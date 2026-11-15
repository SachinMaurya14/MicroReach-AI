import crypto from 'node:crypto';
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
import {
  recordAuditLog,
  type WorkspaceCreatorDetail,
} from '../supabase/sharedWorkspace.service.ts';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const DEFAULT_DISCOVERY_QUERIES = [
  'Indian skincare creators',
  'Indian skincare reviews',
  'Sunscreen reviews India',
  'Acne care India',
  'Affordable skincare India',
  'Beauty and skincare routines India',
  'Indian beauty product reviews',
  'Dermatologist skincare India',
  'Indian skincare serum review',
  'moisturizer review India',
];

const MAX_PROFILES_PER_RUN = 60;
const MAX_CANDIDATE_POOL = 180;
const MAX_QUOTA_UNITS_PER_RUN = 2800; // Safe ceiling well under 10,000 daily YouTube quota
const SEARCH_CALL_QUOTA_COST = 100;
const STANDARD_READ_QUOTA_COST = 1;

interface CachedEntry<T> {
  expiresAt: number;
  value: T;
}

const apiCache = new Map<string, CachedEntry<unknown>>();
let activeDiscoveryRunId: string | null = null;
const ACTIVE_RUN_STALE_WINDOW_MS = 2 * 60 * 1000;
const SERVERLESS_CHUNK_BUDGET_MS = 28_000;

export interface DiscoveryCheckpoint {
  targetCount: number;
  fetchWebsites: boolean;
  queries: string[];
  criteria: {
    minFollowers: number;
    maxFollowers: number;
    minEngagementRate: number;
    targetCountry: string | null;
    niche: string;
  };
  candidateChannelIds: string[];
  processedChannelIds: string[];
  failedChannelIds: string[];
  stats: {
    candidateCount: number;
    processedCount: number;
    qualifiedCount: number;
    rejectedCount: number;
    needsReviewCount: number;
    failureCount: number;
    quotaUsed: number;
  };
}

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  const maxAttempts = 3;
  let lastErr: AppHttpError | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 11_000);
    try {
      const res = await fetch(url.toString(), {
        method: 'GET',
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        const lowerBody = body.toLowerCase();
        if (res.status === 403 && lowerBody.includes('quota')) {
          // Do not waste quota retries on hard daily quota errors
          throw new AppHttpError(
            429,
            'youtube_quota_exceeded',
            'YouTube Data API v3 daily quota limit reached. Try again after quota resets.'
          );
        }

        if (res.status === 429 || res.status >= 500) {
          lastErr = new AppHttpError(
            res.status === 429 ? 429 : 502,
            res.status === 429 ? 'youtube_rate_limited' : 'youtube_upstream_error',
            `YouTube API transient error (${res.status}).`
          );
          if (attempt < maxAttempts - 1) {
            const backoffMs = 450 * Math.pow(2, attempt) + Math.floor(Math.random() * 200);
            await sleep(backoffMs);
            continue;
          }
          throw lastErr;
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
      if (err instanceof AppHttpError && err.code === 'youtube_quota_exceeded') {
        throw err;
      }
      if (err instanceof AppHttpError && err.statusCode === 502 && !err.code.includes('upstream')) {
        throw err;
      }
      lastErr =
        err instanceof AppHttpError
          ? err
          : new AppHttpError(
              504,
              'youtube_timeout',
              'YouTube API request timed out or failed to respond.'
            );

      if (attempt < maxAttempts - 1) {
        const backoffMs = 450 * Math.pow(2, attempt) + Math.floor(Math.random() * 200);
        await sleep(backoffMs);
        continue;
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw (
    lastErr ??
    new AppHttpError(504, 'youtube_timeout', 'YouTube API request failed after retries.')
  );
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
  minFollowers?: number;
  maxFollowers?: number;
  minEngagementRate?: number;
  targetCountry?: string | null;
  niche?: string;
}

export interface DiscoveryPersistenceResult {
  persisted: boolean;
  savedCount: number;
  verifiedCount: number;
  warning: string | null;
}

export interface YouTubeDiscoveryResult {
  run: Database['public']['Tables']['discovery_runs']['Row'];
  creators: WorkspaceCreatorDetail[];
  persistence: DiscoveryPersistenceResult;
  stats?: {
    rawCount: number;
    uniqueCount: number;
    duplicateCount: number;
    qualifiedCount: number;
    needsReviewCount: number;
    rejectedCount: number;
    persistedCount: number;
    persistenceFailureCount: number;
  };
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
    // Fallback without additive migration 002/001 columns if pending in Supabase
    const safeStatus =
      patch.status === 'partial'
        ? 'running'
        : patch.status === 'cancelled'
          ? 'failed'
          : patch.status;
    const basePatch: Database['public']['Tables']['discovery_runs']['Update'] = {
      status: safeStatus,
      profiles_found: patch.profiles_found,
      error_message: patch.error_message,
      started_at: patch.started_at,
      completed_at: patch.completed_at,
      params: patch.params,
      quota_used: patch.quota_used,
      progress_percent: patch.progress_percent,
    };
    const { error: midErr } = await admin
      .from('discovery_runs')
      .update(basePatch)
      .eq('id', runId);
    if (midErr) {
      await admin
        .from('discovery_runs')
        .update({
          status:
            safeStatus === 'running' || safeStatus === 'pending' || safeStatus === 'completed' || safeStatus === 'failed'
              ? safeStatus
              : 'failed',
          profiles_found: patch.profiles_found,
          error_message: patch.error_message,
          started_at: patch.started_at,
          completed_at: patch.completed_at,
        })
        .eq('id', runId);
    }
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

function buildDiscoveryQueries(
  input: StartDiscoveryInput,
  criteria: DiscoveryCheckpoint['criteria']
): string[] {
  if (Array.isArray(input.queries) && input.queries.length > 0) {
    return input.queries.map((q) => q.trim()).filter(Boolean).slice(0, 8);
  }
  const niche = criteria.niche.trim();
  const country = criteria.targetCountry?.trim() || '';
  const isDefaultNiche = niche.toLowerCase() === 'beauty & skincare';
  const isDefaultCountry = country.toLowerCase() === 'india';

  if (isDefaultNiche && isDefaultCountry) {
    return DEFAULT_DISCOVERY_QUERIES;
  }

  const baseNiche = niche && niche.toLowerCase() !== 'all' ? niche : 'lifestyle & beauty';
  const countrySuffix = country && country.toLowerCase() !== 'all' ? ` ${country}` : '';
  return [
    `${baseNiche} review${countrySuffix}`,
    `${baseNiche} creator${countrySuffix}`,
    `${baseNiche} routine${countrySuffix}`,
    `${baseNiche} channel${countrySuffix}`,
  ];
}

export async function startYouTubeDiscoveryRun(
  input: StartDiscoveryInput
): Promise<YouTubeDiscoveryResult> {
  const cfg = getServerConfig();
  if (!cfg.youtubeApiKey) {
    throw new AppHttpError(
      503,
      'youtube_not_configured',
      'YouTube integration requires YOUTUBE_API_KEY configuration.'
    );
  }

  const admin = getSupabaseAdmin();
  const isServerless = Boolean(process.env.VERCEL);

  if (activeDiscoveryRunId) {
    throw new AppHttpError(
      409,
      'discovery_already_running',
      'A YouTube discovery run is already in progress. Wait for completion or cancel it first.'
    );
  }

  // Database-backed active run lock when Supabase is available
  if (admin) {
    try {
      const staleCutoff = new Date(Date.now() - ACTIVE_RUN_STALE_WINDOW_MS).toISOString();
      const { data: activeRows } = await admin
        .from('discovery_runs')
        .select('id, updated_at:created_at, last_heartbeat_at')
        .in('status', ['pending', 'running'])
        .limit(5);

      const trulyActive = (activeRows ?? []).filter((r) => {
        const heartbeat =
          (r as { last_heartbeat_at?: string | null; updated_at?: string }).last_heartbeat_at ||
          (r as { updated_at?: string }).updated_at;
        return !heartbeat || heartbeat >= staleCutoff;
      });

      if (trulyActive.length > 0) {
        throw new AppHttpError(
          409,
          'discovery_already_running',
          'A YouTube discovery run is already in progress. Wait for completion or cancel it first.'
        );
      }
    } catch (err) {
      if (err instanceof AppHttpError) throw err;
    }
  }

  let campaignId = input.campaignId ?? null;
  let criteria: DiscoveryCheckpoint['criteria'] = {
    minFollowers: input.minFollowers ?? 5000,
    maxFollowers: input.maxFollowers ?? 100000,
    minEngagementRate: input.minEngagementRate ?? 2.0,
    targetCountry: input.targetCountry === undefined ? 'India' : input.targetCountry,
    niche: input.niche ?? 'Beauty & Skincare',
  };

  if (admin) {
    try {
      if (campaignId) {
        const { data: campaign } = await admin
          .from('campaigns')
          .select('*')
          .eq('id', campaignId)
          .single();
        if (campaign) {
          criteria = {
            minFollowers: input.minFollowers ?? campaign.min_followers ?? 5000,
            maxFollowers: input.maxFollowers ?? campaign.max_followers ?? 100000,
            minEngagementRate:
              input.minEngagementRate ?? Number(campaign.min_engagement_rate ?? 2.0),
            targetCountry:
              input.targetCountry === undefined
                ? campaign.target_country ?? 'India'
                : input.targetCountry,
            niche: input.niche ?? (campaign.niche || 'Beauty & Skincare'),
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
            minFollowers: input.minFollowers ?? firstCampaign[0].min_followers ?? 5000,
            maxFollowers: input.maxFollowers ?? firstCampaign[0].max_followers ?? 100000,
            minEngagementRate:
              input.minEngagementRate ?? Number(firstCampaign[0].min_engagement_rate ?? 2.0),
            targetCountry:
              input.targetCountry === undefined
                ? firstCampaign[0].target_country ?? 'India'
                : input.targetCountry,
            niche: input.niche ?? (firstCampaign[0].niche || 'Beauty & Skincare'),
          };
        }
      }
    } catch {
      // Proceed with criteria from request/defaults even if campaign lookup fails
    }
  }

  const queries = buildDiscoveryQueries(input, criteria);
  const requestedTarget = Math.min(
    MAX_PROFILES_PER_RUN,
    Math.max(5, Number(input.targetCount || MAX_PROFILES_PER_RUN))
  );
  // Without DB checkpointing, cap to a responsive single-pass batch of up to 20 creators
  const targetCount = admin ? requestedTarget : Math.min(requestedTarget, 20);

  const initialCheckpoint: DiscoveryCheckpoint = {
    targetCount,
    fetchWebsites: Boolean(input.fetchWebsites),
    queries,
    criteria,
    candidateChannelIds: [],
    processedChannelIds: [],
    failedChannelIds: [],
    stats: {
      candidateCount: 0,
      processedCount: 0,
      qualifiedCount: 0,
      rejectedCount: 0,
      needsReviewCount: 0,
      failureCount: 0,
      quotaUsed: 0,
    },
  };

  let persistenceWarning: string | null = admin
    ? null
    : 'Supabase server backend is not configured (set SUPABASE_URL and SUPABASE_SECRET_KEY). Showing live YouTube Data API v3 results without database persistence.';

  const nowIso = new Date().toISOString();
  let runRecord: DiscoveryRunRow = {
    id: crypto.randomUUID(),
    campaign_id: campaignId,
    platform: 'youtube',
    search_query: queries.join(' | '),
    status: 'pending',
    profiles_found: 0,
    error_message: null,
    started_at: nowIso,
    completed_at: null,
    created_at: nowIso,
    params: { checkpoint: initialCheckpoint },
    candidate_count: 0,
    qualified_count: 0,
    rejected_count: 0,
    needs_review_count: 0,
    failure_count: 0,
    quota_used: 0,
    progress_percent: 5,
    cancelled_at: null,
    last_heartbeat_at: nowIso,
  };

  let hasDbRun = false;
  if (admin) {
    const baseInsert = {
      campaign_id: campaignId,
      platform: 'youtube',
      search_query: queries.join(' | '),
      status: 'pending' as const,
      profiles_found: 0,
    };

    try {
      const { data: insertedWithMeta, error: insertErr } = await admin
        .from('discovery_runs')
        .insert({
          ...baseInsert,
          params: { checkpoint: initialCheckpoint },
          quota_used: 0,
          progress_percent: 5,
          last_heartbeat_at: nowIso,
        })
        .select()
        .single();

      if (insertErr) {
        const { data: fallbackRow, error: fallbackErr } = await admin
          .from('discovery_runs')
          .insert(baseInsert)
          .select()
          .single();
        if (fallbackErr || !fallbackRow) {
          persistenceWarning = `Supabase discovery run record could not be created (${fallbackErr?.message || insertErr.message}). Running YouTube discovery without DB persistence.`;
        } else {
          runRecord = fallbackRow;
          hasDbRun = true;
        }
      } else if (insertedWithMeta) {
        runRecord = insertedWithMeta;
        hasDbRun = true;
      }
    } catch (err) {
      persistenceWarning =
        err instanceof Error
          ? `Supabase discovery run initialization failed: ${err.message}`
          : 'Supabase discovery run initialization failed.';
    }
  }

  activeDiscoveryRunId = runRecord.id;
  if (hasDbRun) {
    await recordAuditLog('start_discovery_run', 'discovery_run', runRecord.id, {
      campaignId,
      targetCount,
      queriesCount: queries.length,
    });
  }

  try {
    const chunkResult = await executeDiscoveryChunk({
      runId: runRecord.id,
      hasDbRun,
      initialRunRecord: runRecord,
      campaignId,
      checkpoint: initialCheckpoint,
      apiKey: cfg.youtubeApiKey,
      timeBudgetMs: isServerless ? SERVERLESS_CHUNK_BUDGET_MS : 22_000,
      concurrency: isServerless ? 6 : 5,
      initialPersistenceWarning: persistenceWarning,
    });

    const latestRun =
      admin && hasDbRun
        ? await getDiscoveryRunById(runRecord.id).catch(() => chunkResult.run)
        : chunkResult.run;

    return {
      run: latestRun,
      creators: chunkResult.creators,
      persistence: chunkResult.persistence,
    };
  } finally {
    if (activeDiscoveryRunId === runRecord.id) {
      activeDiscoveryRunId = null;
    }
  }
}

export async function resumeYouTubeDiscoveryRun(
  runId: string
): Promise<YouTubeDiscoveryResult> {
  const cfg = getServerConfig();
  if (!cfg.youtubeApiKey) {
    throw new AppHttpError(503, 'youtube_not_configured', 'YouTube API key not configured.');
  }

  const run = await getDiscoveryRunById(runId);
  if (run.status === 'completed' || run.status === 'cancelled') {
    return {
      run,
      creators: [],
      persistence: {
        persisted: true,
        savedCount: run.profiles_found ?? 0,
        verifiedCount: run.profiles_found ?? 0,
        warning: null,
      },
    };
  }

  if (activeDiscoveryRunId && activeDiscoveryRunId !== runId) {
    throw new AppHttpError(
      409,
      'discovery_already_running',
      'Another discovery run is currently active.'
    );
  }

  const rawParams = (run.params ?? {}) as { checkpoint?: DiscoveryCheckpoint };
  const checkpoint: DiscoveryCheckpoint = rawParams.checkpoint ?? {
    targetCount: MAX_PROFILES_PER_RUN,
    fetchWebsites: false,
    queries: run.search_query
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean),
    criteria: {
      minFollowers: 5000,
      maxFollowers: 100000,
      minEngagementRate: 2.0,
      targetCountry: 'India',
      niche: 'Beauty & Skincare',
    },
    candidateChannelIds: [],
    processedChannelIds: [],
    failedChannelIds: [],
    stats: {
      candidateCount: 0,
      processedCount: run.profiles_found ?? 0,
      qualifiedCount: 0,
      rejectedCount: 0,
      needsReviewCount: 0,
      failureCount: 0,
      quotaUsed: run.quota_used ?? 0,
    },
  };

  const isServerless = Boolean(process.env.VERCEL);
  activeDiscoveryRunId = run.id;

  try {
    const chunkResult = await executeDiscoveryChunk({
      runId: run.id,
      hasDbRun: true,
      initialRunRecord: run,
      campaignId: run.campaign_id,
      checkpoint,
      apiKey: cfg.youtubeApiKey,
      timeBudgetMs: isServerless ? SERVERLESS_CHUNK_BUDGET_MS : 22_000,
      concurrency: isServerless ? 6 : 5,
      initialPersistenceWarning: null,
    });

    const latestRun = await getDiscoveryRunById(run.id).catch(() => chunkResult.run);
    return {
      run: latestRun,
      creators: chunkResult.creators,
      persistence: chunkResult.persistence,
    };
  } finally {
    if (activeDiscoveryRunId === run.id) {
      activeDiscoveryRunId = null;
    }
  }
}

async function collectCandidateChannelIds(
  checkpoint: DiscoveryCheckpoint,
  apiKey: string,
  runId: string,
  hasDbRun: boolean
): Promise<string[]> {
  if (checkpoint.candidateChannelIds.length >= checkpoint.targetCount) {
    return checkpoint.candidateChannelIds;
  }

  const uniqueChannelIds = new Set<string>(checkpoint.candidateChannelIds);
  const candidateTarget = Math.min(MAX_CANDIDATE_POOL, Math.max(checkpoint.targetCount * 3, 120));
  const targetCountry = (checkpoint.criteria.targetCountry ?? '').toLowerCase();

  // Search both active skincare review videos (finds active creators) and channel profiles
  const searchTasks: Array<{ query: string; type: 'video' | 'channel'; maxPages: number }> = [];
  checkpoint.queries.forEach((query, idx) => {
    searchTasks.push({ query, type: 'video', maxPages: idx < 4 ? 2 : 1 });
    if (idx < 4) {
      searchTasks.push({ query, type: 'channel', maxPages: 1 });
    }
  });

  for (const task of searchTasks) {
    if (hasDbRun && (await isRunCancelled(runId))) break;
    if (uniqueChannelIds.size >= candidateTarget) break;
    if (checkpoint.stats.quotaUsed + SEARCH_CALL_QUOTA_COST > MAX_QUOTA_UNITS_PER_RUN) break;

    let pageToken: string | undefined;
    for (let page = 0; page < task.maxPages; page++) {
      if (uniqueChannelIds.size >= candidateTarget) break;
      if (checkpoint.stats.quotaUsed + SEARCH_CALL_QUOTA_COST > MAX_QUOTA_UNITS_PER_RUN) break;

      const searchParams: Record<string, string> = {
        part: 'snippet',
        type: task.type,
        q: task.query,
        maxResults: '25',
        relevanceLanguage: 'en',
      };
      if (targetCountry === 'india') {
        searchParams.regionCode = 'IN';
      }
      if (pageToken) searchParams.pageToken = pageToken;

      checkpoint.stats.quotaUsed += SEARCH_CALL_QUOTA_COST;
      const searchRes = await fetchYouTubeJson<YouTubeSearchResponse>(
        'search',
        searchParams,
        apiKey
      );

      for (const item of searchRes.items ?? []) {
        const cid = item.id?.channelId || item.snippet?.channelId;
        if (cid) uniqueChannelIds.add(cid);
      }

      pageToken = searchRes.nextPageToken;
      if (!pageToken) break;
    }
  }

  return Array.from(uniqueChannelIds).slice(0, candidateTarget);
}

async function refreshTopPicksForCampaign(campaignId: string | null): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;

  try {
    let qualifiedInfIds: string[] = [];
    if (campaignId) {
      const { data: qualLinks } = await admin
        .from('campaign_influencers')
        .select('influencer_id')
        .eq('campaign_id', campaignId)
        .eq('qualification_status', 'qualified');
      qualifiedInfIds = (qualLinks ?? []).map((l) => l.influencer_id);
    } else {
      const { data: qualLinks } = await admin
        .from('campaign_influencers')
        .select('influencer_id')
        .eq('qualification_status', 'qualified');
      qualifiedInfIds = (qualLinks ?? []).map((l) => l.influencer_id);
    }

    if (qualifiedInfIds.length === 0) return;

    const { data: ranked } = await admin
      .from('influencers')
      .select('id, fit_score')
      .in('id', qualifiedInfIds)
      .order('fit_score', { ascending: false, nullsFirst: false })
      .limit(5);

    const top5Ids = (ranked ?? []).map((r) => r.id);
    if (top5Ids.length === 0) return;

    await admin
      .from('influencers')
      .update({ is_top_pick: false })
      .eq('is_top_pick', true);

    await admin
      .from('influencers')
      .update({ is_top_pick: true })
      .in('id', top5Ids);
  } catch {
    // Non-fatal if additive columns are not yet present
  }
}

async function executeDiscoveryChunk(opts: {
  runId: string;
  hasDbRun: boolean;
  initialRunRecord: DiscoveryRunRow;
  campaignId: string | null;
  checkpoint: DiscoveryCheckpoint;
  apiKey: string;
  timeBudgetMs?: number;
  concurrency?: number;
  initialPersistenceWarning: string | null;
}): Promise<YouTubeDiscoveryResult> {
  const admin = getSupabaseAdmin();
  const cp = opts.checkpoint;
  const startedAtMs = Date.now();
  const isNearTimeBudget = () =>
    Boolean(opts.timeBudgetMs && Date.now() - startedAtMs >= opts.timeBudgetMs);

  const collectedCreators: WorkspaceCreatorDetail[] = [];
  const savedInfluencerIds: string[] = [];
  let persistenceWarning: string | null = opts.initialPersistenceWarning;
  let currentRunRecord: DiscoveryRunRow = { ...opts.initialRunRecord };

  const updateRunSafely = async (patch: Database['public']['Tables']['discovery_runs']['Update']) => {
    currentRunRecord = {
      ...currentRunRecord,
      ...patch,
      status: patch.status ?? currentRunRecord.status,
    } as DiscoveryRunRow;
    if (opts.hasDbRun && admin) {
      await safeUpdateRun(opts.runId, patch);
    }
  };

  try {
    await updateRunSafely({
      status: 'running',
      started_at: new Date(startedAtMs).toISOString(),
      last_heartbeat_at: new Date(startedAtMs).toISOString(),
      progress_percent: Math.max(
        10,
        Math.round((cp.stats.processedCount / Math.max(1, cp.targetCount)) * 100)
      ),
    });

    // Step 1: Collect unique paginated candidate channel IDs if not collected yet
    if (cp.candidateChannelIds.length === 0) {
      cp.candidateChannelIds = await collectCandidateChannelIds(
        cp,
        opts.apiKey,
        opts.runId,
        opts.hasDbRun
      );
      cp.stats.candidateCount = cp.candidateChannelIds.length;
    }

    if (cp.candidateChannelIds.length === 0) {
      await updateRunSafely({
        status: 'failed',
        profiles_found: 0,
        candidate_count: 0,
        quota_used: cp.stats.quotaUsed,
        progress_percent: 100,
        error_message: 'YouTube Data API returned 0 matching channels for the search queries.',
        completed_at: new Date().toISOString(),
        params: { checkpoint: cp },
      });
      return {
        run: currentRunRecord,
        creators: [],
        persistence: {
          persisted: false,
          savedCount: 0,
          verifiedCount: 0,
          warning: persistenceWarning,
        },
      };
    }

    const processedSet = new Set(cp.processedChannelIds);
    const failedSet = new Set(cp.failedChannelIds);

    const remainingCapacity = Math.max(0, cp.targetCount - cp.stats.processedCount);
    const remainingIds = cp.candidateChannelIds.filter(
      (cid) => !processedSet.has(cid) && !failedSet.has(cid)
    );

    if (remainingCapacity === 0 || remainingIds.length === 0) {
      if (admin) {
        await refreshTopPicksForCampaign(opts.campaignId);
      }
      await updateRunSafely({
        status: cp.stats.processedCount > 0 ? 'completed' : 'failed',
        profiles_found: cp.stats.processedCount,
        candidate_count: cp.stats.candidateCount,
        qualified_count: cp.stats.qualifiedCount,
        rejected_count: cp.stats.rejectedCount,
        needs_review_count: cp.stats.needsReviewCount,
        failure_count: cp.stats.failureCount,
        quota_used: cp.stats.quotaUsed,
        progress_percent: 100,
        error_message:
          cp.stats.processedCount === 0
            ? 'No creator profiles could be evaluated during discovery.'
            : null,
        completed_at: new Date().toISOString(),
        params: { checkpoint: cp },
      });
      return {
        run: currentRunRecord,
        creators: [],
        persistence: {
          persisted: Boolean(admin && !persistenceWarning),
          savedCount: 0,
          verifiedCount: 0,
          warning: persistenceWarning,
        },
      };
    }

    await updateRunSafely({
      candidate_count: cp.stats.candidateCount,
      quota_used: cp.stats.quotaUsed,
      progress_percent: Math.max(
        20,
        Math.min(90, Math.round((cp.stats.processedCount / cp.targetCount) * 100))
      ),
      last_heartbeat_at: new Date().toISOString(),
      params: { checkpoint: cp },
    });

    // Fetch channel stats in batches of 50 (only 1 quota unit per 50 channels) so we can prioritize in-range creators
    const idsToFetchThisPass = remainingIds.slice(0, MAX_CANDIDATE_POOL);
    const channelDetails: NonNullable<YouTubeChannelsResponse['items']> = [];

    for (let i = 0; i < idsToFetchThisPass.length; i += 50) {
      if (opts.hasDbRun && (await isRunCancelled(opts.runId))) {
        return {
          run: currentRunRecord,
          creators: collectedCreators,
          persistence: {
            persisted: savedInfluencerIds.length > 0,
            savedCount: savedInfluencerIds.length,
            verifiedCount: savedInfluencerIds.length,
            warning: persistenceWarning,
          },
        };
      }
      const chunk = idsToFetchThisPass.slice(i, i + 50);
      if (cp.stats.quotaUsed + STANDARD_READ_QUOTA_COST > MAX_QUOTA_UNITS_PER_RUN) break;
      cp.stats.quotaUsed += STANDARD_READ_QUOTA_COST;
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

    const seenUrls = new Set<string>();
    const dedupedChannels = channelDetails
      .filter((ch) => {
        if (processedSet.has(ch.id) || failedSet.has(ch.id)) return false;
        const canonicalUrl = `https://www.youtube.com/channel/${ch.id}`;
        if (seenUrls.has(canonicalUrl)) return false;
        seenUrls.add(canonicalUrl);
        return true;
      })
      .sort((a, b) => {
        const rankChannel = (ch: (typeof channelDetails)[number]): number => {
          const hidden = Boolean(ch.statistics?.hiddenSubscriberCount);
          const subs = !hidden && ch.statistics?.subscriberCount ? Number(ch.statistics.subscriberCount) : null;
          const inRange =
            subs !== null &&
            subs >= cp.criteria.minFollowers &&
            subs <= cp.criteria.maxFollowers;
          const countryUpper = (ch.snippet?.country ?? '').toUpperCase();
          const isIndia = countryUpper === 'IN' || countryUpper === 'IND' || countryUpper === 'INDIA';
          if (inRange && isIndia) return 4;
          if (inRange) return 3;
          if (subs === null) return 2;
          return 1;
        };
        return rankChannel(b) - rankChannel(a);
      });

    const batchSize = Math.max(4, opts.concurrency ?? 5);
    let stoppedByBudget = false;

    for (let i = 0; i < dedupedChannels.length; i += batchSize) {
      if (opts.hasDbRun && (await isRunCancelled(opts.runId))) break;
      if (cp.stats.processedCount >= cp.targetCount) break;
      if (isNearTimeBudget()) {
        stoppedByBudget = true;
        break;
      }

      const slice = dedupedChannels
        .slice(i, i + batchSize)
        .slice(0, Math.max(0, cp.targetCount - cp.stats.processedCount));

      await mapWithConcurrency(slice, opts.concurrency ?? 5, async (ch) => {
        if (isNearTimeBudget()) {
          stoppedByBudget = true;
          return;
        }

        try {
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

          const knownOutOfRange =
            subscriberCount !== null &&
            (subscriberCount < cp.criteria.minFollowers || subscriberCount > cp.criteria.maxFollowers);

          let recentVideos: VideoMetricSample[] = [];
          const uploadsPlaylistId = ch.contentDetails?.relatedPlaylists?.uploads;

          if (
            !knownOutOfRange &&
            uploadsPlaylistId &&
            cp.stats.quotaUsed + 2 <= MAX_QUOTA_UNITS_PER_RUN
          ) {
            try {
              cp.stats.quotaUsed += STANDARD_READ_QUOTA_COST;
              const plRes = await fetchYouTubeJson<YouTubePlaylistItemsResponse>(
                'playlistItems',
                {
                  part: 'snippet',
                  playlistId: uploadsPlaylistId,
                  maxResults: '8',
                },
                opts.apiKey
              );

              const videoIds = (plRes.items ?? [])
                .map((it) => it.snippet?.resourceId?.videoId)
                .filter((vid): vid is string => Boolean(vid));

              if (videoIds.length > 0 && cp.stats.quotaUsed + 1 <= MAX_QUOTA_UNITS_PER_RUN) {
                cp.stats.quotaUsed += STANDARD_READ_QUOTA_COST;
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
                  likeCount:
                    v.statistics?.likeCount !== undefined
                      ? Number(v.statistics.likeCount)
                      : null,
                  commentCount:
                    v.statistics?.commentCount !== undefined
                      ? Number(v.statistics.commentCount)
                      : null,
                }));
              }
            } catch {
              // Keep channel record safely even if upload sampling fails
            }
          }

          const engagement = knownOutOfRange
            ? {
                platform: 'youtube' as const,
                available: false,
                availabilityStatus: 'unavailable' as const,
                engagementRate: null,
                sampleSize: 0,
                avgLikes: 0,
                avgComments: 0,
                formulaVersion: 'v1_public_likes_comments_over_subs',
                formulaDescription: '((avg_likes + avg_comments) / subscriber_count) * 100',
                metricsUsed: ['likeCount', 'commentCount', 'subscriberCount'],
                label: 'Estimated Public Engagement',
                calculatedAt: retrievedAt,
                reasonIfUnavailable: 'Skipped video sampling (outside campaign follower range)',
              }
            : calculateEstimatedPublicEngagement({
                subscriberCount,
                hiddenSubscriberCount: hiddenSubs,
                videos: recentVideos,
              });

          const contact = await enrichCreatorPublicContact({
            description,
            fetchWebsite: cp.fetchWebsites,
          });

          const evaluation = evaluateCreatorQualification(
            {
              name: title,
              description,
              recentVideoTitles: recentVideos.map((v) => v.title),
              country: ch.snippet?.country ?? null,
              subscriberCount,
              engagementRate: engagement.engagementRate,
              engagementSampleSize: engagement.sampleSize,
              contactEmail: contact.contactEmail,
              platform: 'youtube',
            },
            cp.criteria
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
              : engagement.reasonIfUnavailable || 'Unavailable',
            niche: evaluation.nicheMatched ? 'Beauty & Skincare' : 'General / Unmatched',
            content_themes: evaluation.detectedThemes,
            contact_email: contact.contactEmail ?? 'Not Found',
            email_status: contact.emailStatus,
            website: contact.website,
            audience_age: 'Not Available',
            audience_gender: 'Not Available',
            audience_geography: evaluation.verifiedCountry ?? 'Not Available',
            country: evaluation.verifiedCountry ?? null,
            data_source: 'youtube_data_api_v3',
            last_verified_at: contact.contactEmail ? retrievedAt : null,
            updated_at: retrievedAt,
          };

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
              engagementMeta: {
                platform: engagement.platform,
                formulaVersion: engagement.formulaVersion,
                formulaDescription: engagement.formulaDescription,
                metricsUsed: engagement.metricsUsed,
                sampleSize: engagement.sampleSize,
                avgLikes: engagement.avgLikes,
                avgComments: engagement.avgComments,
                availabilityStatus: engagement.availabilityStatus,
                calculatedAt: engagement.calculatedAt,
                reasonIfUnavailable: engagement.reasonIfUnavailable ?? null,
              },
              emailSource: contact.emailSourceUrl ?? contact.emailSource,
              emailProvenanceStatus: contact.emailProvenanceStatus,
              emailVerificationNote: contact.emailVerificationNote,
              geographyStatus: evaluation.geographyStatus,
              geographyVerification: evaluation.geographyVerification,
              classificationCode: evaluation.classificationCode,
              fitScoreBreakdown: evaluation.fitScoreBreakdown,
              evaluatedAt: evaluation.evaluatedAt,
              enrichmentStatus: contact.contactEmail || contact.website ? 'partial' : 'pending',
              recentVideoTitles: recentVideos.map((v) => v.title).slice(0, 5),
              contactChannels: contact.discoveredChannels,
            },
          };

          let savedInfRow: Database['public']['Tables']['influencers']['Row'] | null = null;
          let savedLinkRow: Database['public']['Tables']['campaign_influencers']['Row'] | null =
            null;

          if (admin) {
            try {
              const { data: upsertedExt, error: upsertErr } = await admin
                .from('influencers')
                .upsert(extendedPayload, { onConflict: 'platform,profile_url' })
                .select('*')
                .single();

              if (upsertErr) {
                const { data: upsertedBase, error: baseErr } = await admin
                  .from('influencers')
                  .upsert(baseInfluencerPayload, { onConflict: 'platform,profile_url' })
                  .select('*')
                  .single();
                if (!baseErr && upsertedBase) {
                  savedInfRow = upsertedBase;
                } else if (baseErr) {
                  persistenceWarning =
                    persistenceWarning ?? `Supabase influencer save warning: ${baseErr.message}`;
                }
              } else if (upsertedExt) {
                savedInfRow = upsertedExt;
              }

              if (savedInfRow) {
                savedInfluencerIds.push(savedInfRow.id);
                if (opts.campaignId) {
                  const { data: ciData, error: ciErr } = await admin
                    .from('campaign_influencers')
                    .upsert(
                      {
                        campaign_id: opts.campaignId,
                        influencer_id: savedInfRow.id,
                        qualification_status: evaluation.status,
                        qualification_reason: evaluation.reason,
                        source_run_id: opts.hasDbRun ? opts.runId : null,
                        review_state:
                          evaluation.status === 'needs_review'
                            ? 'pending_country_review'
                            : 'evaluated',
                      },
                      { onConflict: 'campaign_id,influencer_id' }
                    )
                    .select('*')
                    .single();
                  if (ciErr) {
                    const { data: fallbackCi } = await admin
                      .from('campaign_influencers')
                      .upsert(
                        {
                          campaign_id: opts.campaignId,
                          influencer_id: savedInfRow.id,
                          qualification_status:
                            evaluation.status === 'needs_review'
                              ? 'discovered'
                              : evaluation.status,
                          qualification_reason: evaluation.reason,
                        },
                        { onConflict: 'campaign_id,influencer_id' }
                      )
                      .select('*')
                      .single();
                    savedLinkRow = fallbackCi ?? null;
                  } else {
                    savedLinkRow = ciData ?? null;
                  }
                }
              }
            } catch (dbErr) {
              persistenceWarning =
                persistenceWarning ??
                (dbErr instanceof Error
                  ? `Supabase persistence warning: ${dbErr.message}`
                  : 'Supabase persistence warning.');
            }
          }

          const syntheticId = savedInfRow?.id ?? crypto.randomUUID();
          const finalInfRow: Database['public']['Tables']['influencers']['Row'] = savedInfRow ?? {
            id: syntheticId,
            owner_id: null,
            name: baseInfluencerPayload.name,
            platform: 'youtube',
            profile_url: baseInfluencerPayload.profile_url,
            username: baseInfluencerPayload.username ?? null,
            follower_count: baseInfluencerPayload.follower_count ?? null,
            engagement_rate: baseInfluencerPayload.engagement_rate ?? null,
            engagement_source: baseInfluencerPayload.engagement_source ?? null,
            niche: baseInfluencerPayload.niche ?? null,
            content_themes: baseInfluencerPayload.content_themes ?? [],
            contact_email: baseInfluencerPayload.contact_email ?? 'Not Found',
            email_status: baseInfluencerPayload.email_status ?? 'not_found',
            website: baseInfluencerPayload.website ?? null,
            audience_age: baseInfluencerPayload.audience_age ?? 'Not Available',
            audience_gender: baseInfluencerPayload.audience_gender ?? 'Not Available',
            audience_geography: baseInfluencerPayload.audience_geography ?? 'Not Available',
            country: baseInfluencerPayload.country ?? null,
            data_source: 'youtube_data_api_v3',
            last_verified_at: baseInfluencerPayload.last_verified_at ?? null,
            profile_description: extendedPayload.profile_description ?? null,
            profile_image_url: extendedPayload.profile_image_url ?? null,
            source_retrieved_at: retrievedAt,
            engagement_sample_size: engagement.sampleSize,
            engagement_calculated_at: engagement.calculatedAt,
            fit_score: evaluation.fitScore,
            is_top_pick: false,
            source_metadata: extendedPayload.source_metadata ?? {},
            created_at: retrievedAt,
            updated_at: retrievedAt,
          };

          const finalLinkRow: Database['public']['Tables']['campaign_influencers']['Row'] | null =
            savedLinkRow ?? {
              id: crypto.randomUUID(),
              campaign_id: opts.campaignId ?? 'transient',
              influencer_id: finalInfRow.id,
              qualification_status: evaluation.status,
              qualification_reason: evaluation.reason,
              added_at: retrievedAt,
            };

          collectedCreators.push({
            influencer: finalInfRow,
            campaignInfluencer: finalLinkRow,
            emailMessage: null,
            instagramDmMessage: null,
            linkedinMessage: null,
            youtubeContactMessage: null,
            latestOutreachLog: null,
          });

          cp.processedChannelIds.push(ch.id);
          cp.stats.processedCount += 1;
          if (evaluation.status === 'qualified') cp.stats.qualifiedCount += 1;
          else if (evaluation.status === 'needs_review') cp.stats.needsReviewCount += 1;
          else cp.stats.rejectedCount += 1;
        } catch {
          cp.failedChannelIds.push(ch.id);
          cp.stats.failureCount += 1;
        }
      });

      const progressPct = Math.min(
        95,
        Math.max(15, Math.round((cp.stats.processedCount / Math.max(1, cp.targetCount)) * 100))
      );

      await updateRunSafely({
        profiles_found: cp.stats.processedCount,
        candidate_count: cp.stats.candidateCount,
        qualified_count: cp.stats.qualifiedCount,
        rejected_count: cp.stats.rejectedCount,
        needs_review_count: cp.stats.needsReviewCount,
        failure_count: cp.stats.failureCount,
        quota_used: cp.stats.quotaUsed,
        progress_percent: progressPct,
        last_heartbeat_at: new Date().toISOString(),
        params: { checkpoint: cp },
      });
    }

    if (admin) {
      await refreshTopPicksForCampaign(opts.campaignId);
    }

    let verifiedCount = 0;
    if (admin && savedInfluencerIds.length > 0) {
      try {
        const { data: readBackRows } = await admin
          .from('influencers')
          .select('id')
          .in('id', savedInfluencerIds);
        verifiedCount = readBackRows?.length ?? 0;
      } catch {
        verifiedCount = 0;
      }
    }

    const remainingAfterPass = cp.candidateChannelIds.filter(
      (cid) => !cp.processedChannelIds.includes(cid) && !cp.failedChannelIds.includes(cid)
    );

    const shouldMarkPartial =
      Boolean(admin && opts.hasDbRun) &&
      stoppedByBudget &&
      cp.stats.processedCount < cp.targetCount &&
      remainingAfterPass.length > 0;

    if (shouldMarkPartial) {
      await updateRunSafely({
        status: 'partial',
        profiles_found: cp.stats.processedCount,
        candidate_count: cp.stats.candidateCount,
        qualified_count: cp.stats.qualifiedCount,
        rejected_count: cp.stats.rejectedCount,
        needs_review_count: cp.stats.needsReviewCount,
        failure_count: cp.stats.failureCount,
        quota_used: cp.stats.quotaUsed,
        progress_percent: Math.min(
          95,
          Math.max(20, Math.round((cp.stats.processedCount / Math.max(1, cp.targetCount)) * 100))
        ),
        last_heartbeat_at: new Date().toISOString(),
        params: { checkpoint: cp },
      });
    } else if (cp.stats.processedCount === 0) {
      await updateRunSafely({
        status: 'failed',
        profiles_found: 0,
        candidate_count: cp.stats.candidateCount,
        failure_count: cp.stats.failureCount,
        quota_used: cp.stats.quotaUsed,
        progress_percent: 100,
        error_message: 'No creator profiles could be retrieved during YouTube discovery.',
        completed_at: new Date().toISOString(),
        params: { checkpoint: cp },
      });
    } else {
      await updateRunSafely({
        status: 'completed',
        profiles_found: cp.stats.processedCount,
        candidate_count: cp.stats.candidateCount,
        qualified_count: cp.stats.qualifiedCount,
        rejected_count: cp.stats.rejectedCount,
        needs_review_count: cp.stats.needsReviewCount,
        failure_count: cp.stats.failureCount,
        quota_used: cp.stats.quotaUsed,
        progress_percent: 100,
        completed_at: new Date().toISOString(),
        params: { checkpoint: cp },
      });
    }

    const persisted = Boolean(
      admin && (collectedCreators.length === 0 || (verifiedCount === collectedCreators.length && !persistenceWarning))
    );

    return {
      run: currentRunRecord,
      creators: collectedCreators,
      persistence: {
        persisted,
        savedCount: savedInfluencerIds.length,
        verifiedCount,
        warning: persisted ? null : persistenceWarning,
      },
      stats: {
        rawCount: cp.stats.candidateCount,
        uniqueCount: cp.candidateChannelIds.length,
        duplicateCount: Math.max(0, dedupedChannels.length < channelDetails.length ? channelDetails.length - dedupedChannels.length : 0),
        qualifiedCount: cp.stats.qualifiedCount,
        needsReviewCount: cp.stats.needsReviewCount,
        rejectedCount: cp.stats.rejectedCount,
        persistedCount: verifiedCount,
        persistenceFailureCount: Math.max(0, collectedCreators.length - verifiedCount),
      },
    };
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : 'Unexpected failure during YouTube discovery.';
    await updateRunSafely({
      status: cp.stats.processedCount > 0 ? 'partial' : 'failed',
      profiles_found: cp.stats.processedCount,
      candidate_count: cp.stats.candidateCount,
      qualified_count: cp.stats.qualifiedCount,
      rejected_count: cp.stats.rejectedCount,
      needs_review_count: cp.stats.needsReviewCount,
      failure_count: cp.stats.failureCount,
      quota_used: cp.stats.quotaUsed,
      progress_percent:
        cp.stats.processedCount > 0
          ? Math.min(95, Math.round((cp.stats.processedCount / Math.max(1, cp.targetCount)) * 100))
          : 100,
      error_message: msg,
      completed_at: cp.stats.processedCount > 0 ? null : new Date().toISOString(),
      params: { checkpoint: cp },
    });

    if (collectedCreators.length > 0) {
      return {
        run: currentRunRecord,
        creators: collectedCreators,
        persistence: {
          persisted: savedInfluencerIds.length > 0,
          savedCount: savedInfluencerIds.length,
          verifiedCount: savedInfluencerIds.length,
          warning: persistenceWarning ?? msg,
        },
      };
    }

    throw err;
  }
}
