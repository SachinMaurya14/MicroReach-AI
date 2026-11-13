import dotenv from 'dotenv';
import path from 'node:path';

// Load .env.local first in development (if present), then fallback to .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

export type OutreachMode = 'simulation' | 'live';

const DEFAULT_GEMINI_MODEL = 'gemini-4-hydrogen';

function cleanEnv(name: string): string {
  return (process.env[name] ?? '').trim();
}

function isValidHttpUrl(raw: string): boolean {
  if (!raw) return false;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export interface ServerConfig {
  port: number;
  nodeEnv: string;
  isProduction: boolean;
  appUrl: string;
  supabaseUrl: string;
  supabaseSecretKey: string;
  demoAccessToken: string;
  demoSessionSecret: string;
  youtubeApiKey: string;
  geminiApiKey: string;
  geminiModel: string;
  outreachMode: OutreachMode;
  googleClientId: string;
  googleClientSecret: string;
  googleRedirectUri: string;
  integrationEncryptionKey: string;
}

export function getServerConfig(): ServerConfig {
  const port = Number(process.env.PORT || 3000) || 3000;
  const nodeEnv = cleanEnv('NODE_ENV') || 'development';
  const isProduction = nodeEnv === 'production';

  const supabaseUrl = cleanEnv('SUPABASE_URL') || cleanEnv('VITE_SUPABASE_URL');
  const supabaseSecretKey = cleanEnv('SUPABASE_SECRET_KEY');
  const demoAccessToken = cleanEnv('DEMO_ACCESS_TOKEN');
  const demoSessionSecret = cleanEnv('DEMO_SESSION_SECRET');
  const youtubeApiKey = cleanEnv('YOUTUBE_API_KEY');
  const geminiApiKey = cleanEnv('GEMINI_API_KEY');
  const rawModel = cleanEnv('GEMINI_MODEL');
  const geminiModel = rawModel || DEFAULT_GEMINI_MODEL;

  const rawOutreachMode = cleanEnv('OUTREACH_MODE').toLowerCase();
  const outreachMode: OutreachMode = rawOutreachMode === 'live' ? 'live' : 'simulation';

  const googleClientId = cleanEnv('GOOGLE_CLIENT_ID');
  const googleClientSecret = cleanEnv('GOOGLE_CLIENT_SECRET');
  const rawGoogleRedirectUri = cleanEnv('GOOGLE_REDIRECT_URI');
  const googleRedirectUri = isValidHttpUrl(rawGoogleRedirectUri) ? rawGoogleRedirectUri : '';
  const integrationEncryptionKey = cleanEnv('INTEGRATION_ENCRYPTION_KEY');

  return {
    port,
    nodeEnv,
    isProduction,
    appUrl: cleanEnv('APP_URL'),
    supabaseUrl: isValidHttpUrl(supabaseUrl) ? supabaseUrl : '',
    supabaseSecretKey,
    demoAccessToken,
    demoSessionSecret,
    youtubeApiKey,
    geminiApiKey,
    geminiModel,
    outreachMode,
    googleClientId,
    googleClientSecret,
    googleRedirectUri,
    integrationEncryptionKey,
  };
}

export interface GmailOAuthConfigStatus {
  oauthConfigured: boolean;
  encryptionKeyConfigured: boolean;
  sessionSecretConfigured: boolean;
  missingEnvVars: string[];
}

export function getGmailOAuthConfigStatus(): GmailOAuthConfigStatus {
  const cfg = getServerConfig();
  const missingEnvVars: string[] = [];

  if (!cfg.googleClientId) missingEnvVars.push('GOOGLE_CLIENT_ID');
  if (!cfg.googleClientSecret) missingEnvVars.push('GOOGLE_CLIENT_SECRET');
  if (!cfg.googleRedirectUri) missingEnvVars.push('GOOGLE_REDIRECT_URI');
  if (!cfg.integrationEncryptionKey || cfg.integrationEncryptionKey.length < 16) {
    missingEnvVars.push('INTEGRATION_ENCRYPTION_KEY');
  }
  if (!cfg.demoSessionSecret || cfg.demoSessionSecret.length < 16) {
    missingEnvVars.push('DEMO_SESSION_SECRET');
  }

  return {
    oauthConfigured: Boolean(
      cfg.googleClientId && cfg.googleClientSecret && cfg.googleRedirectUri
    ),
    encryptionKeyConfigured: Boolean(cfg.integrationEncryptionKey.length >= 16),
    sessionSecretConfigured: Boolean(cfg.demoSessionSecret.length >= 16),
    missingEnvVars,
  };
}

export interface NonSensitiveHealthStatus {
  status: 'ok';
  demoAccessConfigured: boolean;
  supabaseConfigured: boolean;
  youtubeConfigured: boolean;
  geminiConfigured: boolean;
  geminiModel: string;
  outreachMode: OutreachMode;
  gmailOAuthConfigured: boolean;
  encryptionKeyConfigured: boolean;
}

export function getNonSensitiveHealthStatus(): NonSensitiveHealthStatus {
  const cfg = getServerConfig();
  const supabaseConfigured = Boolean(
    cfg.supabaseUrl &&
      cfg.supabaseSecretKey &&
      (cfg.supabaseSecretKey.startsWith('sb_secret_') ||
        cfg.supabaseSecretKey.length >= 20)
  );
  const demoAccessConfigured = Boolean(
    cfg.demoAccessToken.length >= 16 && cfg.demoSessionSecret.length >= 16
  );
  const gmailOAuthConfigured = Boolean(
    cfg.googleClientId && cfg.googleClientSecret && cfg.googleRedirectUri
  );

  return {
    status: 'ok',
    demoAccessConfigured,
    supabaseConfigured,
    youtubeConfigured: Boolean(cfg.youtubeApiKey),
    geminiConfigured: Boolean(cfg.geminiApiKey),
    geminiModel: cfg.geminiModel,
    outreachMode: cfg.outreachMode,
    gmailOAuthConfigured,
    encryptionKeyConfigured: Boolean(cfg.integrationEncryptionKey.length >= 16),
  };
}
