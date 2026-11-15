import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../src/types/database.ts';
import { getServerConfig } from '../config/env.ts';

let cachedAdminClient: SupabaseClient<Database> | null = null;
let cachedSignature = '';

export function isSupabaseAdminConfigured(): boolean {
  const cfg = getServerConfig();
  return Boolean(cfg.supabaseUrl && cfg.supabaseSecretKey);
}

export function getSupabaseAdmin(): SupabaseClient<Database> | null {
  const cfg = getServerConfig();
  if (!cfg.supabaseUrl || !cfg.supabaseSecretKey) {
    return null;
  }

  // Allow publishable key if no dedicated service role key is provided
  const isPublishable = cfg.supabaseSecretKey.startsWith('sb_publishable_') || cfg.supabaseSecretKey.startsWith('eyJ');

  const signature = `${cfg.supabaseUrl}:${cfg.supabaseSecretKey.slice(0, 12)}`;
  if (cachedAdminClient && cachedSignature === signature) {
    return cachedAdminClient;
  }

  cachedAdminClient = createClient<Database>(cfg.supabaseUrl, cfg.supabaseSecretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  cachedSignature = signature;
  return cachedAdminClient;
}
