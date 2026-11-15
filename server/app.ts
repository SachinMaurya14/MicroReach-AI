import express from 'express';
import { validateSameOrigin } from './middleware/demoSession.ts';
import { errorHandler } from './middleware/errorHandler.ts';
import { apiSessionRateLimiter } from './middleware/rateLimit.ts';
import { campaignRouter } from './routes/campaign.routes.ts';
import { demoRouter } from './routes/demo.routes.ts';
import { discoveryRouter } from './routes/discovery.routes.ts';
import { healthRouter } from './routes/health.routes.ts';
import { influencerRouter } from './routes/influencer.routes.ts';
import {
  integrationCallbackRouter,
  integrationRouter,
} from './routes/integration.routes.ts';
import { messageRouter } from './routes/message.routes.ts';
import { outreachRouter } from './routes/outreach.routes.ts';
import { workspaceRouter } from './routes/workspace.routes.ts';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // Security headers (preserve iframe embed compatibility inside AI Studio)
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.use(express.json({ limit: '256kb' }));

  // Public health, invitation-access, and HMAC-state-verified OAuth callback endpoints
  app.use('/api', healthRouter);
  app.use('/api', demoRouter);
  app.use('/api', integrationCallbackRouter);

  // Workspace APIs: same-origin protection + rate limit (direct access without invitation gate)
  app.use('/api', validateSameOrigin, apiSessionRateLimiter);
  app.use('/api', campaignRouter);
  app.use('/api', influencerRouter);
  app.use('/api', discoveryRouter);
  app.use('/api', messageRouter);
  app.use('/api', outreachRouter);
  app.use('/api', integrationRouter);
  app.use('/api', workspaceRouter);

  // Unmatched API endpoints return 404 JSON
  app.use('/api', (_req, res) => {
    res.status(404).json({
      error: 'not_found',
      message: 'API endpoint not found.',
    });
  });

  app.use(errorHandler);

  return app;
}
