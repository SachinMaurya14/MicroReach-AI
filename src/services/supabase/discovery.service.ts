import { getSupabaseClient, getSupabaseClientState } from '../../lib/supabase/client';
import { Database } from '../../types/database';
import {
  authRequiredResult,
  mapPostgrestError,
  notConfiguredResult,
  SupabaseServiceResult,
} from './types';

export type DiscoveryRunRow = Database['public']['Tables']['discovery_runs']['Row'];
export type DiscoveryRunInsert = Database['public']['Tables']['discovery_runs']['Insert'];

export async function listDiscoveryRuns(
  campaignId?: string
): Promise<SupabaseServiceResult<DiscoveryRunRow[]>> {
  const client = getSupabaseClient();
  const state = getSupabaseClientState();
  if (!client || !state.initialized) {
    return notConfiguredResult(state.errorMessage ?? undefined);
  }

  let query = client
    .from('discovery_runs')
    .select('*')
    .order('created_at', { ascending: false });

  if (campaignId) {
    query = query.eq('campaign_id', campaignId);
  }

  const { data, error } = await query;

  if (error) {
    return { ok: false, error: mapPostgrestError(error) };
  }

  return { ok: true, data: data ?? [] };
}

export async function createDiscoveryRunGuarded(
  _payload: DiscoveryRunInsert
): Promise<SupabaseServiceResult<DiscoveryRunRow>> {
  return authRequiredResult('createDiscoveryRun');
}
