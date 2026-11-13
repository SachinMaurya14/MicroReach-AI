import { getSupabaseClient, getSupabaseClientState } from '../../lib/supabase/client';
import { Database } from '../../types/database';
import {
  authRequiredResult,
  mapPostgrestError,
  notConfiguredResult,
  SupabaseServiceResult,
} from './types';

export type InfluencerRow = Database['public']['Tables']['influencers']['Row'];
export type InfluencerInsert = Database['public']['Tables']['influencers']['Insert'];
export type CampaignInfluencerRow =
  Database['public']['Tables']['campaign_influencers']['Row'];

export async function listInfluencers(): Promise<SupabaseServiceResult<InfluencerRow[]>> {
  const client = getSupabaseClient();
  const state = getSupabaseClientState();
  if (!client || !state.initialized) {
    return notConfiguredResult(state.errorMessage ?? undefined);
  }

  const { data, error } = await client
    .from('influencers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return { ok: false, error: mapPostgrestError(error) };
  }

  return { ok: true, data: data ?? [] };
}

export async function listCampaignInfluencers(
  campaignId: string
): Promise<SupabaseServiceResult<CampaignInfluencerRow[]>> {
  const client = getSupabaseClient();
  const state = getSupabaseClientState();
  if (!client || !state.initialized) {
    return notConfiguredResult(state.errorMessage ?? undefined);
  }

  const { data, error } = await client
    .from('campaign_influencers')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('added_at', { ascending: false });

  if (error) {
    return { ok: false, error: mapPostgrestError(error) };
  }

  return { ok: true, data: data ?? [] };
}

export async function upsertInfluencerGuarded(
  _payload: InfluencerInsert
): Promise<SupabaseServiceResult<InfluencerRow>> {
  return authRequiredResult('upsertInfluencer');
}
