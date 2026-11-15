import type {
  ChannelAvailabilityItem,
  ContactChannelRecord,
  OutreachChannel,
  UnifiedOutreachStatus,
} from './database';

export type DashboardPlatform = 'Instagram' | 'TikTok' | 'YouTube';

export type DashboardQualStatus =
  | 'Passed'
  | 'Needs Review'
  | 'Failed'
  | 'Approved / Queued';

export type DashboardQualFilter = 'all' | 'qualified' | 'needs_review' | 'rejected';

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
  emailStatus?: 'verified' | 'unverified' | 'not_found';
  niche: string;
  geography: string;
  emailPitchDraft: string;
  instagramDmDraft: string;
  linkedinMessageDraft?: string;
  youtubeContactDraft?: string;
  youtubeContactSubject?: string;
  // Backend-backed metadata (present for Supabase records)
  isLiveRecord?: boolean;
  isTopPick?: boolean;
  campaignInfluencerId?: string;
  influencerId?: string;
  emailMessageId?: string;
  instagramDmMessageId?: string;
  linkedinMessageId?: string;
  youtubeContactMessageId?: string;
  emailSubject?: string;
  emailMessageStatus?: string;
  emailWorkflowStatus?: UnifiedOutreachStatus;
  instagramDmStatus?: string;
  instagramDmWorkflowStatus?: UnifiedOutreachStatus;
  linkedinMessageStatus?: string;
  linkedinWorkflowStatus?: UnifiedOutreachStatus;
  youtubeContactStatus?: string;
  youtubeContactWorkflowStatus?: UnifiedOutreachStatus;
  collaborationType?: string;
  personalizationSignals?: string[];
  aiModel?: string | null;
  emailWordCount?: number | null;
  dmWordCount?: number | null;
  linkedinWordCount?: number | null;
  youtubeWordCount?: number | null;
  engagementSource?: string | null;
  profileUrl?: string;
  website?: string | null;
  emailSource?: string | null;
  enrichmentStatus?: string | null;
  dataSource?: string;
  retrievedAt?: string;
  outreachStatusLabel?: string;
  contactChannels?: ContactChannelRecord[];
  channelAvailability?: ChannelAvailabilityItem[];
  recommendedChannel?: OutreachChannel | null;
  preferredChannel?: OutreachChannel | null;
}

export interface CampaignOption {
  id: string;
  label: string;
  breadcrumbName: string;
  brandName?: string;
  niche?: string;
  targetCountry?: string | null;
  status?: string;
  minFollowers?: number;
  maxFollowers?: number;
  minEngagementRate?: number;
  collaborationType?: string | null;
  productDescription?: string | null;
  campaignBrief?: string | null;
  targetPlatforms?: string[] | null;
}
