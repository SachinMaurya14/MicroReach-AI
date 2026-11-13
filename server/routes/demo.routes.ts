import { Router } from 'express';
import { getNonSensitiveHealthStatus, getServerConfig } from '../config/env.ts';
import {
  clearDemoSessionCookie,
  extractValidDemoSession,
  setDemoSessionCookie,
  validateSameOrigin,
} from '../middleware/demoSession.ts';
import { accessExchangeRateLimiter } from '../middleware/rateLimit.ts';
import { recordAuditLog } from '../services/supabase/sharedWorkspace.service.ts';
import { constantTimeEqual, signDemoSessionToken } from '../utils/crypto.ts';

export const demoRouter = Router();

demoRouter.post(
  '/demo/access',
  validateSameOrigin,
  accessExchangeRateLimiter,
  async (req, res) => {
    const cfg = getServerConfig();
    if (!cfg.demoAccessToken || !cfg.demoSessionSecret) {
      res.status(503).json({
        error: 'demo_access_not_configured',
        message:
          'Shared workspace invitation access is not configured on the server yet (DEMO_ACCESS_TOKEN and DEMO_SESSION_SECRET).',
      });
      return;
    }

    const rawToken =
      typeof req.body?.token === 'string' ? req.body.token.trim() : '';

    if (!rawToken || rawToken.length > 512) {
      res.status(400).json({
        error: 'missing_token',
        message: 'A valid invitation token is required.',
      });
      return;
    }

    // Constant-time verification without logging the raw token
    if (!constantTimeEqual(rawToken, cfg.demoAccessToken)) {
      await recordAuditLog('demo_access_rejected', 'demo_session', null, {
        reason: 'invalid_token',
      });
      res.status(401).json({
        error: 'invalid_invitation_token',
        message: 'This invitation link is invalid or has been rotated.',
      });
      return;
    }

    const { token, payload } = signDemoSessionToken(
      cfg.demoSessionSecret,
      cfg.demoAccessToken
    );

    setDemoSessionCookie(req, res, token);
    await recordAuditLog('demo_access_granted', 'demo_session', payload.sid, {
      expiresAt: new Date(payload.exp * 1000).toISOString(),
    });

    res.json({
      authenticated: true,
      expiresAt: new Date(payload.exp * 1000).toISOString(),
      workspaceMode: 'shared_demo',
    });
  }
);

demoRouter.get('/demo/session', (req, res) => {
  const health = getNonSensitiveHealthStatus();
  const session = extractValidDemoSession(req);

  if (!session) {
    res.json({
      authenticated: false,
      demoAccessConfigured: health.demoAccessConfigured,
      workspaceMode: 'shared_demo',
      health,
    });
    return;
  }

  res.json({
    authenticated: true,
    demoAccessConfigured: health.demoAccessConfigured,
    expiresAt: new Date(session.exp * 1000).toISOString(),
    workspaceMode: 'shared_demo',
    health,
  });
});

demoRouter.post('/demo/logout', validateSameOrigin, async (req, res) => {
  const session = extractValidDemoSession(req);
  clearDemoSessionCookie(req, res);
  if (session) {
    await recordAuditLog('demo_session_logout', 'demo_session', session.sid, {});
  }
  res.json({ authenticated: false });
});
