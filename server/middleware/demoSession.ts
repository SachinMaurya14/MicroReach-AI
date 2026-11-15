import type { NextFunction, Request, Response } from 'express';
import { getServerConfig } from '../config/env.ts';
import {
  DEMO_SESSION_TTL_SECONDS,
  type DemoSessionPayload,
  verifyDemoSessionToken,
} from '../utils/crypto.ts';

export const DEMO_SESSION_COOKIE_NAME = 'mr_demo_session';

declare global {
  namespace Express {
    interface Request {
      demoSession?: DemoSessionPayload;
    }
  }
}

export function parseCookieHeader(cookieHeader: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) {
      try {
        result[key] = decodeURIComponent(val);
      } catch {
        result[key] = val;
      }
    }
  }
  return result;
}

export function isRequestSecure(req: Request): boolean {
  const proto = req.headers['x-forwarded-proto'];
  if (typeof proto === 'string' && proto.split(',')[0].trim() === 'https') {
    return true;
  }
  return Boolean(req.secure);
}

export function setDemoSessionCookie(req: Request, res: Response, signedToken: string): void {
  const cfg = getServerConfig();
  const secure = cfg.isProduction || isRequestSecure(req);
  const parts = [
    `${DEMO_SESSION_COOKIE_NAME}=${encodeURIComponent(signedToken)}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Strict',
    `Max-Age=${DEMO_SESSION_TTL_SECONDS}`,
  ];
  if (secure) {
    parts.push('Secure');
  }
  res.setHeader('Set-Cookie', parts.join('; '));
}

export function clearDemoSessionCookie(req: Request, res: Response): void {
  const cfg = getServerConfig();
  const secure = cfg.isProduction || isRequestSecure(req);
  const parts = [
    `${DEMO_SESSION_COOKIE_NAME}=`,
    'HttpOnly',
    'Path=/',
    'SameSite=Strict',
    'Max-Age=0',
  ];
  if (secure) {
    parts.push('Secure');
  }
  res.setHeader('Set-Cookie', parts.join('; '));
}

export function extractValidDemoSession(req: Request): DemoSessionPayload | null {
  const cfg = getServerConfig();
  if (!cfg.demoAccessToken || !cfg.demoSessionSecret) {
    return null;
  }
  const cookies = parseCookieHeader(req.headers.cookie);
  const rawToken = cookies[DEMO_SESSION_COOKIE_NAME];
  if (!rawToken) return null;
  return verifyDemoSessionToken(rawToken, cfg.demoSessionSecret, cfg.demoAccessToken);
}

export function validateSameOrigin(req: Request, res: Response, next: NextFunction): void {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    next();
    return;
  }

  const host = (req.headers['x-forwarded-host'] || req.headers.host || '').toString().split(',')[0].trim();
  const origin = req.headers.origin;
  const referer = req.headers.referer;

  if (origin) {
    try {
      const originHost = new URL(origin).host;
      if (host && originHost !== host) {
        res.status(403).json({
          error: 'origin_mismatch',
          message: 'Cross-origin state-changing request rejected.',
        });
        return;
      }
    } catch {
      res.status(403).json({
        error: 'invalid_origin',
        message: 'Invalid request origin.',
      });
      return;
    }
  } else if (referer) {
    try {
      const refererHost = new URL(referer).host;
      if (host && refererHost !== host) {
        res.status(403).json({
          error: 'origin_mismatch',
          message: 'Cross-origin referer rejected.',
        });
        return;
      }
    } catch {
      res.status(403).json({
        error: 'invalid_origin',
        message: 'Invalid request referer.',
      });
      return;
    }
  }

  next();
}

export function requireDemoSession(req: Request, res: Response, next: NextFunction): void {
  const session = extractValidDemoSession(req);
  if (session) {
    req.demoSession = session;
  } else {
    req.demoSession = {
      sid: 'public-workspace-user',
      exp: Math.floor(Date.now() / 1000) + 86400,
      iat: Math.floor(Date.now() / 1000),
      tfp: 'public-workspace-tfp',
    };
  }
  next();
}
