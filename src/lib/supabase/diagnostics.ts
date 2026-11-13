import { getSupabaseClient, getSupabaseClientState } from './client';
import { SupabaseEnvStatus } from './env';

export type DataAccessStatus =
  | 'not_checked'
  | 'rows_returned'
  | 'empty_or_no_applicable_policy'
  | 'rls_restricted_or_unauthenticated'
  | 'request_failed';

export interface SupabaseDiagnosticReport {
  hasUrl: boolean;
  hasPublishableKey: boolean;
  configurationStatus: SupabaseEnvStatus;
  clientInitialized: boolean;
  readAttempted: boolean;
  reachable: boolean;
  dataAccessStatus: DataAccessStatus;
  rowCountObserved: number;
  note: string;
}

/**
 * Runs a strictly read-only diagnostic check against the existing `campaigns` table.
 * Under RLS without an active authenticated session or matching SELECT policy,
 * an empty result or permission error is expected and must not be treated as
 * full authorized database access.
 */
export async function runSupabaseDiagnostics(): Promise<SupabaseDiagnosticReport> {
  const clientState = getSupabaseClientState();
  const client = getSupabaseClient();

  if (!client || !clientState.initialized) {
    return {
      hasUrl: clientState.hasUrl,
      hasPublishableKey: clientState.hasPublishableKey,
      configurationStatus: clientState.status,
      clientInitialized: false,
      readAttempted: false,
      reachable: false,
      dataAccessStatus: 'not_checked',
      rowCountObserved: 0,
      note:
        clientState.errorMessage ??
        'Supabase client is not configured yet. Provide VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.',
    };
  }

  try {
    const { data, error } = await client.from('campaigns').select('id').limit(1);

    if (error) {
      const code = error.code ?? '';
      const isRlsOrAuthError =
        code === '42501' ||
        code === 'PGRST301' ||
        error.message.toLowerCase().includes('permission') ||
        error.message.toLowerCase().includes('policy') ||
        error.message.toLowerCase().includes('jwt');

      return {
        hasUrl: true,
        hasPublishableKey: true,
        configurationStatus: 'configured',
        clientInitialized: true,
        readAttempted: true,
        reachable: true,
        dataAccessStatus: isRlsOrAuthError
          ? 'rls_restricted_or_unauthenticated'
          : 'request_failed',
        rowCountObserved: 0,
        note: isRlsOrAuthError
          ? 'Supabase endpoint responded, and Row Level Security / unauthenticated access restricted rows as expected.'
          : `Read-only query returned error: ${error.message}`,
      };
    }

    const rows = Array.isArray(data) ? data : [];
    if (rows.length === 0) {
      return {
        hasUrl: true,
        hasPublishableKey: true,
        configurationStatus: 'configured',
        clientInitialized: true,
        readAttempted: true,
        reachable: true,
        dataAccessStatus: 'empty_or_no_applicable_policy',
        rowCountObserved: 0,
        note:
          'Read-only request succeeded with 0 rows. An empty result is expected when no authenticated session or applicable SELECT policy exists, and does not confirm full authorized data access.',
      };
    }

    return {
      hasUrl: true,
      hasPublishableKey: true,
      configurationStatus: 'configured',
      clientInitialized: true,
      readAttempted: true,
      reachable: true,
      dataAccessStatus: 'rows_returned',
      rowCountObserved: rows.length,
      note: 'Read-only diagnostic query succeeded and returned row metadata.',
    };
  } catch (err) {
    return {
      hasUrl: true,
      hasPublishableKey: true,
      configurationStatus: 'configured',
      clientInitialized: true,
      readAttempted: true,
      reachable: false,
      dataAccessStatus: 'request_failed',
      rowCountObserved: 0,
      note:
        err instanceof Error
          ? `Diagnostic network request failed: ${err.message}`
          : 'Diagnostic network request failed.',
    };
  }
}
