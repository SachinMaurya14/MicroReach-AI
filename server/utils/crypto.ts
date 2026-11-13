import crypto from 'node:crypto';

export function constantTimeEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  const hashA = crypto.createHash('sha256').update(a, 'utf8').digest();
  const hashB = crypto.createHash('sha256').update(b, 'utf8').digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

export function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function deriveSigningKey(sessionSecret: string, accessToken: string): Buffer {
  // Binding the signing key to both DEMO_SESSION_SECRET and a hash of DEMO_ACCESS_TOKEN
  // ensures rotating the invitation token immediately invalidates prior session cookies.
  const tokenDigest = sha256Hex(accessToken);
  return crypto
    .createHmac('sha256', sessionSecret)
    .update(`microreach-demo-session-v1:${tokenDigest}`)
    .digest();
}

export interface DemoSessionPayload {
  sid: string;
  iat: number;
  exp: number;
  tfp: string;
}

export const DEMO_SESSION_TTL_SECONDS = 12 * 60 * 60; // 12 hours

export function signDemoSessionToken(
  sessionSecret: string,
  accessToken: string,
  ttlSeconds: number = DEMO_SESSION_TTL_SECONDS
): { token: string; payload: DemoSessionPayload } {
  const nowSec = Math.floor(Date.now() / 1000);
  const payload: DemoSessionPayload = {
    sid: crypto.randomBytes(16).toString('hex'),
    iat: nowSec,
    exp: nowSec + ttlSeconds,
    tfp: sha256Hex(accessToken).slice(0, 16),
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const key = deriveSigningKey(sessionSecret, accessToken);
  const signature = crypto
    .createHmac('sha256', key)
    .update(encodedPayload)
    .digest('base64url');

  return {
    token: `${encodedPayload}.${signature}`,
    payload,
  };
}

export function verifyDemoSessionToken(
  token: string,
  sessionSecret: string,
  accessToken: string
): DemoSessionPayload | null {
  if (!token || !sessionSecret || !accessToken) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [encodedPayload, providedSig] = parts;
  if (!encodedPayload || !providedSig) return null;

  try {
    const key = deriveSigningKey(sessionSecret, accessToken);
    const expectedSig = crypto
      .createHmac('sha256', key)
      .update(encodedPayload)
      .digest('base64url');

    if (!constantTimeEqual(providedSig, expectedSig)) {
      return null;
    }

    const decoded = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8')
    ) as DemoSessionPayload;

    if (
      !decoded ||
      typeof decoded.sid !== 'string' ||
      typeof decoded.exp !== 'number' ||
      typeof decoded.iat !== 'number' ||
      typeof decoded.tfp !== 'string'
    ) {
      return null;
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (decoded.exp <= nowSec) {
      return null;
    }

    const expectedTfp = sha256Hex(accessToken).slice(0, 16);
    if (!constantTimeEqual(decoded.tfp, expectedTfp)) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

function deriveAesKey(encryptionKey: string): Buffer {
  // Normalize arbitrary strong passphrase/hex/base64 into a 32-byte AES-256 key
  if (/^[0-9a-fA-F]{64}$/.test(encryptionKey)) {
    return Buffer.from(encryptionKey, 'hex');
  }
  return crypto.createHash('sha256').update(encryptionKey, 'utf8').digest();
}

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  authTag: string;
}

export function encryptSecretAes256Gcm(
  plaintext: string,
  encryptionKey: string
): EncryptedPayload {
  if (!encryptionKey || encryptionKey.length < 16) {
    throw new Error('INTEGRATION_ENCRYPTION_KEY must be at least 16 characters.');
  }
  const key = deriveAesKey(encryptionKey);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

export function decryptSecretAes256Gcm(
  payload: EncryptedPayload,
  encryptionKey: string
): string {
  if (!encryptionKey || encryptionKey.length < 16) {
    throw new Error('INTEGRATION_ENCRYPTION_KEY must be at least 16 characters.');
  }
  const key = deriveAesKey(encryptionKey);
  const iv = Buffer.from(payload.iv, 'base64');
  const authTag = Buffer.from(payload.authTag, 'base64');
  const ciphertext = Buffer.from(payload.ciphertext, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

const consumedOAuthNonces = new Map<string, number>();

function pruneConsumedOAuthNonces(nowSec: number): void {
  if (consumedOAuthNonces.size < 250) return;
  for (const [nonce, exp] of consumedOAuthNonces.entries()) {
    if (exp <= nowSec) {
      consumedOAuthNonces.delete(nonce);
    }
  }
}

export interface OAuthStateVerificationResult {
  valid: boolean;
  sid?: string;
  reason?: string;
}

export function signOAuthState(
  sessionId: string,
  sessionSecret: string,
  ttlSeconds = 600
): string {
  const nonce = crypto.randomBytes(16).toString('hex');
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = Buffer.from(
    JSON.stringify({ sid: sessionId, nonce, exp }),
    'utf8'
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', sessionSecret)
    .update(`oauth-state:${payload}`)
    .digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyOAuthState(
  state: string,
  expectedSessionId: string | null,
  sessionSecret: string,
  options?: { consumeNonce?: boolean }
): OAuthStateVerificationResult {
  if (!state || !sessionSecret) {
    return { valid: false, reason: 'missing_state_or_secret' };
  }
  const parts = state.split('.');
  if (parts.length !== 2) {
    return { valid: false, reason: 'malformed_state' };
  }
  const [payload, providedSig] = parts;
  if (!payload || !providedSig) {
    return { valid: false, reason: 'malformed_state' };
  }

  try {
    const expectedSig = crypto
      .createHmac('sha256', sessionSecret)
      .update(`oauth-state:${payload}`)
      .digest('base64url');
    if (!constantTimeEqual(providedSig, expectedSig)) {
      return { valid: false, reason: 'invalid_signature' };
    }

    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      sid?: string;
      nonce?: string;
      exp?: number;
    };

    if (
      !decoded ||
      typeof decoded.sid !== 'string' ||
      typeof decoded.nonce !== 'string' ||
      !/^[a-f0-9]{32}$/.test(decoded.nonce) ||
      typeof decoded.exp !== 'number'
    ) {
      return { valid: false, reason: 'invalid_payload' };
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (decoded.exp <= nowSec) {
      return { valid: false, reason: 'state_expired' };
    }

    if (expectedSessionId && !constantTimeEqual(decoded.sid, expectedSessionId)) {
      return { valid: false, reason: 'session_mismatch' };
    }

    pruneConsumedOAuthNonces(nowSec);
    if (consumedOAuthNonces.has(decoded.nonce)) {
      return { valid: false, reason: 'state_already_used' };
    }

    if (options?.consumeNonce !== false) {
      consumedOAuthNonces.set(decoded.nonce, decoded.exp);
    }

    return { valid: true, sid: decoded.sid };
  } catch {
    return { valid: false, reason: 'invalid_state' };
  }
}
