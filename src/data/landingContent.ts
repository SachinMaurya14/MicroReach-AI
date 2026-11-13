import {
  AudienceTabContent,
  DemoCreatorRow,
  FAQItem,
  FeatureTabItem,
  ResourceItem,
  UseCaseItem,
  WorkflowStep,
} from '../types/landing';

export const DEMO_CREATOR_ROWS: DemoCreatorRow[] = [
  {
    id: 'creator-a',
    name: 'Creator A',
    handle: '@creator_a_skincare',
    platform: 'YouTube',
    geography: 'India',
    category: 'Beauty & Skincare',
    followers: '24.5K',
    followersCount: 24500,
    engagementEstimate: '3.4% est.',
    engagementValue: 3.4,
    contactEmail: 'creator-a-demo@example.invalid',
    qualification: 'Qualified',
    outreachStatus: 'Approved',
    fitScoreDemo: 88,
    summaryChecks: {
      nicheMatch: 'Skincare routines & ingredient reviews',
      followerRange: 'Within 5K - 100K range',
      engagement: 'Above 2% public estimate threshold',
      contentRelevance: 'Consistent skincare focus',
      contactAvailability: 'Public business email listed',
    },
  },
  {
    id: 'creator-b',
    name: 'Creator B',
    handle: '@creator_b_routines',
    platform: 'YouTube',
    geography: 'India',
    category: 'Beauty & Skincare',
    followers: '58.2K',
    followersCount: 58200,
    engagementEstimate: '2.8% est.',
    engagementValue: 2.8,
    contactEmail: 'Not Found',
    qualification: 'Review',
    outreachStatus: 'Manual DM',
    fitScoreDemo: 74,
    summaryChecks: {
      nicheMatch: 'Daily skincare & product comparisons',
      followerRange: 'Within 5K - 100K range',
      engagement: 'Above 2% public estimate threshold',
      contentRelevance: 'Relevant beauty tutorials',
      contactAvailability: 'Email Not Found - manual DM path',
    },
  },
  {
    id: 'creator-c',
    name: 'Creator C',
    handle: '@creator_c_glow',
    platform: 'YouTube',
    geography: 'India',
    category: 'Beauty & Skincare',
    followers: '14.1K',
    followersCount: 14100,
    engagementEstimate: '4.1% est.',
    engagementValue: 4.1,
    contactEmail: 'creator-c-demo@example.invalid',
    qualification: 'Qualified',
    outreachStatus: 'Pending Approval',
    fitScoreDemo: 92,
    summaryChecks: {
      nicheMatch: 'Barrier repair & sensitive skin',
      followerRange: 'Within 5K - 100K range',
      engagement: 'Strong public comment & like ratio',
      contentRelevance: 'High alignment with GlowCare',
      contactAvailability: 'Public channel email available',
    },
  },
  {
    id: 'creator-d',
    name: 'Creator D',
    handle: '@creator_d_vlogs',
    platform: 'YouTube',
    geography: 'India',
    category: 'Beauty & Skincare',
    followers: '3.2K',
    followersCount: 3200,
    engagementEstimate: '1.3% est.',
    engagementValue: 1.3,
    contactEmail: 'Not Found',
    qualification: 'Failed',
    outreachStatus: 'Skipped',
    fitScoreDemo: 41,
    summaryChecks: {
      nicheMatch: 'Mixed lifestyle & occasional beauty',
      followerRange: 'Followers below 5K threshold',
      engagement: 'Low estimated engagement (< 2%)',
      contentRelevance: 'Content not sufficiently relevant',
      contactAvailability: 'Not Found',
    },
  },
];

export const FEATURE_TABS: FeatureTabItem[] = [
  {
    id: 'discovery',
    label: 'Creator Discovery',
    title: 'Discover creators who fit your brand',
    description:
      'Find relevant micro-influencers from YouTube and other permitted public sources using niche-based discovery tailored to your campaign brief.',
    benefits: [
      'Filter by niche, preferred geography, and creator size range',
      'Initial assignment test run targets at least 50 genuine creator profiles',
      'Actual discovery volume depends on API access and available public data',
    ],
    ctaLabel: 'Explore Discovery Flow',
    ctaTarget: 'how-it-works',
  },
  {
    id: 'filtering',
    label: 'Smart Filtering',
    title: 'Qualify creators with transparent criteria',
    description:
      'Automatically assess creator fit using public metrics, category relevance, geography, and engagement estimates with clear pass and rejection reasons.',
    benefits: [
      'Configure Beauty & Skincare, India preferred, 5K-100K followers, >= 2% estimate',
      'Inspect explicit rejection reasons rather than opaque black-box scores',
      'Engagement metrics are clearly labelled as public estimates, not private analytics',
    ],
    ctaLabel: 'See Qualification Rules',
    ctaTarget: 'audience',
  },
  {
    id: 'enrichment',
    label: 'Profile Enrichment',
    title: 'Know more than just follower counts',
    description:
      'Collect accessible profile information and maintain source-aware creator records without ever inventing or guessing missing details.',
    benefits: [
      'Store name, platform, URL, follower count, niche, and content themes',
      'Missing emails appear as Not Found; unavailable demographics show Not Available',
      'Preserve data source references and verification state on every record',
    ],
    ctaLabel: 'Review Data Standards',
    ctaTarget: 'why-microreach',
  },
  {
    id: 'email-pitch',
    label: 'AI Email Pitch',
    title: 'Generate outreach that feels personal',
    description:
      'Create tailored 60-90 word collaboration pitches grounded strictly in verified creator profile details and your actual campaign context.',
    benefits: [
      'Generates concise 60-90 word pitches with live word count visibility',
      'Never fabricates recent posts, personal stories, or unverified metrics',
      'Full inline message editing before moving to human approval',
    ],
    ctaLabel: 'Explore Personalization',
    ctaTarget: 'how-it-works',
  },
  {
    id: 'instagram-dm',
    label: 'Instagram DM',
    title: 'Start conversations with natural DMs',
    description:
      'Draft concise 15-30 word Instagram messages shaped by the creator niche and public content themes, ready for compliant manual sending.',
    benefits: [
      'Short 15-30 word format designed for direct creator reading',
      'One-click copy workflow for fast manual outreach execution',
      'Explicitly manual unless an officially permitted API integration is configured',
    ],
    ctaLabel: 'View Workflow Safeguards',
    ctaTarget: 'faq',
  },
  {
    id: 'outreach-tracker',
    label: 'Outreach Tracker',
    title: 'Keep every outreach action organized',
    description:
      'Review pending approvals, track sending status in simulation or live mode, prevent duplicate outreach, and keep a clean audit trail.',
    benefits: [
      'Approval-first queue ensures no message leaves without human sign-off',
      'Clear states: Draft, Pending Approval, Approved, Sent, Failed, Skipped, Manual DM',
      'Built-in duplicate outreach protection across campaign runs',
    ],
    ctaLabel: 'Get Early Access Updates',
    ctaTarget: 'pricing',
  },
];

export const AUDIENCE_TABS: AudienceTabContent[] = [
  {
    id: 'founders',
    label: 'Brand Founders',
    headline: 'Run focused creator partnerships without building spreadsheets',
    benefits: [
      {
        title: 'Discover relevant creators without manual searching',
        detail: 'Surface niche-aligned creators using structured category and geography filters.',
      },
      {
        title: 'Evaluate profiles using transparent filters',
        detail: 'See why each creator passed or failed qualification before investing time.',
      },
      {
        title: 'Create personalized collaboration pitches',
        detail: 'Draft concise emails and DMs grounded in real profile data and campaign context.',
      },
      {
        title: 'Manage every outreach action in one place',
        detail: 'Review approvals, monitor status, and prevent duplicate outreach cleanly.',
      },
    ],
    previewTitle: 'Qualification Filter Preview — GlowCare Demo',
    rows: [
      {
        creator: 'Creator A',
        followers: '24.5K',
        engagement: '3.4% est.',
        qualification: 'Passed',
        reason: 'Niche relevance passed',
      },
      {
        creator: 'Creator B',
        followers: '58.2K',
        engagement: '2.8% est.',
        qualification: 'Passed',
        reason: 'Contact unavailable (Manual DM)',
      },
      {
        creator: 'Creator D',
        followers: '3.2K',
        engagement: '1.3% est.',
        qualification: 'Failed',
        reason: 'Followers below 5K',
      },
      {
        creator: 'Creator E',
        followers: '72.0K',
        engagement: '1.1% est.',
        qualification: 'Failed',
        reason: 'Low engagement estimate',
      },
    ],
  },
  {
    id: 'marketers',
    label: 'Growth Marketers',
    headline: 'Standardize creator evaluation and keep outreach workflows repeatable',
    benefits: [
      {
        title: 'Standardize creator qualification',
        detail: 'Apply consistent follower, geography, and engagement estimate thresholds across campaigns.',
      },
      {
        title: 'Compare public engagement signals',
        detail: 'Evaluate public like and comment ratios alongside transparent data-source notes.',
      },
      {
        title: 'Review relevant creator information',
        detail: 'Inspect verified fields and missing-data indicators without guesswork.',
      },
      {
        title: 'Keep campaigns organized',
        detail: 'Track every draft, approval, sent record, and manual DM in one queue.',
      },
    ],
    previewTitle: 'Campaign Qualification Summary — Illustrative',
    rows: [
      {
        creator: 'Creator C',
        followers: '14.1K',
        engagement: '4.1% est.',
        qualification: 'Passed',
        reason: 'Niche relevance passed',
      },
      {
        creator: 'Creator F',
        followers: '142.0K',
        engagement: '3.2% est.',
        qualification: 'Failed',
        reason: 'Followers above 100K',
      },
      {
        creator: 'Creator G',
        followers: '19.8K',
        engagement: '2.9% est.',
        qualification: 'Passed',
        reason: 'Niche relevance passed',
      },
      {
        creator: 'Creator H',
        followers: '11.4K',
        engagement: '0.9% est.',
        qualification: 'Failed',
        reason: 'Low engagement estimate',
      },
    ],
  },
  {
    id: 'agencies',
    label: 'Agency Leads',
    headline: 'Deliver structured, transparent creator outreach across campaigns',
    benefits: [
      {
        title: 'Manage repeatable discovery workflows',
        detail: 'Reuse qualification logic and campaign briefs cleanly across client niches.',
      },
      {
        title: 'Maintain organized creator records',
        detail: 'Keep profile URLs, contact status, and data verification timestamps clearly structured.',
      },
      {
        title: 'Review personalized outreach at scale',
        detail: 'Verify every AI-drafted pitch in an approval-first queue before sending.',
      },
      {
        title: 'Track work across campaign stages',
        detail: 'Monitor Draft, Pending Approval, Approved, Sent, and Manual DM states cleanly.',
      },
    ],
    previewTitle: 'Agency Qualification Audit — Illustrative',
    rows: [
      {
        creator: 'Creator A',
        followers: '24.5K',
        engagement: '3.4% est.',
        qualification: 'Passed',
        reason: 'Niche relevance passed',
      },
      {
        creator: 'Creator J',
        followers: '41.0K',
        engagement: '2.5% est.',
        qualification: 'Passed',
        reason: 'Contact unavailable',
      },
      {
        creator: 'Creator K',
        followers: '9.6K',
        engagement: 'N/A',
        qualification: 'Failed',
        reason: 'Insufficient public metrics',
      },
      {
        creator: 'Creator L',
        followers: '31.5K',
        engagement: '2.4% est.',
        qualification: 'Failed',
        reason: 'Content not sufficiently relevant',
      },
    ],
  },
];

export const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    stepNumber: '01',
    title: 'Discover',
    description: 'Find relevant creators from permitted public sources.',
    iconName: 'search',
  },
  {
    stepNumber: '02',
    title: 'Collect',
    description: 'Retrieve accessible profile details and public metrics.',
    iconName: 'database',
  },
  {
    stepNumber: '03',
    title: 'Qualify',
    description: 'Evaluate creators using transparent campaign criteria.',
    iconName: 'filter',
  },
  {
    stepNumber: '04',
    title: 'Enrich',
    description: 'Record verified contact details and content context.',
    iconName: 'user-plus',
  },
  {
    stepNumber: '05',
    title: 'Personalize',
    description: 'Generate email pitches and Instagram DMs with AI.',
    iconName: 'sparkles',
  },
  {
    stepNumber: '06',
    title: 'Review & Track',
    description: 'Approve outreach and record sending activity cleanly.',
    iconName: 'check-circle',
  },
];

export const MANUAL_APPROACH_ITEMS: string[] = [
  'Search creators across multiple sources',
  'Track information in spreadsheets',
  'Manually evaluate content relevance',
  'Write each collaboration email from scratch',
  'Remember follow-ups independently',
  'Maintain scattered outreach records',
];

export const MICROREACH_APPROACH_ITEMS: string[] = [
  'Centralized creator discovery',
  'Structured qualification criteria',
  'Source-aware profile enrichment',
  'AI-assisted personalized messaging',
  'Approval-first email workflow',
  'Centralized outreach tracking',
];

export const USE_CASES: UseCaseItem[] = [
  {
    id: 'beauty-skincare',
    title: 'Beauty & Skincare',
    description:
      'Discover creators who talk about skincare routines, product reviews, beauty tips and personal care.',
    statusLabel: 'Initial Focus Category',
    isPrimary: true,
    campaignExample: 'GlowCare — India Skincare Influencer Campaign (Fictional Demo Brand)',
  },
  {
    id: 'fashion',
    title: 'Fashion',
    description: 'Style guides, capsule wardrobe lookbooks, and everyday apparel reviews.',
    statusLabel: 'Expandable Use Case',
  },
  {
    id: 'fitness',
    title: 'Fitness',
    description: 'Workout routines, training education, and wellness product walkthroughs.',
    statusLabel: 'Expandable Use Case',
  },
  {
    id: 'technology',
    title: 'Technology',
    description: 'Consumer gear tutorials, software walkthroughs, and desk setup creators.',
    statusLabel: 'Expandable Use Case',
  },
  {
    id: 'lifestyle',
    title: 'Lifestyle',
    description: 'Daily routines, home organization, and practical living recommendations.',
    statusLabel: 'Expandable Use Case',
  },
  {
    id: 'gaming',
    title: 'Gaming',
    description: 'Hardware impressions, indie spotlights, and community stream creators.',
    statusLabel: 'Expandable Use Case',
  },
];

export const RESOURCES_LIST: ResourceItem[] = [
  {
    id: 'discovery-guide',
    category: 'Discovery',
    title: 'Micro-Influencer Discovery Guide',
    description:
      'How to identify relevant creators from public sources using clear niche keywords, geography preferences, and subscriber ranges.',
    readActionLabel: 'Read Guide',
    sections: [
      {
        heading: 'Start with specific content themes',
        body: 'Broad keywords return noisy lists. Define sub-topics such as barrier repair, daily sunscreen routines, or acne-safe skincare so public discovery surfaces creators already educating your target audience.',
      },
      {
        heading: 'Respect platform boundaries',
        body: 'Automated discovery relies on permitted APIs such as YouTube Data API v3. Where external platforms restrict automated scraping, build compliant manual curation workflows instead of brittle workarounds.',
      },
      {
        heading: 'Right-size creator cohorts',
        body: 'Micro-influencers between 5,000 and 100,000 subscribers often maintain focused niche communities. Validate both channel activity recency and thematic consistency before enrichment.',
      },
    ],
  },
  {
    id: 'engagement-guide',
    category: 'Qualification',
    title: 'Understanding Engagement',
    description:
      'How to interpret public engagement estimates and qualification criteria without confusing public ratios for private creator analytics.',
    readActionLabel: 'Read Guide',
    sections: [
      {
        heading: 'Public estimates vs. studio analytics',
        body: 'External tools can only calculate ratios from publicly visible likes, comments, views, and subscriber counts. Treat these numbers as directional screening estimates rather than official YouTube Studio retention or reach figures.',
      },
      {
        heading: 'Clear pass and rejection thresholds',
        body: 'Document your minimum criteria upfront—for example, 5K-100K followers, India preferred, and at least 2% estimated public engagement—and log exact rejection reasons when a creator does not qualify.',
      },
      {
        heading: 'Look beyond a single metric',
        body: 'A channel with moderate views but thoughtful comment discussions about ingredients may be a stronger skincare partner than a channel with high passive views and minimal topic relevance.',
      },
    ],
  },
  {
    id: 'outreach-guide',
    category: 'Messaging',
    title: 'Personalized Outreach Guide',
    description:
      'How to write relevant and respectful collaboration messages grounded in real creator context and an approval-first sending flow.',
    readActionLabel: 'Read Guide',
    sections: [
      {
        heading: 'Keep email pitches concise (60-90 words)',
        body: 'Respect creator time by stating why their content niche aligns with your product, what the collaboration involves, and a simple next step in 60-90 words.',
      },
      {
        heading: 'Never invent fake personal observations',
        body: 'Only reference verified public themes and actual campaign context. Hallucinated compliments about unverified posts erode trust immediately.',
      },
      {
        heading: 'Approve every outbound message',
        body: 'Use AI to accelerate drafting, then require human review before sending emails or copying short 15-30 word Instagram DMs for manual outreach.',
      },
    ],
  },
];

export const FAQ_ITEMS: FAQItem[] = [
  {
    id: 'faq-1',
    question: 'What is MicroReach AI?',
    answer:
      'MicroReach AI is an AI-powered micro-influencer discovery, qualification, profile enrichment, and outreach platform. It connects creator sourcing, transparent qualification filtering, source-aware profile records, AI-assisted message drafting, and approval-first outreach tracking in one structured workflow.',
  },
  {
    id: 'faq-2',
    question: 'How does influencer discovery work?',
    answer:
      'Discovery queries permitted public sources—primarily YouTube Data API v3 in the initial implementation—using your campaign niche, geography preferences, and follower range. The initial assignment test workflow targets at least 50 genuine creator profiles, with actual volume depending on API access and available public data.',
  },
  {
    id: 'faq-3',
    question: 'What defines a micro-influencer?',
    answer:
      'For the initial Beauty & Skincare campaign workflow, MicroReach AI targets creators with 5,000 to 100,000 followers or subscribers and at least 2% estimated public engagement. Qualification thresholds are structured so teams can adjust criteria cleanly per campaign.',
  },
  {
    id: 'faq-4',
    question: 'Which platforms are supported?',
    answer:
      'YouTube Data API v3 is the primary automated discovery source in the initial architecture. Instagram data access is restricted by platform policies and uses permitted manual workflows unless an officially supported integration is configured.',
  },
  {
    id: 'faq-5',
    question: 'How does creator qualification work?',
    answer:
      'Each discovered creator is evaluated against transparent criteria including niche relevance, preferred geography, follower range (5K-100K), and estimated public engagement (2% minimum). Creators receive a clear Passed, Review, or Failed outcome along with explicit reasons such as Followers below 5K or Low estimated engagement.',
  },
  {
    id: 'faq-6',
    question: "What happens when an influencer's email cannot be found?",
    answer:
      'If no public contact email is available in permitted profile sources, MicroReach AI records the field explicitly as "Not Found" and never guesses or fabricates an address. Similarly, unavailable demographic fields are marked "Not Available," and the creator can be routed to a Manual DM workflow.',
  },
  {
    id: 'faq-7',
    question: 'How are AI messages personalized?',
    answer:
      'AI drafts 60-90 word email pitches and 15-30 word Instagram DMs strictly from verified creator profile attributes (such as niche, platform, and public content themes) combined with your campaign brief. Messages never invent fake recent posts or personal details.',
  },
  {
    id: 'faq-8',
    question: 'Can MicroReach AI automatically send Instagram DMs?',
    answer:
      'No. Because unrestricted automated Instagram DM sending is not permitted without official API authorization, Instagram DM outreach is structured as a respectful manual workflow—generating a concise 15-30 word draft with a copy button and Manual DM tracking state.',
  },
  {
    id: 'faq-9',
    question: 'Do users approve emails before sending?',
    answer:
      'Yes. MicroReach AI enforces an approval-first workflow. Drafted pitches enter Pending Approval so a human can edit or approve them before sending, with simulation/test mode supported initially and duplicate outreach prevention built into the queue.',
  },
  {
    id: 'faq-10',
    question: 'Does the application use real influencer data?',
    answer:
      'This public marketing website displays clearly labelled illustrative demo data (such as Creator A-D and the fictional GlowCare campaign) to preview the interface. Live creator discovery using YouTube Data API v3 and database persistence will operate in the connected application phase.',
  },
];
