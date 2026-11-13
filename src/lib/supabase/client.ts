import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../types/database';
import { SupabaseEnvStatus, validateSupabaseEnv } from './env';

export interface SupabaseClientState {
  status: SupabaseEnvStatus;
  hasUrl: boolean;
  hasPublishableKey: boolean;
  initialized: boolean;
  errorMessage: string | null;
}

let cachedClient: SupabaseClient<Database> | null = null;
let initializationAttempted = false;
let initializationError: string | null = null;

function initializeSupabaseClient(): SupabaseClient<Database> | null {
  if (initializationAttempted) {
    return cachedClient;
  }
  initializationAttempted = true;

  const env = validateSupabaseEnv();
  if (env.status !== 'configured' || !env.url || !env.publishableKey) {
    initializationError = env.errorMessage;
    return null;
  }

  try {
    cachedClient = createClient<Database>(env.url, env.publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
    return cachedClient;
  } catch (err) {
    initializationError =
      err instanceof Error
        ? `Failed to initialize Supabase client: ${err.message}`
        : 'Failed to initialize Supabase client.';
    cachedClient = null;
    return null;
  }
}

export function getSupabaseClient(): SupabaseClient<Database> | null {
  return initializeSupabaseClient();
}

export function getSupabaseClientState(): SupabaseClientState {
  const env = validateSupabaseEnv();
  const client = initializeSupabaseClient();

  if (client) {
    return {
      status: 'configured',
      hasUrl: env.hasUrl,
      hasPublishableKey: env.hasPublishableKey,
      initialized: true,
      errorMessage: null,
    };
  }

  return {
    status: env.status === 'configured' ? 'configuration_error' : env.status,
    hasUrl: env.hasUrl,
    hasPublishableKey: env.hasPublishableKey,
    initialized: false,
    errorMessage: initializationError ?? env.errorMessage,
  };
}

export const supabase: SupabaseClient<Database> | null = getSupabaseClient();
