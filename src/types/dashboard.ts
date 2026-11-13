export type DashboardPlatform = 'Instagram' | 'TikTok' | 'YouTube';

export type DashboardQualStatus =
  | 'Passed'
  | 'Needs Review'
  | 'Failed'
  | 'Approved / Queued';

export interface DashboardCreatorRow {
  id: string;
  name: string;
  initials: string;
  handle: string;
  handleBgClass: string;
  handleTextClass: string;
  platforms: DashboardPlatform[];
  followers: string;
  followersCount: number;
  engagement: string;
  engagementRate: number;
  qualStatus: DashboardQualStatus;
  qualReason: string;
  email: string;
  emailVerifiedDemo: boolean;
  niche: string;
  geography: string;
  emailPitchDraft: string;
  instagramDmDraft: string;
  // Backend-backed metadata (present for Supabase records)
  isLiveRecord?: boolean;
  isTopPick?: boolean;
  campaignInfluencerId?: string;
  influencerId?: string;
  emailMessageId?: string;
  instagramDmMessageId?: string;
  emailSubject?: string;
  profileUrl?: string;
  dataSource?: string;
  retrievedAt?: string;
  outreachStatusLabel?: string;
}

export interface CampaignOption {
  id: string;
  label: string;
  breadcrumbName: string;
  brandName?: string;
  niche?: string;
  targetCountry?: string | null;
  status?: string;
}
