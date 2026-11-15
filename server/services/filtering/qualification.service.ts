export interface VideoMetricSample {
  videoId: string;
  title: string;
  likeCount: number | null;
  commentCount: number | null;
  publishedAt?: string;
}

export interface InstagramPostMetricSample {
  postId?: string;
  caption?: string;
  likeCount: number | null;
  commentCount: number | null;
  publishedAt?: string;
}

export interface EngagementEstimateResult {
  platform: 'youtube' | 'instagram';
  available: boolean;
  availabilityStatus: 'available' | 'unavailable';
  engagementRate: number | null;
  sampleSize: number;
  avgLikes: number;
  avgComments: number;
  formulaVersion: string;
  formulaDescription: string;
  metricsUsed: string[];
  label: string;
  calculatedAt: string;
  reasonIfUnavailable?: string;
}

export function calculateEstimatedPublicEngagement(input: {
  subscriberCount: number | null;
  hiddenSubscriberCount?: boolean;
  videos: VideoMetricSample[];
}): EngagementEstimateResult {
  const nowIso = new Date().toISOString();
  const formulaVersion = 'v1_public_likes_comments_over_subs';
  const formulaDescription = '((avg_likes + avg_comments) / subscriber_count) * 100';
  const metricsUsed = ['likeCount', 'commentCount', 'subscriberCount'];
  const label = 'Estimated Public Engagement';

  if (
    input.hiddenSubscriberCount ||
    input.subscriberCount === null ||
    input.subscriberCount === undefined ||
    !Number.isFinite(input.subscriberCount) ||
    input.subscriberCount <= 0
  ) {
    return {
      platform: 'youtube',
      available: false,
      availabilityStatus: 'unavailable',
      engagementRate: null,
      sampleSize: 0,
      avgLikes: 0,
      avgComments: 0,
      formulaVersion,
      formulaDescription,
      metricsUsed,
      label,
      calculatedAt: nowIso,
      reasonIfUnavailable: 'Subscriber count is hidden or unavailable.',
    };
  }

  // Only include videos where at least likes or comments are publicly exposed
  const eligible = input.videos
    .filter((v) => v.likeCount !== null || v.commentCount !== null)
    .slice(0, 10);

  if (eligible.length === 0) {
    return {
      platform: 'youtube',
      available: false,
      availabilityStatus: 'unavailable',
      engagementRate: null,
      sampleSize: 0,
      avgLikes: 0,
      avgComments: 0,
      formulaVersion,
      formulaDescription,
      metricsUsed,
      label,
      calculatedAt: nowIso,
      reasonIfUnavailable:
        input.videos.length > 0
          ? 'Public like and comment metrics are disabled or unavailable on recent videos.'
          : 'No recent eligible public videos found for engagement sampling.',
    };
  }

  const totalLikes = eligible.reduce((acc, v) => acc + Math.max(0, v.likeCount ?? 0), 0);
  const totalComments = eligible.reduce(
    (acc, v) => acc + Math.max(0, v.commentCount ?? 0),
    0
  );
  const avgLikes = totalLikes / eligible.length;
  const avgComments = totalComments / eligible.length;

  const rawRate = ((avgLikes + avgComments) / input.subscriberCount) * 100;
  const engagementRate = Number(Math.min(100, Math.max(0, rawRate)).toFixed(3));

  return {
    platform: 'youtube',
    available: true,
    availabilityStatus: 'available',
    engagementRate,
    sampleSize: eligible.length,
    avgLikes: Number(avgLikes.toFixed(1)),
    avgComments: Number(avgComments.toFixed(1)),
    formulaVersion,
    formulaDescription,
    metricsUsed,
    label,
    calculatedAt: nowIso,
  };
}

export function calculateInstagramPostEngagement(input: {
  followerCount: number | null;
  posts: InstagramPostMetricSample[];
}): EngagementEstimateResult {
  const nowIso = new Date().toISOString();
  const formulaVersion = 'v1_instagram_recent_posts_likes_comments_over_followers';
  const formulaDescription = '((avg_post_likes + avg_post_comments) / follower_count) * 100';
  const metricsUsed = ['likesCount', 'commentsCount', 'followersCount'];
  const label = 'Estimated Public Engagement (Instagram Posts)';

  if (
    input.followerCount === null ||
    input.followerCount === undefined ||
    !Number.isFinite(input.followerCount) ||
    input.followerCount <= 0
  ) {
    return {
      platform: 'instagram',
      available: false,
      availabilityStatus: 'unavailable',
      engagementRate: null,
      sampleSize: 0,
      avgLikes: 0,
      avgComments: 0,
      formulaVersion,
      formulaDescription,
      metricsUsed,
      label,
      calculatedAt: nowIso,
      reasonIfUnavailable: 'Instagram follower count is unavailable.',
    };
  }

  // Instagram uses -1 when post likes are hidden by the creator
  const eligible = input.posts
    .filter((p) => p.likeCount !== null && Number.isFinite(p.likeCount) && p.likeCount >= 0)
    .slice(0, 12);

  if (eligible.length === 0) {
    return {
      platform: 'instagram',
      available: false,
      availabilityStatus: 'unavailable',
      engagementRate: null,
      sampleSize: 0,
      avgLikes: 0,
      avgComments: 0,
      formulaVersion,
      formulaDescription,
      metricsUsed,
      label,
      calculatedAt: nowIso,
      reasonIfUnavailable:
        input.posts.length > 0
          ? 'Public like counts on recent Instagram posts are hidden or unavailable.'
          : 'Recent Instagram posts were not returned by the discovery actor.',
    };
  }

  const totalLikes = eligible.reduce((acc, p) => acc + Math.max(0, p.likeCount ?? 0), 0);
  const totalComments = eligible.reduce(
    (acc, p) => acc + Math.max(0, p.commentCount !== null && p.commentCount >= 0 ? p.commentCount : 0),
    0
  );
  const avgLikes = totalLikes / eligible.length;
  const avgComments = totalComments / eligible.length;
  const rawRate = ((avgLikes + avgComments) / input.followerCount) * 100;
  const engagementRate = Number(Math.min(100, Math.max(0, rawRate)).toFixed(3));

  return {
    platform: 'instagram',
    available: true,
    availabilityStatus: 'available',
    engagementRate,
    sampleSize: eligible.length,
    avgLikes: Number(avgLikes.toFixed(1)),
    avgComments: Number(avgComments.toFixed(1)),
    formulaVersion,
    formulaDescription,
    metricsUsed,
    label,
    calculatedAt: nowIso,
  };
}

const CORE_BEAUTY_SKINCARE_KEYWORDS = [
  'skincare',
  'skin care',
  'beauty',
  'sunscreen',
  'spf',
  'serum',
  'cleanser',
  'moisturizer',
  'niacinamide',
  'retinol',
  'dermatolog',
  'acne',
  'makeup',
  'cosmetic',
  'hyaluronic',
  'vitamin c',
  'facial',
  'haircare',
  'skin barrier',
];

const SUPPORTING_BEAUTY_KEYWORDS = ['glow', 'routine', 'review', 'toner', 'exfoliat'];

const INDIA_BIO_HINT_KEYWORDS = [
  'india',
  'indian',
  'mumbai',
  'delhi',
  'bangalore',
  'bengaluru',
  'hyderabad',
  'chennai',
  'kolkata',
  'pune',
  'hindi',
  'nykaa',
  'rupee',
  'inr',
];

export interface QualificationInput {
  name: string;
  description: string;
  recentVideoTitles: string[];
  country: string | null;
  subscriberCount: number | null;
  engagementRate: number | null;
  engagementSampleSize?: number | null;
  contactEmail: string | null;
  platform?: string;
}

export interface QualificationCriteria {
  minFollowers: number;
  maxFollowers: number;
  minEngagementRate: number;
  targetCountry: string | null;
  niche: string;
}

export type GeographyVerificationLabel = 'Verified' | 'Likely' | 'Unknown';
export type QualificationClassificationCode = 'PASS' | 'FAIL' | 'REVIEW_REQUIRED';

export interface FitScoreBreakdown {
  total: number;
  nicheRelevance: number;
  contentRelevance: number;
  campaignRelevance: number;
  geographyEvidence: number;
  engagementQuality: number;
  platformSuitability: number;
  reasons: string[];
}

export interface QualificationEvaluation {
  status: 'qualified' | 'rejected' | 'needs_review';
  classificationCode: QualificationClassificationCode;
  reason: string;
  nicheMatched: boolean;
  detectedThemes: string[];
  verifiedCountry: string | null;
  geographyStatus: 'verified_match' | 'verified_mismatch' | 'unavailable';
  geographyVerification: GeographyVerificationLabel;
  fitScore: number;
  fitScoreBreakdown: FitScoreBreakdown;
  evaluatedAt: string;
}

export function extractContentThemes(
  description: string,
  recentVideoTitles: string[]
): string[] {
  const combined = `${description} ${recentVideoTitles.join(' ')}`.toLowerCase();
  const themeMap: Array<[string, string]> = [
    ['skincare', 'Skincare'],
    ['skin care', 'Skincare'],
    ['sunscreen', 'Sunscreen & SPF'],
    ['spf', 'Sunscreen & SPF'],
    ['serum', 'Serums & Actives'],
    ['niacinamide', 'Serums & Actives'],
    ['retinol', 'Serums & Actives'],
    ['routine', 'Daily Routines'],
    ['acne', 'Acne Care'],
    ['dermatolog', 'Derm Education'],
    ['review', 'Product Reviews'],
    ['makeup', 'Makeup'],
    ['beauty', 'Beauty'],
    ['cleanser', 'Cleansers'],
    ['moisturizer', 'Hydration'],
    ['hyaluronic', 'Hydration'],
    ['haircare', 'Haircare'],
    ['wellness', 'Wellness'],
    ['self-care', 'Self-Care'],
  ];

  const found = new Set<string>();
  for (const [needle, label] of themeMap) {
    if (combined.includes(needle)) {
      found.add(label);
    }
  }
  return Array.from(found).slice(0, 6);
}

/**
 * Only trust explicit structured public profile country metadata (e.g. YouTube snippet.country).
 * Never promote bio keywords (Hindi, Nykaa, Mumbai, India) to verified creator geography.
 */
export function normalizeVerifiedProfileCountry(rawCountry: string | null | undefined): string | null {
  const cleaned = rawCountry?.trim().toUpperCase();
  if (!cleaned) return null;
  if (cleaned === 'IN' || cleaned === 'IND' || cleaned === 'INDIA') {
    return 'India';
  }
  return cleaned;
}

function evaluateNicheMatch(combinedText: string, niche: string): {
  matched: boolean;
  coreMatches: number;
  supportingMatches: number;
} {
  const cleanedNiche = niche.trim().toLowerCase();
  const coreMatches = CORE_BEAUTY_SKINCARE_KEYWORDS.filter((kw) =>
    combinedText.includes(kw)
  ).length;
  const supportingMatches = SUPPORTING_BEAUTY_KEYWORDS.filter((kw) =>
    combinedText.includes(kw)
  ).length;

  if (!cleanedNiche || cleanedNiche === 'all') {
    return { matched: true, coreMatches: Math.max(1, coreMatches), supportingMatches };
  }

  if (cleanedNiche.includes('beauty') || cleanedNiche.includes('skincare')) {
    return {
      matched: coreMatches >= 1 || (coreMatches === 0 && supportingMatches >= 3),
      coreMatches,
      supportingMatches,
    };
  }

  const tokens = cleanedNiche
    .split(/[^a-z0-9]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && t !== 'and');
  const tokenHits = tokens.filter((tok) => combinedText.includes(tok)).length;

  return {
    matched: tokenHits >= 1 || coreMatches >= 1,
    coreMatches: Math.max(coreMatches, tokenHits),
    supportingMatches,
  };
}

function buildFitScoreBreakdown(params: {
  nicheMatched: boolean;
  coreMatches: number;
  supportingMatches: number;
  detectedThemesCount: number;
  subscriberCount: number | null;
  engagementRate: number | null;
  verifiedCountry: string | null;
  targetIsIndia: boolean;
  hasBioIndiaHint: boolean;
  contactEmail: string | null;
  classificationCode: QualificationClassificationCode;
  minFollowers: number;
  maxFollowers: number;
  minEngagementRate: number;
}): FitScoreBreakdown {
  const nicheRelevance = params.nicheMatched
    ? Math.min(25, 10 + params.coreMatches * 4 + params.supportingMatches * 2)
    : 0;
  const contentRelevance = Math.min(15, params.detectedThemesCount * 3);
  const inSweetSpot =
    params.subscriberCount !== null &&
    params.subscriberCount >= Math.max(15000, params.minFollowers) &&
    params.subscriberCount <= Math.min(85000, params.maxFollowers);
  const inFollowerRange =
    params.subscriberCount !== null &&
    params.subscriberCount >= params.minFollowers &&
    params.subscriberCount <= params.maxFollowers;
  const campaignRelevance = inSweetSpot ? 20 : inFollowerRange ? 14 : 0;

  const geographyEvidence =
    params.verifiedCountry === 'India' || (!params.targetIsIndia && Boolean(params.verifiedCountry))
      ? 15
      : params.hasBioIndiaHint
        ? 6
        : 0;

  const engagementQuality =
    params.engagementRate !== null && Number.isFinite(params.engagementRate)
      ? params.engagementRate >= params.minEngagementRate
        ? Math.min(15, Number((params.engagementRate * 3).toFixed(1)))
        : Math.min(5, Number((params.engagementRate * 2).toFixed(1)))
      : 0;

  const platformSuitability = params.contactEmail ? 10 : 4;

  const rawTotal = Number(
    Math.min(
      100,
      nicheRelevance +
        contentRelevance +
        campaignRelevance +
        geographyEvidence +
        engagementQuality +
        platformSuitability
    ).toFixed(2)
  );

  let total = rawTotal;
  if (params.classificationCode === 'FAIL') {
    total = Math.min(30, rawTotal);
  } else if (params.classificationCode === 'REVIEW_REQUIRED') {
    total = Math.min(64, rawTotal);
  }

  const reasons: string[] = [
    params.nicheMatched
      ? `Niche match (${params.coreMatches} core + ${params.supportingMatches} supporting signals)`
      : 'Niche mismatch against campaign criteria',
    inFollowerRange && params.subscriberCount !== null
      ? `Follower reach (${params.subscriberCount.toLocaleString()}) within ${params.minFollowers.toLocaleString()}-${params.maxFollowers.toLocaleString()}`
      : params.subscriberCount === null
        ? 'Follower count unavailable'
        : `Follower reach (${params.subscriberCount.toLocaleString()}) outside ${params.minFollowers.toLocaleString()}-${params.maxFollowers.toLocaleString()}`,
    params.engagementRate !== null && Number.isFinite(params.engagementRate)
      ? `Estimated engagement ${params.engagementRate.toFixed(2)}% (target >= ${params.minEngagementRate}%)`
      : 'Engagement rate unavailable (requires review)',
    params.verifiedCountry
      ? `Verified profile country: ${params.verifiedCountry}`
      : params.hasBioIndiaHint
        ? 'Profile country unverified (India bio hint only)'
        : 'Profile country unknown',
    params.contactEmail
      ? 'Public contact email present'
      : 'No public business email listed',
  ];

  return {
    total,
    nicheRelevance,
    contentRelevance,
    campaignRelevance,
    geographyEvidence,
    engagementQuality,
    platformSuitability,
    reasons,
  };
}

export function evaluateCreatorQualification(
  input: QualificationInput,
  criteria: QualificationCriteria
): QualificationEvaluation {
  const evaluatedAt = new Date().toISOString();
  const combinedText = `${input.name} ${input.description} ${input.recentVideoTitles.join(' ')}`.toLowerCase();
  const detectedThemes = extractContentThemes(input.description, input.recentVideoTitles);

  const { matched: nicheMatched, coreMatches, supportingMatches } = evaluateNicheMatch(
    combinedText,
    criteria.niche
  );

  const verifiedCountry = normalizeVerifiedProfileCountry(input.country);
  const hasBioIndiaHint = INDIA_BIO_HINT_KEYWORDS.some((kw) => combinedText.includes(kw));

  const targetIsIndia =
    !criteria.targetCountry ||
    criteria.targetCountry.toLowerCase() === 'all'
      ? false
      : criteria.targetCountry.toLowerCase().includes('india') ||
        criteria.targetCountry.toLowerCase() === 'in';

  const geographyStatus: QualificationEvaluation['geographyStatus'] = !verifiedCountry
    ? 'unavailable'
    : targetIsIndia && verifiedCountry !== 'India'
      ? 'verified_mismatch'
      : 'verified_match';

  const geographyVerification: GeographyVerificationLabel = verifiedCountry
    ? 'Verified'
    : hasBioIndiaHint
      ? 'Likely'
      : 'Unknown';

  const hasFollowerCount =
    input.subscriberCount !== null &&
    input.subscriberCount !== undefined &&
    Number.isFinite(input.subscriberCount);
  const hasEngagementRate =
    input.engagementRate !== null &&
    input.engagementRate !== undefined &&
    Number.isFinite(input.engagementRate) &&
    input.engagementSampleSize !== 0;

  const finalize = (
    status: QualificationEvaluation['status'],
    classificationCode: QualificationClassificationCode,
    reason: string,
    overrideGeoStatus?: QualificationEvaluation['geographyStatus'],
    overrideGeoVerification?: GeographyVerificationLabel,
    overrideNicheMatched?: boolean,
    overrideCountry?: string | null
  ): QualificationEvaluation => {
    const breakdown = buildFitScoreBreakdown({
      nicheMatched: overrideNicheMatched ?? nicheMatched,
      coreMatches,
      supportingMatches,
      detectedThemesCount: detectedThemes.length,
      subscriberCount: hasFollowerCount ? input.subscriberCount : null,
      engagementRate: hasEngagementRate ? input.engagementRate : null,
      verifiedCountry: overrideCountry !== undefined ? overrideCountry : verifiedCountry,
      targetIsIndia,
      hasBioIndiaHint,
      contactEmail: input.contactEmail,
      classificationCode,
      minFollowers: criteria.minFollowers,
      maxFollowers: criteria.maxFollowers,
      minEngagementRate: criteria.minEngagementRate,
    });

    return {
      status,
      classificationCode,
      reason,
      nicheMatched: overrideNicheMatched ?? nicheMatched,
      detectedThemes,
      verifiedCountry: overrideCountry !== undefined ? overrideCountry : verifiedCountry,
      geographyStatus: overrideGeoStatus ?? geographyStatus,
      geographyVerification: overrideGeoVerification ?? geographyVerification,
      fitScore: breakdown.total,
      fitScoreBreakdown: breakdown,
      evaluatedAt,
    };
  };

  // 1. Check all KNOWN hard disqualifiers first -> FAIL (rejected)
  if (hasFollowerCount && input.subscriberCount! < criteria.minFollowers) {
    return finalize(
      'rejected',
      'FAIL',
      `Below follower threshold (${input.subscriberCount!.toLocaleString()} < ${criteria.minFollowers.toLocaleString()}).`
    );
  }

  if (hasFollowerCount && input.subscriberCount! > criteria.maxFollowers) {
    return finalize(
      'rejected',
      'FAIL',
      `Above follower threshold (${input.subscriberCount!.toLocaleString()} > ${criteria.maxFollowers.toLocaleString()}).`
    );
  }

  if (hasEngagementRate && input.engagementRate! < criteria.minEngagementRate) {
    return finalize(
      'rejected',
      'FAIL',
      `Engagement below minimum (${input.engagementRate!.toFixed(2)}% < ${criteria.minEngagementRate}%).`
    );
  }

  if (!nicheMatched) {
    return finalize(
      'rejected',
      'FAIL',
      `Niche mismatch (${criteria.niche || 'Beauty & Skincare'} relevance insufficient).`,
      undefined,
      undefined,
      false
    );
  }

  if (targetIsIndia && verifiedCountry && verifiedCountry !== 'India') {
    return finalize(
      'rejected',
      'FAIL',
      `Verified profile country (${verifiedCountry}) does not match India target.`,
      'verified_mismatch',
      'Verified',
      true
    );
  }

  // 2. If NO hard disqualifier failed, missing metrics or unverified geography -> REVIEW_REQUIRED
  const missingReasons: string[] = [];
  if (!hasFollowerCount) {
    missingReasons.push('follower count unavailable');
  }
  if (!hasEngagementRate) {
    missingReasons.push('engagement metrics unavailable');
  }
  if (targetIsIndia && !verifiedCountry) {
    missingReasons.push(
      hasBioIndiaHint
        ? 'country unverified (Likely India via bio/content text)'
        : 'country unknown on public profile'
    );
  }

  if (missingReasons.length > 0) {
    return finalize(
      'needs_review',
      'REVIEW_REQUIRED',
      `Review required: ${missingReasons.join('; ')}.`,
      targetIsIndia && !verifiedCountry ? 'unavailable' : undefined,
      undefined,
      true,
      verifiedCountry ?? null
    );
  }

  // 3. All required thresholds & verifications passed -> PASS (qualified)
  return finalize(
    'qualified',
    'PASS',
    `PASS: ${input.subscriberCount!.toLocaleString()} followers, ${input.engagementRate!.toFixed(2)}% est. engagement (>= ${criteria.minEngagementRate}%), ${criteria.niche}${verifiedCountry ? `, ${verifiedCountry}` : ''}.`,
    targetIsIndia ? 'verified_match' : geographyStatus,
    verifiedCountry ? 'Verified' : geographyVerification,
    true,
    verifiedCountry ?? null
  );
}
