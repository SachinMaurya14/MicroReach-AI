import { createApp } from '../server/app.ts';

// Vercel serverless entry point: export the configured Express application directly
// without calling app.listen() or bundling Vite dev middleware.
const app = createApp();

export default app;
