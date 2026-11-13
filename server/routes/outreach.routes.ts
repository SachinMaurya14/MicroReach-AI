import { Router } from 'express';
import { AppHttpError } from '../middleware/errorHandler.ts';
import {
  listOutreachLogs,
  logManualInstagramDm,
  sendLiveEmailOutreach,
  simulateEmailOutreach,
} from '../services/outreach/outreach.service.ts';
import { isValidUuid, parseBoundedInt } from '../utils/validation.ts';

export const outreachRouter = Router();

outreachRouter.post('/outreach/simulate', async (req, res, next) => {
  try {
    const campaignInfluencerId = req.body?.campaignInfluencerId;
    if (!isValidUuid(campaignInfluencerId)) {
      throw new AppHttpError(
        400,
        'invalid_campaign_influencer_id',
        'Valid campaignInfluencerId is required.'
      );
    }
    const result = await simulateEmailOutreach({
      campaignInfluencerId,
      outreachMessageId: isValidUuid(req.body?.outreachMessageId)
        ? req.body.outreachMessageId
        : undefined,
      editedSubject:
        typeof req.body?.subject === 'string' ? req.body.subject : undefined,
      editedBody:
        typeof req.body?.messageBody === 'string' ? req.body.messageBody : undefined,
      idempotencyKey:
        typeof req.body?.idempotencyKey === 'string' ? req.body.idempotencyKey : undefined,
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

outreachRouter.post('/outreach/send', async (req, res, next) => {
  try {
    const campaignInfluencerId = req.body?.campaignInfluencerId;
    const outreachMessageId = req.body?.outreachMessageId;
    if (!isValidUuid(campaignInfluencerId) || !isValidUuid(outreachMessageId)) {
      throw new AppHttpError(
        400,
        'invalid_outreach_identifiers',
        'Valid campaignInfluencerId and outreachMessageId are required.'
      );
    }

    const result = await sendLiveEmailOutreach({
      campaignInfluencerId,
      outreachMessageId,
      confirmSend: req.body?.confirmSend === true,
      idempotencyKey:
        typeof req.body?.idempotencyKey === 'string' ? req.body.idempotencyKey : undefined,
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

outreachRouter.post('/outreach/instagram-manual', async (req, res, next) => {
  try {
    const campaignInfluencerId = req.body?.campaignInfluencerId;
    const dmText = typeof req.body?.dmText === 'string' ? req.body.dmText.trim() : '';
    if (!isValidUuid(campaignInfluencerId) || !dmText) {
      throw new AppHttpError(
        400,
        'invalid_instagram_log_request',
        'Valid campaignInfluencerId and dmText are required.'
      );
    }

    const result = await logManualInstagramDm({
      campaignInfluencerId,
      outreachMessageId: isValidUuid(req.body?.outreachMessageId)
        ? req.body.outreachMessageId
        : undefined,
      dmText,
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

outreachRouter.get('/outreach/logs', async (req, res, next) => {
  try {
    const campaignId =
      typeof req.query.campaignId === 'string' && isValidUuid(req.query.campaignId)
        ? req.query.campaignId
        : undefined;
    const limit = parseBoundedInt(req.query.limit, 50, 1, 200);
    const logs = await listOutreachLogs(campaignId, limit);
    res.json({ logs });
  } catch (err) {
    next(err);
  }
});
