import { getSupabaseAdmin } from '../../lib/supabaseAdmin.ts';
import { AppHttpError } from '../../middleware/errorHandler.ts';
import type {
  CampaignStatus,
  Database,
  QualificationStatusDb,
} from '../../../src/types/database.ts';
import { clampString, parseBoundedFloat, parseBoundedInt } from '../../utils/validation.ts';

type CampaignRow = Database['public']['Tables']['campaigns']['Row'];
type InfluencerRow = Database['public']['Tables']['influencers']['Row'];
type CampaignInfluencerRow = Database['public']['Tables']['campaign_influencers']['Row'];
type OutreachMessageRow = Database['public']['Tables']['outreach_messages']['Row'];
type OutreachLogRow = Database['public']['Tables']['outreach_logs']['Row'];

function requireAdminClient() {
  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new AppHttpError(
      503,
      'supabase_not_configured',
      'Supabase server backend requires SUPABASE_URL and SUPABASE_SECRET_KEY configuration.'
    );
  }
  return admin;
}

export async function recordAuditLog(
  action: string,
  entityType: string,
  entityId: string | null,
  details: Record<string, unknown> = {}
): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;
  try {
    await admin.from('demo_audit_logs').insert({
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
    });
  } catch {
    // Graceful no-op if additive migration 001 has not been applied yet
  }
}

export async function listCampaigns(): Promise<CampaignRow[]> {
  const admin = requireAdminClient();
  const { data, error } = await admin
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new AppHttpError(500, 'supabase_query_error', error.message);
  }

  return data ?? [];
}

export async function ensureDefaultCampaign(): Promise<CampaignRow[]> {
  const existing = await listCampaigns();
  if (existing.length > 0) return existing;

  const admin = requireAdminClient();
  const { data, error } = await admin
    .from('campaigns')
    .insert({
      owner_id: null,
      name: 'GlowCare — India Skincare Campaign',
      brand_name: 'GlowCare',
      niche: 'Beauty & Skincare',
      target_country: 'India',
      min_followers: 5000,
      max_followers: 100000,
      min_engagement_rate: 2.0,
      status: 'active',
    })
    .select()
    .single();

  if (error) {
    throw new AppHttpError(500, 'supabase_insert_error', error.message);
  }

  await recordAuditLog('create_default_campaign', 'campaign', data.id, {
    name: data.name,
  });

  return [data];
}

export interface CreateCampaignInput {
  name: string;
  brand_name?: string;
  niche: string;
  target_country?: string;
  min_followers?: number;
  max_followers?: number;
  min_engagement_rate?: number;
  status?: CampaignStatus;
}

export async function createCampaign(input: CreateCampaignInput): Promise<CampaignRow> {
  const admin = requireAdminClient();
  const name = clampString(input.name, 140);
  const brandName = clampString(input.brand_name || 'GlowCare', 100) || 'GlowCare';
  const niche = clampString(input.niche || 'Beauty & Skincare', 100) || 'Beauty & Skincare';
  const targetCountry = clampString(input.target_country || 'India', 80) || 'India';
  const minFollowers = parseBoundedInt(input.min_followers, 5000, 500, 1_000_000);
  const maxFollowers = parseBoundedInt(
    input.max_followers,
    100000,
    minFollowers,
    10_000_000
  );
  const minEngagementRate = parseBoundedFloat(input.min_engagement_rate, 2.0, 0, 50);

  if (!name || name.length < 3) {
    throw new AppHttpError(400, 'invalid_campaign_name', 'Campaign name must be at least 3 characters.');
  }

  const allowedStatuses: CampaignStatus[] = ['draft', 'active', 'paused', 'completed'];
  const status: CampaignStatus =
    input.status && allowedStatuses.includes(input.status) ? input.status : 'active';

  const { data, error } = await admin
    .from('campaigns')
    .insert({
      owner_id: null,
      name,
      brand_name: brandName,
      niche,
      target_country: targetCountry,
      min_followers: minFollowers,
      max_followers: maxFollowers,
      min_engagement_rate: minEngagementRate,
      status,
    })
    .select()
    .single();

  if (error) {
    throw new AppHttpError(500, 'supabase_insert_error', error.message);
  }

  await recordAuditLog('create_campaign', 'campaign', data.id, {
    name: data.name,
    niche: data.niche,
  });

  return data;
}

export async function updateCampaign(
  id: string,
  patch: Partial<CreateCampaignInput>
): Promise<CampaignRow> {
  const admin = requireAdminClient();
  const updatePayload: Database['public']['Tables']['campaigns']['Update'] = {
    updated_at: new Date().toISOString(),
  };

  if (typeof patch.name === 'string') {
    const cleaned = clampString(patch.name, 140);
    if (cleaned.length < 3) {
      throw new AppHttpError(400, 'invalid_campaign_name', 'Campaign name must be at least 3 characters.');
    }
    updatePayload.name = cleaned;
  }
  if (typeof patch.brand_name === 'string') {
    updatePayload.brand_name = clampString(patch.brand_name, 100);
  }
  if (typeof patch.niche === 'string') {
    updatePayload.niche = clampString(patch.niche, 100);
  }
  if (typeof patch.target_country === 'string') {
    updatePayload.target_country = clampString(patch.target_country, 80);
  }
  if (patch.min_followers !== undefined) {
    updatePayload.min_followers = parseBoundedInt(patch.min_followers, 5000, 500, 1_000_000);
  }
  if (patch.max_followers !== undefined) {
    updatePayload.max_followers = parseBoundedInt(patch.max_followers, 100000, 1000, 10_000_000);
  }
  if (patch.min_engagement_rate !== undefined) {
    updatePayload.min_engagement_rate = parseBoundedFloat(patch.min_engagement_rate, 2.0, 0, 50);
  }
  if (patch.status && ['draft', 'active', 'paused', 'completed'].includes(patch.status)) {
    updatePayload.status = patch.status;
  }

  const { data, error } = await admin
    .from('campaigns')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    throw new AppHttpError(404, 'campaign_not_found', error?.message || 'Campaign not found.');
  }

  await recordAuditLog('update_campaign', 'campaign', id, { fields: Object.keys(updatePayload) });
  return data;
}

export async function deleteCampaign(id: string, confirmDelete: boolean): Promise<void> {
  if (!confirmDelete) {
    throw new AppHttpError(
      400,
      'confirmation_required',
      'Deleting a campaign requires explicit confirmation.'
    );
  }
  const admin = requireAdminClient();
  const { error } = await admin.from('campaigns').delete().eq('id', id);
  if (error) {
    throw new AppHttpError(500, 'supabase_delete_error', error.message);
  }
  await recordAuditLog('delete_campaign', 'campaign', id, {});
}

export interface WorkspaceCreatorDetail {
  influencer: InfluencerRow;
  campaignInfluencer: CampaignInfluencerRow | null;
  emailMessage: OutreachMessageRow | null;
  instagramDmMessage: OutreachMessageRow | null;
  latestOutreachLog: OutreachLogRow | null;
}

export interface InfluencerListFilters {
  campaignId?: string;
  search?: string;
  niche?: string;
  country?: string;
  platform?: string;
  qualificationStatus?: string;
  minFollowers?: number;
  maxFollowers?: number;
  minEngagement?: number;
  sortBy?: 'relevance' | 'followers-desc' | 'followers-asc' | 'engagement-desc';
  limit?: number;
}

export async function listWorkspaceCreators(filters: InfluencerListFilters): Promise<{
  items: WorkspaceCreatorDetail[];
  totalCount: number;
}> {
  const admin = requireAdminClient();

  let campaignLinks: CampaignInfluencerRow[] = [];
  if (filters.campaignId) {
    const { data: linkData, error: linkErr } = await admin
      .from('campaign_influencers')
      .select('*')
      .eq('campaign_id', filters.campaignId);
    if (linkErr) {
      throw new AppHttpError(500, 'supabase_query_error', linkErr.message);
    }
    campaignLinks = linkData ?? [];
  } else {
    const { data: linkData } = await admin
      .from('campaign_influencers')
      .select('*')
      .order('added_at', { ascending: false });
    campaignLinks = linkData ?? [];
  }

  const { data: influencersData, error: infErr } = await admin
    .from('influencers')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(filters.limit ?? 200);

  if (infErr) {
    throw new AppHttpError(500, 'supabase_query_error', infErr.message);
  }

  const influencers = influencersData ?? [];
  const linkByInfId = new Map<string, CampaignInfluencerRow>();
  for (const link of campaignLinks) {
    if (!linkByInfId.has(link.influencer_id)) {
      linkByInfId.set(link.influencer_id, link);
    }
  }

  const linkIds = Array.from(linkByInfId.values()).map((l) => l.id);
  const messagesByLinkId = new Map<string, OutreachMessageRow[]>();
  const latestLogByLinkId = new Map<string, OutreachLogRow>();

  if (linkIds.length > 0) {
    const { data: msgData } = await admin
      .from('outreach_messages')
      .select('*')
      .in('campaign_influencer_id', linkIds)
      .order('updated_at', { ascending: false });

    for (const msg of msgData ?? []) {
      const list = messagesByLinkId.get(msg.campaign_influencer_id) ?? [];
      list.push(msg);
      messagesByLinkId.set(msg.campaign_influencer_id, list);
    }

    const { data: logData } = await admin
      .from('outreach_logs')
      .select('*')
      .in('campaign_influencer_id', linkIds)
      .order('created_at', { ascending: false });

    for (const log of logData ?? []) {
      if (!latestLogByLinkId.has(log.campaign_influencer_id)) {
        latestLogByLinkId.set(log.campaign_influencer_id, log);
      }
    }
  }

  let items: WorkspaceCreatorDetail[] = influencers.map((inf) => {
    const link = linkByInfId.get(inf.id) ?? null;
    const msgs = link ? messagesByLinkId.get(link.id) ?? [] : [];
    const emailMessage = msgs.find((m) => m.channel === 'email') ?? null;
    const instagramDmMessage = msgs.find((m) => m.channel === 'instagram_dm') ?? null;
    const latestOutreachLog = link ? latestLogByLinkId.get(link.id) ?? null : null;

    return {
      influencer: inf,
      campaignInfluencer: link,
      emailMessage,
      instagramDmMessage,
      latestOutreachLog,
    };
  });

  // Apply explicit campaign membership filter if requested and campaign links exist
  if (filters.campaignId) {
    items = items.filter((item) => item.campaignInfluencer !== null);
  }

  if (filters.search) {
    const q = filters.search.toLowerCase();
    items = items.filter((item) => {
      const inf = item.influencer;
      return (
        inf.name.toLowerCase().includes(q) ||
        (inf.username ?? '').toLowerCase().includes(q) ||
        (inf.contact_email ?? '').toLowerCase().includes(q) ||
        (inf.niche ?? '').toLowerCase().includes(q) ||
        (inf.content_themes ?? []).some((t) => t.toLowerCase().includes(q))
      );
    });
  }

  if (filters.country && filters.country !== 'All') {
    const c = filters.country.toLowerCase();
    items = items.filter((item) => {
      const country = (item.influencer.country ?? '').toLowerCase();
      if (c === 'india') {
        return country.includes('india') || country === 'in';
      }
      return country === c || !country;
    });
  }

  if (filters.niche && filters.niche !== 'All') {
    const n = filters.niche.toLowerCase();
    items = items.filter((item) => {
      const infNiche = (item.influencer.niche ?? '').toLowerCase();
      const themes = (item.influencer.content_themes ?? []).map((t) => t.toLowerCase());
      return infNiche.includes(n) || themes.some((t) => t.includes(n) || n.includes(t));
    });
  }

  if (filters.platform && filters.platform !== 'all') {
    const p = filters.platform.toLowerCase();
    items = items.filter((item) => item.influencer.platform.toLowerCase() === p);
  }

  if (filters.qualificationStatus && filters.qualificationStatus !== 'all') {
    items = items.filter(
      (item) => item.campaignInfluencer?.qualification_status === filters.qualificationStatus
    );
  }

  if (filters.minFollowers && filters.minFollowers > 0) {
    items = items.filter(
      (item) => (item.influencer.follower_count ?? 0) >= filters.minFollowers!
    );
  }

  if (filters.maxFollowers && filters.maxFollowers > 0) {
    items = items.filter(
      (item) => (item.influencer.follower_count ?? 0) <= filters.maxFollowers!
    );
  }

  if (filters.minEngagement && filters.minEngagement > 0) {
    items = items.filter(
      (item) => (item.influencer.engagement_rate ?? 0) >= filters.minEngagement!
    );
  }

  if (filters.sortBy === 'followers-desc') {
    items.sort(
      (a, b) => (b.influencer.follower_count ?? 0) - (a.influencer.follower_count ?? 0)
    );
  } else if (filters.sortBy === 'followers-asc') {
    items.sort(
      (a, b) => (a.influencer.follower_count ?? 0) - (b.influencer.follower_count ?? 0)
    );
  } else if (filters.sortBy === 'engagement-desc') {
    items.sort(
      (a, b) => (b.influencer.engagement_rate ?? 0) - (a.influencer.engagement_rate ?? 0)
    );
  } else {
    // Relevance: qualified & top picks first, then fit score / engagement
    items.sort((a, b) => {
      const rankStatus = (s?: string) =>
        s === 'qualified' ? 3 : s === 'needs_review' ? 2 : s === 'discovered' ? 1 : 0;
      const diff =
        rankStatus(b.campaignInfluencer?.qualification_status) -
        rankStatus(a.campaignInfluencer?.qualification_status);
      if (diff !== 0) return diff;
      const fitDiff = (b.influencer.fit_score ?? 0) - (a.influencer.fit_score ?? 0);
      if (fitDiff !== 0) return fitDiff;
      return (b.influencer.engagement_rate ?? 0) - (a.influencer.engagement_rate ?? 0);
    });
  }

  return {
    items,
    totalCount: items.length,
  };
}

export async function getInfluencerById(id: string): Promise<WorkspaceCreatorDetail> {
  const admin = requireAdminClient();
  const { data: inf, error } = await admin
    .from('influencers')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !inf) {
    throw new AppHttpError(404, 'influencer_not_found', 'Creator profile not found.');
  }

  const { data: links } = await admin
    .from('campaign_influencers')
    .select('*')
    .eq('influencer_id', id)
    .order('added_at', { ascending: false })
    .limit(1);

  const link = links?.[0] ?? null;
  let emailMessage: OutreachMessageRow | null = null;
  let instagramDmMessage: OutreachMessageRow | null = null;
  let latestOutreachLog: OutreachLogRow | null = null;

  if (link) {
    const { data: msgs } = await admin
      .from('outreach_messages')
      .select('*')
      .eq('campaign_influencer_id', link.id)
      .order('updated_at', { ascending: false });

    emailMessage = (msgs ?? []).find((m) => m.channel === 'email') ?? null;
    instagramDmMessage = (msgs ?? []).find((m) => m.channel === 'instagram_dm') ?? null;

    const { data: logs } = await admin
      .from('outreach_logs')
      .select('*')
      .eq('campaign_influencer_id', link.id)
      .order('created_at', { ascending: false })
      .limit(1);
    latestOutreachLog = logs?.[0] ?? null;
  }

  return {
    influencer: inf,
    campaignInfluencer: link,
    emailMessage,
    instagramDmMessage,
    latestOutreachLog,
  };
}

export async function addInfluencersToCampaign(
  campaignId: string,
  influencerIds: string[]
): Promise<{ added: number }> {
  const admin = requireAdminClient();
  if (influencerIds.length === 0) {
    throw new AppHttpError(400, 'no_influencers_selected', 'Select at least one creator.');
  }

  const rows = influencerIds.slice(0, 50).map((influencerId) => ({
    campaign_id: campaignId,
    influencer_id: influencerId,
    qualification_status: 'discovered' as QualificationStatusDb,
    qualification_reason: 'Added manually to campaign queue',
  }));

  const { error } = await admin
    .from('campaign_influencers')
    .upsert(rows, { onConflict: 'campaign_id,influencer_id' });

  if (error) {
    throw new AppHttpError(500, 'supabase_upsert_error', error.message);
  }

  await recordAuditLog('add_influencers_to_campaign', 'campaign', campaignId, {
    count: rows.length,
  });

  return { added: rows.length };
}

export async function updateCreatorProfileManual(
  influencerId: string,
  patch: {
    name?: string;
    contactEmail?: string | null;
    qualificationStatus?: QualificationStatusDb;
    qualificationReason?: string;
    campaignInfluencerId?: string;
  }
): Promise<void> {
  const admin = requireAdminClient();

  const infUpdate: Database['public']['Tables']['influencers']['Update'] = {
    updated_at: new Date().toISOString(),
  };

  if (typeof patch.name === 'string' && patch.name.trim()) {
    infUpdate.name = clampString(patch.name, 140);
  }

  if (patch.contactEmail !== undefined) {
    const trimmed = (patch.contactEmail ?? '').trim();
    if (!trimmed || trimmed.toLowerCase() === 'not found') {
      infUpdate.contact_email = null;
      infUpdate.email_status = 'not_found';
    } else {
      infUpdate.contact_email = clampString(trimmed, 254);
      infUpdate.email_status = 'verified';
      infUpdate.last_verified_at = new Date().toISOString();
    }
  }

  const { error: infErr } = await admin
    .from('influencers')
    .update(infUpdate)
    .eq('id', influencerId);

  if (infErr) {
    throw new AppHttpError(500, 'supabase_update_error', infErr.message);
  }

  if (patch.campaignInfluencerId && (patch.qualificationStatus || patch.qualificationReason)) {
    const ciUpdate: Database['public']['Tables']['campaign_influencers']['Update'] = {};
    if (patch.qualificationStatus) {
      ciUpdate.qualification_status = patch.qualificationStatus;
    }
    if (patch.qualificationReason !== undefined) {
      ciUpdate.qualification_reason = clampString(patch.qualificationReason, 280);
    }

    await admin
      .from('campaign_influencers')
      .update(ciUpdate)
      .eq('id', patch.campaignInfluencerId);
  }

  await recordAuditLog('manual_update_creator', 'influencer', influencerId, {
    fields: Object.keys(patch),
  });
}

export async function removeCreatorFromCampaign(
  campaignInfluencerId: string,
  confirmDelete: boolean
): Promise<void> {
  if (!confirmDelete) {
    throw new AppHttpError(
      400,
      'confirmation_required',
      'Removing a creator from a campaign requires explicit confirmation.'
    );
  }
  const admin = requireAdminClient();
  const { error } = await admin
    .from('campaign_influencers')
    .delete()
    .eq('id', campaignInfluencerId);

  if (error) {
    throw new AppHttpError(500, 'supabase_delete_error', error.message);
  }
  await recordAuditLog('remove_creator_from_campaign', 'campaign_influencer', campaignInfluencerId, {});
}

function escapeCsvCell(value: unknown): string {
  const str = String(value ?? '');
  const safeFormula = /^[=+\-@]/.test(str) ? `'${str}` : str;
  if (safeFormula.includes(',') || safeFormula.includes('"') || safeFormula.includes('\n')) {
    return `"${safeFormula.replace(/"/g, '""')}"`;
  }
  return safeFormula;
}

export function serializeCreatorsToCsv(items: WorkspaceCreatorDetail[]): string {
  const headers = [
    'Name',
    'Platform',
    'Handle',
    'Profile URL',
    'Followers',
    'Estimated Public Engagement (%)',
    'Engagement Source',
    'Niche',
    'Content Themes',
    'Country',
    'Contact Email',
    'Email Status',
    'Qualification Status',
    'Qualification Reason',
    'Website',
    'Audience Age',
    'Audience Gender',
    'Audience Geography',
    'Data Source',
    'Retrieved At',
  ];

  const rows = items.map(({ influencer, campaignInfluencer }) => [
    influencer.name,
    influencer.platform,
    influencer.username ?? '',
    influencer.profile_url,
    influencer.follower_count ?? 'Unavailable',
    influencer.engagement_rate ?? 'Unavailable',
    influencer.engagement_source ?? 'Unavailable',
    influencer.niche ?? 'Beauty & Skincare',
    (influencer.content_themes ?? []).join(' | '),
    influencer.country ?? 'Unavailable',
    influencer.contact_email ?? 'Not Found',
    influencer.email_status,
    campaignInfluencer?.qualification_status ?? 'discovered',
    campaignInfluencer?.qualification_reason ?? '',
    influencer.website ?? 'Not Available',
    influencer.audience_age ?? 'Not Available',
    influencer.audience_gender ?? 'Not Available',
    influencer.audience_geography ?? 'Not Available',
    influencer.data_source ?? 'youtube_data_api_v3',
    influencer.source_retrieved_at ?? influencer.created_at,
  ]);

  return [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((r) => r.map(escapeCsvCell).join(',')),
  ].join('\n');
}
