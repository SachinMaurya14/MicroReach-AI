import { getGmailOAuthConfigStatus, getServerConfig } from '../../config/env.ts';
import { getSupabaseAdmin } from '../../lib/supabaseAdmin.ts';
import { AppHttpError } from '../../middleware/errorHandler.ts';
import {
  decryptSecretAes256Gcm,
  type EncryptedPayload,
  encryptSecretAes256Gcm,
  signOAuthState,
  verifyOAuthState,
} from '../../utils/crypto.ts';
import { isValidEmail } from '../../utils/validation.ts';
import { recordAuditLog } from '../supabase/sharedWorkspace.service.ts';

export const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';
export const GMAIL_OAUTH_CALLBACK_PATH = '/api/integrations/gmail/callback';

const GOOGLE_OAUTH_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL_SEND_ENDPOINT = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
const ACCESS_TOKEN_EXPIRY_SKEW_MS = 60_000;

interface CachedEncryptedAccessToken {
  encrypted: EncryptedPayload;
  expiresAtMs: number;
}

let cachedAccessToken: CachedEncryptedAccessToken | null = null;

export interface GmailStatusInfo {
  oauthConfigured: boolean;
  encryptionConfigured: boolean;
  connected: boolean;
  senderEmail: string | null;
  outreachMode: 'simulation' | 'live';
  scope: string;
  callbackPath: string;
  missingEnvVars: string[];
  message: string;
}

function clearCachedAccessToken(): void {
  cachedAccessToken = null;
}

function cacheEncryptedAccessToken(
  accessToken: string,
  expiresInSeconds: number | undefined,
  encryptionKey: string
): void {
  if (!accessToken || !encryptionKey || encryptionKey.length < 16) return;
  const ttlMs = Math.max(60, Number(expiresInSeconds) || 3600) * 1000;
  cachedAccessToken = {
    encrypted: encryptSecretAes256Gcm(accessToken, encryptionKey),
    expiresAtMs: Date.now() + ttlMs,
  };
}

function getCachedAccessToken(encryptionKey: string): string | null {
  if (!cachedAccessToken) return null;
  if (Date.now() + ACCESS_TOKEN_EXPIRY_SKEW_MS >= cachedAccessToken.expiresAtMs) {
    cachedAccessToken = null;
    return null;
  }
  try {
    return decryptSecretAes256Gcm(cachedAccessToken.encrypted, encryptionKey);
  } catch {
    cachedAccessToken = null;
    return null;
  }
}

function assertGmailOAuthEnvConfigured() {
  const cfg = getServerConfig();
  const status = getGmailOAuthConfigStatus();

  if (!status.oauthConfigured || !status.encryptionKeyConfigured || !status.sessionSecretConfigured) {
    throw new AppHttpError(
      503,
      'gmail_oauth_not_configured',
      `Gmail OAuth is not fully configured. Missing or invalid server environment variables: ${status.missingEnvVars.join(', ')}.`
    );
  }

  return cfg;
}

export async function getGmailConnectionStatus(): Promise<GmailStatusInfo> {
  const cfg = getServerConfig();
  const envStatus = getGmailOAuthConfigStatus();

  const base: Omit<GmailStatusInfo, 'connected' | 'senderEmail' | 'message'> = {
    oauthConfigured: envStatus.oauthConfigured,
    encryptionConfigured: envStatus.encryptionKeyConfigured,
    outreachMode: cfg.outreachMode,
    scope: GMAIL_SEND_SCOPE,
    callbackPath: GMAIL_OAUTH_CALLBACK_PATH,
    missingEnvVars: envStatus.missingEnvVars,
  };

  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      ...base,
      connected: false,
      senderEmail: null,
      message: 'Gmail not connected.',
    };
  }

  try {
    const { data, error } = await admin
      .from('integration_credentials')
      .select('account_email, connected_at')
      .eq('provider', 'gmail')
      .single();

    if (error || !data) {
      return {
        ...base,
        connected: false,
        senderEmail: null,
        message: 'Gmail not connected.',
      };
    }

    const senderLabel = data.account_email ?? null;
    const displayLabel = senderLabel ?? 'authorized Gmail account';

    return {
      ...base,
      connected: true,
      senderEmail: senderLabel,
      message:
        cfg.outreachMode === 'live'
          ? `Gmail connected (${displayLabel}).`
          : `Gmail authorized (${displayLabel}), currently running in Simulation mode.`,
    };
  } catch {
    return {
      ...base,
      connected: false,
      senderEmail: null,
      message: 'Gmail not connected.',
    };
  }
}

export function buildGmailOAuthAuthorizationUrl(sessionId: string): {
  authUrl: string;
  scope: string;
  callbackPath: string;
} {
  if (!sessionId) {
    throw new AppHttpError(401, 'demo_session_required', 'Valid workspace session is required.');
  }
  const cfg = assertGmailOAuthEnvConfigured();

  const state = signOAuthState(sessionId, cfg.demoSessionSecret);
  const url = new URL(GOOGLE_OAUTH_AUTH_URL);
  url.searchParams.set('client_id', cfg.googleClientId);
  url.searchParams.set('redirect_uri', cfg.googleRedirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('scope', GMAIL_SEND_SCOPE);
  url.searchParams.set('state', state);

  return {
    authUrl: url.toString(),
    scope: GMAIL_SEND_SCOPE,
    callbackPath: GMAIL_OAUTH_CALLBACK_PATH,
  };
}

export async function handleGmailOAuthCallback(input: {
  code: string;
  state: string;
  expectedSessionId: string | null;
}): Promise<{ connected: boolean; scope: string }> {
  const cfg = assertGmailOAuthEnvConfigured();

  const stateCheck = verifyOAuthState(
    input.state,
    input.expectedSessionId,
    cfg.demoSessionSecret,
    { consumeNonce: true }
  );

  if (!stateCheck.valid) {
    throw new AppHttpError(
      403,
      'invalid_oauth_state',
      `OAuth state validation failed (${stateCheck.reason ?? 'invalid'}).`
    );
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new AppHttpError(
      503,
      'supabase_not_configured',
      'Supabase server backend is not configured yet (SUPABASE_URL and SUPABASE_SECRET_KEY).'
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  let tokenRes: Response;
  try {
    tokenRes = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: input.code,
        client_id: cfg.googleClientId,
        client_secret: cfg.googleClientSecret,
        redirect_uri: cfg.googleRedirectUri,
        grant_type: 'authorization_code',
      }),
    });
  } catch {
    throw new AppHttpError(
      502,
      'oauth_token_exchange_network_error',
      'Unable to reach Google OAuth token endpoint.'
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!tokenRes.ok) {
    throw new AppHttpError(
      502,
      'oauth_token_exchange_failed',
      `Google OAuth token exchange failed (${tokenRes.status}).`
    );
  }

  const tokens = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };

  if (!tokens.access_token) {
    throw new AppHttpError(
      502,
      'missing_access_token',
      'Google OAuth response did not include an access token.'
    );
  }

  const grantedScopes = (tokens.scope || GMAIL_SEND_SCOPE)
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.scope && !grantedScopes.includes(GMAIL_SEND_SCOPE)) {
    throw new AppHttpError(
      403,
      'missing_required_gmail_scope',
      'Required gmail.send permission was not granted.'
    );
  }

  let encryptedRefreshPayload: EncryptedPayload | null = null;
  if (tokens.refresh_token) {
    encryptedRefreshPayload = encryptSecretAes256Gcm(
      tokens.refresh_token,
      cfg.integrationEncryptionKey
    );
  } else {
    const { data: existingCred } = await admin
      .from('integration_credentials')
      .select('encrypted_refresh_token, token_iv, token_auth_tag')
      .eq('provider', 'gmail')
      .maybeSingle();

    if (existingCred?.encrypted_refresh_token) {
      encryptedRefreshPayload = {
        ciphertext: existingCred.encrypted_refresh_token,
        iv: existingCred.token_iv,
        authTag: existingCred.token_auth_tag,
      };
    }
  }

  if (!encryptedRefreshPayload) {
    throw new AppHttpError(
      400,
      'missing_refresh_token',
      'Google did not return an offline refresh token. Please revoke prior access and re-authorize with consent.'
    );
  }

  cacheEncryptedAccessToken(
    tokens.access_token,
    tokens.expires_in,
    cfg.integrationEncryptionKey
  );

  const nowIso = new Date().toISOString();
  const { error } = await admin.from('integration_credentials').upsert(
    {
      provider: 'gmail',
      account_email: null,
      encrypted_refresh_token: encryptedRefreshPayload.ciphertext,
      token_iv: encryptedRefreshPayload.iv,
      token_auth_tag: encryptedRefreshPayload.authTag,
      scopes: [GMAIL_SEND_SCOPE],
      updated_at: nowIso,
    },
    { onConflict: 'provider' }
  );

  if (error) {
    throw new AppHttpError(500, 'credential_store_failed', error.message);
  }

  await recordAuditLog('connect_gmail_oauth', 'integration', 'gmail', {
    scope: GMAIL_SEND_SCOPE,
    sessionSid: stateCheck.sid ?? null,
  });

  return { connected: true, scope: GMAIL_SEND_SCOPE };
}

export async function refreshGmailAccessToken(): Promise<{
  accessToken: string;
  senderEmail: string | null;
}> {
  const cfg = assertGmailOAuthEnvConfigured();
  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new AppHttpError(
      503,
      'supabase_not_configured',
      'Supabase server backend not configured.'
    );
  }

  const { data: cred, error: credErr } = await admin
    .from('integration_credentials')
    .select('*')
    .eq('provider', 'gmail')
    .single();

  if (credErr || !cred) {
    throw new AppHttpError(503, 'gmail_not_connected', 'Gmail not connected.');
  }

  let refreshToken: string;
  try {
    refreshToken = decryptSecretAes256Gcm(
      {
        ciphertext: cred.encrypted_refresh_token,
        iv: cred.token_iv,
        authTag: cred.token_auth_tag,
      },
      cfg.integrationEncryptionKey
    );
  } catch {
    throw new AppHttpError(
      500,
      'token_decryption_failed',
      'Stored Gmail credentials could not be decrypted with the current INTEGRATION_ENCRYPTION_KEY.'
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  let tokenRes: Response;
  try {
    tokenRes = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: cfg.googleClientId,
        client_secret: cfg.googleClientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
  } catch {
    throw new AppHttpError(
      502,
      'gmail_refresh_network_error',
      'Unable to reach Google OAuth endpoint to refresh Gmail access token.'
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!tokenRes.ok) {
    let errorCode = '';
    try {
      const errBody = (await tokenRes.json()) as { error?: string };
      errorCode = errBody.error ?? '';
    } catch {
      errorCode = '';
    }

    if (errorCode === 'invalid_grant' || tokenRes.status === 400 || tokenRes.status === 401) {
      clearCachedAccessToken();
      throw new AppHttpError(
        401,
        'gmail_reauth_required',
        'Gmail OAuth refresh token is invalid or revoked. Please re-authorize Gmail.'
      );
    }

    throw new AppHttpError(
      502,
      'gmail_refresh_failed',
      `Unable to refresh Gmail OAuth token (${tokenRes.status}).`
    );
  }

  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!tokenJson.access_token) {
    throw new AppHttpError(
      502,
      'gmail_access_token_missing',
      'Google OAuth refresh response did not include an access token.'
    );
  }

  cacheEncryptedAccessToken(
    tokenJson.access_token,
    tokenJson.expires_in,
    cfg.integrationEncryptionKey
  );

  return {
    accessToken: tokenJson.access_token,
    senderEmail: cred.account_email ?? null,
  };
}

export async function getValidGmailAccessToken(): Promise<{
  accessToken: string;
  senderEmail: string | null;
}> {
  const cfg = assertGmailOAuthEnvConfigured();
  const cached = getCachedAccessToken(cfg.integrationEncryptionKey);
  if (cached) {
    const status = await getGmailConnectionStatus();
    if (status.connected) {
      return { accessToken: cached, senderEmail: status.senderEmail };
    }
    clearCachedAccessToken();
  }
  return refreshGmailAccessToken();
}

export async function disconnectGmailIntegration(): Promise<{ disconnected: boolean }> {
  clearCachedAccessToken();
  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new AppHttpError(
      503,
      'supabase_not_configured',
      'Supabase server backend not configured.'
    );
  }

  const { error } = await admin
    .from('integration_credentials')
    .delete()
    .eq('provider', 'gmail');

  if (error) {
    throw new AppHttpError(500, 'credential_delete_failed', error.message);
  }

  await recordAuditLog('disconnect_gmail_oauth', 'integration', 'gmail', {});
  return { disconnected: true };
}

function encodeRfc2822Email(params: {
  to: string;
  from: string | null;
  subject: string;
  body: string;
}): string {
  const safeSubject = params.subject.replace(/[\r\n]+/g, ' ').trim();
  const safeTo = params.to.replace(/[\r\n]+/g, '').trim();
  const lines: string[] = [];

  if (params.from && isValidEmail(params.from)) {
    lines.push(`From: ${params.from.replace(/[\r\n]+/g, '').trim()}`);
  }

  lines.push(
    `To: ${safeTo}`,
    `Subject: ${safeSubject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    params.body
  );

  return Buffer.from(lines.join('\r\n'), 'utf8').toString('base64url');
}

export async function sendEmailViaGmailApi(params: {
  to: string;
  subject: string;
  body: string;
}): Promise<{ providerMessageId: string; senderEmail: string }> {
  const cfg = getServerConfig();
  if (cfg.outreachMode !== 'live') {
    throw new AppHttpError(
      409,
      'live_outreach_disabled',
      'Live email sending is disabled while OUTREACH_MODE=simulation.'
    );
  }

  let tokenBundle = await getValidGmailAccessToken();

  const rawMessage = encodeRfc2822Email({
    to: params.to,
    from: tokenBundle.senderEmail,
    subject: params.subject,
    body: params.body,
  });

  const executeSend = async (accessToken: string): Promise<Response> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      return await fetch(GMAIL_SEND_ENDPOINT, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: rawMessage }),
      });
    } finally {
      clearTimeout(timeout);
    }
  };

  let sendRes = await executeSend(tokenBundle.accessToken);
  if (sendRes.status === 401) {
    clearCachedAccessToken();
    tokenBundle = await refreshGmailAccessToken();
    sendRes = await executeSend(tokenBundle.accessToken);
  }

  if (!sendRes.ok) {
    throw new AppHttpError(
      502,
      'gmail_send_failed',
      `Gmail API send failed (${sendRes.status}).`
    );
  }

  const sendJson = (await sendRes.json()) as { id?: string };
  return {
    providerMessageId: sendJson.id || 'gmail_sent',
    senderEmail: tokenBundle.senderEmail || 'Authorized Gmail Account',
  };
}
