import { getSupabaseAdmin } from '../../lib/supabaseAdmin.ts';
import { AppHttpError } from '../../middleware/errorHandler.ts';
import type {
  CampaignStatus,
  ChannelAvailabilityItem,
  ContactChannelRecord,
  ContactChannelType,
  Database,
  OutreachChannel,
  QualificationStatusDb,
} from '../../../src/types/database.ts';
import { getServerConfig } from '../../config/env.ts';
import { clampString, isValidEmail, parseBoundedFloat, parseBoundedInt } from '../../utils/validation.ts';
import {
  buildCreatorContactChannels,
  evaluateCreatorChannels,
  loadMultiChannelFallbackLogs,
  loadMultiChannelFallbackMessages,
  mergeContactChannels,
  MULTI_CHANNEL_LOG_ENTITY,
  MULTI_CHANNEL_MESSAGE_ENTITY,
  validateManualContactChannelInput,
} from '../outreach/multiChannel.service.ts';
import { evaluateCreatorQualification } from '../filtering/qualification.service.ts';

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

const CAMPAIGN_EXTENSION_META_ENTITY = 'campaign_extension_meta';

function isMissingColumnError(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  const code = err.code || '';
  const msg = (err.message || '').toLowerCase();
  return (
    code === '42703' ||
    code === 'PGRST204' ||
    msg.includes('column') ||
    msg.includes('schema cache')
  );
}

async function saveCampaignExtensionMeta(
  campaignId: string,
  meta: Record<string, unknown>
): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;
  try {
    await admin
      .from('demo_audit_logs')
      .delete()
      .eq('entity_type', CAMPAIGN_EXTENSION_META_ENTITY)
      .eq('entity_id', campaignId);
    await admin.from('demo_audit_logs').insert({
      action: 'upsert_campaign_meta',
      entity_type: CAMPAIGN_EXTENSION_META_ENTITY,
      entity_id: campaignId,
      details: meta,
    });
  } catch {
    // Graceful no-op
  }
}

async function loadCampaignExtensionMetaMap(): Promise<Map<string, Record<string, unknown>>> {
  const admin = getSupabaseAdmin();
  const map = new Map<string, Record<string, unknown>>();
  if (!admin) return map;
  try {
    const { data } = await admin
      .from('demo_audit_logs')
      .select('entity_id, details')
      .eq('entity_type', CAMPAIGN_EXTENSION_META_ENTITY)
      .order('created_at', { ascending: false })
      .limit(100);
    for (const row of data ?? []) {
      if (row.entity_id && !map.has(row.entity_id) && row.details && typeof row.details === 'object') {
        map.set(row.entity_id, row.details as Record<string, unknown>);
      }
    }
  } catch {
    // Graceful no-op
  }
  return map;
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

  const rows = data ?? [];
  const metaMap = await loadCampaignExtensionMetaMap();
  return rows.map((row) => {
    const fallback = metaMap.get(row.id);
    if (!fallback) return row;
    return {
      ...row,
      product_description: row.product_description ?? (fallback.product_description as string | null) ?? null,
      target_platforms: row.target_platforms ?? (fallback.target_platforms as string[] | null) ?? ['youtube', 'instagram'],
      collaboration_type: row.collaboration_type ?? (fallback.collaboration_type as string | null) ?? 'Sponsorship',
      campaign_brief: row.campaign_brief ?? (fallback.campaign_brief as string | null) ?? null,
      start_date: row.start_date ?? (fallback.start_date as string | null) ?? null,
      end_date: row.end_date ?? (fallback.end_date as string | null) ?? null,
      target_creator_count: row.target_creator_count ?? (fallback.target_creator_count as number | null) ?? null,
      archived_at: row.archived_at ?? (fallback.archived_at as string | null) ?? null,
    };
  });
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
  product_description?: string | null;
  target_platforms?: string[];
  collaboration_type?: string | null;
  campaign_brief?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  target_creator_count?: number | null;
  archived_at?: string | null;
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

  const targetPlatforms =
    Array.isArray(input.target_platforms) && input.target_platforms.length > 0
      ? input.target_platforms.filter((p) => p === 'youtube' || p === 'instagram')
      : ['youtube', 'instagram'];

  const extFields = {
    product_description: input.product_description
      ? clampString(input.product_description, 500)
      : null,
    target_platforms: targetPlatforms.length > 0 ? targetPlatforms : ['youtube', 'instagram'],
    collaboration_type: input.collaboration_type
      ? clampString(input.collaboration_type, 60)
      : 'Sponsorship',
    campaign_brief: input.campaign_brief ? clampString(input.campaign_brief, 600) : null,
    start_date: input.start_date ? clampString(input.start_date, 40) : null,
    end_date: input.end_date ? clampString(input.end_date, 40) : null,
    target_creator_count:
      input.target_creator_count !== undefined && input.target_creator_count !== null
        ? parseBoundedInt(input.target_creator_count, 50, 1, 5000)
        : null,
    archived_at: input.archived_at ?? null,
  };

  const basePayload: Database['public']['Tables']['campaigns']['Insert'] = {
    owner_id: null,
    name,
    brand_name: brandName,
    niche,
    target_country: targetCountry,
    min_followers: minFollowers,
    max_followers: maxFollowers,
    min_engagement_rate: minEngagementRate,
    status,
  };

  let { data, error } = await admin
    .from('campaigns')
    .insert({ ...basePayload, ...extFields })
    .select()
    .single();

  if (error && isMissingColumnError(error)) {
    const fb = await admin.from('campaigns').insert(basePayload).select().single();
    data = fb.data;
    error = fb.error;
    if (!error && data) {
      await saveCampaignExtensionMeta(data.id, extFields);
      data = { ...data, ...extFields };
    }
  }

  if (error || !data) {
    throw new AppHttpError(500, 'supabase_insert_error', error?.message || 'Unable to create campaign.');
  }

  await recordAuditLog('create_campaign', 'campaign', data.id, {
    name: data.name,
    niche: data.niche,
    collaboration_type: extFields.collaboration_type,
  });

  return data;
}

export async function updateCampaign(
  id: string,
  patch: Partial<CreateCampaignInput>
): Promise<CampaignRow> {
  const admin = requireAdminClient();
  const basePayload: Database['public']['Tables']['campaigns']['Update'] = {
    updated_at: new Date().toISOString(),
  };

  if (typeof patch.name === 'string') {
    const cleaned = clampString(patch.name, 140);
    if (cleaned.length < 3) {
      throw new AppHttpError(400, 'invalid_campaign_name', 'Campaign name must be at least 3 characters.');
    }
    basePayload.name = cleaned;
  }
  if (typeof patch.brand_name === 'string') {
    basePayload.brand_name = clampString(patch.brand_name, 100);
  }
  if (typeof patch.niche === 'string') {
    basePayload.niche = clampString(patch.niche, 100);
  }
  if (typeof patch.target_country === 'string') {
    basePayload.target_country = clampString(patch.target_country, 80);
  }
  if (patch.min_followers !== undefined) {
    basePayload.min_followers = parseBoundedInt(patch.min_followers, 5000, 500, 1_000_000);
  }
  if (patch.max_followers !== undefined) {
    basePayload.max_followers = parseBoundedInt(patch.max_followers, 100000, 1000, 10_000_000);
  }
  if (patch.min_followers !== undefined || patch.max_followers !== undefined) {
    const { data: current } = await admin
      .from('campaigns')
      .select('min_followers, max_followers')
      .eq('id', id)
      .single();

    if (!current) {
      throw new AppHttpError(404, 'campaign_not_found', 'Campaign not found.');
    }

    const effectiveMin = basePayload.min_followers ?? current.min_followers ?? 5000;
    const effectiveMax = basePayload.max_followers ?? current.max_followers ?? 100000;
    if (effectiveMin > effectiveMax) {
      throw new AppHttpError(
        400,
        'invalid_follower_range',
        'Minimum followers cannot exceed maximum followers.'
      );
    }
  }
  if (patch.min_engagement_rate !== undefined) {
    basePayload.min_engagement_rate = parseBoundedFloat(patch.min_engagement_rate, 2.0, 0, 50);
  }
  if (patch.status && ['draft', 'active', 'paused', 'completed'].includes(patch.status)) {
    basePayload.status = patch.status;
  }

  const extPatch: Record<string, unknown> = {};
  if (patch.product_description !== undefined) {
    extPatch.product_description = patch.product_description
      ? clampString(patch.product_description, 500)
      : null;
  }
  if (patch.target_platforms !== undefined) {
    extPatch.target_platforms = patch.target_platforms.filter(
      (p) => p === 'youtube' || p === 'instagram'
    );
  }
  if (patch.collaboration_type !== undefined) {
    extPatch.collaboration_type = patch.collaboration_type
      ? clampString(patch.collaboration_type, 60)
      : null;
  }
  if (patch.campaign_brief !== undefined) {
    extPatch.campaign_brief = patch.campaign_brief
      ? clampString(patch.campaign_brief, 600)
      : null;
  }
  if (patch.start_date !== undefined) {
    extPatch.start_date = patch.start_date ? clampString(patch.start_date, 40) : null;
  }
  if (patch.end_date !== undefined) {
    extPatch.end_date = patch.end_date ? clampString(patch.end_date, 40) : null;
  }
  if (patch.target_creator_count !== undefined) {
    extPatch.target_creator_count =
      patch.target_creator_count !== null
        ? parseBoundedInt(patch.target_creator_count, 50, 1, 5000)
        : null;
  }
  if (patch.archived_at !== undefined) {
    extPatch.archived_at = patch.archived_at;
  }

  let { data, error } = await admin
    .from('campaigns')
    .update({ ...basePayload, ...extPatch })
    .eq('id', id)
    .select()
    .single();

  if (error && isMissingColumnError(error)) {
    const fb = await admin
      .from('campaigns')
      .update(basePayload)
      .eq('id', id)
      .select()
      .single();
    data = fb.data;
    error = fb.error;
    if (!error && data && Object.keys(extPatch).length > 0) {
      const existingMap = await loadCampaignExtensionMetaMap();
      const merged = { ...(existingMap.get(id) ?? {}), ...extPatch };
      await saveCampaignExtensionMeta(id, merged);
      data = { ...data, ...merged };
    }
  }

  if (error || !data) {
    throw new AppHttpError(404, 'campaign_not_found', error?.message || 'Campaign not found.');
  }

  await recordAuditLog('update_campaign', 'campaign', id, {
    fields: [...Object.keys(basePayload), ...Object.keys(extPatch)],
  });
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
  linkedinMessage: OutreachMessageRow | null;
  youtubeContactMessage: OutreachMessageRow | null;
  latestOutreachLog: OutreachLogRow | null;
  contactChannels?: ContactChannelRecord[];
  channelAvailability?: ChannelAvailabilityItem[];
  recommendedChannel?: OutreachChannel;
  preferredChannel?: OutreachChannel;
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
    const [{ data: msgData }, fallbackMsgs, { data: logData }, fallbackLogs] = await Promise.all([
      admin
        .from('outreach_messages')
        .select('*')
        .in('campaign_influencer_id', linkIds)
        .order('updated_at', { ascending: false }),
      loadMultiChannelFallbackMessages({ campaignInfluencerIds: linkIds }),
      admin
        .from('outreach_logs')
        .select('*')
        .in('campaign_influencer_id', linkIds)
        .order('created_at', { ascending: false }),
      loadMultiChannelFallbackLogs(linkIds),
    ]);

    const seenMsgIds = new Set<string>();
    const combinedMsgs = [...(msgData ?? []), ...fallbackMsgs].sort((a, b) =>
      String(b.updated_at || '').localeCompare(String(a.updated_at || ''))
    );

    for (const msg of combinedMsgs) {
      if (seenMsgIds.has(msg.id)) continue;
      seenMsgIds.add(msg.id);
      const list = messagesByLinkId.get(msg.campaign_influencer_id) ?? [];
      list.push(msg);
      messagesByLinkId.set(msg.campaign_influencer_id, list);
    }

    const combinedLogs = [...(logData ?? []), ...fallbackLogs].sort((a, b) =>
      String(b.created_at || '').localeCompare(String(a.created_at || ''))
    );

    for (const log of combinedLogs) {
      if (!latestLogByLinkId.has(log.campaign_influencer_id)) {
        latestLogByLinkId.set(log.campaign_influencer_id, log);
      }
    }
  }

  const cfg = getServerConfig();
  let items: WorkspaceCreatorDetail[] = influencers.map((inf) => {
    const link = linkByInfId.get(inf.id) ?? null;
    const msgs = link ? messagesByLinkId.get(link.id) ?? [] : [];
    const emailMessage = msgs.find((m) => m.channel === 'email') ?? null;
    const instagramDmMessage = msgs.find((m) => m.channel === 'instagram_dm') ?? null;
    const linkedinMessage = msgs.find((m) => m.channel === 'linkedin_message') ?? null;
    const youtubeContactMessage = msgs.find((m) => m.channel === 'youtube_contact') ?? null;
    const latestOutreachLog = link ? latestLogByLinkId.get(link.id) ?? null : null;

    const contactChannels = buildCreatorContactChannels(inf);
    const channelEval = evaluateCreatorChannels({
      influencer: inf,
      contactChannels,
      qualificationStatus: link?.qualification_status ?? null,
      outreachMode: cfg.outreachMode,
    });

    return {
      influencer: inf,
      campaignInfluencer: link,
      emailMessage,
      instagramDmMessage,
      linkedinMessage,
      youtubeContactMessage,
      latestOutreachLog,
      contactChannels,
      channelAvailability: channelEval.availability,
      recommendedChannel: channelEval.recommendedChannel,
      preferredChannel: channelEval.preferredChannel,
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
        (inf.contact_email && inf.contact_email.toLowerCase() !== 'not found'
          ? inf.contact_email
          : ''
        )
          .toLowerCase()
          .includes(q) ||
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
  let linkedinMessage: OutreachMessageRow | null = null;
  let youtubeContactMessage: OutreachMessageRow | null = null;
  let latestOutreachLog: OutreachLogRow | null = null;

  if (link) {
    const [{ data: msgs }, fbMsgs, { data: logs }, fbLogs] = await Promise.all([
      admin
        .from('outreach_messages')
        .select('*')
        .eq('campaign_influencer_id', link.id)
        .order('updated_at', { ascending: false }),
      loadMultiChannelFallbackMessages({ campaignInfluencerIds: [link.id] }),
      admin
        .from('outreach_logs')
        .select('*')
        .eq('campaign_influencer_id', link.id)
        .order('created_at', { ascending: false })
        .limit(10),
      loadMultiChannelFallbackLogs([link.id]),
    ]);

    const allMsgs = [...(msgs ?? []), ...fbMsgs].sort((a, b) =>
      String(b.updated_at || '').localeCompare(String(a.updated_at || ''))
    );

    emailMessage = allMsgs.find((m) => m.channel === 'email') ?? null;
    instagramDmMessage = allMsgs.find((m) => m.channel === 'instagram_dm') ?? null;
    linkedinMessage = allMsgs.find((m) => m.channel === 'linkedin_message') ?? null;
    youtubeContactMessage = allMsgs.find((m) => m.channel === 'youtube_contact') ?? null;

    const allLogs = [...(logs ?? []), ...fbLogs].sort((a, b) =>
      String(b.created_at || '').localeCompare(String(a.created_at || ''))
    );
    latestOutreachLog = allLogs[0] ?? null;
  }

  const cfg = getServerConfig();
  const contactChannels = buildCreatorContactChannels(inf);
  const channelEval = evaluateCreatorChannels({
    influencer: inf,
    contactChannels,
    qualificationStatus: link?.qualification_status ?? null,
    outreachMode: cfg.outreachMode,
  });

  return {
    influencer: inf,
    campaignInfluencer: link,
    emailMessage,
    instagramDmMessage,
    linkedinMessage,
    youtubeContactMessage,
    latestOutreachLog,
    contactChannels,
    channelAvailability: channelEval.availability,
    recommendedChannel: channelEval.recommendedChannel,
    preferredChannel: channelEval.preferredChannel,
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
    emailStatus?: 'verified' | 'unverified' | 'not_found';
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
      infUpdate.contact_email = 'Not Found';
      infUpdate.email_status = 'not_found';
    } else {
      if (!isValidEmail(trimmed)) {
        throw new AppHttpError(
          400,
          'invalid_contact_email',
          'Provide a valid email address or Not Found.'
        );
      }
      infUpdate.contact_email = clampString(trimmed, 254);
      infUpdate.email_status =
        patch.emailStatus === 'verified' ? 'verified' : 'unverified';
      infUpdate.last_verified_at =
        infUpdate.email_status === 'verified' ? new Date().toISOString() : null;
    }
  } else if (patch.emailStatus) {
    if (patch.emailStatus === 'not_found') {
      infUpdate.contact_email = 'Not Found';
      infUpdate.email_status = 'not_found';
    } else {
      const { data: existingInf } = await admin
        .from('influencers')
        .select('contact_email')
        .eq('id', influencerId)
        .single();
      if (!existingInf?.contact_email || !isValidEmail(existingInf.contact_email)) {
        throw new AppHttpError(
          400,
          'missing_contact_email',
          'A valid contact email must be present before marking it verified or unverified.'
        );
      }
      infUpdate.email_status = patch.emailStatus;
      infUpdate.last_verified_at =
        patch.emailStatus === 'verified' ? new Date().toISOString() : null;
    }
  }

  const { error: infErr } = await admin
    .from('influencers')
    .update(infUpdate)
    .eq('id', influencerId);

  if (infErr) {
    throw new AppHttpError(500, 'supabase_update_error', infErr.message);
  }

  if (patch.campaignInfluencerId && (patch.qualificationStatus || patch.qualificationReason !== undefined)) {
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

export async function updateCreatorChannelsAndPreference(
  influencerId: string,
  input: {
    preferredChannel?: OutreachChannel;
    addChannel?: {
      type: ContactChannelType;
      value: string;
      evidence?: string;
    };
  }
): Promise<WorkspaceCreatorDetail> {
  const admin = requireAdminClient();
  const { data: inf, error } = await admin
    .from('influencers')
    .select('*')
    .eq('id', influencerId)
    .single();

  if (error || !inf) {
    throw new AppHttpError(404, 'influencer_not_found', 'Creator profile not found.');
  }

  const nowIso = new Date().toISOString();
  const currentMeta = (inf.source_metadata ?? {}) as Record<string, unknown>;
  let channels = buildCreatorContactChannels(inf);

  const baseUpdate: Database['public']['Tables']['influencers']['Update'] = {
    updated_at: nowIso,
  };

  if (input.addChannel) {
    let validated: { value: string; url: string | null; username?: string | null };
    try {
      validated = validateManualContactChannelInput({
        type: input.addChannel.type,
        value: input.addChannel.value,
      });
    } catch (validationErr) {
      throw new AppHttpError(
        400,
        'invalid_contact_channel',
        validationErr instanceof Error ? validationErr.message : 'Invalid contact channel.'
      );
    }

    const newRec: ContactChannelRecord = {
      type: input.addChannel.type,
      value: validated.value,
      url: validated.url,
      username: validated.username,
      source: 'user_manual_confirmation',
      sourceUrl: validated.url,
      verificationStatus: 'user_confirmed',
      linkingConfidence: 'user_confirmed',
      evidence:
        clampString(input.addChannel.evidence || '', 200) ||
        'Explicitly linked and confirmed by operator',
      discoveredAt: nowIso,
    };

    channels = mergeContactChannels(channels, [newRec]);

    if (input.addChannel.type === 'email') {
      baseUpdate.contact_email = validated.value;
      baseUpdate.email_status = 'verified';
      baseUpdate.last_verified_at = nowIso;
    } else if (input.addChannel.type === 'other_contact' && validated.url && !inf.website) {
      baseUpdate.website = validated.url;
    }
  }

  const nextPreferred =
    input.preferredChannel &&
    ['email', 'instagram_dm', 'linkedin_message', 'youtube_contact'].includes(input.preferredChannel)
      ? input.preferredChannel
      : ((inf.preferred_channel ?? currentMeta.preferredChannel) as OutreachChannel | undefined) ?? null;

  const nextMeta: Record<string, unknown> = {
    ...currentMeta,
    contactChannels: channels,
    preferredChannel: nextPreferred,
  };

  baseUpdate.source_metadata = nextMeta;

  const { error: extErr } = await admin
    .from('influencers')
    .update({
      ...baseUpdate,
      contact_channels: channels,
      preferred_channel: nextPreferred,
    })
    .eq('id', influencerId);

  if (extErr && isMissingColumnError(extErr)) {
    const { error: fbErr } = await admin
      .from('influencers')
      .update(baseUpdate)
      .eq('id', influencerId);
    if (fbErr) {
      throw new AppHttpError(500, 'supabase_update_error', fbErr.message);
    }
  } else if (extErr) {
    throw new AppHttpError(500, 'supabase_update_error', extErr.message);
  }

  await recordAuditLog('update_creator_channels', 'influencer', influencerId, {
    preferredChannel: nextPreferred,
    addedChannelType: input.addChannel?.type ?? null,
  });

  return getInfluencerById(influencerId);
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

export function serializeCreatorsToCsv(
  items: WorkspaceCreatorDetail[],
  campaignNameById?: Map<string, string>
): string {
  const headers = [
    'Name',
    'Platform',
    'Handle',
    'Profile URL',
    'Campaign',
    'Followers',
    'Estimated Public Engagement (%)',
    'Engagement Source',
    'Niche',
    'Content Themes',
    'Country',
    'Geography Status',
    'Contact Email',
    'Email Status',
    'Email Source',
    'Enrichment Status',
    'Qualification Status',
    'Qualification Reason',
    'Rejection Reason',
    'Website',
    'Audience Age',
    'Audience Gender',
    'Audience Geography',
    'Data Source',
    'Retrieved At',
    'Preferred Channel',
    'Contact Channels',
  ];

  const rows = items.map(({ influencer, campaignInfluencer, contactChannels, preferredChannel }) => {
    const emailStatusLabel =
      influencer.email_status === 'verified'
        ? 'Manually Verified'
        : influencer.email_status === 'unverified'
          ? 'Publicly Listed (Unverified)'
          : 'Not Found';

    const meta = (influencer.source_metadata ?? {}) as Record<string, unknown>;
    const geographyStatus =
      (meta.geographyVerification as string | undefined) ||
      (influencer.country ? 'Verified' : 'Unknown');
    const enrichmentStatus =
      influencer.enrichment_status ||
      (meta.enrichmentStatus as string | undefined) ||
      (influencer.contact_email && influencer.contact_email !== 'Not Found' ? 'partial' : 'pending');
    const emailSource =
      influencer.email_source || (meta.emailSource as string | undefined) || 'Not Found';
    const qualStatus = campaignInfluencer?.qualification_status ?? 'discovered';
    const qualReason = campaignInfluencer?.qualification_reason ?? '';
    const rejectionReason = qualStatus === 'rejected' ? qualReason : '';
    const campaignLabel =
      campaignInfluencer?.campaign_id && campaignNameById?.get(campaignInfluencer.campaign_id)
        ? campaignNameById.get(campaignInfluencer.campaign_id)!
        : campaignInfluencer?.campaign_id ?? 'Unassigned';
    const channelsSummary = (contactChannels ?? [])
      .map((c) => `${c.type}:${c.value}(${c.verificationStatus})`)
      .join(' | ');

    return [
      influencer.name,
      influencer.platform,
      influencer.username ?? '',
      influencer.profile_url,
      campaignLabel,
      influencer.follower_count ?? 'Unavailable',
      influencer.engagement_rate ?? 'Unavailable',
      influencer.engagement_source ?? 'Unavailable',
      influencer.niche ?? 'Beauty & Skincare',
      (influencer.content_themes ?? []).join(' | '),
      influencer.country ?? 'Not Available',
      geographyStatus,
      influencer.contact_email ?? 'Not Found',
      emailStatusLabel,
      emailSource,
      enrichmentStatus,
      qualStatus,
      qualReason,
      rejectionReason,
      influencer.website ?? 'Not Available',
      influencer.audience_age ?? 'Not Available',
      influencer.audience_gender ?? 'Not Available',
      influencer.audience_geography ?? 'Not Available',
      influencer.data_source ?? 'youtube_data_api_v3',
      influencer.source_retrieved_at ?? influencer.created_at,
      preferredChannel ?? '',
      channelsSummary,
    ];
  });

  return [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((r) => r.map(escapeCsvCell).join(',')),
  ].join('\n');
}

export async function listAuditAndSystemOverview(): Promise<{
  discoveryRuns: Database['public']['Tables']['discovery_runs']['Row'][];
  outreachLogs: OutreachLogRow[];
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
  const admin = requireAdminClient();

  const [
    { data: runs },
    { data: logs },
    { data: auditRows },
    { count: campCount },
    { count: infCount },
    { count: msgCount },
    { count: suppCount },
  ] = await Promise.all([
    admin.from('discovery_runs').select('*').order('created_at', { ascending: false }).limit(25),
    admin.from('outreach_logs').select('*').order('created_at', { ascending: false }).limit(30),
    admin.from('demo_audit_logs').select('*').order('created_at', { ascending: false }).limit(40),
    admin.from('campaigns').select('id', { count: 'exact', head: true }),
    admin.from('influencers').select('id', { count: 'exact', head: true }),
    admin.from('outreach_messages').select('id', { count: 'exact', head: true }),
    admin.from('outreach_suppressions').select('id', { count: 'exact', head: true }),
  ]);

  const sanitizedAudits = (auditRows ?? [])
    .filter(
      (r) =>
        r.entity_type !== CAMPAIGN_EXTENSION_META_ENTITY &&
        r.entity_type !== MULTI_CHANNEL_MESSAGE_ENTITY &&
        r.entity_type !== MULTI_CHANNEL_LOG_ENTITY &&
        !String(r.entity_type || '').startsWith('workspace_')
    )
    .slice(0, 25)
    .map((r) => ({
      id: r.id,
      action: r.action,
      entity_type: r.entity_type,
      entity_id: r.entity_id,
      details: (r.details ?? {}) as Record<string, unknown>,
      created_at: r.created_at,
    }));

  return {
    discoveryRuns: runs ?? [],
    outreachLogs: logs ?? [],
    auditLogs: sanitizedAudits,
    counts: {
      campaigns: campCount ?? 0,
      influencers: infCount ?? 0,
      messages: msgCount ?? 0,
      suppressions: suppCount ?? 0,
    },
  };
}

export interface ReEvaluateCampaignResult {
  campaignId: string;
  campaignName: string;
  totalEvaluated: number;
  deduplicatedCount: number;
  before: {
    qualified: number;
    needs_review: number;
    rejected: number;
    discovered: number;
  };
  after: {
    qualified: number;
    needs_review: number;
    rejected: number;
  };
  changesSample: Array<{
    influencerId: string;
    name: string;
    platform: string;
    previousStatus: string;
    nextStatus: string;
    classificationCode: 'PASS' | 'FAIL' | 'REVIEW_REQUIRED';
    fitScore: number;
    reason: string;
  }>;
}

export async function reEvaluateCampaignCreators(
  campaignId?: string
): Promise<ReEvaluateCampaignResult> {
  const admin = requireAdminClient();

  let campaign: CampaignRow | null = null;
  if (campaignId) {
    const { data, error } = await admin
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();
    if (error || !data) {
      throw new AppHttpError(404, 'campaign_not_found', 'Campaign not found.');
    }
    campaign = data;
  } else {
    const { data } = await admin
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);
    campaign = data?.[0] ?? null;
  }

  if (!campaign) {
    throw new AppHttpError(404, 'campaign_not_found', 'No campaign found to re-evaluate.');
  }

  const { data: links, error: linkErr } = await admin
    .from('campaign_influencers')
    .select('*')
    .eq('campaign_id', campaign.id);

  if (linkErr) {
    throw new AppHttpError(500, 'supabase_query_error', linkErr.message);
  }

  const campaignLinks = links ?? [];
  const infIds = Array.from(new Set(campaignLinks.map((l) => l.influencer_id)));
  if (infIds.length === 0) {
    return {
      campaignId: campaign.id,
      campaignName: campaign.name,
      totalEvaluated: 0,
      deduplicatedCount: 0,
      before: { qualified: 0, needs_review: 0, rejected: 0, discovered: 0 },
      after: { qualified: 0, needs_review: 0, rejected: 0 },
      changesSample: [],
    };
  }

  const { data: infRows, error: infErr } = await admin
    .from('influencers')
    .select('*')
    .in('id', infIds);

  if (infErr) {
    throw new AppHttpError(500, 'supabase_query_error', infErr.message);
  }

  const infMap = new Map((infRows ?? []).map((r) => [r.id, r]));
  const criteria = {
    minFollowers: campaign.min_followers ?? 5000,
    maxFollowers: campaign.max_followers ?? 100000,
    minEngagementRate: Number(campaign.min_engagement_rate ?? 2.0),
    targetCountry: campaign.target_country ?? 'India',
    niche: campaign.niche ?? 'Beauty & Skincare',
  };

  // Deduplicate canonical Instagram URLs differing only by trailing slash
  const canonicalSeen = new Map<string, { link: CampaignInfluencerRow; inf: InfluencerRow }>();
  const duplicateLinks: CampaignInfluencerRow[] = [];

  for (const link of campaignLinks) {
    const inf = infMap.get(link.influencer_id);
    if (!inf) continue;
    const canonicalUrl =
      inf.platform === 'instagram'
        ? inf.profile_url.replace(/\/+$/, '').toLowerCase()
        : inf.profile_url.toLowerCase();
    const existing = canonicalSeen.get(canonicalUrl);
    if (!existing) {
      canonicalSeen.set(canonicalUrl, { link, inf });
    } else {
      const existingHasNoSlash = !existing.inf.profile_url.endsWith('/');
      const currentHasNoSlash = !inf.profile_url.endsWith('/');
      const currentRicher =
        (inf.engagement_rate !== null && existing.inf.engagement_rate === null) ||
        (currentHasNoSlash && !existingHasNoSlash);
      if (currentRicher) {
        duplicateLinks.push(existing.link);
        canonicalSeen.set(canonicalUrl, { link, inf });
      } else {
        duplicateLinks.push(link);
      }
    }
  }

  let deduplicatedCount = 0;
  for (const dup of duplicateLinks) {
    try {
      await admin.from('campaign_influencers').delete().eq('id', dup.id);
      deduplicatedCount += 1;
    } catch {
      // Non-fatal cleanup
    }
  }

  const before = { qualified: 0, needs_review: 0, rejected: 0, discovered: 0 };
  const after = { qualified: 0, needs_review: 0, rejected: 0 };
  const changesSample: ReEvaluateCampaignResult['changesSample'] = [];
  const qualifiedScores: Array<{ influencerId: string; fitScore: number }> = [];

  const entries = Array.from(canonicalSeen.values());
  for (const { link, inf } of entries) {
    const prevStatus = link.qualification_status || 'discovered';
    if (prevStatus === 'qualified') before.qualified += 1;
    else if (prevStatus === 'needs_review') before.needs_review += 1;
    else if (prevStatus === 'rejected') before.rejected += 1;
    else before.discovered += 1;

    const meta = (inf.source_metadata ?? {}) as Record<string, unknown>;
    const recentTitles = Array.isArray(meta.recentVideoTitles)
      ? meta.recentVideoTitles.filter((t): t is string => typeof t === 'string')
      : [];
    const engagementMeta =
      meta.engagementMeta && typeof meta.engagementMeta === 'object'
        ? (meta.engagementMeta as Record<string, unknown>)
        : {};
    const sampleSize =
      inf.engagement_sample_size ??
      (typeof engagementMeta.sampleSize === 'number' ? engagementMeta.sampleSize : undefined);

    const evaluation = evaluateCreatorQualification(
      {
        name: inf.name,
        description: inf.profile_description ?? '',
        recentVideoTitles: recentTitles,
        country: inf.country,
        subscriberCount: inf.follower_count,
        engagementRate: inf.engagement_rate,
        engagementSampleSize: inf.engagement_rate === null ? 0 : sampleSize,
        contactEmail:
          inf.contact_email && inf.contact_email.toLowerCase() !== 'not found'
            ? inf.contact_email
            : null,
        platform: inf.platform,
      },
      criteria
    );

    if (evaluation.status === 'qualified') {
      after.qualified += 1;
      qualifiedScores.push({ influencerId: inf.id, fitScore: evaluation.fitScore });
    } else if (evaluation.status === 'needs_review') {
      after.needs_review += 1;
    } else {
      after.rejected += 1;
    }

    const updatedMeta: Record<string, unknown> = {
      ...meta,
      geographyStatus: evaluation.geographyStatus,
      geographyVerification: evaluation.geographyVerification,
      classificationCode: evaluation.classificationCode,
      fitScoreBreakdown: evaluation.fitScoreBreakdown,
      evaluatedAt: evaluation.evaluatedAt,
    };

    const nextThemes =
      inf.content_themes && inf.content_themes.length > 0
        ? inf.content_themes
        : evaluation.detectedThemes;

    await admin
      .from('influencers')
      .update({
        fit_score: evaluation.fitScore,
        niche: evaluation.nicheMatched ? criteria.niche : 'General / Unmatched',
        content_themes: nextThemes,
        source_metadata: updatedMeta,
        updated_at: evaluation.evaluatedAt,
      })
      .eq('id', inf.id);

    const { error: ciErr } = await admin
      .from('campaign_influencers')
      .update({
        qualification_status: evaluation.status,
        qualification_reason: evaluation.reason,
        review_state:
          evaluation.status === 'needs_review' ? 'pending_country_review' : 'evaluated',
        reviewed_at: evaluation.evaluatedAt,
      })
      .eq('id', link.id);

    if (ciErr && isMissingColumnError(ciErr)) {
      await admin
        .from('campaign_influencers')
        .update({
          qualification_status: evaluation.status,
          qualification_reason: evaluation.reason,
        })
        .eq('id', link.id);
    }

    if (prevStatus !== evaluation.status || prevStatus === 'qualified' || evaluation.status !== 'rejected') {
      changesSample.push({
        influencerId: inf.id,
        name: inf.name,
        platform: inf.platform,
        previousStatus: prevStatus,
        nextStatus: evaluation.status,
        classificationCode: evaluation.classificationCode,
        fitScore: evaluation.fitScore,
        reason: evaluation.reason,
      });
    }
  }

  // Refresh Top 5 picks strictly among re-evaluated qualified creators
  try {
    await admin.from('influencers').update({ is_top_pick: false }).in('id', infIds);
    const top5Ids = qualifiedScores
      .sort((a, b) => b.fitScore - a.fitScore)
      .slice(0, 5)
      .map((item) => item.influencerId);
    if (top5Ids.length > 0) {
      await admin.from('influencers').update({ is_top_pick: true }).in('id', top5Ids);
    }
  } catch {
    // Non-fatal if is_top_pick column is unavailable
  }

  await recordAuditLog('re_evaluate_campaign_creators', 'campaign', campaign.id, {
    totalEvaluated: entries.length,
    deduplicatedCount,
    before,
    after,
  });

  return {
    campaignId: campaign.id,
    campaignName: campaign.name,
    totalEvaluated: entries.length,
    deduplicatedCount,
    before,
    after,
    changesSample: changesSample.slice(0, 30),
  };
}
