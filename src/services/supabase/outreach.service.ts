import { getSupabaseClient, getSupabaseClientState } from '../../lib/supabase/client';
import { Database } from '../../types/database';
import {
  authRequiredResult,
  mapPostgrestError,
  notConfiguredResult,
  SupabaseServiceResult,
} from './types';

export type OutreachMessageRow =
  Database['public']['Tables']['outreach_messages']['Row'];
export type OutreachMessageInsert =
  Database['public']['Tables']['outreach_messages']['Insert'];
export type OutreachLogRow = Database['public']['Tables']['outreach_logs']['Row'];

export async function listOutreachMessages(
  campaignInfluencerId?: string
): Promise<SupabaseServiceResult<OutreachMessageRow[]>> {
  const client = getSupabaseClient();
  const state = getSupabaseClientState();
  if (!client || !state.initialized) {
    return notConfiguredResult(state.errorMessage ?? undefined);
  }

  let query = client
    .from('outreach_messages')
    .select('*')
    .order('created_at', { ascending: false });

  if (campaignInfluencerId) {
    query = query.eq('campaign_influencer_id', campaignInfluencerId);
  }

  const { data, error } = await query;

  if (error) {
    return { ok: false, error: mapPostgrestError(error) };
  }

  return { ok: true, data: data ?? [] };
}

export async function listOutreachLogs(
  campaignInfluencerId?: string
): Promise<SupabaseServiceResult<OutreachLogRow[]>> {
  const client = getSupabaseClient();
  const state = getSupabaseClientState();
  if (!client || !state.initialized) {
    return notConfiguredResult(state.errorMessage ?? undefined);
  }

  let query = client
    .from('outreach_logs')
    .select('*')
    .order('created_at', { ascending: false });

  if (campaignInfluencerId) {
    query = query.eq('campaign_influencer_id', campaignInfluencerId);
  }

  const { data, error } = await query;

  if (error) {
    return { ok: false, error: mapPostgrestError(error) };
  }

  return { ok: true, data: data ?? [] };
}

export async function queueOutreachMessageGuarded(
  _payload: OutreachMessageInsert
): Promise<SupabaseServiceResult<OutreachMessageRow>> {
  return authRequiredResult('queueOutreachMessage');
}
