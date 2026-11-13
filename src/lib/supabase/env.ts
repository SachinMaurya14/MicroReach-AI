export type SupabaseEnvStatus =
  | 'not_configured'
  | 'configured'
  | 'configuration_error';

export interface SupabaseEnvValidation {
  status: SupabaseEnvStatus;
  hasUrl: boolean;
  hasPublishableKey: boolean;
  url: string | null;
  publishableKey: string | null;
  errorMessage: string | null;
}

function isValidSupabaseUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol === 'https:') {
      return Boolean(parsed.hostname);
    }
    if (
      parsed.protocol === 'http:' &&
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function isForbiddenSecretKey(key: string): boolean {
  const normalized = key.trim().toLowerCase();
  return (
    normalized.startsWith('sb_secret_') ||
    normalized.includes('service_role')
  );
}

export function validateSupabaseEnv(): SupabaseEnvValidation {
  const rawUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
  const rawKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '').trim();

  const hasUrl = rawUrl.length > 0;
  const hasPublishableKey = rawKey.length > 0;

  if (!hasUrl && !hasPublishableKey) {
    return {
      status: 'not_configured',
      hasUrl: false,
      hasPublishableKey: false,
      url: null,
      publishableKey: null,
      errorMessage:
        'VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are not configured.',
    };
  }

  if (!hasUrl || !hasPublishableKey) {
    return {
      status: 'configuration_error',
      hasUrl,
      hasPublishableKey,
      url: null,
      publishableKey: null,
      errorMessage:
        'Both VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are required.',
    };
  }

  if (!isValidSupabaseUrl(rawUrl)) {
    return {
      status: 'configuration_error',
      hasUrl: true,
      hasPublishableKey: true,
      url: null,
      publishableKey: null,
      errorMessage: 'VITE_SUPABASE_URL must be a valid HTTPS Supabase project URL.',
    };
  }

  if (isForbiddenSecretKey(rawKey)) {
    return {
      status: 'configuration_error',
      hasUrl: true,
      hasPublishableKey: true,
      url: null,
      publishableKey: null,
      errorMessage:
        'Secret or service_role keys must never be used in Vite client environment variables.',
    };
  }

  return {
    status: 'configured',
    hasUrl: true,
    hasPublishableKey: true,
    url: rawUrl,
    publishableKey: rawKey,
    errorMessage: null,
  };
}
