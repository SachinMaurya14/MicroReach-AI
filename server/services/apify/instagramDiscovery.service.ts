import crypto from 'node:crypto';
import { getServerConfig } from '../../config/env.ts';
import { getSupabaseAdmin } from '../../lib/supabaseAdmin.ts';
import { AppHttpError } from '../../middleware/errorHandler.ts';
import type {
  ContactChannelRecord,
  Database,
  QualificationStatusDb,
} from '../../../src/types/database.ts';
import { enrichCreatorPublicContact } from '../enrichment/emailEnrichment.service.ts';
import { extractPublicContactChannelsFromText } from '../outreach/multiChannel.service.ts';
import {
  calculateInstagramPostEngagement,
  evaluateCreatorQualification,
  type InstagramPostMetricSample,
  normalizeVerifiedProfileCountry,
  type GeographyVerificationLabel,
} from '../filtering/qualification.service.ts';
import {
  recordAuditLog,
  type WorkspaceCreatorDetail,
} from '../supabase/sharedWorkspace.service.ts';

const ACTOR_ID = 'apify~instagram-search-scraper';
const PROFILE_ENRICH_ACTOR_ID = 'apify~instagram-profile-scraper';
const APIFY_BASE = 'https://api.apify.com/v2';

const DEFAULT_INSTAGRAM_QUERIES = [
  'indian skincare creators',
  'indian skincare reviews',
  'sunscreen review india',
  'acne care india',
  'affordable skincare india',
  'skincare routine india',
];

const INDIA_TEXT_RE =
  /\b(india|indian|mumbai|delhi|bangalore|bengaluru|hyderabad|chennai|kolkata|pune|jaipur|ahmedabad|chandigarh|kochi|lucknow|indore|surat|noida|gurgaon|gurugram)\b/i;

export interface DiscoveryStatsSummary {
  rawCount: number;
  uniqueCount: number;
  duplicateCount: number;
  qualifiedCount: number;
  needsReviewCount: number;
  rejectedCount: number;
  persistedCount: number;
  persistenceFailureCount: number;
}

export interface InstagramDiscoveryPersistence {
  persisted: boolean;
  savedCount: number;
  verifiedCount: number;
  warning: string | null;
}

export interface InstagramDiscoveryResult {
  run: Database['public']['Tables']['discovery_runs']['Row'];
  creators: WorkspaceCreatorDetail[];
  savedCount: number;
  persistence: InstagramDiscoveryPersistence;
  stats: DiscoveryStatsSummary;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseFiniteNumber(val: unknown): number | null {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string' && val.trim() !== '') {
    const cleaned = val.replace(/,/g, '').trim();
    const num = Number(cleaned);
    if (Number.isFinite(num)) return num;
  }
  return null;
}

function buildInstagramQueries(input: {
  queries?: string[];
  niche?: string;
  targetCountry?: string | null;
  targetCount?: number;
}): string[] {
  if (Array.isArray(input.queries) && input.queries.length > 0) {
    return input.queries.map((q) => q.trim()).filter(Boolean).slice(0, 4);
  }

  const niche = (input.niche || '').trim();
  const country = (input.targetCountry || '').trim();
  const desiredCount = Number(input.targetCount || 15);
  const queryLimit = desiredCount > 15 ? 3 : 2;

  if (niche && niche.toLowerCase() !== 'all') {
    const lowerNiche = niche.toLowerCase();
    const countryPart = country && country.toLowerCase() !== 'all' ? ` ${country.toLowerCase()}` : '';
    if (lowerNiche.includes('skincare') || lowerNiche.includes('beauty')) {
      return DEFAULT_INSTAGRAM_QUERIES.slice(0, queryLimit);
    }
    return [
      `${lowerNiche}${countryPart}`.trim(),
      `${lowerNiche} creator${countryPart}`.trim(),
    ].slice(0, queryLimit);
  }

  if (country && country.toLowerCase() !== 'all') {
    return [`skincare ${country.toLowerCase()}`, `beauty creator ${country.toLowerCase()}`].slice(
      0,
      queryLimit
    );
  }

  return DEFAULT_INSTAGRAM_QUERIES.slice(0, queryLimit);
}

async function pollApifyRunUntilDone(
  runId: string,
  apifyToken: string,
  maxWaitMs = 35_000
): Promise<{ status: string; defaultDatasetId?: string }> {
  const started = Date.now();
  let lastStatus = 'RUNNING';
  let datasetId: string | undefined;

  while (Date.now() - started < maxWaitMs) {
    const statusRes = await fetch(`${APIFY_BASE}/actor-runs/${encodeURIComponent(runId)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apifyToken}`,
        Accept: 'application/json',
      },
    });

    if (!statusRes.ok) {
      throw new AppHttpError(
        502,
        'apify_status_failed',
        `Failed to poll Apify run status (${statusRes.status}).`
      );
    }

    const statusJson = (await statusRes.json()) as {
      data?: { status?: string; defaultDatasetId?: string };
    };
    lastStatus = statusJson.data?.status ?? 'UNKNOWN';
    datasetId = statusJson.data?.defaultDatasetId ?? datasetId;

    if (lastStatus === 'SUCCEEDED') {
      return { status: lastStatus, defaultDatasetId: datasetId };
    }
    if (lastStatus === 'FAILED' || lastStatus === 'ABORTED' || lastStatus === 'TIMED-OUT') {
      throw new AppHttpError(
        502,
        'apify_run_failed',
        `Apify Instagram scraper run ${runId} ended with status ${lastStatus}.`
      );
    }

    await sleep(2200);
  }

  throw new AppHttpError(
    504,
    'apify_run_timeout',
    `Apify Instagram scraper run ${runId} did not finish within ${Math.round(maxWaitMs / 1000)}s (last status: ${lastStatus}).`
  );
}

async function runSingleApifySearchQuery(
  searchTerm: string,
  searchLimit: number,
  apifyToken: string
): Promise<{
  apifyRunId: string;
  datasetId: string;
  items: Array<Record<string, unknown>>;
}> {
  const startUrl = `${APIFY_BASE}/acts/${ACTOR_ID}/runs?waitForFinish=25`;
  const startRes = await fetch(startUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apifyToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      search: searchTerm,
      searchType: 'user',
      searchLimit,
    }),
  });

  if (!startRes.ok) {
    const errText = await startRes.text().catch(() => '');
    throw new AppHttpError(
      502,
      'apify_start_failed',
      `Failed to start Apify Instagram search scraper (${startRes.status}): ${errText.slice(0, 200)}`
    );
  }

  const startJson = (await startRes.json()) as {
    data?: { id?: string; defaultDatasetId?: string; status?: string };
  };
  const apifyRunId = startJson.data?.id;
  let datasetId = startJson.data?.defaultDatasetId;
  let actorStatus = startJson.data?.status ?? 'RUNNING';

  if (!apifyRunId || !datasetId) {
    throw new AppHttpError(
      502,
      'apify_invalid_response',
      'Apify run did not return a run ID or dataset ID.'
    );
  }

  if (actorStatus !== 'SUCCEEDED') {
    if (actorStatus === 'FAILED' || actorStatus === 'ABORTED' || actorStatus === 'TIMED-OUT') {
      throw new AppHttpError(
        502,
        'apify_run_failed',
        `Apify Instagram scraper run ${apifyRunId} ended with status ${actorStatus}.`
      );
    }

    const finalState = await pollApifyRunUntilDone(apifyRunId, apifyToken, 30_000);
    actorStatus = finalState.status;
    datasetId = finalState.defaultDatasetId ?? datasetId;
  }

  const datasetUrl = `${APIFY_BASE}/datasets/${encodeURIComponent(datasetId)}/items?clean=true&format=json`;
  const dataRes = await fetch(datasetUrl, {
    headers: {
      Authorization: `Bearer ${apifyToken}`,
      Accept: 'application/json',
    },
  });

  if (!dataRes.ok) {
    throw new AppHttpError(
      502,
      'apify_dataset_fetch_failed',
      'Failed to retrieve Instagram dataset results from Apify.'
    );
  }

  const items = (await dataRes.json()) as Array<Record<string, unknown>>;
  return { apifyRunId, datasetId, items: Array.isArray(items) ? items : [] };
}

function parseInstagramPostsFromItem(item: Record<string, unknown>): InstagramPostMetricSample[] {
  const rawPosts = Array.isArray(item.latestPosts)
    ? item.latestPosts
    : Array.isArray(item.posts)
      ? item.posts
      : [];
  const parsed: InstagramPostMetricSample[] = [];
  for (const raw of rawPosts.slice(0, 12)) {
    if (!raw || typeof raw !== 'object') continue;
    const p = raw as Record<string, unknown>;
    const likes = parseFiniteNumber(p.likesCount ?? p.likeCount ?? p.likes);
    const comments = parseFiniteNumber(p.commentsCount ?? p.commentCount ?? p.comments);
    const caption = typeof p.caption === 'string' ? p.caption.trim() : '';
    const postId = typeof p.id === 'string' ? p.id : typeof p.shortCode === 'string' ? p.shortCode : undefined;
    parsed.push({
      postId,
      caption,
      likeCount: likes,
      commentCount: comments,
      publishedAt: typeof p.timestamp === 'string' ? p.timestamp : undefined,
    });
  }
  return parsed;
}

async function enrichInstagramProfilesWithPosts(
  usernames: string[],
  apifyToken: string
): Promise<Map<string, Record<string, unknown>>> {
  const result = new Map<string, Record<string, unknown>>();
  const unique = Array.from(new Set(usernames.map((u) => u.toLowerCase().trim()).filter(Boolean))).slice(
    0,
    10
  );
  if (unique.length === 0) return result;

  try {
    const startUrl = `${APIFY_BASE}/acts/${PROFILE_ENRICH_ACTOR_ID}/runs?waitForFinish=25`;
    const startRes = await fetch(startUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apifyToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ usernames: unique }),
    });
    if (!startRes.ok) return result;
    const startJson = (await startRes.json()) as {
      data?: { id?: string; defaultDatasetId?: string; status?: string };
    };
    const apifyRunId = startJson.data?.id;
    let datasetId = startJson.data?.defaultDatasetId;
    const actorStatus = startJson.data?.status ?? 'RUNNING';
    if (!apifyRunId || !datasetId) return result;

    if (actorStatus !== 'SUCCEEDED') {
      if (actorStatus === 'FAILED' || actorStatus === 'ABORTED' || actorStatus === 'TIMED-OUT') {
        return result;
      }
      const finalState = await pollApifyRunUntilDone(apifyRunId, apifyToken, 20_000);
      datasetId = finalState.defaultDatasetId ?? datasetId;
    }

    const dataRes = await fetch(
      `${APIFY_BASE}/datasets/${encodeURIComponent(datasetId)}/items?clean=true&format=json`,
      {
        headers: {
          Authorization: `Bearer ${apifyToken}`,
          Accept: 'application/json',
        },
      }
    );
    if (!dataRes.ok) return result;
    const items = (await dataRes.json()) as Array<Record<string, unknown>>;
    if (!Array.isArray(items)) return result;
    for (const item of items) {
      const uname =
        typeof item.username === 'string'
          ? item.username.trim().replace(/^@/, '').toLowerCase()
          : '';
      if (uname) result.set(uname, item);
    }
  } catch {
    // Profile post enrichment is best-effort; fallback preserves engagementRate = null -> REVIEW_REQUIRED
  }
  return result;
}

export async function startInstagramDiscoveryRun(input: {
  campaignId?: string;
  queries?: string[];
  targetCount?: number;
  minFollowers?: number;
  maxFollowers?: number;
  minEngagementRate?: number;
  targetCountry?: string | null;
  niche?: string;
}): Promise<InstagramDiscoveryResult> {
  const cfg = getServerConfig();
  if (!cfg.apifyToken) {
    throw new AppHttpError(
      503,
      'apify_not_configured',
      'Apify integration requires APIFY_TOKEN configuration.'
    );
  }

  const admin = getSupabaseAdmin();
  let campaignId = input.campaignId ?? null;
  let minFollowers = input.minFollowers;
  let maxFollowers = input.maxFollowers;
  let minEngagementRate = input.minEngagementRate;
  let targetCountry = input.targetCountry;
  let niche = input.niche;

  if (admin) {
    try {
      const campaignQuery = campaignId
        ? admin.from('campaigns').select('*').eq('id', campaignId).single()
        : admin.from('campaigns').select('*').order('created_at', { ascending: false }).limit(1).single();
      const { data: camp } = await campaignQuery;
      if (camp) {
        campaignId = camp.id;
        minFollowers = minFollowers ?? camp.min_followers ?? 5000;
        maxFollowers = maxFollowers ?? camp.max_followers ?? 100000;
        minEngagementRate =
          minEngagementRate ?? Number(camp.min_engagement_rate ?? 2.0);
        targetCountry = targetCountry === undefined ? camp.target_country ?? 'India' : targetCountry;
        niche = niche ?? camp.niche ?? 'Beauty & Skincare';
      }
    } catch {
      // Proceed cleanly with explicit/default criteria
    }
  }

  minFollowers = minFollowers ?? 5000;
  maxFollowers = maxFollowers ?? 100000;
  minEngagementRate = minEngagementRate ?? 2.0;
  targetCountry = targetCountry === undefined ? 'India' : targetCountry;
  niche = niche ?? 'Beauty & Skincare';

  const targetCount = Math.min(30, Math.max(5, Number(input.targetCount || 15)));
  const queries = buildInstagramQueries({
    queries: input.queries,
    niche,
    targetCountry,
    targetCount,
  });

  let dbRunId: string = crypto.randomUUID();
  let dbRunRow: Database['public']['Tables']['discovery_runs']['Row'] | null = null;
  let persistenceWarning: string | null = admin
    ? null
    : 'Supabase server backend is not configured (set SUPABASE_URL and SUPABASE_SECRET_KEY). Showing live Apify Instagram results without database persistence.';

  if (admin) {
    try {
      const { data: createdRun, error: runInsertErr } = await admin
        .from('discovery_runs')
        .insert({
          campaign_id: campaignId,
          platform: 'instagram',
          search_query: queries.join(' | '),
          status: 'running',
          profiles_found: 0,
          params: { queries, targetCount, minFollowers, maxFollowers },
        })
        .select()
        .single();

      if (runInsertErr || !createdRun) {
        persistenceWarning = `Supabase discovery run record could not be created: ${runInsertErr?.message || 'unknown error'}`;
      } else {
        dbRunRow = createdRun;
        dbRunId = createdRun.id;
      }
    } catch (err) {
      persistenceWarning =
        err instanceof Error
          ? `Supabase discovery run initialization failed: ${err.message}`
          : 'Supabase discovery run initialization failed.';
    }
  }

  const startedAtMs = Date.now();
  const apifyRunsMeta: Array<{ query: string; apifyRunId: string; datasetId: string; count: number }> = [];
  const allTaggedItems: Array<{ query: string; item: Record<string, unknown> }> = [];
  const perQueryLimit = Math.min(20, Math.max(8, Math.ceil(targetCount / Math.max(1, queries.length)) + 4));

  try {
    for (const q of queries) {
      if (allTaggedItems.length >= targetCount + 12) break;
      if (Date.now() - startedAtMs > 46_000) break;

      const queryRun = await runSingleApifySearchQuery(q, perQueryLimit, cfg.apifyToken);
      apifyRunsMeta.push({
        query: q,
        apifyRunId: queryRun.apifyRunId,
        datasetId: queryRun.datasetId,
        count: queryRun.items.length,
      });
      for (const item of queryRun.items) {
        allTaggedItems.push({ query: q, item });
      }
    }
  } catch (err) {
    if (allTaggedItems.length === 0) {
      if (admin && dbRunRow) {
        await admin
          .from('discovery_runs')
          .update({
            status: 'failed',
            error_message: err instanceof Error ? err.message : 'Apify Instagram discovery failed.',
            completed_at: new Date().toISOString(),
          })
          .eq('id', dbRunRow.id);
      }
      throw err;
    }
    persistenceWarning =
      persistenceWarning ??
      (err instanceof Error ? `Partial Apify run warning: ${err.message}` : null);
  }

  // Identify in-range candidates that lack latestPosts so we can enrich their recent post metrics via profile scraper
  const inRangeCandidatesForPosts: string[] = [];
  const previewSeen = new Set<string>();
  for (const { item } of allTaggedItems) {
    const rawU =
      typeof item.username === 'string'
        ? item.username
        : typeof item.ownerUsername === 'string'
          ? item.ownerUsername
          : '';
    const uKey = rawU.trim().replace(/^@/, '').toLowerCase();
    if (!uKey || previewSeen.has(uKey)) continue;
    previewSeen.add(uKey);
    const fCount =
      parseFiniteNumber(item.followersCount) ??
      parseFiniteNumber(item.followers) ??
      parseFiniteNumber(item.edgeFollowedByCount);
    const hasPosts = parseInstagramPostsFromItem(item).length > 0;
    if (!hasPosts && (fCount === null || (fCount >= minFollowers && fCount <= maxFollowers))) {
      inRangeCandidatesForPosts.push(uKey);
    }
  }

  const enrichedProfilesByUsername =
    inRangeCandidatesForPosts.length > 0 && Date.now() - startedAtMs < 40_000
      ? await enrichInstagramProfilesWithPosts(inRangeCandidatesForPosts, cfg.apifyToken)
      : new Map<string, Record<string, unknown>>();

  const retrievedAt = new Date().toISOString();
  const seenUsernames = new Set<string>();
  const discoveredCreators: WorkspaceCreatorDetail[] = [];
  const savedInfluencerIds: string[] = [];
  let rawCount = allTaggedItems.length;
  let duplicateCount = 0;
  let qualifiedCount = 0;
  let needsReviewCount = 0;
  let rejectedCount = 0;
  let persistenceFailureCount = 0;

  for (const { query, item: searchItem } of allTaggedItems) {
    const rawUsername =
      typeof searchItem.username === 'string'
        ? searchItem.username
        : typeof searchItem.ownerUsername === 'string'
          ? searchItem.ownerUsername
          : '';
    const username = rawUsername.trim().replace(/^@/, '');
    if (!username) {
      rawCount = Math.max(0, rawCount - 1);
      continue;
    }
    const usernameKey = username.toLowerCase();
    if (seenUsernames.has(usernameKey)) {
      duplicateCount += 1;
      continue;
    }
    seenUsernames.add(usernameKey);

    if (discoveredCreators.length >= targetCount) {
      continue;
    }

    const richItem = enrichedProfilesByUsername.get(usernameKey);
    const item: Record<string, unknown> = richItem ? { ...searchItem, ...richItem } : searchItem;

    const fullName =
      typeof item.fullName === 'string' && item.fullName.trim()
        ? item.fullName.trim()
        : typeof item.name === 'string' && item.name.trim()
          ? item.name.trim()
          : username;

    const profileUrl = `https://www.instagram.com/${usernameKey}`;

    const followersCount =
      parseFiniteNumber(item.followersCount) ??
      parseFiniteNumber(item.followers) ??
      parseFiniteNumber(item.edgeFollowedByCount);

    const biography =
      typeof item.biography === 'string'
        ? item.biography.trim()
        : typeof item.bio === 'string'
          ? item.bio.trim()
          : '';

    const profilePicUrl =
      typeof item.profilePicUrl === 'string'
        ? item.profilePicUrl
        : typeof item.profilePicUrlHD === 'string'
          ? item.profilePicUrlHD
          : typeof item.profilePic === 'string'
            ? item.profilePic
            : null;

    const externalUrl =
      typeof item.externalUrl === 'string' && item.externalUrl.trim()
        ? item.externalUrl.trim()
        : null;

    const directEmail =
      typeof item.publicEmail === 'string' && item.publicEmail.includes('@')
        ? item.publicEmail.trim()
        : typeof item.email === 'string' && item.email.includes('@')
          ? item.email.trim()
          : null;

    const enrichedContact = directEmail
      ? {
          contactEmail: directEmail,
          emailStatus: 'unverified' as const,
          emailProvenanceStatus: 'Found Publicly' as const,
          emailVerificationNote:
            'Returned in public Apify Instagram profile business contact payload (syntax valid; deliverability unverified)',
          website: externalUrl,
          emailSource: 'instagram_public_profile',
          emailSourceUrl: profileUrl,
          discoveredChannels: [
            {
              type: 'email' as const,
              value: directEmail,
              url: `mailto:${directEmail}`,
              source: 'instagram_public_profile',
              sourceUrl: profileUrl,
              verificationStatus: 'found_publicly' as const,
              linkingConfidence: 'explicit_link' as const,
              evidence: 'Returned in public Apify Instagram business payload',
              discoveredAt: retrievedAt,
            },
            ...extractPublicContactChannelsFromText({
              text: `${biography}\n${externalUrl ?? ''}`,
              sourceLabel: 'instagram_public_profile',
              sourceUrl: profileUrl,
              discoveredAt: retrievedAt,
            }),
          ] as ContactChannelRecord[],
        }
      : await enrichCreatorPublicContact({
          description: biography,
          explicitWebsite: externalUrl,
          fetchWebsite: false,
          platform: 'instagram',
          profileUrl,
        });

    const isVerified = Boolean(item.verified || item.isVerified);
    const categoryName =
      typeof item.businessCategoryName === 'string' ? item.businessCategoryName.trim() : '';

    // Distinguish explicit structured country/location metadata vs bio text hints vs Unknown
    const structuredCountry = normalizeVerifiedProfileCountry(
      typeof item.country === 'string' ? item.country : null
    );
    const structuredCity = [
      typeof item.cityName === 'string' ? item.cityName.trim() : '',
      typeof item.locationName === 'string' ? item.locationName.trim() : '',
    ]
      .filter(Boolean)
      .join(' ');
    const structuredIndia = structuredCountry === 'India' || INDIA_TEXT_RE.test(structuredCity);
    const resolvedCountry = structuredIndia ? 'India' : structuredCountry;

    const recentPosts = parseInstagramPostsFromItem(item);
    const postCaptions = recentPosts.map((p) => p.caption || '').filter(Boolean);
    const igEngagement = calculateInstagramPostEngagement({
      followerCount: followersCount,
      posts: recentPosts,
    });

    const evaluation = evaluateCreatorQualification(
      {
        name: fullName,
        description: `${biography} ${categoryName}`.trim(),
        recentVideoTitles: postCaptions,
        country: resolvedCountry,
        subscriberCount: followersCount,
        engagementRate: igEngagement.engagementRate,
        engagementSampleSize: igEngagement.sampleSize,
        contactEmail: enrichedContact.contactEmail,
        platform: 'instagram',
      },
      {
        minFollowers,
        maxFollowers,
        minEngagementRate,
        targetCountry,
        niche,
      }
    );

    const qualStatus: QualificationStatusDb = evaluation.status;
    const qualReason = evaluation.reason;
    if (qualStatus === 'qualified') qualifiedCount += 1;
    else if (qualStatus === 'needs_review') needsReviewCount += 1;
    else rejectedCount += 1;

    const geographyVerification: GeographyVerificationLabel = evaluation.geographyVerification;

    const contentThemes =
      evaluation.detectedThemes.length > 0
        ? evaluation.detectedThemes
        : [
            evaluation.nicheMatched ? (niche && niche !== 'All' ? niche : 'Beauty & Skincare') : 'General / Unmatched',
            categoryName || 'Instagram Creator',
          ];

    const influencerInsert: Database['public']['Tables']['influencers']['Insert'] = {
      owner_id: null,
      name: fullName.slice(0, 140),
      platform: 'instagram',
      profile_url: profileUrl,
      username,
      follower_count: followersCount,
      engagement_rate: igEngagement.engagementRate,
      engagement_source: igEngagement.available
        ? `${igEngagement.label} (${igEngagement.sampleSize} posts)`
        : igEngagement.reasonIfUnavailable || 'Unavailable (recent post metrics not returned)',
      engagement_sample_size: igEngagement.sampleSize,
      engagement_calculated_at: igEngagement.calculatedAt,
      niche: evaluation.nicheMatched
        ? (niche && niche !== 'All' ? niche : 'Beauty & Skincare')
        : 'General / Unmatched',
      content_themes: contentThemes,
      contact_email: enrichedContact.contactEmail ?? 'Not Found',
      email_status: enrichedContact.emailStatus,
      website: enrichedContact.website ?? externalUrl,
      audience_age: 'Not Available',
      audience_gender: 'Not Available',
      audience_geography: evaluation.verifiedCountry ?? 'Not Available',
      country: resolvedCountry,
      data_source: richItem ? 'apify_instagram_profile_scraper' : 'apify_instagram_search_scraper',
      profile_description: biography ? biography.slice(0, 2000) : null,
      profile_image_url: profilePicUrl,
      source_retrieved_at: retrievedAt,
      fit_score: evaluation.fitScore,
      is_top_pick: false,
      source_metadata: {
        apifyId: typeof item.id === 'string' ? item.id : null,
        isVerified,
        businessCategoryName: categoryName || null,
        searchQuery: query,
        geographyStatus: evaluation.geographyStatus,
        geographyVerification,
        classificationCode: evaluation.classificationCode,
        fitScoreBreakdown: evaluation.fitScoreBreakdown,
        evaluatedAt: evaluation.evaluatedAt,
        engagementMeta: {
          platform: igEngagement.platform,
          formulaVersion: igEngagement.formulaVersion,
          formulaDescription: igEngagement.formulaDescription,
          metricsUsed: igEngagement.metricsUsed,
          sampleSize: igEngagement.sampleSize,
          avgLikes: igEngagement.avgLikes,
          avgComments: igEngagement.avgComments,
          availabilityStatus: igEngagement.availabilityStatus,
          calculatedAt: igEngagement.calculatedAt,
          reasonIfUnavailable: igEngagement.reasonIfUnavailable ?? null,
        },
        recentVideoTitles: postCaptions.slice(0, 5),
        contactChannels: enrichedContact.discoveredChannels,
        emailSource: enrichedContact.emailSourceUrl ?? enrichedContact.emailSource,
        emailProvenanceStatus: enrichedContact.emailProvenanceStatus,
        emailVerificationNote: enrichedContact.emailVerificationNote,
        enrichmentStatus: enrichedContact.contactEmail ? 'enriched' : 'partial',
        enrichedAt: retrievedAt,
      },
      updated_at: retrievedAt,
    };

    let savedInfluencerRow: Database['public']['Tables']['influencers']['Row'] | null = null;
    let savedCampaignLinkRow: Database['public']['Tables']['campaign_influencers']['Row'] | null =
      null;

    if (admin) {
      try {
        const { data: upsertedInf, error: infErr } = await admin
          .from('influencers')
          .upsert(influencerInsert, { onConflict: 'platform,profile_url' })
          .select('*')
          .single();

        if (infErr) {
          persistenceFailureCount += 1;
          persistenceWarning =
            persistenceWarning ?? `Supabase influencer upsert warning: ${infErr.message}`;
        } else if (upsertedInf) {
          savedInfluencerRow = upsertedInf;
          savedInfluencerIds.push(upsertedInf.id);

          if (campaignId) {
            const { data: upsertedLink, error: linkErr } = await admin
              .from('campaign_influencers')
              .upsert(
                {
                  campaign_id: campaignId,
                  influencer_id: upsertedInf.id,
                  qualification_status: qualStatus,
                  qualification_reason: qualReason,
                  source_run_id: dbRunRow?.id ?? null,
                },
                { onConflict: 'campaign_id,influencer_id' }
              )
              .select('*')
              .single();
            if (linkErr) {
              const { data: fallbackLink } = await admin
                .from('campaign_influencers')
                .upsert(
                  {
                    campaign_id: campaignId,
                    influencer_id: upsertedInf.id,
                    qualification_status:
                      qualStatus === 'needs_review' ? 'discovered' : qualStatus,
                    qualification_reason: qualReason,
                  },
                  { onConflict: 'campaign_id,influencer_id' }
                )
                .select('*')
                .single();
              savedCampaignLinkRow = fallbackLink ?? null;
            } else {
              savedCampaignLinkRow = upsertedLink ?? null;
            }
          }
        }
      } catch (err) {
        persistenceFailureCount += 1;
        persistenceWarning =
          persistenceWarning ??
          (err instanceof Error ? `Supabase persistence warning: ${err.message}` : 'Supabase persistence warning.');
      }
    }

    const syntheticId = savedInfluencerRow?.id ?? crypto.randomUUID();
    const influencerRow: Database['public']['Tables']['influencers']['Row'] = savedInfluencerRow ?? {
      id: syntheticId,
      owner_id: null,
      name: influencerInsert.name,
      platform: 'instagram',
      profile_url: influencerInsert.profile_url,
      username: influencerInsert.username ?? null,
      follower_count: influencerInsert.follower_count ?? null,
      engagement_rate: null,
      engagement_source: influencerInsert.engagement_source ?? null,
      niche: influencerInsert.niche ?? null,
      content_themes: influencerInsert.content_themes ?? [],
      contact_email: influencerInsert.contact_email ?? 'Not Found',
      email_status: influencerInsert.email_status ?? 'not_found',
      website: influencerInsert.website ?? null,
      audience_age: 'Not Available',
      audience_gender: 'Not Available',
      audience_geography: 'Not Available',
      country: resolvedCountry,
      data_source: 'apify_instagram_search_scraper',
      last_verified_at: null,
      profile_description: influencerInsert.profile_description ?? null,
      profile_image_url: influencerInsert.profile_image_url ?? null,
      source_retrieved_at: retrievedAt,
      engagement_sample_size: null,
      engagement_calculated_at: null,
      fit_score: influencerInsert.fit_score ?? null,
      is_top_pick: false,
      source_metadata: influencerInsert.source_metadata ?? {},
      created_at: retrievedAt,
      updated_at: retrievedAt,
    };

    const campaignInfluencerRow: Database['public']['Tables']['campaign_influencers']['Row'] | null =
      savedCampaignLinkRow ?? {
        id: crypto.randomUUID(),
        campaign_id: campaignId ?? 'transient',
        influencer_id: influencerRow.id,
        qualification_status: qualStatus,
        qualification_reason: qualReason,
        added_at: retrievedAt,
      };

    discoveredCreators.push({
      influencer: influencerRow,
      campaignInfluencer: campaignInfluencerRow,
      emailMessage: null,
      instagramDmMessage: null,
      linkedinMessage: null,
      youtubeContactMessage: null,
      latestOutreachLog: null,
    });
  }

  let verifiedCount = 0;
  if (admin && savedInfluencerIds.length > 0) {
    try {
      const { data: readBack } = await admin
        .from('influencers')
        .select('id')
        .in('id', savedInfluencerIds);
      verifiedCount = readBack?.length ?? 0;
    } catch {
      verifiedCount = 0;
    }
  }

  const completedAt = new Date().toISOString();
  const finalRunStatus = 'completed' as const;
  const stats: DiscoveryStatsSummary = {
    rawCount,
    uniqueCount: discoveredCreators.length,
    duplicateCount,
    qualifiedCount,
    needsReviewCount,
    rejectedCount,
    persistedCount: verifiedCount,
    persistenceFailureCount,
  };

  if (admin && dbRunRow) {
    try {
      const { data: updatedRun, error: updateErr } = await admin
        .from('discovery_runs')
        .update({
          status: finalRunStatus,
          profiles_found: discoveredCreators.length,
          candidate_count: rawCount,
          qualified_count: qualifiedCount,
          needs_review_count: needsReviewCount,
          rejected_count: rejectedCount,
          failure_count: persistenceFailureCount,
          progress_percent: 100,
          params: { apifyRuns: apifyRunsMeta, stats },
          completed_at: completedAt,
        })
        .eq('id', dbRunRow.id)
        .select()
        .single();
      if (!updateErr && updatedRun) {
        dbRunRow = updatedRun;
      } else {
        const { data: fallbackRun } = await admin
          .from('discovery_runs')
          .update({
            status: finalRunStatus,
            profiles_found: discoveredCreators.length,
            completed_at: completedAt,
          })
          .eq('id', dbRunRow.id)
          .select()
          .single();
        dbRunRow = fallbackRun ?? {
          ...dbRunRow,
          status: finalRunStatus,
          profiles_found: discoveredCreators.length,
          completed_at: completedAt,
          progress_percent: 100,
        };
      }
      await recordAuditLog('instagram_discovery_completed', 'discovery_run', dbRunRow.id, {
        ...stats,
        apifyRuns: apifyRunsMeta,
      });
    } catch {
      dbRunRow = {
        ...dbRunRow,
        status: finalRunStatus,
        profiles_found: discoveredCreators.length,
        completed_at: completedAt,
        progress_percent: 100,
      };
    }
  }

  const finalRun: Database['public']['Tables']['discovery_runs']['Row'] = dbRunRow ?? {
    id: dbRunId,
    campaign_id: campaignId,
    platform: 'instagram',
    search_query: queries.join(' | '),
    status: finalRunStatus,
    profiles_found: discoveredCreators.length,
    error_message: null,
    started_at: retrievedAt,
    completed_at: completedAt,
    created_at: retrievedAt,
    params: { apifyRuns: apifyRunsMeta, stats },
    candidate_count: rawCount,
    qualified_count: qualifiedCount,
    rejected_count: rejectedCount,
    needs_review_count: needsReviewCount,
    failure_count: persistenceFailureCount,
    quota_used: 0,
    progress_percent: 100,
    cancelled_at: null,
    last_heartbeat_at: completedAt,
  };

  const persisted = Boolean(
    admin && (discoveredCreators.length === 0 || (verifiedCount === discoveredCreators.length && !persistenceWarning))
  );

  return {
    run: finalRun,
    creators: discoveredCreators,
    savedCount: savedInfluencerIds.length,
    persistence: {
      persisted,
      savedCount: savedInfluencerIds.length,
      verifiedCount,
      warning: persisted ? null : persistenceWarning,
    },
    stats,
  };
}
