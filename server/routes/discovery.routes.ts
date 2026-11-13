import { Router } from 'express';
import { AppHttpError } from '../middleware/errorHandler.ts';
import { discoveryRateLimiter } from '../middleware/rateLimit.ts';
import {
  cancelDiscoveryRun,
  getDiscoveryRunById,
  listDiscoveryRuns,
  startYouTubeDiscoveryRun,
} from '../services/youtube/youtubeDiscovery.service.ts';
import { isValidUuid, parseBoundedInt } from '../utils/validation.ts';

export const discoveryRouter = Router();

discoveryRouter.post('/discovery/youtube', discoveryRateLimiter, async (req, res, next) => {
  try {
    const campaignId =
      typeof req.body?.campaignId === 'string' && isValidUuid(req.body.campaignId)
        ? req.body.campaignId
        : undefined;
    const queries = Array.isArray(req.body?.queries)
      ? req.body.queries.filter((q: unknown): q is string => typeof q === 'string')
      : undefined;
    const targetCount = parseBoundedInt(req.body?.targetCount, 50, 5, 50);
    const fetchWebsites = req.body?.fetchWebsites === true;

    const run = await startYouTubeDiscoveryRun({
      campaignId,
      queries,
      targetCount,
      fetchWebsites,
    });

    res.status(202).json({ run });
  } catch (err) {
    next(err);
  }
});

discoveryRouter.get('/discovery/runs', async (req, res, next) => {
  try {
    const limit = parseBoundedInt(req.query.limit, 20, 1, 50);
    const runs = await listDiscoveryRuns(limit);
    res.json({ runs });
  } catch (err) {
    next(err);
  }
});

discoveryRouter.get('/discovery/runs/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      throw new AppHttpError(400, 'invalid_run_id', 'Invalid discovery run ID.');
    }
    const run = await getDiscoveryRunById(id);
    res.json({ run });
  } catch (err) {
    next(err);
  }
});

discoveryRouter.post('/discovery/runs/:id/cancel', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      throw new AppHttpError(400, 'invalid_run_id', 'Invalid discovery run ID.');
    }
    await cancelDiscoveryRun(id);
    const run = await getDiscoveryRunById(id);
    res.json({ run });
  } catch (err) {
    next(err);
  }
});
