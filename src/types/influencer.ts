import type {
  ChannelAvailabilityItem,
  ContactChannelRecord,
  OutreachChannel,
} from './database';

export type InfluencerPlatformKey = 'instagram' | 'tiktok' | 'youtube';

export interface InfluencerThumbnailSpec {
  id: string;
  motif: 'serum' | 'routine' | 'sunscreen' | 'botanical' | 'review' | 'cleanser';
  label: string;
  paletteBg: string;
  paletteAccent: string;
}

export interface ContentEvidenceItem {
  theme: string;
  evidence: string;
  source?: string;
  extractedAt?: string;
}

export interface InfluencerDemoProfile {
  id: string;
  name: string;
  initials: string;
  avatarBg: string;
  avatarText: string;
  contextLine: string;
  location: string;
  primaryNiche: string;
  niches: string[];
  overflowCount: number;
  isMyMember: boolean;
  engagementEstimate: number;
  engagementRate?: number | null;
  platforms: {
    instagram: string | null;
    instagramCount: number;
    tiktok: string | null;
    tiktokCount: number;
    youtube: string | null;
    youtubeCount: number;
  };
  totalReachCount: number;
  thumbnails: InfluencerThumbnailSpec[];
  // Live backend metadata (present for Supabase / YouTube / Apify records)
  isLiveRecord?: boolean;
  isTopPick?: boolean;
  qualificationStatus?: 'discovered' | 'qualified' | 'rejected' | 'needs_review';
  classificationCode?: 'PASS' | 'FAIL' | 'REVIEW_REQUIRED';
  qualificationReason?: string;
  fitScore?: number | null;
  fitScoreBreakdown?: {
    total: number;
    nicheRelevance: number;
    contentRelevance: number;
    campaignRelevance: number;
    geographyEvidence: number;
    engagementQuality: number;
    platformSuitability: number;
    reasons: string[];
  } | null;
  evaluatedAt?: string | null;
  contactEmail?: string | null;
  emailStatus?: 'verified' | 'unverified' | 'not_found';
  emailSource?: string | null;
  emailProvenanceStatus?: string | null;
  website?: string | null;
  enrichmentStatus?: string | null;
  enrichedAt?: string | null;
  contentEvidence?: ContentEvidenceItem[];
  geographyVerification?: 'Verified' | 'Likely' | 'Unknown';
  engagementSource?: string | null;
  engagementSampleSize?: number | null;
  engagementMeta?: {
    platform?: string;
    formulaDescription?: string;
    metricsUsed?: string[];
    sampleSize?: number;
    availabilityStatus?: string;
    calculatedAt?: string;
    reasonIfUnavailable?: string | null;
  } | null;
  profileDescription?: string | null;
  profileUrl?: string;
  dataSource?: string;
  retrievedAt?: string;
  contactChannels?: ContactChannelRecord[];
  channelAvailability?: ChannelAvailabilityItem[];
  recommendedChannel?: OutreachChannel | null;
  preferredChannel?: OutreachChannel | null;
}

export type InfluencerTopTab = 'search' | 'summary' | 'facebook';
export type InfluencerIndexMode = 'index' | 'members';
export type InfluencerSortOption =
  | 'relevance'
  | 'followers-desc'
  | 'followers-asc'
  | 'engagement-desc';
export type InfluencerViewMode = 'grid' | 'list';

export type InfluencerQualFilter = 'all' | 'qualified' | 'needs_review' | 'rejected';

export interface AppliedFilterChip {
  key: 'location' | 'niche' | 'platform' | 'followers' | 'engagement' | 'status';
  label: string;
  value: string;
}
