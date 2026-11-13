export type QualificationStatus = 'Qualified' | 'Review' | 'Failed';

export type OutreachStatus =
  | 'Draft'
  | 'Pending Approval'
  | 'Approved'
  | 'Sent'
  | 'Failed'
  | 'Skipped'
  | 'Manual DM';

export interface DemoCreatorRow {
  id: string;
  name: string;
  handle: string;
  platform: 'YouTube' | 'Instagram';
  geography: string;
  category: string;
  followers: string;
  followersCount: number;
  engagementEstimate: string;
  engagementValue: number;
  contactEmail: string;
  qualification: QualificationStatus;
  outreachStatus: OutreachStatus;
  fitScoreDemo: number;
  summaryChecks: {
    nicheMatch: string;
    followerRange: string;
    engagement: string;
    contentRelevance: string;
    contactAvailability: string;
  };
}

export type FeatureTabId =
  | 'discovery'
  | 'filtering'
  | 'enrichment'
  | 'email-pitch'
  | 'instagram-dm'
  | 'outreach-tracker';

export interface FeatureTabItem {
  id: FeatureTabId;
  label: string;
  title: string;
  description: string;
  benefits: string[];
  ctaLabel: string;
  ctaTarget: string;
}

export type AudienceTabId = 'founders' | 'marketers' | 'agencies';

export interface AudienceTabContent {
  id: AudienceTabId;
  label: string;
  headline: string;
  benefits: {
    title: string;
    detail: string;
  }[];
  previewTitle: string;
  rows: {
    creator: string;
    followers: string;
    engagement: string;
    qualification: 'Passed' | 'Failed';
    reason: string;
  }[];
}

export interface WorkflowStep {
  stepNumber: string;
  title: string;
  description: string;
  iconName: 'search' | 'database' | 'filter' | 'user-plus' | 'sparkles' | 'check-circle';
}

export interface UseCaseItem {
  id: string;
  title: string;
  description: string;
  statusLabel: string;
  isPrimary?: boolean;
  campaignExample?: string;
}

export interface ResourceItem {
  id: string;
  category: string;
  title: string;
  description: string;
  readActionLabel: string;
  sections: {
    heading: string;
    body: string;
  }[];
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}
