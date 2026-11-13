import { getServerConfig } from '../../config/env.ts';
import { getSupabaseAdmin } from '../../lib/supabaseAdmin.ts';
import { AppHttpError } from '../../middleware/errorHandler.ts';
import type { Database } from '../../../src/types/database.ts';
import { enrichCreatorPublicContact } from '../enrichment/emailEnrichment.service.ts';
import {
  calculateEstimatedPublicEngagement,
  evaluateCreatorQualification,
  type VideoMetricSample,
} from '../filtering/qualification.service.ts';
import { recordAuditLog } from '../supabase/sharedWorkspace.service.ts';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const DEFAULT_DISCOVERY_QUERIES = [
  'Indian skincare routine',
  'Indian beauty creator',
  'Skincare product reviews India',
  'Beauty tips India',
  'Dermatology skincare content India',
  'Makeup and skincare India',
];

const MAX_PROFILES_PER_RUN = 50;
const MAX_QUOTA_UNITS_PER_RUN = 2400; // Safe ceiling well under 10,000 daily YouTube quota
const SEARCH_CALL_QUOTA_COST = 100;
const STANDARD_READ_QUOTA_COST = 1;

interface CachedEntry<T> {
  expiresAt: number;
  value: T;
}

const apiCache = new Map<string, CachedEntry<unknown>>();
let activeDiscoveryRunId: string | null = null;

function getCached<T>(key: string): T | null {
  const entry = apiCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    apiCache.delete(key);
    return null;
  }
  return entry.value as T;
}

function setCached<T>(key: string, value: T, ttlMs = 10 * 60 * 1000): void {
  apiCache.set(key, { expiresAt: Date.now() + ttlMs, value });
}

async function fetchYouTubeJson<T>(
  endpoint: string,
  params: Record<string, string>,
  apiKey: string
): Promise<T> {
  const url = new URL(`${YOUTUBE_API_BASE}/${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  url.searchParams.set('key', apiKey);

  const cacheKey = `${endpoint}:${Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&')}`;

  const cached = getCached<T>(cacheKey);
  if (cached) return cached;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      if (res.status === 403 && body.toLowerCase().includes('quota')) {
        throw new AppHttpError(
          429,
          'youtube_quota_exceeded',
          'YouTube Data API v3 daily quota limit reached. Try again after quota resets.'
        );
      }
      throw new AppHttpError(
        502,
        'youtube_api_error',
        `YouTube API request failed (${res.status}).`
      );
    }

    const json = (await res.json()) as T;
    setCached(cacheKey, json);
    return json;
  } catch (err) {
    if (err instanceof AppHttpError) throw err;
    throw new AppHttpError(
      504,
      'youtube_timeout',
      'YouTube API request timed out or failed to respond.'
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, idx: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function next() {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await worker(items[idx], idx);
    }
  }

  const runners = Array.from({ length: Math.min(limit, items.length) }, () => next());
  await Promise.all(runners);
  return results;
}

interface YouTubeSearchResponse {
  nextPageToken?: string;
  items?: Array<{
    id?: { channelId?: string };
    snippet?: { channelId?: string };
  }>;
}

interface YouTubeChannelsResponse {
  items?: Array<{
    id: string;
    snippet?: {
      title?: string;
      description?: string;
      customUrl?: string;
      country?: string;
      thumbnails?: {
        high?: { url?: string };
        medium?: { url?: string };
        default?: { url?: string };
      };
    };
    statistics?: {
      subscriberCount?: string;
      hiddenSubscriberCount?: boolean;
      videoCount?: string;
      viewCount?: string;
    };
    contentDetails?: {
      relatedPlaylists?: { uploads?: string };
    };
  }>;
}

interface YouTubePlaylistItemsResponse {
  items?: Array<{
    snippet?: {
      title?: string;
      publishedAt?: string;
      resourceId?: { videoId?: string };
    };
  }>;
}

interface YouTubeVideosResponse {
  items?: Array<{
    id: string;
    snippet?: {
      title?: string;
      publishedAt?: string;
    };
    statistics?: {
      likeCount?: string;
      commentCount?: string;
      viewCount?: string;
    };
  }>;
}

export interface StartDiscoveryInput {
  campaignId?: string;
  queries?: string[];
  targetCount?: number;
  fetchWebsites?: boolean;
}

type DiscoveryRunRow = Database['public']['Tables']['discovery_runs']['Row'];

async function safeUpdateRun(
  runId: string,
  patch: Database['public']['Tables']['discovery_runs']['Update']
): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;
  const { error } = await admin.from('discovery_runs').update(patch).eq('id', runId);
  if (error) {
    // Fallback without additive columns if migration 001 has not been applied yet
    const basePatch: Database['public']['Tables']['discovery_runs']['Update'] = {
      status: patch.status === 'cancelled' ? 'failed' : patch.status,
      profiles_found: patch.profiles_found,
      error_message: patch.error_message,
      started_at: patch.started_at,
      completed_at: patch.completed_at,
    };
    await admin.from('discovery_runs').update(basePatch).eq('id', runId);
  }
}

async function isRunCancelled(runId: string): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin) return false;
  const { data } = await admin
    .from('discovery_runs')
    .select('status')
    .eq('id', runId)
    .single();
  return data?.status === 'cancelled';
}

export async function listDiscoveryRuns(limit = 20): Promise<DiscoveryRunRow[]> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new AppHttpError(
      503,
      'supabase_not_configured',
      'Supabase server backend requires configuration.'
    );
  }
  const { data, error } = await admin
    .from('discovery_runs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new AppHttpError(500, 'supabase_query_error', error.message);
  }
  return data ?? [];
}

export async function getDiscoveryRunById(runId: string): Promise<DiscoveryRunRow> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new AppHttpError(
      503,
      'supabase_not_configured',
      'Supabase server backend requires configuration.'
    );
  }
  const { data, error } = await admin
    .from('discovery_runs')
    .select('*')
    .eq('id', runId)
    .single();

  if (error || !data) {
    throw new AppHttpError(404, 'discovery_run_not_found', 'Discovery run not found.');
  }
  return data;
}

export async function cancelDiscoveryRun(runId: string): Promise<void> {
  await safeUpdateRun(runId, {
    status: 'cancelled',
    error_message: 'Cancelled by workspace user.',
    cancelled_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  });
  await recordAuditLog('cancel_discovery_run', 'discovery_run', runId, {});
}

export async function startYouTubeDiscoveryRun(
  input: StartDiscoveryInput
): Promise<DiscoveryRunRow> {
  const cfg = getServerConfig();
  if (!cfg.youtubeApiKey) {
    throw new AppHttpError(
      503,
      'youtube_not_configured',
      'YouTube integration requires configuration.'
    );
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new AppHttpError(
      503,
      'supabase_not_configured',
      'Supabase server backend requires configuration.'
    );
  }

  if (activeDiscoveryRunId) {
    throw new AppHttpError(
      409,
      'discovery_already_running',
      'A YouTube discovery run is already in progress. Wait for completion or cancel it first.'
    );
  }

  const queries =
    Array.isArray(input.queries) && input.queries.length > 0
      ? input.queries.map((q) => q.trim()).filter(Boolean).slice(0, 8)
      : DEFAULT_DISCOVERY_QUERIES;

  const targetCount = Math.min(
    MAX_PROFILES_PER_RUN,
    Math.max(5, Number(input.targetCount || MAX_PROFILES_PER_RUN))
  );

  // Resolve campaign criteria (fallback to GlowCare defaults if campaignId not provided)
  let campaignId = input.campaignId ?? null;
  let criteria = {
    minFollowers: 5000,
    maxFollowers: 100000,
    minEngagementRate: 2.0,
    targetCountry: 'India' as string | null,
    niche: 'Beauty & Skincare',
  };

  if (campaignId) {
    const { data: campaign } = await admin
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();
    if (campaign) {
      criteria = {
        minFollowers: campaign.min_followers ?? 5000,
        maxFollowers: campaign.max_followers ?? 100000,
        minEngagementRate: Number(campaign.min_engagement_rate ?? 2.0),
        targetCountry: campaign.target_country ?? 'India',
        niche: campaign.niche || 'Beauty & Skincare',
      };
    }
  } else {
    const { data: firstCampaign } = await admin
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);
    if (firstCampaign?.[0]) {
      campaignId = firstCampaign[0].id;
      criteria = {
        minFollowers: firstCampaign[0].min_followers ?? 5000,
        maxFollowers: firstCampaign[0].max_followers ?? 100000,
        minEngagementRate: Number(firstCampaign[0].min_engagement_rate ?? 2.0),
        targetCountry: firstCampaign[0].target_country ?? 'India',
        niche: firstCampaign[0].niche || 'Beauty & Skincare',
      };
    }
  }

  // Create persisted pending run record
  const baseInsert = {
    campaign_id: campaignId,
    platform: 'youtube',
    search_query: queries.join(' | '),
    status: 'pending' as const,
    profiles_found: 0,
  };

  let runRecord: DiscoveryRunRow | null = null;
  const { data: insertedWithMeta, error: insertErr } = await admin
    .from('discovery_runs')
    .insert({
      ...baseInsert,
      params: { queries, targetCount, criteria },
      quota_used: 0,
      progress_percent: 5,
    })
    .select()
    .single();

  if (insertErr) {
    // Fallback if migration 001 has not been applied yet
    const { data: fallbackRow, error: fallbackErr } = await admin
      .from('discovery_runs')
      .insert(baseInsert)
      .select()
      .single();
    if (fallbackErr || !fallbackRow) {
      throw new AppHttpError(
        500,
        'discovery_run_create_failed',
        fallbackErr?.message || 'Unable to create discovery run.'
      );
    }
    runRecord = fallbackRow;
  } else {
    runRecord = insertedWithMeta;
  }

  activeDiscoveryRunId = runRecord.id;
  await recordAuditLog('start_discovery_run', 'discovery_run', runRecord.id, {
    campaignId,
    targetCount,
    queriesCount: queries.length,
  });

  // Execute bounded asynchronous discovery job while persisting progress in Supabase
  void executeDiscoveryPipeline({
    runId: runRecord.id,
    campaignId,
    queries,
    targetCount,
    criteria,
    apiKey: cfg.youtubeApiKey,
    fetchWebsites: Boolean(input.fetchWebsites),
  }).finally(() => {
    if (activeDiscoveryRunId === runRecord?.id) {
      activeDiscoveryRunId = null;
    }
  });

  return runRecord;
}

async function executeDiscoveryPipeline(opts: {
  runId: string;
  campaignId: string | null;
  queries: string[];
  targetCount: number;
  criteria: {
    minFollowers: number;
    maxFollowers: number;
    minEngagementRate: number;
    targetCountry: string | null;
    niche: string;
  };
  apiKey: string;
  fetchWebsites: boolean;
}): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;

  let quotaUsed = 0;
  const startedAt = new Date().toISOString();

  try {
    await safeUpdateRun(opts.runId, {
      status: 'running',
      started_at: startedAt,
      progress_percent: 10,
    });

    // Step 1: Collect unique channel IDs across configured queries (capped for quota protection)
    const uniqueChannelIds = new Set<string>();
    const candidateTarget = Math.min(80, Math.max(opts.targetCount, 55));

    for (const query of opts.queries) {
      if (await isRunCancelled(opts.runId)) return;
      if (uniqueChannelIds.size >= candidateTarget) break;
      if (quotaUsed + SEARCH_CALL_QUOTA_COST > MAX_QUOTA_UNITS_PER_RUN) break;

      let pageToken: string | undefined;
      for (let page = 0; page < 2; page++) {
        if (uniqueChannelIds.size >= candidateTarget) break;
        if (quotaUsed + SEARCH_CALL_QUOTA_COST > MAX_QUOTA_UNITS_PER_RUN) break;

        const searchParams: Record<string, string> = {
          part: 'snippet',
          type: 'channel',
          q: query,
          maxResults: '25',
          regionCode: 'IN',
          relevanceLanguage: 'en',
        };
        if (pageToken) searchParams.pageToken = pageToken;

        quotaUsed += SEARCH_CALL_QUOTA_COST;
        const searchRes = await fetchYouTubeJson<YouTubeSearchResponse>(
          'search',
          searchParams,
          opts.apiKey
        );

        for (const item of searchRes.items ?? []) {
          const cid = item.id?.channelId || item.snippet?.channelId;
          if (cid) uniqueChannelIds.add(cid);
        }

        pageToken = searchRes.nextPageToken;
        if (!pageToken) break;
      }
    }

    const channelIds = Array.from(uniqueChannelIds).slice(0, candidateTarget);
    if (channelIds.length === 0) {
      await safeUpdateRun(opts.runId, {
        status: 'failed',
        profiles_found: 0,
        quota_used: quotaUsed,
        progress_percent: 100,
        error_message: 'YouTube Data API returned 0 matching channels for the search queries.',
        completed_at: new Date().toISOString(),
      });
      return;
    }

    await safeUpdateRun(opts.runId, {
      quota_used: quotaUsed,
      progress_percent: 35,
    });

    // Step 2: Fetch full channel snippets, statistics, and upload playlists in batches of 50
    const channelDetails: NonNullable<YouTubeChannelsResponse['items']> = [];
    for (let i = 0; i < channelIds.length; i += 50) {
      if (await isRunCancelled(opts.runId)) return;
      const chunk = channelIds.slice(i, i + 50);
      quotaUsed += STANDARD_READ_QUOTA_COST;
      const res = await fetchYouTubeJson<YouTubeChannelsResponse>(
        'channels',
        {
          part: 'snippet,statistics,contentDetails',
          id: chunk.join(','),
          maxResults: '50',
        },
        opts.apiKey
      );
      channelDetails.push(...(res.items ?? []));
    }

    // Deduplicate channels by channelId & canonical profile URL
    const seenUrls = new Set<string>();
    const dedupedChannels = channelDetails.filter((ch) => {
      const canonicalUrl = `https://www.youtube.com/channel/${ch.id}`;
      if (seenUrls.has(canonicalUrl)) return false;
      seenUrls.add(canonicalUrl);
      return true;
    }).slice(0, opts.targetCount);

    await safeUpdateRun(opts.runId, {
      quota_used: quotaUsed,
      progress_percent: 55,
    });

    // Step 3: Sample recent eligible public videos from upload playlists + enrich + evaluate
    let persistedCount = 0;
    const processedRecords = await mapWithConcurrency(
      dedupedChannels,
      3,
      async (ch) => {
        if (await isRunCancelled(opts.runId)) return null;

        const retrievedAt = new Date().toISOString();
        const title = ch.snippet?.title?.trim() || `YouTube Channel ${ch.id}`;
        const description = ch.snippet?.description?.trim() || '';
        const customUrl = ch.snippet?.customUrl?.trim() || null;
        const profileUrl = `https://www.youtube.com/channel/${ch.id}`;
        const profileImageUrl =
          ch.snippet?.thumbnails?.high?.url ||
          ch.snippet?.thumbnails?.medium?.url ||
          ch.snippet?.thumbnails?.default?.url ||
          null;

        const hiddenSubs = Boolean(ch.statistics?.hiddenSubscriberCount);
        const subscriberCount =
          !hiddenSubs && ch.statistics?.subscriberCount
            ? Number(ch.statistics.subscriberCount)
            : null;

        let recentVideos: VideoMetricSample[] = [];
        const uploadsPlaylistId = ch.contentDetails?.relatedPlaylists?.uploads;

        if (uploadsPlaylistId && quotaUsed + 2 <= MAX_QUOTA_UNITS_PER_RUN) {
          try {
            quotaUsed += STANDARD_READ_QUOTA_COST;
            const plRes = await fetchYouTubeJson<YouTubePlaylistItemsResponse>(
              'playlistItems',
              {
                part: 'snippet',
                playlistId: uploadsPlaylistId,
                maxResults: '6',
              },
              opts.apiKey
            );

            const videoIds = (plRes.items ?? [])
              .map((it) => it.snippet?.resourceId?.videoId)
              .filter((vid): vid is string => Boolean(vid));

            if (videoIds.length > 0 && quotaUsed + 1 <= MAX_QUOTA_UNITS_PER_RUN) {
              quotaUsed += STANDARD_READ_QUOTA_COST;
              const vidRes = await fetchYouTubeJson<YouTubeVideosResponse>(
                'videos',
                {
                  part: 'snippet,statistics',
                  id: videoIds.join(','),
                },
                opts.apiKey
              );

              recentVideos = (vidRes.items ?? []).map((v) => ({
                videoId: v.id,
                title: v.snippet?.title || '',
                publishedAt: v.snippet?.publishedAt,
                likeCount: Number(v.statistics?.likeCount || 0),
                commentCount: Number(v.statistics?.commentCount || 0),
              }));
            }
          } catch {
            // Keep channel even if uploads playlist lookup fails; engagement marks unavailable safely
          }
        }

        const engagement = calculateEstimatedPublicEngagement({
          subscriberCount,
          hiddenSubscriberCount: hiddenSubs,
          videos: recentVideos,
        });

        const contact = await enrichCreatorPublicContact({
          description,
          fetchWebsite: opts.fetchWebsites,
        });

        const evaluation = evaluateCreatorQualification(
          {
            name: title,
            description,
            recentVideoTitles: recentVideos.map((v) => v.title),
            country: ch.snippet?.country ?? null,
            subscriberCount,
            engagementRate: engagement.engagementRate,
            contactEmail: contact.contactEmail,
          },
          opts.criteria
        );

        const baseInfluencerPayload: Database['public']['Tables']['influencers']['Insert'] = {
          owner_id: null,
          name: title.slice(0, 140),
          platform: 'youtube',
          profile_url: profileUrl,
          username: customUrl,
          follower_count: subscriberCount,
          engagement_rate: engagement.engagementRate,
          engagement_source: engagement.available
            ? `${engagement.label} (${engagement.formulaVersion}, ${engagement.sampleSize} videos)`
            : 'Unavailable',
          niche: evaluation.nicheMatched ? 'Beauty & Skincare' : 'General / Unmatched',
          content_themes: evaluation.detectedThemes,
          contact_email: contact.contactEmail,
          email_status: contact.emailStatus,
          website: contact.website,
          audience_age: 'Not Available',
          audience_gender: 'Not Available',
          audience_geography: evaluation.inferredCountry ?? 'Not Available',
          country: evaluation.inferredCountry ?? ch.snippet?.country ?? null,
          data_source: 'youtube_data_api_v3',
          last_verified_at: contact.contactEmail ? retrievedAt : null,
          updated_at: retrievedAt,
        };

        // Try writing with extended provenance columns; fall back cleanly if migration 001 pending
        const extendedPayload: Database['public']['Tables']['influencers']['Insert'] = {
          ...baseInfluencerPayload,
          profile_description: description.slice(0, 2000),
          profile_image_url: profileImageUrl,
          source_retrieved_at: retrievedAt,
          engagement_sample_size: engagement.sampleSize,
          engagement_calculated_at: engagement.calculatedAt,
          fit_score: evaluation.fitScore,
          is_top_pick: false,
          source_metadata: {
            channelId: ch.id,
            customUrl,
            formulaVersion: engagement.formulaVersion,
            avgLikes: engagement.avgLikes,
            avgComments: engagement.avgComments,
            emailSource: contact.emailSource,
            recentVideoTitles: recentVideos.map((v) => v.title).slice(0, 5),
          },
        };

        let savedInfluencerId: string | null = null;
        const { data: upsertedExt, error: upsertErr } = await admin
          .from('influencers')
          .upsert(extendedPayload, { onConflict: 'platform,profile_url' })
          .select('id')
          .single();

        if (upsertErr) {
          const { data: upsertedBase, error: baseErr } = await admin
            .from('influencers')
            .upsert(baseInfluencerPayload, { onConflict: 'platform,profile_url' })
            .select('id')
            .single();
          if (!baseErr && upsertedBase) {
            savedInfluencerId = upsertedBase.id;
          }
        } else if (upsertedExt) {
          savedInfluencerId = upsertedExt.id;
        }

        if (savedInfluencerId) {
          persistedCount += 1;
          if (opts.campaignId) {
            const dbStatus =
              evaluation.status === 'needs_review' ? 'needs_review' : evaluation.status;
            const { error: ciErr } = await admin.from('campaign_influencers').upsert(
              {
                campaign_id: opts.campaignId,
                influencer_id: savedInfluencerId,
                qualification_status: dbStatus,
                qualification_reason: evaluation.reason,
                source_run_id: opts.runId,
                review_state: evaluation.status === 'needs_review' ? 'pending_country_review' : 'evaluated',
              },
              { onConflict: 'campaign_id,influencer_id' }
            );
            if (ciErr) {
              // Fallback without additive constraint/columns
              await admin.from('campaign_influencers').upsert(
                {
                  campaign_id: opts.campaignId,
                  influencer_id: savedInfluencerId,
                  qualification_status:
                    evaluation.status === 'needs_review' ? 'discovered' : evaluation.status,
                  qualification_reason: evaluation.reason,
                },
                { onConflict: 'campaign_id,influencer_id' }
              );
            }
          }
        }

        return {
          influencerId: savedInfluencerId,
          status: evaluation.status,
          fitScore: evaluation.fitScore,
        };
      }
    );

    if (await isRunCancelled(opts.runId)) return;

    // Highlight top 5 strongest qualified creators if extended column exists
    const qualifiedTop5Ids = processedRecords
      .filter(
        (r): r is { influencerId: string; status: 'qualified' | 'rejected' | 'needs_review'; fitScore: number } =>
          Boolean(r && r.influencerId && r.status === 'qualified')
      )
      .sort((a, b) => b.fitScore - a.fitScore)
      .slice(0, 5)
      .map((r) => r.influencerId);

    if (qualifiedTop5Ids.length > 0) {
      await admin
        .from('influencers')
        .update({ is_top_pick: false })
        .eq('is_top_pick', true)
        .then(() => undefined, () => undefined);
      await admin
        .from('influencers')
        .update({ is_top_pick: true })
        .in('id', qualifiedTop5Ids)
        .then(() => undefined, () => undefined);
    }

    if (persistedCount === 0) {
      await safeUpdateRun(opts.runId, {
        status: 'failed',
        profiles_found: 0,
        quota_used: quotaUsed,
        progress_percent: 100,
        error_message: 'No creator profiles could be persisted during discovery.',
        completed_at: new Date().toISOString(),
      });
      return;
    }

    await safeUpdateRun(opts.runId, {
      status: 'completed',
      profiles_found: persistedCount,
      quota_used: quotaUsed,
      progress_percent: 100,
      completed_at: new Date().toISOString(),
    });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : 'Unexpected failure during YouTube discovery.';
    await safeUpdateRun(opts.runId, {
      status: 'failed',
      quota_used: quotaUsed,
      progress_percent: 100,
      error_message: msg,
      completed_at: new Date().toISOString(),
    });
  }
}
