import { Router } from 'express';
import { extractValidDemoSession } from '../middleware/demoSession.ts';
import { AppHttpError } from '../middleware/errorHandler.ts';
import {
  buildGmailOAuthAuthorizationUrl,
  disconnectGmailIntegration,
  getGmailConnectionStatus,
  handleGmailOAuthCallback,
} from '../services/gmail/gmailOAuth.service.ts';

export const integrationRouter = Router();
export const integrationCallbackRouter = Router();

integrationRouter.get('/integrations/gmail/status', async (_req, res, next) => {
  try {
    const status = await getGmailConnectionStatus();
    res.json(status);
  } catch (err) {
    next(err);
  }
});

integrationRouter.get('/integrations/gmail/oauth-url', (req, res, next) => {
  try {
    const sessionId = req.demoSession?.sid;
    if (!sessionId) {
      throw new AppHttpError(401, 'demo_session_required', 'Valid demo session required.');
    }
    const result = buildGmailOAuthAuthorizationUrl(sessionId);
    if (req.query.redirect === '1' || req.query.redirect === 'true') {
      res.redirect(result.authUrl);
      return;
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
});

integrationRouter.post('/integrations/gmail/disconnect', async (_req, res, next) => {
  try {
    const result = await disconnectGmailIntegration();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

integrationCallbackRouter.get(
  ['/integrations/gmail/callback', '/integrations/gmail/callback/'],
  async (req, res, next) => {
    try {
      const oauthError =
        typeof req.query.error === 'string' ? req.query.error.trim() : '';

      if (oauthError) {
        const safeReason = oauthError.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
        const wantsJson =
          req.query.format === 'json' ||
          (req.headers.accept ?? '').includes('application/json');
        if (!wantsJson && (req.headers.accept ?? '').includes('text/html')) {
          res.redirect(`/dashboard?gmail=error&reason=${encodeURIComponent(safeReason)}`);
          return;
        }
        throw new AppHttpError(
          400,
          'oauth_authorization_denied',
          `Google OAuth authorization returned error: ${safeReason}.`
        );
      }

      const code = typeof req.query.code === 'string' ? req.query.code.trim() : '';
      const state = typeof req.query.state === 'string' ? req.query.state.trim() : '';
      if (!code || !state) {
        throw new AppHttpError(
          400,
          'invalid_oauth_callback',
          'Missing authorization code or state.'
        );
      }

      const activeSession = extractValidDemoSession(req);
      const result = await handleGmailOAuthCallback({
        code,
        state,
        expectedSessionId: activeSession?.sid ?? null,
      });

      const wantsJson =
        req.query.format === 'json' ||
        (req.headers.accept ?? '').includes('application/json');
      if (wantsJson) {
        res.json({
          connected: result.connected,
          scope: result.scope,
          message: 'Gmail OAuth connected securely.',
        });
        return;
      }

      res.redirect('/dashboard?gmail=connected');
    } catch (err) {
      next(err);
    }
  }
);
