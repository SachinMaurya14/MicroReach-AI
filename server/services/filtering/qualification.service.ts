export interface VideoMetricSample {
  videoId: string;
  title: string;
  likeCount: number;
  commentCount: number;
  publishedAt?: string;
}

export interface EngagementEstimateResult {
  available: boolean;
  engagementRate: number | null;
  sampleSize: number;
  avgLikes: number;
  avgComments: number;
  formulaVersion: string;
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
  const label = 'Estimated Public Engagement';

  if (
    input.hiddenSubscriberCount ||
    !input.subscriberCount ||
    input.subscriberCount <= 0
  ) {
    return {
      available: false,
      engagementRate: null,
      sampleSize: 0,
      avgLikes: 0,
      avgComments: 0,
      formulaVersion,
      label,
      calculatedAt: nowIso,
      reasonIfUnavailable: 'Subscriber count is hidden or unavailable.',
    };
  }

  const eligible = input.videos.slice(0, 10);
  if (eligible.length === 0) {
    return {
      available: false,
      engagementRate: null,
      sampleSize: 0,
      avgLikes: 0,
      avgComments: 0,
      formulaVersion,
      label,
      calculatedAt: nowIso,
      reasonIfUnavailable: 'No recent eligible public videos found for engagement sampling.',
    };
  }

  const totalLikes = eligible.reduce((acc, v) => acc + Math.max(0, v.likeCount), 0);
  const totalComments = eligible.reduce((acc, v) => acc + Math.max(0, v.commentCount), 0);
  const avgLikes = totalLikes / eligible.length;
  const avgComments = totalComments / eligible.length;

  const rawRate = ((avgLikes + avgComments) / input.subscriberCount) * 100;
  const engagementRate = Number(Math.min(100, Math.max(0, rawRate)).toFixed(3));

  return {
    available: true,
    engagementRate,
    sampleSize: eligible.length,
    avgLikes: Number(avgLikes.toFixed(1)),
    avgComments: Number(avgComments.toFixed(1)),
    formulaVersion,
    label,
    calculatedAt: nowIso,
  };
}

const BEAUTY_SKINCARE_KEYWORDS = [
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
  'glow',
  'makeup',
  'cosmetic',
  'routine',
  'hyaluronic',
  'vitamin c',
  'facial',
  'haircare',
  'barrier',
];

const INDIA_SIGNAL_KEYWORDS = [
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
  'ahmedabad',
  'jaipur',
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
  contactEmail: string | null;
}

export interface QualificationCriteria {
  minFollowers: number;
  maxFollowers: number;
  minEngagementRate: number;
  targetCountry: string | null;
  niche: string;
}

export interface QualificationEvaluation {
  status: 'qualified' | 'rejected' | 'needs_review';
  reason: string;
  nicheMatched: boolean;
  detectedThemes: string[];
  inferredCountry: string | null;
  fitScore: number;
}

export function extractContentThemes(
  description: string,
  recentVideoTitles: string[]
): string[] {
  const combined = `${description} ${recentVideoTitles.join(' ')}`.toLowerCase();
  const themeMap: Array<[string, string]> = [
    ['skincare', 'Skincare'],
    ['sunscreen', 'Sunscreen & SPF'],
    ['spf', 'Sunscreen & SPF'],
    ['serum', 'Serums & Actives'],
    ['routine', 'Daily Routines'],
    ['acne', 'Acne Care'],
    ['dermatolog', 'Derm Education'],
    ['review', 'Product Reviews'],
    ['makeup', 'Makeup'],
    ['beauty', 'Beauty'],
    ['cleanser', 'Cleansers'],
    ['moisturizer', 'Hydration'],
    ['glow', 'Glow Care'],
  ];

  const found = new Set<string>();
  for (const [needle, label] of themeMap) {
    if (combined.includes(needle)) {
      found.add(label);
    }
  }
  return Array.from(found).slice(0, 6);
}

export function evaluateCreatorQualification(
  input: QualificationInput,
  criteria: QualificationCriteria
): QualificationEvaluation {
  const combinedText = `${input.name} ${input.description} ${input.recentVideoTitles.join(' ')}`.toLowerCase();
  const detectedThemes = extractContentThemes(input.description, input.recentVideoTitles);

  const keywordMatches = BEAUTY_SKINCARE_KEYWORDS.filter((kw) =>
    combinedText.includes(kw)
  ).length;
  const nicheMatched = keywordMatches >= 1;

  // Determine country availability carefully without guessing aggressively
  const normalizedCountry = input.country?.trim().toUpperCase() || null;
  const hasIndiaKeyword = INDIA_SIGNAL_KEYWORDS.some((kw) => combinedText.includes(kw));
  const inferredCountry =
    normalizedCountry === 'IN' || normalizedCountry === 'INDIA'
      ? 'India'
      : normalizedCountry
        ? normalizedCountry
        : hasIndiaKeyword
          ? 'India'
          : null;

  // 1. Check public metrics availability
  if (input.subscriberCount === null || input.engagementRate === null) {
    return {
      status: 'rejected',
      reason: 'Metrics unavailable.',
      nicheMatched,
      detectedThemes,
      inferredCountry,
      fitScore: 0,
    };
  }

  // 2. Follower range checks (5K - 100K default)
  if (input.subscriberCount < criteria.minFollowers) {
    return {
      status: 'rejected',
      reason: `Below ${Math.round(criteria.minFollowers / 1000)}K subscribers.`,
      nicheMatched,
      detectedThemes,
      inferredCountry,
      fitScore: 10,
    };
  }

  if (input.subscriberCount > criteria.maxFollowers) {
    return {
      status: 'rejected',
      reason: `Above ${Math.round(criteria.maxFollowers / 1000)}K subscribers.`,
      nicheMatched,
      detectedThemes,
      inferredCountry,
      fitScore: 15,
    };
  }

  // 3. Engagement rate threshold (>= 2% default)
  if (input.engagementRate < criteria.minEngagementRate) {
    return {
      status: 'rejected',
      reason: `Estimated engagement below ${criteria.minEngagementRate}%.`,
      nicheMatched,
      detectedThemes,
      inferredCountry,
      fitScore: 20,
    };
  }

  // 4. Beauty & Skincare niche relevance
  if (!nicheMatched) {
    return {
      status: 'rejected',
      reason: 'Niche relevance insufficient.',
      nicheMatched: false,
      detectedThemes,
      inferredCountry,
      fitScore: 25,
    };
  }

  // 5. Country preference check (never auto-reject solely because YouTube omits country)
  const targetIsIndia =
    !criteria.targetCountry ||
    criteria.targetCountry.toLowerCase().includes('india') ||
    criteria.targetCountry.toLowerCase() === 'in';

  if (targetIsIndia && !inferredCountry) {
    return {
      status: 'needs_review',
      reason: 'Country information unavailable — Needs Review.',
      nicheMatched: true,
      detectedThemes,
      inferredCountry: null,
      fitScore: Number(
        (
          45 +
          Math.min(25, input.engagementRate * 4) +
          Math.min(15, keywordMatches * 3) +
          (input.contactEmail ? 10 : 0)
        ).toFixed(2)
      ),
    };
  }

  if (targetIsIndia && inferredCountry && inferredCountry !== 'India') {
    return {
      status: 'rejected',
      reason: `Country (${inferredCountry}) does not match India campaign target.`,
      nicheMatched: true,
      detectedThemes,
      inferredCountry,
      fitScore: 30,
    };
  }

  // Qualified creator composite score (transparent ranking for top 5 highlight)
  const sweetSpotScore =
    input.subscriberCount >= 15000 && input.subscriberCount <= 85000 ? 20 : 12;
  const engagementScore = Math.min(35, input.engagementRate * 5.5);
  const relevanceScore = Math.min(25, keywordMatches * 4);
  const contactScore = input.contactEmail ? 15 : 5;
  const countryScore = inferredCountry === 'India' ? 5 : 0;
  const fitScore = Number(
    Math.min(
      100,
      sweetSpotScore + engagementScore + relevanceScore + contactScore + countryScore
    ).toFixed(2)
  );

  return {
    status: 'qualified',
    reason: `Engagement >= ${criteria.minEngagementRate}%, ${criteria.niche}${inferredCountry ? `, ${inferredCountry}` : ''}`,
    nicheMatched: true,
    detectedThemes,
    inferredCountry: inferredCountry ?? 'India',
    fitScore,
  };
}
