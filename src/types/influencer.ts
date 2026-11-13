export type InfluencerPlatformKey = 'instagram' | 'tiktok' | 'youtube';

export interface InfluencerThumbnailSpec {
  id: string;
  motif: 'serum' | 'routine' | 'sunscreen' | 'botanical' | 'review' | 'cleanser';
  label: string;
  paletteBg: string;
  paletteAccent: string;
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
  // Live backend metadata (present for Supabase / YouTube records)
  isLiveRecord?: boolean;
  isTopPick?: boolean;
  qualificationStatus?: 'discovered' | 'qualified' | 'rejected' | 'needs_review';
  qualificationReason?: string;
  contactEmail?: string | null;
  emailStatus?: 'verified' | 'unverified' | 'not_found';
  profileUrl?: string;
  dataSource?: string;
  retrievedAt?: string;
}

export type InfluencerTopTab = 'search' | 'summary' | 'facebook';
export type InfluencerIndexMode = 'index' | 'members';
export type InfluencerSortOption =
  | 'relevance'
  | 'followers-desc'
  | 'followers-asc'
  | 'engagement-desc';
export type InfluencerViewMode = 'grid' | 'list';

export interface AppliedFilterChip {
  key: 'location' | 'niche' | 'platform' | 'followers' | 'engagement';
  label: string;
  value: string;
}
