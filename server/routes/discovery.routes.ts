import { Router } from 'express';
import { AppHttpError } from '../middleware/errorHandler.ts';
import { discoveryRateLimiter } from '../middleware/rateLimit.ts';
import {
  cancelDiscoveryRun,
  getDiscoveryRunById,
  listDiscoveryRuns,
  resumeYouTubeDiscoveryRun,
  startYouTubeDiscoveryRun,
} from '../services/youtube/youtubeDiscovery.service.ts';
import { startInstagramDiscoveryRun } from '../services/apify/instagramDiscovery.service.ts';
import { isValidUuid, parseBoundedInt } from '../utils/validation.ts';

export const discoveryRouter = Router();

discoveryRouter.post('/discovery/instagram', discoveryRateLimiter, async (req, res, next) => {
  try {
    const campaignId =
      typeof req.body?.campaignId === 'string' && isValidUuid(req.body.campaignId)
        ? req.body.campaignId
        : undefined;
    const queries = Array.isArray(req.body?.queries)
      ? req.body.queries.filter((q: unknown): q is string => typeof q === 'string')
      : undefined;
    const targetCount = parseBoundedInt(req.body?.targetCount, 15, 5, 30);
    const minFollowers =
      typeof req.body?.minFollowers === 'number' ? req.body.minFollowers : undefined;
    const maxFollowers =
      typeof req.body?.maxFollowers === 'number' ? req.body.maxFollowers : undefined;
    const targetCountry =
      req.body?.targetCountry === null || typeof req.body?.targetCountry === 'string'
        ? req.body.targetCountry
        : undefined;
    const niche = typeof req.body?.niche === 'string' ? req.body.niche : undefined;

    const result = await startInstagramDiscoveryRun({
      campaignId,
      queries,
      targetCount,
      minFollowers,
      maxFollowers,
      targetCountry,
      niche,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

discoveryRouter.post('/discovery/youtube', discoveryRateLimiter, async (req, res, next) => {
  try {
    const campaignId =
      typeof req.body?.campaignId === 'string' && isValidUuid(req.body.campaignId)
        ? req.body.campaignId
        : undefined;
    const queries = Array.isArray(req.body?.queries)
      ? req.body.queries.filter((q: unknown): q is string => typeof q === 'string')
      : undefined;
    const targetCount = parseBoundedInt(req.body?.targetCount, 50, 5, 60);
    const fetchWebsites = req.body?.fetchWebsites === true;
    const minFollowers =
      typeof req.body?.minFollowers === 'number' ? req.body.minFollowers : undefined;
    const maxFollowers =
      typeof req.body?.maxFollowers === 'number' ? req.body.maxFollowers : undefined;
    const minEngagementRate =
      typeof req.body?.minEngagementRate === 'number' ? req.body.minEngagementRate : undefined;
    const targetCountry =
      req.body?.targetCountry === null || typeof req.body?.targetCountry === 'string'
        ? req.body.targetCountry
        : undefined;
    const niche = typeof req.body?.niche === 'string' ? req.body.niche : undefined;

    const result = await startYouTubeDiscoveryRun({
      campaignId,
      queries,
      targetCount,
      fetchWebsites,
      minFollowers,
      maxFollowers,
      minEngagementRate,
      targetCountry,
      niche,
    });

    const statusCode =
      result.run.status === 'pending' || result.run.status === 'running' ? 202 : 200;
    res.status(statusCode).json(result);
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

discoveryRouter.post('/discovery/runs/:id/resume', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      throw new AppHttpError(400, 'invalid_run_id', 'Invalid discovery run ID.');
    }
    const result = await resumeYouTubeDiscoveryRun(id);
    const statusCode =
      result.run.status === 'pending' || result.run.status === 'running' ? 202 : 200;
    res.status(statusCode).json(result);
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
