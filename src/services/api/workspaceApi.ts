import { Database } from '../../types/database';
import { apiDelete, apiGet, apiPatch, apiPost } from './client';

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
  latestOutreachLog: OutreachLogDbRow | null;
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
}): Promise<CampaignDbRow> {
  const res = await apiPost<{ campaign: CampaignDbRow }>('/api/campaigns', input);
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
    qualificationStatus?: 'discovered' | 'qualified' | 'rejected' | 'needs_review';
    qualificationReason?: string;
    campaignInfluencerId?: string;
  }
): Promise<WorkspaceCreatorApiItem> {
  return apiPatch<WorkspaceCreatorApiItem>(`/api/influencers/${influencerId}`, patch);
}

export async function removeCreatorFromCampaignApi(
  campaignInfluencerId: string
): Promise<void> {
  await apiDelete(`/api/influencers/campaign-link/${campaignInfluencerId}`, {
    confirmDelete: true,
  });
}

export async function startYouTubeDiscoveryApi(input: {
  campaignId?: string;
  queries?: string[];
  targetCount?: number;
}): Promise<DiscoveryRunDbRow> {
  const res = await apiPost<{ run: DiscoveryRunDbRow }>('/api/discovery/youtube', input);
  return res.run;
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

export async function generateEmailPitchApi(
  campaignInfluencerId: string
): Promise<OutreachMessageDbRow> {
  const res = await apiPost<{ message: OutreachMessageDbRow }>(
    '/api/messages/generate-email',
    { campaignInfluencerId }
  );
  return res.message;
}

export async function generateInstagramDmApi(
  campaignInfluencerId: string
): Promise<OutreachMessageDbRow> {
  const res = await apiPost<{ message: OutreachMessageDbRow }>(
    '/api/messages/generate-instagram-dm',
    { campaignInfluencerId }
  );
  return res.message;
}

export async function updateMessageDraftApi(
  messageId: string,
  patch: { subject?: string | null; messageBody?: string; approve?: boolean }
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
}): Promise<{ mode: string; status: string; message: string; log: OutreachLogDbRow }> {
  return apiPost('/api/outreach/instagram-manual', input);
}

export async function fetchOutreachLogsApi(
  campaignId?: string
): Promise<OutreachLogDbRow[]> {
  const qs = campaignId ? `?campaignId=${encodeURIComponent(campaignId)}` : '';
  const res = await apiGet<{ logs: OutreachLogDbRow[] }>(`/api/outreach/logs${qs}`);
  return res.logs ?? [];
}

export async function fetchGmailStatusApi(): Promise<GmailStatusApiResponse> {
  return apiGet<GmailStatusApiResponse>('/api/integrations/gmail/status');
}
