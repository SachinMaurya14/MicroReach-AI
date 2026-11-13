import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { getServerConfig } from './server/config/env.ts';
import {
  requireDemoSession,
  validateSameOrigin,
} from './server/middleware/demoSession.ts';
import { errorHandler } from './server/middleware/errorHandler.ts';
import { apiSessionRateLimiter, oauthCallbackRateLimiter } from './server/middleware/rateLimit.ts';
import { campaignRouter } from './server/routes/campaign.routes.ts';
import { demoRouter } from './server/routes/demo.routes.ts';
import { discoveryRouter } from './server/routes/discovery.routes.ts';
import { healthRouter } from './server/routes/health.routes.ts';
import { influencerRouter } from './server/routes/influencer.routes.ts';
import {
  integrationCallbackRouter,
  integrationRouter,
} from './server/routes/integration.routes.ts';
import { messageRouter } from './server/routes/message.routes.ts';
import { outreachRouter } from './server/routes/outreach.routes.ts';

async function startServer() {
  const cfg = getServerConfig();
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
  app.use('/api', oauthCallbackRateLimiter, integrationCallbackRouter);

  // Protected workspace APIs: strict origin check + signed demo session + rate limit
  app.use('/api', validateSameOrigin, requireDemoSession, apiSessionRateLimiter);
  app.use('/api', campaignRouter);
  app.use('/api', influencerRouter);
  app.use('/api', discoveryRouter);
  app.use('/api', messageRouter);
  app.use('/api', outreachRouter);
  app.use('/api', integrationRouter);

  // Unmatched API endpoints return 404 JSON
  app.use('/api', (_req, res) => {
    res.status(404).json({
      error: 'not_found',
      message: 'API endpoint not found.',
    });
  });

  app.use(errorHandler);

  if (!cfg.isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir, { index: false }));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(503).send('Production build not found.');
      }
    });
  }

  app.listen(cfg.port, '0.0.0.0', () => {
    console.log(
      `MicroReach AI server listening on http://0.0.0.0:${cfg.port} (${cfg.nodeEnv})`
    );
  });
}

startServer().catch((err) => {
  console.error('Failed to start MicroReach AI server:', err instanceof Error ? err.message : err);
  process.exit(1);
});
