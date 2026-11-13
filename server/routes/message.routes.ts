import { Router } from 'express';
import { AppHttpError } from '../middleware/errorHandler.ts';
import { geminiRateLimiter } from '../middleware/rateLimit.ts';
import {
  generatePersonalizedEmailPitch,
  generatePersonalizedInstagramDm,
  updateOutreachMessageDraft,
} from '../services/gemini/pitchGenerator.service.ts';
import { isValidUuid } from '../utils/validation.ts';

export const messageRouter = Router();

messageRouter.post('/messages/generate-email', geminiRateLimiter, async (req, res, next) => {
  try {
    const campaignInfluencerId = req.body?.campaignInfluencerId;
    if (!isValidUuid(campaignInfluencerId)) {
      throw new AppHttpError(
        400,
        'invalid_campaign_influencer_id',
        'Valid campaignInfluencerId is required.'
      );
    }
    const message = await generatePersonalizedEmailPitch(campaignInfluencerId);
    res.status(201).json({ message });
  } catch (err) {
    next(err);
  }
});

messageRouter.post(
  '/messages/generate-instagram-dm',
  geminiRateLimiter,
  async (req, res, next) => {
    try {
      const campaignInfluencerId = req.body?.campaignInfluencerId;
      if (!isValidUuid(campaignInfluencerId)) {
        throw new AppHttpError(
          400,
          'invalid_campaign_influencer_id',
          'Valid campaignInfluencerId is required.'
        );
      }
      const message = await generatePersonalizedInstagramDm(campaignInfluencerId);
      res.status(201).json({ message });
    } catch (err) {
      next(err);
    }
  }
);

messageRouter.patch('/messages/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      throw new AppHttpError(400, 'invalid_message_id', 'Invalid message ID.');
    }
    const message = await updateOutreachMessageDraft(id, {
      subject:
        req.body?.subject !== undefined
          ? req.body.subject === null
            ? null
            : String(req.body.subject)
          : undefined,
      messageBody:
        req.body?.messageBody !== undefined ? String(req.body.messageBody) : undefined,
      approve: req.body?.approve === true,
    });
    res.json({ message });
  } catch (err) {
    next(err);
  }
});
