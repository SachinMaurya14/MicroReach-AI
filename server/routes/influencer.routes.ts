import { Router } from 'express';
import { AppHttpError } from '../middleware/errorHandler.ts';
import {
  getInfluencerById,
  listWorkspaceCreators,
  recordAuditLog,
  removeCreatorFromCampaign,
  serializeCreatorsToCsv,
  updateCreatorProfileManual,
} from '../services/supabase/sharedWorkspace.service.ts';
import { isValidUuid, parseBoundedFloat, parseBoundedInt } from '../utils/validation.ts';

export const influencerRouter = Router();

function parseFiltersFromQuery(query: Record<string, unknown>) {
  const sortRaw = typeof query.sortBy === 'string' ? query.sortBy : 'relevance';
  const sortBy = (
    ['relevance', 'followers-desc', 'followers-asc', 'engagement-desc'].includes(sortRaw)
      ? sortRaw
      : 'relevance'
  ) as 'relevance' | 'followers-desc' | 'followers-asc' | 'engagement-desc';

  return {
    campaignId:
      typeof query.campaignId === 'string' && isValidUuid(query.campaignId)
        ? query.campaignId
        : undefined,
    search: typeof query.search === 'string' ? query.search.trim().slice(0, 120) : undefined,
    niche: typeof query.niche === 'string' ? query.niche.trim().slice(0, 80) : undefined,
    country: typeof query.country === 'string' ? query.country.trim().slice(0, 80) : undefined,
    platform: typeof query.platform === 'string' ? query.platform.trim().slice(0, 40) : undefined,
    qualificationStatus:
      typeof query.qualificationStatus === 'string'
        ? query.qualificationStatus.trim().slice(0, 40)
        : undefined,
    minFollowers: query.minFollowers
      ? parseBoundedInt(query.minFollowers, 0, 0, 100_000_000)
      : undefined,
    maxFollowers: query.maxFollowers
      ? parseBoundedInt(query.maxFollowers, 0, 0, 100_000_000)
      : undefined,
    minEngagement: query.minEngagement
      ? parseBoundedFloat(query.minEngagement, 0, 0, 100)
      : undefined,
    sortBy,
    limit: query.limit ? parseBoundedInt(query.limit, 100, 1, 300) : 150,
  };
}

influencerRouter.get('/influencers', async (req, res, next) => {
  try {
    const filters = parseFiltersFromQuery(req.query as Record<string, unknown>);
    const result = await listWorkspaceCreators(filters);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

influencerRouter.get('/influencers/export.csv', async (req, res, next) => {
  try {
    const filters = parseFiltersFromQuery(req.query as Record<string, unknown>);
    const result = await listWorkspaceCreators({ ...filters, limit: 300 });
    const csv = serializeCreatorsToCsv(result.items);

    await recordAuditLog('export_influencers_csv', 'influencer_export', null, {
      rowCount: result.items.length,
      campaignId: filters.campaignId ?? null,
    });

    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="microreach-creators-${stamp}.csv"`
    );
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

influencerRouter.get('/influencers/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      throw new AppHttpError(400, 'invalid_influencer_id', 'Invalid creator ID.');
    }
    const detail = await getInfluencerById(id);
    res.json(detail);
  } catch (err) {
    next(err);
  }
});

influencerRouter.patch('/influencers/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      throw new AppHttpError(400, 'invalid_influencer_id', 'Invalid creator ID.');
    }

    const allowedQual = ['discovered', 'qualified', 'rejected', 'needs_review'];
    const rawQual = req.body?.qualificationStatus;
    const qualificationStatus =
      typeof rawQual === 'string' && allowedQual.includes(rawQual)
        ? (rawQual as 'discovered' | 'qualified' | 'rejected' | 'needs_review')
        : undefined;

    await updateCreatorProfileManual(id, {
      name: typeof req.body?.name === 'string' ? req.body.name : undefined,
      contactEmail:
        req.body?.contactEmail !== undefined ? String(req.body.contactEmail ?? '') : undefined,
      qualificationStatus,
      qualificationReason:
        typeof req.body?.qualificationReason === 'string'
          ? req.body.qualificationReason
          : undefined,
      campaignInfluencerId:
        typeof req.body?.campaignInfluencerId === 'string' &&
        isValidUuid(req.body.campaignInfluencerId)
          ? req.body.campaignInfluencerId
          : undefined,
    });

    const updated = await getInfluencerById(id);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

influencerRouter.delete('/influencers/campaign-link/:campaignInfluencerId', async (req, res, next) => {
  try {
    const { campaignInfluencerId } = req.params;
    if (!isValidUuid(campaignInfluencerId)) {
      throw new AppHttpError(400, 'invalid_link_id', 'Invalid campaign creator link ID.');
    }
    const confirmed = req.body?.confirmDelete === true || req.query.confirm === 'true';
    await removeCreatorFromCampaign(campaignInfluencerId, confirmed);
    res.json({ deleted: true, campaignInfluencerId });
  } catch (err) {
    next(err);
  }
});
