import { getSupabaseClient, getSupabaseClientState } from '../../lib/supabase/client';
import { Database } from '../../types/database';
import {
  authRequiredResult,
  mapPostgrestError,
  notConfiguredResult,
  SupabaseServiceResult,
} from './types';

export type CampaignRow = Database['public']['Tables']['campaigns']['Row'];
export type CampaignInsert = Database['public']['Tables']['campaigns']['Insert'];

/**
 * Technical Note (Phase 4A):
 * All 6 Supabase tables have RLS enabled and owner_id references auth.users(id).
 * Read queries handle empty / RLS-restricted responses explicitly without silently
 * suppressing errors. Write operations are intentionally guarded until Supabase Auth
 * and verified RLS policies are enabled.
 */
export async function listCampaigns(): Promise<SupabaseServiceResult<CampaignRow[]>> {
  const client = getSupabaseClient();
  const state = getSupabaseClientState();
  if (!client || !state.initialized) {
    return notConfiguredResult(state.errorMessage ?? undefined);
  }

  const { data, error } = await client
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return { ok: false, error: mapPostgrestError(error) };
  }

  return { ok: true, data: data ?? [] };
}

export async function getCampaignById(
  campaignId: string
): Promise<SupabaseServiceResult<CampaignRow | null>> {
  const client = getSupabaseClient();
  const state = getSupabaseClientState();
  if (!client || !state.initialized) {
    return notConfiguredResult(state.errorMessage ?? undefined);
  }

  const { data, error } = await client
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: mapPostgrestError(error) };
  }

  return { ok: true, data: data ?? null };
}

export async function createCampaignGuarded(
  _payload: CampaignInsert
): Promise<SupabaseServiceResult<CampaignRow>> {
  // Explicitly blocked until authenticated user session and owner-scoped RLS policies are verified.
  return authRequiredResult('createCampaign');
}
