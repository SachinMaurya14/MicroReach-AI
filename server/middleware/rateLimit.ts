import type { NextFunction, Request, Response } from 'express';

interface BucketRecord {
  timestamps: number[];
}

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyGenerator: (req: Request) => string;
  message: string;
}

export function createRateLimiter(options: RateLimitOptions) {
  const buckets = new Map<string, BucketRecord>();

  // Periodic cleanup to avoid unbounded memory growth
  const cleanupTimer = setInterval(() => {
    const cutoff = Date.now() - options.windowMs;
    for (const [key, record] of buckets.entries()) {
      const active = record.timestamps.filter((ts) => ts > cutoff);
      if (active.length === 0) {
        buckets.delete(key);
      } else {
        record.timestamps = active;
      }
    }
  }, Math.max(60_000, options.windowMs));
  cleanupTimer.unref?.();

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const cutoff = now - options.windowMs;
    const key = options.keyGenerator(req);

    const record = buckets.get(key) ?? { timestamps: [] };
    record.timestamps = record.timestamps.filter((ts) => ts > cutoff);

    if (record.timestamps.length >= options.maxRequests) {
      const oldest = record.timestamps[0] ?? now;
      const retryAfterSec = Math.max(1, Math.ceil((oldest + options.windowMs - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      res.status(429).json({
        error: 'rate_limit_exceeded',
        message: options.message,
        retryAfterSeconds: retryAfterSec,
      });
      return;
    }

    record.timestamps.push(now);
    buckets.set(key, record);
    next();
  };
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

export const accessExchangeRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 12,
  keyGenerator: (req) => `ip:${getClientIp(req)}`,
  message: 'Too many invitation access attempts. Please wait a few minutes and try again.',
});

export const apiSessionRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 120,
  keyGenerator: (req) => `sess:${req.demoSession?.sid ?? getClientIp(req)}`,
  message: 'Workspace request rate limit reached. Please slow down briefly.',
});

export const discoveryRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 6,
  keyGenerator: (req) => `disc:${req.demoSession?.sid ?? getClientIp(req)}`,
  message: 'Hourly YouTube discovery limit reached for this demo session to protect API quota.',
});

export const geminiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 35,
  keyGenerator: (req) => `gem:${req.demoSession?.sid ?? getClientIp(req)}`,
  message: 'AI pitch generation rate limit reached. Please wait a few minutes.',
});

export const oauthCallbackRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 30,
  keyGenerator: (req) => `oauthcb:${getClientIp(req)}`,
  message: 'Too many Gmail OAuth callback attempts. Please try again later.',
});
