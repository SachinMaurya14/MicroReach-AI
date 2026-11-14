import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { createApp } from './server/app.ts';
import { getServerConfig } from './server/config/env.ts';

const app = createApp();

async function startNodeServer() {
  const cfg = getServerConfig();

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

if (!process.env.VERCEL) {
  startNodeServer().catch((err) => {
    console.error(
      'Failed to start MicroReach AI server:',
      err instanceof Error ? err.message : err
    );
    process.exit(1);
  });
}

export default app;
