import { Router } from 'express';
import { getNonSensitiveHealthStatus } from '../config/env.ts';

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  res.json(getNonSensitiveHealthStatus());
});
