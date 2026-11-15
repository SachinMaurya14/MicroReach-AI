import {
  CampaignContentIdeaRow,
  ChannelAvailabilityItem,
  ContactChannelRecord,
  ContactChannelType,
  CreatorIncentiveRow,
  Database,
  OutreachChannel,
  SendingMethod,
  UnifiedOutreachStatus,
  WorkspaceSettingsRow,
  WorkspaceTaskRow,
} from '../../types/database';
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from './client';

export type CampaignDbRow = Database['public']['Tables']['campaigns']['Row'];
export type InfluencerDbRow = Database['public']['Tables']['influencers']['Row'];
export type CampaignInfluencerDbRow =
  Database['public']['Tables']['campaign_influencers']['Row'];
export type DiscoveryRunDbRow = Database['public']['Tables']['discovery_runs']['Row'];
export type OutreachMessageDbRow =
  Database['public']['Tables']['outreach_messages']['Row'];
export type OutreachLogDbRow = Database['public']['Tables']['outreach_logs']['Row'];

export interface WorkspaceCreatorApiItem {
  influencer: InfluencerDbRow;
  campaignInfluencer: CampaignInfluencerDbRow | null;
  emailMessage: OutreachMessageDbRow | null;
  instagramDmMessage: OutreachMessageDbRow | null;
  linkedinMessage?: OutreachMessageDbRow | null;
  youtubeContactMessage?: OutreachMessageDbRow | null;
  latestOutreachLog: OutreachLogDbRow | null;
  contactChannels?: ContactChannelRecord[];
  channelAvailability?: ChannelAvailabilityItem[];
  recommendedChannel?: OutreachChannel | null;
  preferredChannel?: OutreachChannel | null;
}

export interface GmailStatusApiResponse {
  oauthConfigured: boolean;
  encryptionConfigured?: boolean;
  connected: boolean;
  senderEmail: string | null;
  outreachMode: 'simulation' | 'live';
  scope?: string;
  callbackPath?: string;
  missingEnvVars?: string[];
  message: string;
}

export type OutreachSuppressionDbRow =
  Database['public']['Tables']['outreach_suppressions']['Row'];

export async function fetchCampaignsApi(init = true): Promise<CampaignDbRow[]> {
  const res = await apiGet<{ campaigns: CampaignDbRow[] }>(
    `/api/campaigns${init ? '?init=true' : ''}`
  );
  return res.campaigns ?? [];
}

export async function createCampaignApi(input: {
  name: string;
  brand_name?: string;
  niche: string;
  target_country?: string;
  min_followers?: number;
  max_followers?: number;
  min_engagement_rate?: number;
  status?: 'draft' | 'active' | 'paused' | 'completed';
  product_description?: string | null;
  target_platforms?: string[];
  collaboration_type?: string | null;
  campaign_brief?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  target_creator_count?: number | null;
}): Promise<CampaignDbRow> {
  const res = await apiPost<{ campaign: CampaignDbRow }>('/api/campaigns', input);
  return res.campaign;
}

export async function updateCampaignApi(
  id: string,
  patch: Partial<{
    name: string;
    brand_name: string;
    niche: string;
    target_country: string;
    min_followers: number;
    max_followers: number;
    min_engagement_rate: number;
    status: 'draft' | 'active' | 'paused' | 'completed';
    product_description: string | null;
    target_platforms: string[];
    collaboration_type: string | null;
    campaign_brief: string | null;
    start_date: string | null;
    end_date: string | null;
    target_creator_count: number | null;
    archived_at: string | null;
  }>
): Promise<CampaignDbRow> {
  const res = await apiPatch<{ campaign: CampaignDbRow }>(`/api/campaigns/${id}`, patch);
  return res.campaign;
}

export async function deleteCampaignApi(id: string): Promise<void> {
  await apiDelete(`/api/campaigns/${id}`, { confirmDelete: true });
}

export async function fetchInfluencersApi(params?: {
  campaignId?: string;
  search?: string;
  niche?: string;
  country?: string;
  platform?: string;
  qualificationStatus?: string;
  minFollowers?: number;
  maxFollowers?: number;
  minEngagement?: number;
  sortBy?: string;
  limit?: number;
}): Promise<{ items: WorkspaceCreatorApiItem[]; totalCount: number }> {
  const qs = new URLSearchParams();
  if (params?.campaignId) qs.set('campaignId', params.campaignId);
  if (params?.search) qs.set('search', params.search);
  if (params?.niche && params.niche !== 'All') qs.set('niche', params.niche);
  if (params?.country && params.country !== 'All') qs.set('country', params.country);
  if (params?.platform && params.platform !== 'all') qs.set('platform', params.platform);
  if (params?.qualificationStatus && params.qualificationStatus !== 'all') {
    qs.set('qualificationStatus', params.qualificationStatus);
  }
  if (params?.minFollowers) qs.set('minFollowers', String(params.minFollowers));
  if (params?.maxFollowers) qs.set('maxFollowers', String(params.maxFollowers));
  if (params?.minEngagement) qs.set('minEngagement', String(params.minEngagement));
  if (params?.sortBy) qs.set('sortBy', params.sortBy);
  if (params?.limit) qs.set('limit', String(params.limit));

  const queryStr = qs.toString();
  return apiGet<{ items: WorkspaceCreatorApiItem[]; totalCount: number }>(
    `/api/influencers${queryStr ? `?${queryStr}` : ''}`
  );
}

export function buildCreatorsExportCsvUrl(params?: {
  campaignId?: string;
  search?: string;
  niche?: string;
  country?: string;
  platform?: string;
  qualificationStatus?: string;
  minEngagement?: number;
  sortBy?: string;
}): string {
  const qs = new URLSearchParams();
  if (params?.campaignId) qs.set('campaignId', params.campaignId);
  if (params?.search) qs.set('search', params.search);
  if (params?.niche && params.niche !== 'All') qs.set('niche', params.niche);
  if (params?.country && params?.country !== 'All') qs.set('country', params.country);
  if (params?.platform && params?.platform !== 'all') qs.set('platform', params.platform);
  if (params?.qualificationStatus && params.qualificationStatus !== 'all') {
    qs.set('qualificationStatus', params.qualificationStatus);
  }
  if (params?.minEngagement && params.minEngagement > 0) {
    qs.set('minEngagement', String(params.minEngagement));
  }
  if (params?.sortBy) qs.set('sortBy', params.sortBy);
  const queryStr = qs.toString();
  return `/api/influencers/export.csv${queryStr ? `?${queryStr}` : ''}`;
}

export function buildOutreachLogsExportCsvUrl(campaignId?: string): string {
  const qs = campaignId ? `?campaignId=${encodeURIComponent(campaignId)}` : '';
  return `/api/outreach/logs/export.csv${qs}`;
}

export function buildMessagesExportCsvUrl(params?: {
  campaignId?: string;
  channel?: string;
  status?: string;
}): string {
  const qs = new URLSearchParams();
  if (params?.campaignId) qs.set('campaignId', params.campaignId);
  if (params?.channel && params.channel !== 'all') qs.set('channel', params.channel);
  if (params?.status && params.status !== 'all') qs.set('status', params.status);
  const queryStr = qs.toString();
  return `/api/messages/export.csv${queryStr ? `?${queryStr}` : ''}`;
}

export async function addInfluencersToCampaignApi(
  campaignId: string,
  influencerIds: string[]
): Promise<{ added: number }> {
  return apiPost<{ added: number }>(`/api/campaigns/${campaignId}/influencers`, {
    influencerIds,
  });
}

export async function updateInfluencerManualApi(
  influencerId: string,
  patch: {
    name?: string;
    contactEmail?: string;
    emailStatus?: 'verified' | 'unverified' | 'not_found';
    qualificationStatus?: 'discovered' | 'qualified' | 'rejected' | 'needs_review';
    qualificationReason?: string;
    campaignInfluencerId?: string;
  }
): Promise<WorkspaceCreatorApiItem> {
  return apiPatch<WorkspaceCreatorApiItem>(`/api/influencers/${influencerId}`, patch);
}

export async function updateCreatorChannelsApi(
  influencerId: string,
  input: {
    preferredChannel?: OutreachChannel;
    addChannel?: {
      type: ContactChannelType;
      value: string;
      evidence?: string;
    };
  }
): Promise<WorkspaceCreatorApiItem> {
  return apiPatch<WorkspaceCreatorApiItem>(`/api/influencers/${influencerId}/channels`, input);
}

export interface EnrichmentOutcomeApi {
  creator: WorkspaceCreatorApiItem;
  enrichmentStatus: 'enriched' | 'partial' | 'failed';
  emailFound: boolean;
  emailSource: string | null;
  websiteFound: boolean;
  themesCount: number;
  enrichedAt: string;
  notes: string[];
}

export async function enrichInfluencerApi(
  influencerId: string,
  useAiThemes = true
): Promise<EnrichmentOutcomeApi> {
  return apiPost<EnrichmentOutcomeApi>(`/api/influencers/${influencerId}/enrich`, {
    useAiThemes,
  });
}

export async function enrichInfluencersBatchApi(
  influencerIds: string[],
  useAiThemes = true
): Promise<{
  total: number;
  enrichedCount: number;
  partialCount: number;
  failedCount: number;
  results: EnrichmentOutcomeApi[];
}> {
  return apiPost('/api/influencers/enrich-batch', { influencerIds, useAiThemes });
}

export async function reEvaluateInfluencersApi(campaignId?: string): Promise<{
  campaignId: string;
  campaignName: string;
  totalEvaluated: number;
  deduplicatedCount: number;
  before: { qualified: number; needs_review: number; rejected: number; discovered: number };
  after: { qualified: number; needs_review: number; rejected: number };
}> {
  return apiPost('/api/influencers/re-evaluate', { campaignId });
}

export async function removeCreatorFromCampaignApi(
  campaignInfluencerId: string
): Promise<void> {
  await apiDelete(`/api/influencers/campaign-link/${campaignInfluencerId}`, {
    confirmDelete: true,
  });
}

export interface DiscoveryPersistenceInfo {
  persisted: boolean;
  savedCount: number;
  verifiedCount: number;
  warning: string | null;
}

export interface DiscoveryApiResponse {
  run: DiscoveryRunDbRow;
  creators: WorkspaceCreatorApiItem[];
  savedCount?: number;
  persistence?: DiscoveryPersistenceInfo;
  stats?: {
    rawCount: number;
    uniqueCount: number;
    duplicateCount: number;
    qualifiedCount: number;
    needsReviewCount: number;
    rejectedCount: number;
    persistedCount: number;
    persistenceFailureCount: number;
  };
}

export async function startYouTubeDiscoveryApi(input: {
  campaignId?: string;
  queries?: string[];
  targetCount?: number;
  fetchWebsites?: boolean;
  minFollowers?: number;
  maxFollowers?: number;
  minEngagementRate?: number;
  targetCountry?: string | null;
  niche?: string;
}): Promise<DiscoveryApiResponse> {
  return apiPost<DiscoveryApiResponse>('/api/discovery/youtube', input);
}

export async function startInstagramDiscoveryApi(input: {
  campaignId?: string;
  queries?: string[];
  targetCount?: number;
  minFollowers?: number;
  maxFollowers?: number;
  targetCountry?: string | null;
  niche?: string;
}): Promise<DiscoveryApiResponse> {
  return apiPost<DiscoveryApiResponse>('/api/discovery/instagram', input);
}

export async function resumeDiscoveryRunApi(runId: string): Promise<DiscoveryApiResponse> {
  return apiPost<DiscoveryApiResponse>(`/api/discovery/runs/${runId}/resume`);
}

export async function fetchDiscoveryRunApi(runId: string): Promise<DiscoveryRunDbRow> {
  const res = await apiGet<{ run: DiscoveryRunDbRow }>(`/api/discovery/runs/${runId}`);
  return res.run;
}

export async function fetchDiscoveryRunsApi(): Promise<DiscoveryRunDbRow[]> {
  const res = await apiGet<{ runs: DiscoveryRunDbRow[] }>('/api/discovery/runs');
  return res.runs ?? [];
}

export async function cancelDiscoveryRunApi(runId: string): Promise<DiscoveryRunDbRow> {
  const res = await apiPost<{ run: DiscoveryRunDbRow }>(
    `/api/discovery/runs/${runId}/cancel`
  );
  return res.run;
}

export interface WorkspaceMessageApiItem {
  message: OutreachMessageDbRow;
  influencer: InfluencerDbRow;
  campaign: CampaignDbRow;
  campaignInfluencer: CampaignInfluencerDbRow;
  latestLog: OutreachLogDbRow | null;
  sendingMethod?: SendingMethod;
  unifiedStatus?: UnifiedOutreachStatus;
  recipientContact?: string | null;
  recipientUrl?: string | null;
}

export async function fetchMessagesApi(params?: {
  campaignId?: string;
  influencerId?: string;
  channel?: string;
  status?: string;
  limit?: number;
}): Promise<WorkspaceMessageApiItem[]> {
  const qs = new URLSearchParams();
  if (params?.campaignId) qs.set('campaignId', params.campaignId);
  if (params?.influencerId) qs.set('influencerId', params.influencerId);
  if (params?.channel && params.channel !== 'all') qs.set('channel', params.channel);
  if (params?.status && params.status !== 'all') qs.set('status', params.status);
  if (params?.limit) qs.set('limit', String(params.limit));
  const queryStr = qs.toString();
  const res = await apiGet<{ messages: WorkspaceMessageApiItem[] }>(
    `/api/messages${queryStr ? `?${queryStr}` : ''}`
  );
  return res.messages ?? [];
}

export async function generateEmailPitchApi(
  campaignInfluencerId: string,
  collaborationType?: string
): Promise<OutreachMessageDbRow> {
  const res = await apiPost<{ message: OutreachMessageDbRow }>(
    '/api/messages/generate-email',
    { campaignInfluencerId, collaborationType }
  );
  return res.message;
}

export async function generateInstagramDmApi(
  campaignInfluencerId: string,
  collaborationType?: string
): Promise<OutreachMessageDbRow> {
  const res = await apiPost<{ message: OutreachMessageDbRow }>(
    '/api/messages/generate-instagram-dm',
    { campaignInfluencerId, collaborationType }
  );
  return res.message;
}

export async function generateLinkedInMessageApi(
  campaignInfluencerId: string,
  collaborationType?: string
): Promise<OutreachMessageDbRow> {
  const res = await apiPost<{ message: OutreachMessageDbRow }>(
    '/api/messages/generate-linkedin',
    { campaignInfluencerId, collaborationType }
  );
  return res.message;
}

export async function generateYouTubeContactApi(
  campaignInfluencerId: string,
  collaborationType?: string
): Promise<OutreachMessageDbRow> {
  const res = await apiPost<{ message: OutreachMessageDbRow }>(
    '/api/messages/generate-youtube-contact',
    { campaignInfluencerId, collaborationType }
  );
  return res.message;
}

export async function saveManualDraftApi(input: {
  campaignInfluencerId: string;
  channel: OutreachChannel;
  subject?: string | null;
  messageBody: string;
  collaborationType?: string;
  status?: 'draft' | 'pending_review' | 'approved';
}): Promise<OutreachMessageDbRow> {
  const res = await apiPost<{ message: OutreachMessageDbRow }>(
    '/api/messages/manual-draft',
    input
  );
  return res.message;
}

export async function generateFollowUpDraftApi(input: {
  campaignInfluencerId: string;
  channel: OutreachChannel;
  previousMessage?: string;
}): Promise<{
  subject: string | null;
  body: string;
  wordCount: number;
  personalizationSignals: string[];
  modelUsed: string;
}> {
  return apiPost('/api/messages/generate-followup', input);
}

export async function generateContentIdeasAiApi(input: {
  campaignName: string;
  brandName: string;
  niche: string;
  productDescription?: string | null;
  campaignBrief?: string | null;
  collaborationType?: string | null;
  creatorName?: string | null;
  creatorThemes?: string[];
}): Promise<{
  ideas: Array<{ title: string; format: string; angle: string; contentThemes: string[] }>;
  modelUsed: string;
}> {
  return apiPost('/api/ai/content-ideas', input);
}

export async function generateCampaignSuggestionsAiApi(input: {
  campaignName: string;
  brandName: string;
  niche: string;
  targetCountry?: string | null;
  productDescription?: string | null;
  collaborationType?: string | null;
}): Promise<{
  discoveryQueries: string[];
  messagingAngles: string[];
  proposalSummary: string;
  modelUsed: string;
}> {
  return apiPost('/api/ai/campaign-suggestions', input);
}

export async function updateMessageDraftApi(
  messageId: string,
  patch: {
    subject?: string | null;
    messageBody?: string;
    approve?: boolean;
    reject?: boolean;
    rejectedReason?: string;
    status?: OutreachMessageDbRow['status'];
    workflowStatus?: UnifiedOutreachStatus;
  }
): Promise<OutreachMessageDbRow> {
  const res = await apiPatch<{ message: OutreachMessageDbRow }>(
    `/api/messages/${messageId}`,
    patch
  );
  return res.message;
}

export async function simulateOutreachApi(input: {
  campaignInfluencerId: string;
  outreachMessageId?: string;
  subject?: string;
  messageBody?: string;
  idempotencyKey?: string;
}): Promise<{ mode: string; status: string; message: string; log: OutreachLogDbRow }> {
  return apiPost('/api/outreach/simulate', input);
}

export async function sendLiveOutreachApi(input: {
  campaignInfluencerId: string;
  outreachMessageId: string;
  confirmSend: boolean;
  idempotencyKey?: string;
}): Promise<{ mode: string; status: string; message: string; log: OutreachLogDbRow }> {
  return apiPost('/api/outreach/send', input);
}

export async function logManualInstagramDmApi(input: {
  campaignInfluencerId: string;
  outreachMessageId?: string;
  dmText: string;
  stage?: 'ready_for_manual_sending' | 'manually_sent' | 'failed' | 'skipped';
}): Promise<{ mode: string; status: string; message: string; log: OutreachLogDbRow }> {
  return apiPost('/api/outreach/instagram-manual', input);
}

export async function logManualMultiChannelApi(input: {
  campaignInfluencerId: string;
  channel: 'instagram_dm' | 'linkedin_message' | 'youtube_contact';
  outreachMessageId?: string;
  messageText: string;
  subject?: string | null;
  stage?: 'ready_for_manual_sending' | 'manually_sent' | 'failed' | 'skipped';
}): Promise<{ mode: string; status: string; message: string; log: OutreachLogDbRow }> {
  return apiPost('/api/outreach/manual-channel', input);
}

export async function fetchOutreachLogsApi(
  campaignId?: string
): Promise<OutreachLogDbRow[]> {
  const qs = campaignId ? `?campaignId=${encodeURIComponent(campaignId)}` : '';
  const res = await apiGet<{ logs: OutreachLogDbRow[] }>(`/api/outreach/logs${qs}`);
  return res.logs ?? [];
}

export async function fetchSuppressionsApi(): Promise<OutreachSuppressionDbRow[]> {
  const res = await apiGet<{ suppressions: OutreachSuppressionDbRow[] }>(
    '/api/outreach/suppressions'
  );
  return res.suppressions ?? [];
}

export async function addSuppressionApi(input: {
  email: string;
  reason?: string;
}): Promise<OutreachSuppressionDbRow> {
  const res = await apiPost<{ suppression: OutreachSuppressionDbRow }>(
    '/api/outreach/suppressions',
    input
  );
  return res.suppression;
}

export async function removeSuppressionApi(id: string): Promise<void> {
  await apiDelete(`/api/outreach/suppressions/${id}`);
}

export async function fetchGmailStatusApi(): Promise<GmailStatusApiResponse> {
  return apiGet<GmailStatusApiResponse>('/api/integrations/gmail/status');
}

// ============================================================
// Workspace Modules (Content, Incentives, Tasks, Settings, Reports, Admin)
// ============================================================

export async function fetchContentIdeasApi(campaignId?: string): Promise<{
  items: CampaignContentIdeaRow[];
  storageMode: 'native_table' | 'audit_fallback';
}> {
  const qs = campaignId ? `?campaignId=${encodeURIComponent(campaignId)}` : '';
  return apiGet(`/api/content-ideas${qs}`);
}

export async function createContentIdeaApi(input: {
  campaignId?: string | null;
  influencerId?: string | null;
  title: string;
  format?: string;
  angle: string;
  contentThemes?: string[];
  aiModel?: string | null;
  source?: string;
  status?: CampaignContentIdeaRow['status'];
}): Promise<CampaignContentIdeaRow> {
  const res = await apiPost<{ item: CampaignContentIdeaRow }>('/api/content-ideas', input);
  return res.item;
}

export async function updateContentIdeaApi(
  id: string,
  patch: Partial<{
    title: string;
    format: string;
    angle: string;
    contentThemes: string[];
    status: CampaignContentIdeaRow['status'];
  }>
): Promise<CampaignContentIdeaRow> {
  const res = await apiPatch<{ item: CampaignContentIdeaRow }>(`/api/content-ideas/${id}`, patch);
  return res.item;
}

export async function deleteContentIdeaApi(id: string): Promise<void> {
  await apiDelete(`/api/content-ideas/${id}`);
}

export async function fetchIncentivesApi(campaignId?: string): Promise<{
  items: CreatorIncentiveRow[];
  storageMode: 'native_table' | 'audit_fallback';
}> {
  const qs = campaignId ? `?campaignId=${encodeURIComponent(campaignId)}` : '';
  return apiGet(`/api/incentives${qs}`);
}

export async function createIncentiveApi(input: {
  campaignId?: string | null;
  influencerId?: string | null;
  outreachLogId?: string | null;
  compensationType: string;
  amount?: number | null;
  currency?: string;
  commissionPercent?: number | null;
  deliverables?: string | null;
  status?: CreatorIncentiveRow['status'];
  notes?: string | null;
}): Promise<CreatorIncentiveRow> {
  const res = await apiPost<{ item: CreatorIncentiveRow }>('/api/incentives', input);
  return res.item;
}

export async function updateIncentiveApi(
  id: string,
  patch: Partial<{
    compensationType: string;
    amount: number | null;
    currency: string;
    commissionPercent: number | null;
    deliverables: string | null;
    status: CreatorIncentiveRow['status'];
    notes: string | null;
    outreachLogId: string | null;
  }>
): Promise<CreatorIncentiveRow> {
  const res = await apiPatch<{ item: CreatorIncentiveRow }>(`/api/incentives/${id}`, patch);
  return res.item;
}

export async function deleteIncentiveApi(id: string): Promise<void> {
  await apiDelete(`/api/incentives/${id}`);
}

export async function fetchTasksApi(filters?: {
  campaignId?: string;
  status?: string;
}): Promise<{
  items: WorkspaceTaskRow[];
  storageMode: 'native_table' | 'audit_fallback';
}> {
  const qs = new URLSearchParams();
  if (filters?.campaignId) qs.set('campaignId', filters.campaignId);
  if (filters?.status && filters.status !== 'all') qs.set('status', filters.status);
  const queryStr = qs.toString();
  return apiGet(`/api/tasks${queryStr ? `?${queryStr}` : ''}`);
}

export async function createTaskApi(input: {
  campaignId?: string | null;
  influencerId?: string | null;
  outreachMessageId?: string | null;
  title: string;
  description?: string | null;
  priority?: WorkspaceTaskRow['priority'];
  status?: WorkspaceTaskRow['status'];
  dueDate?: string | null;
}): Promise<WorkspaceTaskRow> {
  const res = await apiPost<{ item: WorkspaceTaskRow }>('/api/tasks', input);
  return res.item;
}

export async function updateTaskApi(
  id: string,
  patch: Partial<{
    title: string;
    description: string | null;
    priority: WorkspaceTaskRow['priority'];
    status: WorkspaceTaskRow['status'];
    dueDate: string | null;
  }>
): Promise<WorkspaceTaskRow> {
  const res = await apiPatch<{ item: WorkspaceTaskRow }>(`/api/tasks/${id}`, patch);
  return res.item;
}

export async function deleteTaskApi(id: string): Promise<void> {
  await apiDelete(`/api/tasks/${id}`);
}

export async function fetchWorkspaceSettingsApi(): Promise<{
  settings: WorkspaceSettingsRow;
  storageMode: 'native_table' | 'audit_fallback';
  integrations: {
    outreachMode: 'simulation' | 'live';
    supabaseConfigured: boolean;
    youtubeConfigured: boolean;
    apifyConfigured: boolean;
    geminiConfigured: boolean;
    geminiModel: string;
    gmailOAuthConfigured: boolean;
    gmailConnected: boolean;
    gmailAccountEmail: string | null;
  };
}> {
  return apiGet('/api/settings');
}

export async function updateWorkspaceSettingsApi(
  patch: Partial<{
    default_niche: string;
    default_country: string;
    default_min_followers: number;
    default_max_followers: number;
    default_min_engagement: number;
    default_collaboration_type: string;
    require_manual_review_before_send: boolean;
  }>
): Promise<WorkspaceSettingsRow> {
  const res = await apiPut<{ settings: WorkspaceSettingsRow }>('/api/settings', patch);
  return res.settings;
}

export interface WorkspaceReportApiResponse {
  filters: {
    campaignId: string | null;
    fromDate: string | null;
    toDate: string | null;
  };
  discovery: {
    totalCreatorsDiscovered: number;
    youtubeCreatorsCount: number;
    instagramCreatorsCount: number;
    qualifiedCount: number;
    needsReviewCount: number;
    rejectedCount: number;
    discoveryRunsCount: number;
    topRejectionReasons: Array<{ reason: string; count: number }>;
  };
  enrichment: {
    creatorsWithEmail: number;
    creatorsMissingEmail: number;
    verifiedEmailsCount: number;
    creatorsWithWebsite: number;
    enrichedProfilesCount: number;
    creatorsWithContentThemes: number;
  };
  personalization: {
    totalMessagesGenerated: number;
    emailDraftsCount: number;
    instagramDmDraftsCount: number;
    approvedMessagesCount: number;
    rejectedMessagesCount: number;
    sentMessagesCount: number;
  };
  outreach: {
    totalOutreachLogs: number;
    simulatedEmailsCount: number;
    liveEmailsSentCount: number;
    manualInstagramDmsSentCount: number;
    manualInstagramDmsReadyCount: number;
    failedOrUncertainCount: number;
  };
  generatedAt: string;
}

export async function fetchWorkspaceReportsApi(params?: {
  campaignId?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<WorkspaceReportApiResponse> {
  const qs = new URLSearchParams();
  if (params?.campaignId) qs.set('campaignId', params.campaignId);
  if (params?.fromDate) qs.set('fromDate', params.fromDate);
  if (params?.toDate) qs.set('toDate', params.toDate);
  const queryStr = qs.toString();
  return apiGet(`/api/reports${queryStr ? `?${queryStr}` : ''}`);
}

export interface HealthApiResponse {
  ok: boolean;
  outreachMode: 'simulation' | 'live';
  supabaseConfigured: boolean;
  supabaseReachable: boolean;
  databaseSchemaCompatible: boolean;
  extendedSchemaCompatible: boolean;
  supabaseStatus: 'connected' | 'schema_incompatible' | 'connection_failed' | 'configuration_missing';
  missingTables: string[];
  missingExtendedTables: string[];
  databaseError?: string | null;
  youtubeConfigured: boolean;
  apifyConfigured: boolean;
  geminiConfigured: boolean;
  geminiModel: string;
  gmailOAuthConfigured: boolean;
  encryptionConfigured: boolean;
  checkedAt?: string;
}

export async function fetchHealthApi(): Promise<HealthApiResponse> {
  return apiGet('/api/health');
}

export async function fetchAdminOverviewApi(): Promise<{
  discoveryRuns: DiscoveryRunDbRow[];
  outreachLogs: OutreachLogDbRow[];
  auditLogs: Array<{
    id: string;
    action: string;
    entity_type: string;
    entity_id: string | null;
    details: Record<string, unknown>;
    created_at: string;
  }>;
  counts: {
    campaigns: number;
    influencers: number;
    messages: number;
    suppressions: number;
  };
}> {
  return apiGet('/api/admin/overview');
}
