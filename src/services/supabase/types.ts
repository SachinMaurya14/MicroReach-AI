import { PostgrestError } from '@supabase/supabase-js';

export type SupabaseServiceErrorCode =
  | 'not_configured'
  | 'auth_required'
  | 'rls_restricted'
  | 'query_error';

export interface SupabaseServiceError {
  code: SupabaseServiceErrorCode;
  message: string;
  postgresCode?: string;
}

export type SupabaseServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: SupabaseServiceError };

export function mapPostgrestError(error: PostgrestError): SupabaseServiceError {
  const code = error.code ?? '';
  const msgLower = error.message.toLowerCase();
  const isRlsOrAuth =
    code === '42501' ||
    code === 'PGRST301' ||
    msgLower.includes('permission') ||
    msgLower.includes('policy') ||
    msgLower.includes('row-level security') ||
    msgLower.includes('jwt');

  return {
    code: isRlsOrAuth ? 'rls_restricted' : 'query_error',
    message: error.message,
    postgresCode: error.code,
  };
}

export function notConfiguredResult<T>(message?: string): SupabaseServiceResult<T> {
  return {
    ok: false,
    error: {
      code: 'not_configured',
      message:
        message ??
        'Supabase client is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.',
    },
  };
}

export function authRequiredResult<T>(operation: string): SupabaseServiceResult<T> {
  return {
    ok: false,
    error: {
      code: 'auth_required',
      message: `Operation "${operation}" is awaiting authentication and RLS policy verification. Unauthorized writes are disabled in Phase 4A.`,
    },
  };
}
