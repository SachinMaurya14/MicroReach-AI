import { Router } from 'express';
import { AppHttpError } from '../middleware/errorHandler.ts';
import {
  addInfluencersToCampaign,
  createCampaign,
  deleteCampaign,
  ensureDefaultCampaign,
  listCampaigns,
  updateCampaign,
} from '../services/supabase/sharedWorkspace.service.ts';
import { isValidUuid } from '../utils/validation.ts';

export const campaignRouter = Router();

campaignRouter.get('/campaigns', async (req, res, next) => {
  try {
    const autoInit = req.query.init === 'true';
    const campaigns = autoInit ? await ensureDefaultCampaign() : await listCampaigns();
    res.json({ campaigns });
  } catch (err) {
    next(err);
  }
});

campaignRouter.post('/campaigns', async (req, res, next) => {
  try {
    const campaign = await createCampaign({
      name: req.body?.name,
      brand_name: req.body?.brand_name,
      niche: req.body?.niche,
      target_country: req.body?.target_country,
      min_followers: req.body?.min_followers,
      max_followers: req.body?.max_followers,
      min_engagement_rate: req.body?.min_engagement_rate,
      status: req.body?.status,
    });
    res.status(201).json({ campaign });
  } catch (err) {
    next(err);
  }
});

campaignRouter.patch('/campaigns/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      throw new AppHttpError(400, 'invalid_campaign_id', 'Invalid campaign ID.');
    }
    const campaign = await updateCampaign(id, req.body ?? {});
    res.json({ campaign });
  } catch (err) {
    next(err);
  }
});

campaignRouter.delete('/campaigns/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      throw new AppHttpError(400, 'invalid_campaign_id', 'Invalid campaign ID.');
    }
    const confirmed = req.body?.confirmDelete === true || req.query.confirm === 'true';
    await deleteCampaign(id, confirmed);
    res.json({ deleted: true, id });
  } catch (err) {
    next(err);
  }
});

campaignRouter.post('/campaigns/:id/influencers', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      throw new AppHttpError(400, 'invalid_campaign_id', 'Invalid campaign ID.');
    }
    const rawIds: unknown[] = Array.isArray(req.body?.influencerIds)
      ? req.body.influencerIds
      : [];
    const influencerIds = rawIds.filter((v): v is string => isValidUuid(v));
    const result = await addInfluencersToCampaign(id, influencerIds);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});
