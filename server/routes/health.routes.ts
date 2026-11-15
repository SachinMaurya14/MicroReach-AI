import { Router } from 'express';
import { getNonSensitiveHealthStatus } from '../config/env.ts';
import { getSupabaseAdmin } from '../lib/supabaseAdmin.ts';

export const healthRouter = Router();

const CORE_TABLES = [
  'campaigns',
  'influencers',
  'campaign_influencers',
  'discovery_runs',
  'outreach_messages',
  'outreach_logs',
] as const;

const EXTENDED_TABLES = [
  'campaign_content_ideas',
  'creator_incentives',
  'workspace_tasks',
  'workspace_settings',
] as const;

async function checkTableExists(
  admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  table: string
): Promise<{ exists: boolean; unreachable?: boolean; error?: string }> {
  try {
    const { error } = await admin.from(table as never).select('id').limit(1);
    if (!error) return { exists: true };
    const code = error.code || '';
    const msg = error.message || '';
    if (
      code === '42P01' ||
      code === 'PGRST205' ||
      msg.toLowerCase().includes('could not find the table') ||
      msg.toLowerCase().includes('does not exist')
    ) {
      return { exists: false, error: msg };
    }
    return { exists: false, unreachable: true, error: msg };
  } catch (err) {
    return {
      exists: false,
      unreachable: true,
      error: err instanceof Error ? err.message : 'Database request failed',
    };
  }
}

healthRouter.get('/health', async (_req, res) => {
  const base = getNonSensitiveHealthStatus();
  const admin = getSupabaseAdmin();

  if (!base.supabaseConfigured || !admin) {
    res.json({
      ...base,
      supabaseReachable: false,
      databaseSchemaCompatible: false,
      extendedSchemaCompatible: false,
      supabaseStatus: 'configuration_missing',
      missingTables: [...CORE_TABLES],
      missingExtendedTables: [...EXTENDED_TABLES],
      checkedAt: new Date().toISOString(),
    });
    return;
  }

  const coreResults = await Promise.all(
    CORE_TABLES.map(async (t) => ({ table: t, ...(await checkTableExists(admin, t)) }))
  );
  const extResults = await Promise.all(
    EXTENDED_TABLES.map(async (t) => ({ table: t, ...(await checkTableExists(admin, t)) }))
  );

  const anyUnreachable = coreResults.some((r) => r.unreachable);
  const missingTables = coreResults.filter((r) => !r.exists).map((r) => r.table);
  const missingExtendedTables = extResults.filter((r) => !r.exists).map((r) => r.table);

  const supabaseReachable = !anyUnreachable;
  const databaseSchemaCompatible = supabaseReachable && missingTables.length === 0;
  const extendedSchemaCompatible = supabaseReachable && missingExtendedTables.length === 0;
  const firstErr = coreResults.find((r) => r.error)?.error;

  const supabaseStatus = !supabaseReachable
    ? 'connection_failed'
    : !databaseSchemaCompatible
      ? 'schema_incompatible'
      : 'connected';

  res.json({
    ...base,
    supabaseReachable,
    databaseSchemaCompatible,
    extendedSchemaCompatible,
    supabaseStatus,
    missingTables,
    missingExtendedTables,
    databaseError: !databaseSchemaCompatible ? firstErr || null : null,
    checkedAt: new Date().toISOString(),
  });
});
