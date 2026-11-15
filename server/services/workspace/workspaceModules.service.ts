import crypto from 'node:crypto';
import { getNonSensitiveHealthStatus } from '../../config/env.ts';
import { getSupabaseAdmin } from '../../lib/supabaseAdmin.ts';
import { AppHttpError } from '../../middleware/errorHandler.ts';
import type {
  CampaignContentIdeaRow,
  CreatorIncentiveRow,
  Database,
  WorkspaceSettingsRow,
  WorkspaceTaskRow,
} from '../../../src/types/database.ts';
import { getGmailConnectionStatus } from '../gmail/gmailOAuth.service.ts';
import { recordAuditLog } from '../supabase/sharedWorkspace.service.ts';
import { clampString, parseBoundedFloat, parseBoundedInt } from '../../utils/validation.ts';

function requireAdmin() {
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

function isTableMissingError(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  const code = err.code || '';
  const msg = (err.message || '').toLowerCase();
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    msg.includes('could not find the table') ||
    msg.includes('does not exist')
  );
}

async function listFallbackRecords<T>(entityType: string): Promise<T[]> {
  const admin = requireAdmin();
  const { data, error } = await admin
    .from('demo_audit_logs')
    .select('entity_id, details, created_at')
    .eq('entity_type', entityType)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    throw new AppHttpError(500, 'supabase_query_error', error.message);
  }

  const seen = new Set<string>();
  const rows: T[] = [];
  for (const row of data ?? []) {
    if (!row.entity_id || seen.has(row.entity_id)) continue;
    seen.add(row.entity_id);
    if (row.details && typeof row.details === 'object') {
      const detailsObj = row.details as Record<string, unknown>;
      if (detailsObj._deleted === true || typeof detailsObj.id !== 'string') continue;
      rows.push(detailsObj as unknown as T);
    }
  }
  return rows;
}

async function upsertFallbackRecord<T extends { id: string }>(
  entityType: string,
  record: T,
  action: string
): Promise<T> {
  const admin = requireAdmin();
  await admin
    .from('demo_audit_logs')
    .delete()
    .eq('entity_type', entityType)
    .eq('entity_id', record.id);

  const { error } = await admin.from('demo_audit_logs').insert({
    action,
    entity_type: entityType,
    entity_id: record.id,
    details: record as unknown as Record<string, unknown>,
  });

  if (error) {
    throw new AppHttpError(500, 'supabase_insert_error', error.message);
  }
  return record;
}

async function deleteFallbackRecord(entityType: string, id: string): Promise<void> {
  const admin = requireAdmin();
  const { error } = await admin
    .from('demo_audit_logs')
    .delete()
    .eq('entity_type', entityType)
    .eq('entity_id', id);
  if (error) {
    throw new AppHttpError(500, 'supabase_delete_error', error.message);
  }
}

// ============================================================
// 1. Campaign Content Ideas
// ============================================================

const FALLBACK_CONTENT_ENTITY = 'workspace_content_idea_record';

export async function listContentIdeas(campaignId?: string): Promise<{
  items: CampaignContentIdeaRow[];
  storageMode: 'native_table' | 'audit_fallback';
}> {
  const admin = requireAdmin();
  let query = admin
    .from('campaign_content_ideas')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(100);
  if (campaignId) query = query.eq('campaign_id', campaignId);

  const { data, error } = await query;
  if (!error) {
    return { items: (data ?? []) as CampaignContentIdeaRow[], storageMode: 'native_table' };
  }
  if (!isTableMissingError(error)) {
    throw new AppHttpError(500, 'supabase_query_error', error.message);
  }

  let items = await listFallbackRecords<CampaignContentIdeaRow>(FALLBACK_CONTENT_ENTITY);
  if (campaignId) items = items.filter((item) => item.campaign_id === campaignId);
  return { items, storageMode: 'audit_fallback' };
}

export async function createContentIdea(input: {
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
  const admin = requireAdmin();
  const title = clampString(input.title, 140);
  const angle = clampString(input.angle, 500);
  if (!title || title.length < 3) {
    throw new AppHttpError(400, 'invalid_idea_title', 'Content idea title must be at least 3 characters.');
  }
  if (!angle) {
    throw new AppHttpError(400, 'invalid_idea_angle', 'Content idea angle is required.');
  }

  const nowIso = new Date().toISOString();
  const row: CampaignContentIdeaRow = {
    id: crypto.randomUUID(),
    campaign_id: input.campaignId ?? null,
    influencer_id: input.influencerId ?? null,
    title,
    format: clampString(input.format || 'UGC', 40) || 'UGC',
    angle,
    content_themes: (input.contentThemes ?? []).map((t) => clampString(t, 45)).filter(Boolean).slice(0, 6),
    ai_model: input.aiModel ?? null,
    source: clampString(input.source || 'manual', 40) || 'manual',
    status: input.status ?? 'draft',
    created_at: nowIso,
    updated_at: nowIso,
  };

  const { data, error } = await admin
    .from('campaign_content_ideas')
    .insert(row)
    .select()
    .single();

  if (!error && data) {
    await recordAuditLog('create_content_idea', 'content_idea', data.id, { title: data.title });
    return data as CampaignContentIdeaRow;
  }

  if (!isTableMissingError(error)) {
    throw new AppHttpError(500, 'supabase_insert_error', error?.message || 'Unable to create content idea.');
  }

  await upsertFallbackRecord(FALLBACK_CONTENT_ENTITY, row, 'create_content_idea_fallback');
  await recordAuditLog('create_content_idea', 'content_idea', row.id, { title: row.title });
  return row;
}

export async function updateContentIdea(
  id: string,
  patch: Partial<{
    title: string;
    format: string;
    angle: string;
    contentThemes: string[];
    status: CampaignContentIdeaRow['status'];
  }>
): Promise<CampaignContentIdeaRow> {
  const admin = requireAdmin();
  const nowIso = new Date().toISOString();
  const dbPatch: Database['public']['Tables']['campaign_content_ideas']['Update'] = {
    updated_at: nowIso,
  };
  if (patch.title !== undefined) dbPatch.title = clampString(patch.title, 140);
  if (patch.format !== undefined) dbPatch.format = clampString(patch.format, 40);
  if (patch.angle !== undefined) dbPatch.angle = clampString(patch.angle, 500);
  if (patch.contentThemes !== undefined) {
    dbPatch.content_themes = patch.contentThemes.map((t) => clampString(t, 45)).filter(Boolean).slice(0, 6);
  }
  if (patch.status && ['draft', 'approved', 'archived'].includes(patch.status)) {
    dbPatch.status = patch.status;
  }

  const { data, error } = await admin
    .from('campaign_content_ideas')
    .update(dbPatch)
    .eq('id', id)
    .select()
    .single();

  if (!error && data) {
    return data as CampaignContentIdeaRow;
  }
  if (!isTableMissingError(error)) {
    throw new AppHttpError(error ? 404 : 500, 'content_idea_not_found', error?.message || 'Content idea not found.');
  }

  const existing = (await listFallbackRecords<CampaignContentIdeaRow>(FALLBACK_CONTENT_ENTITY)).find(
    (item) => item.id === id
  );
  if (!existing) {
    throw new AppHttpError(404, 'content_idea_not_found', 'Content idea not found.');
  }
  const updated: CampaignContentIdeaRow = {
    ...existing,
    title: typeof dbPatch.title === 'string' ? dbPatch.title : existing.title,
    format: typeof dbPatch.format === 'string' ? dbPatch.format : existing.format,
    angle: typeof dbPatch.angle === 'string' ? dbPatch.angle : existing.angle,
    content_themes: Array.isArray(dbPatch.content_themes)
      ? (dbPatch.content_themes as string[])
      : existing.content_themes,
    status: (dbPatch.status as CampaignContentIdeaRow['status']) || existing.status,
    updated_at: nowIso,
  };
  return upsertFallbackRecord(FALLBACK_CONTENT_ENTITY, updated, 'update_content_idea_fallback');
}

export async function deleteContentIdea(id: string): Promise<void> {
  const admin = requireAdmin();
  const { error } = await admin.from('campaign_content_ideas').delete().eq('id', id);
  if (!error) return;
  if (!isTableMissingError(error)) {
    throw new AppHttpError(500, 'supabase_delete_error', error.message);
  }
  await deleteFallbackRecord(FALLBACK_CONTENT_ENTITY, id);
}

// ============================================================
// 2. Creator Incentives & Compensation Plans
// ============================================================

const FALLBACK_INCENTIVE_ENTITY = 'workspace_incentive_record';

export async function listIncentives(campaignId?: string): Promise<{
  items: CreatorIncentiveRow[];
  storageMode: 'native_table' | 'audit_fallback';
}> {
  const admin = requireAdmin();
  let query = admin
    .from('creator_incentives')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(120);
  if (campaignId) query = query.eq('campaign_id', campaignId);

  const { data, error } = await query;
  if (!error) {
    return { items: (data ?? []) as CreatorIncentiveRow[], storageMode: 'native_table' };
  }
  if (!isTableMissingError(error)) {
    throw new AppHttpError(500, 'supabase_query_error', error.message);
  }

  let items = await listFallbackRecords<CreatorIncentiveRow>(FALLBACK_INCENTIVE_ENTITY);
  if (campaignId) items = items.filter((item) => item.campaign_id === campaignId);
  return { items, storageMode: 'audit_fallback' };
}

export async function createIncentive(input: {
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
  const admin = requireAdmin();
  const compType = clampString(input.compensationType, 60);
  if (!compType) {
    throw new AppHttpError(400, 'invalid_compensation_type', 'Compensation type is required.');
  }

  // Strict data honesty: never invent amounts unless explicitly supplied
  const amount =
    input.amount !== undefined && input.amount !== null && Number.isFinite(Number(input.amount))
      ? parseBoundedFloat(input.amount, 0, 0, 10_000_000)
      : null;

  const commissionPercent =
    input.commissionPercent !== undefined &&
    input.commissionPercent !== null &&
    Number.isFinite(Number(input.commissionPercent))
      ? parseBoundedFloat(input.commissionPercent, 0, 0, 100)
      : null;

  const nowIso = new Date().toISOString();
  const row: CreatorIncentiveRow = {
    id: crypto.randomUUID(),
    campaign_id: input.campaignId ?? null,
    influencer_id: input.influencerId ?? null,
    outreach_log_id: input.outreachLogId ?? null,
    compensation_type: compType,
    amount,
    currency: clampString(input.currency || 'INR', 10) || 'INR',
    commission_percent: commissionPercent,
    deliverables: input.deliverables ? clampString(input.deliverables, 240) : null,
    status: input.status ?? 'planned',
    notes: input.notes ? clampString(input.notes, 300) : null,
    created_at: nowIso,
    updated_at: nowIso,
  };

  const { data, error } = await admin.from('creator_incentives').insert(row).select().single();
  if (!error && data) {
    await recordAuditLog('create_incentive', 'creator_incentive', data.id, {
      compensationType: data.compensation_type,
      status: data.status,
    });
    return data as CreatorIncentiveRow;
  }

  if (!isTableMissingError(error)) {
    throw new AppHttpError(500, 'supabase_insert_error', error?.message || 'Unable to create incentive.');
  }

  await upsertFallbackRecord(FALLBACK_INCENTIVE_ENTITY, row, 'create_incentive_fallback');
  await recordAuditLog('create_incentive', 'creator_incentive', row.id, {
    compensationType: row.compensation_type,
    status: row.status,
  });
  return row;
}

export async function updateIncentive(
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
  const admin = requireAdmin();
  const nowIso = new Date().toISOString();
  const dbPatch: Database['public']['Tables']['creator_incentives']['Update'] = {
    updated_at: nowIso,
  };
  if (patch.compensationType !== undefined) dbPatch.compensation_type = clampString(patch.compensationType, 60);
  if (patch.amount !== undefined) {
    dbPatch.amount =
      patch.amount !== null && Number.isFinite(Number(patch.amount))
        ? parseBoundedFloat(patch.amount, 0, 0, 10_000_000)
        : null;
  }
  if (patch.currency !== undefined) dbPatch.currency = clampString(patch.currency, 10);
  if (patch.commissionPercent !== undefined) {
    dbPatch.commission_percent =
      patch.commissionPercent !== null && Number.isFinite(Number(patch.commissionPercent))
        ? parseBoundedFloat(patch.commissionPercent, 0, 0, 100)
        : null;
  }
  if (patch.deliverables !== undefined) dbPatch.deliverables = patch.deliverables ? clampString(patch.deliverables, 240) : null;
  if (patch.status && ['planned', 'offered', 'accepted', 'fulfilled', 'cancelled'].includes(patch.status)) {
    dbPatch.status = patch.status;
  }
  if (patch.notes !== undefined) dbPatch.notes = patch.notes ? clampString(patch.notes, 300) : null;
  if (patch.outreachLogId !== undefined) dbPatch.outreach_log_id = patch.outreachLogId;

  const { data, error } = await admin
    .from('creator_incentives')
    .update(dbPatch)
    .eq('id', id)
    .select()
    .single();

  if (!error && data) return data as CreatorIncentiveRow;
  if (!isTableMissingError(error)) {
    throw new AppHttpError(error ? 404 : 500, 'incentive_not_found', error?.message || 'Incentive not found.');
  }

  const existing = (await listFallbackRecords<CreatorIncentiveRow>(FALLBACK_INCENTIVE_ENTITY)).find(
    (item) => item.id === id
  );
  if (!existing) throw new AppHttpError(404, 'incentive_not_found', 'Incentive not found.');

  const updated: CreatorIncentiveRow = { ...existing, ...dbPatch, updated_at: nowIso };
  return upsertFallbackRecord(FALLBACK_INCENTIVE_ENTITY, updated, 'update_incentive_fallback');
}

export async function deleteIncentive(id: string): Promise<void> {
  const admin = requireAdmin();
  const { error } = await admin.from('creator_incentives').delete().eq('id', id);
  if (!error) return;
  if (!isTableMissingError(error)) {
    throw new AppHttpError(500, 'supabase_delete_error', error.message);
  }
  await deleteFallbackRecord(FALLBACK_INCENTIVE_ENTITY, id);
}

// ============================================================
// 3. Workspace Tasks
// ============================================================

const FALLBACK_TASK_ENTITY = 'workspace_task_record';

export async function listTasks(filters?: {
  campaignId?: string;
  status?: string;
}): Promise<{
  items: WorkspaceTaskRow[];
  storageMode: 'native_table' | 'audit_fallback';
}> {
  const admin = requireAdmin();
  let query = admin
    .from('workspace_tasks')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(150);
  if (filters?.campaignId) query = query.eq('campaign_id', filters.campaignId);
  if (
    filters?.status &&
    ['todo', 'in_progress', 'completed', 'cancelled'].includes(filters.status)
  ) {
    query = query.eq('status', filters.status as WorkspaceTaskRow['status']);
  }

  const { data, error } = await query;
  if (!error) {
    return { items: (data ?? []) as WorkspaceTaskRow[], storageMode: 'native_table' };
  }
  if (!isTableMissingError(error)) {
    throw new AppHttpError(500, 'supabase_query_error', error.message);
  }

  let items = await listFallbackRecords<WorkspaceTaskRow>(FALLBACK_TASK_ENTITY);
  if (filters?.campaignId) items = items.filter((t) => t.campaign_id === filters.campaignId);
  if (filters?.status && filters.status !== 'all') items = items.filter((t) => t.status === filters.status);
  return { items, storageMode: 'audit_fallback' };
}

export async function createTask(input: {
  campaignId?: string | null;
  influencerId?: string | null;
  outreachMessageId?: string | null;
  title: string;
  description?: string | null;
  priority?: WorkspaceTaskRow['priority'];
  status?: WorkspaceTaskRow['status'];
  dueDate?: string | null;
}): Promise<WorkspaceTaskRow> {
  const admin = requireAdmin();
  const title = clampString(input.title, 160);
  if (!title || title.length < 3) {
    throw new AppHttpError(400, 'invalid_task_title', 'Task title must be at least 3 characters.');
  }

  const nowIso = new Date().toISOString();
  const status: WorkspaceTaskRow['status'] = input.status ?? 'todo';
  const row: WorkspaceTaskRow = {
    id: crypto.randomUUID(),
    campaign_id: input.campaignId ?? null,
    influencer_id: input.influencerId ?? null,
    outreach_message_id: input.outreachMessageId ?? null,
    title,
    description: input.description ? clampString(input.description, 400) : null,
    priority: input.priority ?? 'medium',
    status,
    due_date: input.dueDate ? clampString(input.dueDate, 40) : null,
    completed_at: status === 'completed' ? nowIso : null,
    created_at: nowIso,
    updated_at: nowIso,
  };

  const { data, error } = await admin.from('workspace_tasks').insert(row).select().single();
  if (!error && data) {
    await recordAuditLog('create_workspace_task', 'workspace_task', data.id, { title: data.title });
    return data as WorkspaceTaskRow;
  }

  if (!isTableMissingError(error)) {
    throw new AppHttpError(500, 'supabase_insert_error', error?.message || 'Unable to create task.');
  }

  await upsertFallbackRecord(FALLBACK_TASK_ENTITY, row, 'create_workspace_task_fallback');
  await recordAuditLog('create_workspace_task', 'workspace_task', row.id, { title: row.title });
  return row;
}

export async function updateTask(
  id: string,
  patch: Partial<{
    title: string;
    description: string | null;
    priority: WorkspaceTaskRow['priority'];
    status: WorkspaceTaskRow['status'];
    dueDate: string | null;
  }>
): Promise<WorkspaceTaskRow> {
  const admin = requireAdmin();
  const nowIso = new Date().toISOString();
  const dbPatch: Database['public']['Tables']['workspace_tasks']['Update'] = {
    updated_at: nowIso,
  };
  if (patch.title !== undefined) dbPatch.title = clampString(patch.title, 160);
  if (patch.description !== undefined) dbPatch.description = patch.description ? clampString(patch.description, 400) : null;
  if (patch.priority && ['low', 'medium', 'high'].includes(patch.priority)) dbPatch.priority = patch.priority;
  if (patch.status && ['todo', 'in_progress', 'completed', 'cancelled'].includes(patch.status)) {
    dbPatch.status = patch.status;
    dbPatch.completed_at = patch.status === 'completed' ? nowIso : null;
  }
  if (patch.dueDate !== undefined) dbPatch.due_date = patch.dueDate ? clampString(patch.dueDate, 40) : null;

  const { data, error } = await admin
    .from('workspace_tasks')
    .update(dbPatch)
    .eq('id', id)
    .select()
    .single();

  if (!error && data) return data as WorkspaceTaskRow;
  if (!isTableMissingError(error)) {
    throw new AppHttpError(error ? 404 : 500, 'task_not_found', error?.message || 'Task not found.');
  }

  const existing = (await listFallbackRecords<WorkspaceTaskRow>(FALLBACK_TASK_ENTITY)).find(
    (t) => t.id === id
  );
  if (!existing) throw new AppHttpError(404, 'task_not_found', 'Task not found.');
  const updated: WorkspaceTaskRow = { ...existing, ...dbPatch, updated_at: nowIso };
  return upsertFallbackRecord(FALLBACK_TASK_ENTITY, updated, 'update_workspace_task_fallback');
}

export async function deleteTask(id: string): Promise<void> {
  const admin = requireAdmin();
  const { error } = await admin.from('workspace_tasks').delete().eq('id', id);
  if (!error) return;
  if (!isTableMissingError(error)) {
    throw new AppHttpError(500, 'supabase_delete_error', error.message);
  }
  await deleteFallbackRecord(FALLBACK_TASK_ENTITY, id);
}

// ============================================================
// 4. Workspace Settings (Non-secret preferences only)
// ============================================================

const FALLBACK_SETTINGS_ENTITY = 'workspace_settings_record';
const DEFAULT_SETTINGS_ID = 'default_workspace_settings';

function defaultWorkspaceSettings(): WorkspaceSettingsRow {
  const nowIso = new Date().toISOString();
  return {
    id: DEFAULT_SETTINGS_ID,
    default_outreach_mode: 'simulation',
    default_niche: 'Beauty & Skincare',
    default_country: 'India',
    default_min_followers: 5000,
    default_max_followers: 100000,
    default_min_engagement: 2.0,
    default_collaboration_type: 'Sponsorship',
    require_manual_review_before_send: true,
    updated_at: nowIso,
  };
}

export async function getWorkspaceSettings(): Promise<{
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
  const admin = requireAdmin();
  const envHealth = getNonSensitiveHealthStatus();
  const gmail = await getGmailConnectionStatus().catch(() => ({
    connected: false,
    senderEmail: null,
  }));

  const integrations = {
    outreachMode: envHealth.outreachMode,
    supabaseConfigured: envHealth.supabaseConfigured,
    youtubeConfigured: envHealth.youtubeConfigured,
    apifyConfigured: envHealth.apifyConfigured,
    geminiConfigured: envHealth.geminiConfigured,
    geminiModel: envHealth.geminiModel,
    gmailOAuthConfigured: envHealth.gmailOAuthConfigured,
    gmailConnected: gmail.connected,
    gmailAccountEmail: gmail.senderEmail,
  };

  const { data, error } = await admin
    .from('workspace_settings')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1);

  if (!error) {
    return {
      settings: (data?.[0] as WorkspaceSettingsRow) || defaultWorkspaceSettings(),
      storageMode: 'native_table',
      integrations,
    };
  }

  if (!isTableMissingError(error)) {
    throw new AppHttpError(500, 'supabase_query_error', error.message);
  }

  const fbRows = await listFallbackRecords<WorkspaceSettingsRow>(FALLBACK_SETTINGS_ENTITY);
  return {
    settings: fbRows[0] || defaultWorkspaceSettings(),
    storageMode: 'audit_fallback',
    integrations,
  };
}

export async function updateWorkspaceSettings(
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
  const current = await getWorkspaceSettings();
  const admin = requireAdmin();
  const nowIso = new Date().toISOString();

  const minFollowers =
    patch.default_min_followers !== undefined
      ? parseBoundedInt(patch.default_min_followers, 5000, 500, 1_000_000)
      : current.settings.default_min_followers;
  const maxFollowers =
    patch.default_max_followers !== undefined
      ? parseBoundedInt(patch.default_max_followers, 100000, minFollowers, 10_000_000)
      : Math.max(minFollowers, current.settings.default_max_followers);

  const nextSettings: WorkspaceSettingsRow = {
    id: current.settings.id || DEFAULT_SETTINGS_ID,
    default_outreach_mode: 'simulation', // Runtime OUTREACH_MODE env remains authoritative for safety
    default_niche:
      patch.default_niche !== undefined
        ? clampString(patch.default_niche, 100) || 'Beauty & Skincare'
        : current.settings.default_niche,
    default_country:
      patch.default_country !== undefined
        ? clampString(patch.default_country, 80) || 'India'
        : current.settings.default_country,
    default_min_followers: minFollowers,
    default_max_followers: maxFollowers,
    default_min_engagement:
      patch.default_min_engagement !== undefined
        ? parseBoundedFloat(patch.default_min_engagement, 2.0, 0, 50)
        : Number(current.settings.default_min_engagement),
    default_collaboration_type:
      patch.default_collaboration_type !== undefined
        ? clampString(patch.default_collaboration_type, 60) || 'Sponsorship'
        : current.settings.default_collaboration_type,
    require_manual_review_before_send:
      patch.require_manual_review_before_send !== undefined
        ? Boolean(patch.require_manual_review_before_send)
        : current.settings.require_manual_review_before_send,
    updated_at: nowIso,
  };

  if (current.storageMode === 'native_table') {
    const existingRowId =
      current.settings.id && /^[0-9a-f-]{36}$/i.test(current.settings.id)
        ? current.settings.id
        : crypto.randomUUID();
    const rowToSave = { ...nextSettings, id: existingRowId };
    const { data, error } = await admin
      .from('workspace_settings')
      .upsert(rowToSave, { onConflict: 'id' })
      .select()
      .single();
    if (!error && data) {
      await recordAuditLog('update_workspace_settings', 'workspace_settings', data.id, {
        niche: data.default_niche,
        country: data.default_country,
      });
      return data as WorkspaceSettingsRow;
    }
    if (!isTableMissingError(error)) {
      throw new AppHttpError(500, 'supabase_update_error', error?.message || 'Unable to save settings.');
    }
  }

  await upsertFallbackRecord(
    FALLBACK_SETTINGS_ENTITY,
    { ...nextSettings, id: DEFAULT_SETTINGS_ID },
    'update_workspace_settings_fallback'
  );
  await recordAuditLog('update_workspace_settings', 'workspace_settings', DEFAULT_SETTINGS_ID, {
    niche: nextSettings.default_niche,
    country: nextSettings.default_country,
  });
  return { ...nextSettings, id: DEFAULT_SETTINGS_ID };
}

// ============================================================
// 5. Real DB-Calculated Reports
// ============================================================

export interface WorkspaceReportSummary {
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

export async function computeWorkspaceReports(filters: {
  campaignId?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<WorkspaceReportSummary> {
  const admin = requireAdmin();

  const [
    { data: infs, error: infErr },
    { data: links, error: linkErr },
    { data: runs },
    { data: msgs },
    { data: logs },
  ] = await Promise.all([
    admin.from('influencers').select('*'),
    admin.from('campaign_influencers').select('*'),
    admin.from('discovery_runs').select('*'),
    admin.from('outreach_messages').select('*'),
    admin.from('outreach_logs').select('*'),
  ]);

  if (infErr) throw new AppHttpError(500, 'supabase_query_error', infErr.message);
  if (linkErr) throw new AppHttpError(500, 'supabase_query_error', linkErr.message);

  const inDateRange = (iso?: string | null) => {
    if (!iso) return true;
    const d = iso.slice(0, 10);
    if (filters.fromDate && d < filters.fromDate) return false;
    if (filters.toDate && d > filters.toDate) return false;
    return true;
  };

  const filteredLinks = (links ?? []).filter((l) => {
    if (filters.campaignId && l.campaign_id !== filters.campaignId) return false;
    return inDateRange(l.added_at);
  });

  const allowedInfIds = new Set(filteredLinks.map((l) => l.influencer_id));
  const infById = new Map((infs ?? []).map((i) => [i.id, i]));
  const scopedCreators = filters.campaignId
    ? Array.from(allowedInfIds)
        .map((id) => infById.get(id))
        .filter((x): x is NonNullable<typeof x> => Boolean(x))
    : (infs ?? []).filter((i) => inDateRange(i.created_at));

  const linkIds = new Set(filteredLinks.map((l) => l.id));
  const scopedMsgs = (msgs ?? []).filter((m) => {
    if (filters.campaignId && !linkIds.has(m.campaign_influencer_id)) return false;
    return inDateRange(m.created_at);
  });
  const scopedLogs = (logs ?? []).filter((l) => {
    if (filters.campaignId && l.campaign_id !== filters.campaignId && !linkIds.has(l.campaign_influencer_id)) {
      return false;
    }
    return inDateRange(l.created_at);
  });
  const scopedRuns = (runs ?? []).filter((r) => {
    if (filters.campaignId && r.campaign_id !== filters.campaignId) return false;
    return inDateRange(r.created_at);
  });

  const reasonCounts = new Map<string, number>();
  for (const link of filteredLinks) {
    if (link.qualification_status === 'rejected') {
      const key = (link.qualification_reason || 'Other reason').slice(0, 90);
      reasonCounts.set(key, (reasonCounts.get(key) ?? 0) + 1);
    }
  }
  const topRejectionReasons = Array.from(reasonCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([reason, count]) => ({ reason, count }));

  const hasValidPublicEmail = (c: (typeof scopedCreators)[number]) =>
    Boolean(c.contact_email && c.contact_email.toLowerCase() !== 'not found' && c.email_status !== 'not_found');

  return {
    filters: {
      campaignId: filters.campaignId ?? null,
      fromDate: filters.fromDate ?? null,
      toDate: filters.toDate ?? null,
    },
    discovery: {
      totalCreatorsDiscovered: scopedCreators.length,
      youtubeCreatorsCount: scopedCreators.filter((c) => c.platform === 'youtube').length,
      instagramCreatorsCount: scopedCreators.filter((c) => c.platform === 'instagram').length,
      qualifiedCount: filteredLinks.filter((l) => l.qualification_status === 'qualified').length,
      needsReviewCount: filteredLinks.filter((l) => l.qualification_status === 'needs_review').length,
      rejectedCount: filteredLinks.filter((l) => l.qualification_status === 'rejected').length,
      discoveryRunsCount: scopedRuns.length,
      topRejectionReasons,
    },
    enrichment: {
      creatorsWithEmail: scopedCreators.filter(hasValidPublicEmail).length,
      creatorsMissingEmail: scopedCreators.filter((c) => !hasValidPublicEmail(c)).length,
      verifiedEmailsCount: scopedCreators.filter((c) => c.email_status === 'verified').length,
      creatorsWithWebsite: scopedCreators.filter((c) => Boolean(c.website)).length,
      enrichedProfilesCount: scopedCreators.filter((c) => {
        const meta = (c.source_metadata ?? {}) as Record<string, unknown>;
        return c.enrichment_status === 'enriched' || meta.enrichmentStatus === 'enriched';
      }).length,
      creatorsWithContentThemes: scopedCreators.filter((c) => (c.content_themes ?? []).length > 0).length,
    },
    personalization: {
      totalMessagesGenerated: scopedMsgs.length,
      emailDraftsCount: scopedMsgs.filter((m) => m.channel === 'email').length,
      instagramDmDraftsCount: scopedMsgs.filter((m) => m.channel === 'instagram_dm').length,
      approvedMessagesCount: scopedMsgs.filter((m) => m.status === 'approved' || Boolean(m.approved_at)).length,
      rejectedMessagesCount: scopedMsgs.filter((m) => m.status === 'rejected').length,
      sentMessagesCount: scopedMsgs.filter((m) => m.status === 'sent').length,
    },
    outreach: {
      totalOutreachLogs: scopedLogs.length,
      simulatedEmailsCount: scopedLogs.filter((l) => l.channel === 'email' && l.status === 'simulated').length,
      liveEmailsSentCount: scopedLogs.filter(
        (l) => l.channel === 'email' && (l.status === 'sent' || l.status === 'delivered')
      ).length,
      manualInstagramDmsSentCount: scopedLogs.filter(
        (l) => l.channel === 'instagram_dm' && l.action === 'manual_instagram_dm_sent'
      ).length,
      manualInstagramDmsReadyCount: scopedLogs.filter(
        (l) => l.channel === 'instagram_dm' && l.action === 'manual_instagram_dm_ready'
      ).length,
      failedOrUncertainCount: scopedLogs.filter(
        (l) => l.status === 'failed' || l.status === 'uncertain'
      ).length,
    },
    generatedAt: new Date().toISOString(),
  };
}
