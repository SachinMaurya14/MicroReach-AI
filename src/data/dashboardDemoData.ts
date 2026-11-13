import { CampaignOption, DashboardCreatorRow } from '../types/dashboard';

export const DASHBOARD_CAMPAIGNS: CampaignOption[] = [
  {
    id: 'glowcare-skincare',
    label: 'GlowCare — Skincare',
    breadcrumbName: 'GlowCare India Skincare',
  },
  {
    id: 'glowcare-sunscreen',
    label: 'GlowCare — Daily SPF',
    breadcrumbName: 'GlowCare Daily SPF Demo',
  },
];

export const INITIAL_DASHBOARD_CREATORS: DashboardCreatorRow[] = [
  {
    id: 'demo-a',
    name: 'Creator A',
    initials: 'CA',
    handle: '@creator_a_glow',
    handleBgClass: 'bg-[#EDE9FE]',
    handleTextClass: 'text-[#5B21B6]',
    platforms: ['Instagram', 'YouTube'],
    followers: '54K',
    followersCount: 54000,
    engagement: '3.8%',
    engagementRate: 3.8,
    qualStatus: 'Passed',
    qualReason: 'Engagement > 2.5%, Beauty & Skincare',
    email: 'creator-a@example.com',
    emailVerifiedDemo: true,
    niche: 'Beauty & Skincare',
    geography: 'India',
    emailPitchDraft:
      "Hi Creator A, your skincare-focused content themes align naturally with GlowCare's upcoming India Skincare collaboration. We would love to send a complimentary barrier-care kit and discuss a sponsored review or UGC partnership for our gentle daily routine line. Would you be open to reviewing the campaign brief this week?",
    instagramDmDraft:
      'Hi Creator A, your beauty and skincare content looks relevant to our upcoming GlowCare India campaign. Would you be open to collaborating?',
  },
  {
    id: 'demo-b',
    name: 'Creator B',
    initials: 'CB',
    handle: '@creator_b_care',
    handleBgClass: 'bg-[#FEE2E2]',
    handleTextClass: 'text-[#991B1B]',
    platforms: ['Instagram'],
    followers: '12K',
    followersCount: 12000,
    engagement: '1.1%',
    engagementRate: 1.1,
    qualStatus: 'Failed',
    qualReason: 'Low engagement',
    email: 'creator-b@example.com',
    emailVerifiedDemo: true,
    niche: 'Beauty & Skincare',
    geography: 'India',
    emailPitchDraft:
      'Hi Creator B, we reviewed your public skincare tutorials for GlowCare India. While our current cohort requires higher estimated engagement, we would be glad to keep your profile on file for future community gifting campaigns.',
    instagramDmDraft:
      'Hi Creator B, thank you for sharing helpful skincare tips. We would love to keep in touch for upcoming GlowCare community drops.',
  },
  {
    id: 'demo-c',
    name: 'Creator C',
    initials: 'CC',
    handle: '@creator_c_skin',
    handleBgClass: 'bg-[#DBEAFE]',
    handleTextClass: 'text-[#1E40AF]',
    platforms: ['YouTube', 'Instagram'],
    followers: '89K',
    followersCount: 89000,
    engagement: '4.2%',
    engagementRate: 4.2,
    qualStatus: 'Passed',
    qualReason: 'Engagement > 2.5%, Beauty & Skincare',
    email: 'creator-c@example.com',
    emailVerifiedDemo: true,
    niche: 'Beauty & Skincare',
    geography: 'India',
    emailPitchDraft:
      "Hi Creator C, we noticed your detailed YouTube skincare ingredient breakdowns for Indian audiences. GlowCare is preparing a Beauty & Skincare creator cohort and would love to explore a sponsored routine spotlight with you. Are you open to seeing product details and deliverables?",
    instagramDmDraft:
      'Hi Creator C, your skincare ingredient breakdowns fit our GlowCare India campaign well. Open to receiving our collaboration brief?',
  },
  {
    id: 'demo-d',
    name: 'Creator D',
    initials: 'CD',
    handle: '@creator_d_daily',
    handleBgClass: 'bg-[#FEE2E2]',
    handleTextClass: 'text-[#991B1B]',
    platforms: ['Instagram'],
    followers: '7.5K',
    followersCount: 7500,
    engagement: '0.9%',
    engagementRate: 0.9,
    qualStatus: 'Failed',
    qualReason: 'Low engagement (< 2.5%)',
    email: 'Not Found',
    emailVerifiedDemo: false,
    niche: 'Lifestyle & Beauty',
    geography: 'India',
    emailPitchDraft:
      'Hi Creator D, no public email was listed on your profile. Use the manual Instagram DM workflow if your team chooses to follow up directly.',
    instagramDmDraft:
      'Hi Creator D, we came across your beauty posts while researching India skincare creators for GlowCare. Let us know if you collaborate on gifting.',
  },
];

export const LOCAL_TEMPLATE_VARIATIONS = [
  (name: string) =>
    `Hi ${name}, your skincare-focused content themes may align with GlowCare's upcoming collaboration in India. We would love to explore a potential partnership around a product review or routine walkthrough. Would you be open to learning more about the brief?`,
  (name: string) =>
    `Hello ${name}, we have been reviewing Beauty & Skincare creators in India for the GlowCare campaign and appreciate how clearly you cover daily routines. We would welcome the chance to send a trial kit and discuss a paid collaboration. Should we share the overview?`,
  (name: string) =>
    `Hi ${name}, your educational skincare tutorials stand out as a strong match for GlowCare's upcoming India Skincare launch. We are putting together a focused group of micro-influencers for honest product feedback and UGC. Would you like to see our collaboration details?`,
];
