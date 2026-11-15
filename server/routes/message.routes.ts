import { Router } from 'express';
import { AppHttpError } from '../middleware/errorHandler.ts';
import { geminiRateLimiter } from '../middleware/rateLimit.ts';
import {
  generateCampaignSuggestionsWithAi,
  generateContentIdeasWithAi,
  generateFollowUpDraft,
  generatePersonalizedEmailPitch,
  generatePersonalizedInstagramDm,
  generatePersonalizedLinkedInMessage,
  generatePersonalizedYouTubeOutreach,
  listWorkspaceMessages,
  saveOrCreateManualDraft,
  serializeMessagesToCsv,
  updateOutreachMessageDraft,
} from '../services/gemini/pitchGenerator.service.ts';
import { recordAuditLog } from '../services/supabase/sharedWorkspace.service.ts';
import type { OutreachChannel, UnifiedOutreachStatus } from '../../src/types/database.ts';
import { isValidUuid, parseBoundedInt } from '../utils/validation.ts';

export const messageRouter = Router();

messageRouter.get('/messages', async (req, res, next) => {
  try {
    const campaignId =
      typeof req.query.campaignId === 'string' && isValidUuid(req.query.campaignId)
        ? req.query.campaignId
        : undefined;
    const influencerId =
      typeof req.query.influencerId === 'string' && isValidUuid(req.query.influencerId)
        ? req.query.influencerId
        : undefined;
    const channel = typeof req.query.channel === 'string' ? req.query.channel : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const limit = parseBoundedInt(req.query.limit, 150, 1, 300);

    const messages = await listWorkspaceMessages({
      campaignId,
      influencerId,
      channel,
      status,
      limit,
    });
    res.json({ messages });
  } catch (err) {
    next(err);
  }
});

messageRouter.get('/messages/export.csv', async (req, res, next) => {
  try {
    const campaignId =
      typeof req.query.campaignId === 'string' && isValidUuid(req.query.campaignId)
        ? req.query.campaignId
        : undefined;
    const channel = typeof req.query.channel === 'string' ? req.query.channel : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;

    const messages = await listWorkspaceMessages({
      campaignId,
      channel,
      status,
      limit: 300,
    });
    const csv = serializeMessagesToCsv(messages);

    await recordAuditLog('export_messages_csv', 'message_export', null, {
      rowCount: messages.length,
      campaignId: campaignId ?? null,
    });

    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="microreach-messages-${stamp}.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

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
    const collaborationType =
      typeof req.body?.collaborationType === 'string' ? req.body.collaborationType : undefined;
    const message = await generatePersonalizedEmailPitch(campaignInfluencerId, {
      collaborationType,
    });
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
      const collaborationType =
        typeof req.body?.collaborationType === 'string' ? req.body.collaborationType : undefined;
      const message = await generatePersonalizedInstagramDm(campaignInfluencerId, {
        collaborationType,
      });
      res.status(201).json({ message });
    } catch (err) {
      next(err);
    }
  }
);

messageRouter.post(
  '/messages/generate-linkedin',
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
      const collaborationType =
        typeof req.body?.collaborationType === 'string' ? req.body.collaborationType : undefined;
      const message = await generatePersonalizedLinkedInMessage(campaignInfluencerId, {
        collaborationType,
      });
      res.status(201).json({ message });
    } catch (err) {
      next(err);
    }
  }
);

messageRouter.post(
  '/messages/generate-youtube-contact',
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
      const collaborationType =
        typeof req.body?.collaborationType === 'string' ? req.body.collaborationType : undefined;
      const message = await generatePersonalizedYouTubeOutreach(campaignInfluencerId, {
        collaborationType,
      });
      res.status(201).json({ message });
    } catch (err) {
      next(err);
    }
  }
);

messageRouter.post('/messages/manual-draft', async (req, res, next) => {
  try {
    const campaignInfluencerId = req.body?.campaignInfluencerId;
    if (!isValidUuid(campaignInfluencerId)) {
      throw new AppHttpError(
        400,
        'invalid_campaign_influencer_id',
        'Valid campaignInfluencerId is required.'
      );
    }
    const allowedChannels: OutreachChannel[] = [
      'email',
      'instagram_dm',
      'linkedin_message',
      'youtube_contact',
    ];
    const channelRaw = req.body?.channel;
    if (
      typeof channelRaw !== 'string' ||
      !allowedChannels.includes(channelRaw as OutreachChannel)
    ) {
      throw new AppHttpError(
        400,
        'invalid_channel',
        'Channel must be one of email, instagram_dm, linkedin_message, or youtube_contact.'
      );
    }
    const messageBody = typeof req.body?.messageBody === 'string' ? req.body.messageBody : '';
    const allowedInitialStatuses = ['draft', 'pending_review', 'approved'] as const;
    const statusRaw = req.body?.status;
    const status =
      typeof statusRaw === 'string' &&
      (allowedInitialStatuses as readonly string[]).includes(statusRaw)
        ? (statusRaw as (typeof allowedInitialStatuses)[number])
        : undefined;

    const message = await saveOrCreateManualDraft({
      campaignInfluencerId,
      channel: channelRaw as OutreachChannel,
      subject:
        req.body?.subject !== undefined
          ? req.body.subject === null
            ? null
            : String(req.body.subject)
          : undefined,
      messageBody,
      collaborationType:
        typeof req.body?.collaborationType === 'string' ? req.body.collaborationType : undefined,
      status,
    });
    res.status(201).json({ message });
  } catch (err) {
    next(err);
  }
});

messageRouter.post('/messages/generate-followup', geminiRateLimiter, async (req, res, next) => {
  try {
    const campaignInfluencerId = req.body?.campaignInfluencerId;
    const allowedChannels: OutreachChannel[] = [
      'email',
      'instagram_dm',
      'linkedin_message',
      'youtube_contact',
    ];
    const channel: OutreachChannel =
      typeof req.body?.channel === 'string' &&
      allowedChannels.includes(req.body.channel as OutreachChannel)
        ? (req.body.channel as OutreachChannel)
        : 'email';

    if (!isValidUuid(campaignInfluencerId)) {
      throw new AppHttpError(
        400,
        'invalid_campaign_influencer_id',
        'Valid campaignInfluencerId is required.'
      );
    }
    const draft = await generateFollowUpDraft({
      campaignInfluencerId,
      channel,
      previousMessage:
        typeof req.body?.previousMessage === 'string' ? req.body.previousMessage : undefined,
    });
    res.status(201).json(draft);
  } catch (err) {
    next(err);
  }
});

messageRouter.post('/ai/content-ideas', geminiRateLimiter, async (req, res, next) => {
  try {
    const result = await generateContentIdeasWithAi({
      campaignName: String(req.body?.campaignName || 'GlowCare India Skincare Campaign'),
      brandName: String(req.body?.brandName || 'GlowCare'),
      niche: String(req.body?.niche || 'Beauty & Skincare'),
      productDescription:
        typeof req.body?.productDescription === 'string' ? req.body.productDescription : null,
      campaignBrief: typeof req.body?.campaignBrief === 'string' ? req.body.campaignBrief : null,
      collaborationType:
        typeof req.body?.collaborationType === 'string' ? req.body.collaborationType : null,
      creatorName: typeof req.body?.creatorName === 'string' ? req.body.creatorName : null,
      creatorThemes: Array.isArray(req.body?.creatorThemes)
        ? req.body.creatorThemes.filter((t: unknown): t is string => typeof t === 'string')
        : [],
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

messageRouter.post('/ai/campaign-suggestions', geminiRateLimiter, async (req, res, next) => {
  try {
    const result = await generateCampaignSuggestionsWithAi({
      campaignName: String(req.body?.campaignName || 'GlowCare India Skincare Campaign'),
      brandName: String(req.body?.brandName || 'GlowCare'),
      niche: String(req.body?.niche || 'Beauty & Skincare'),
      targetCountry: typeof req.body?.targetCountry === 'string' ? req.body.targetCountry : 'India',
      productDescription:
        typeof req.body?.productDescription === 'string' ? req.body.productDescription : null,
      collaborationType:
        typeof req.body?.collaborationType === 'string' ? req.body.collaborationType : null,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

messageRouter.patch('/messages/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      throw new AppHttpError(400, 'invalid_message_id', 'Invalid message ID.');
    }
    const allowedStatuses = ['draft', 'pending_review', 'approved', 'rejected', 'sent', 'failed'];
    const rawStatus = req.body?.status;
    const status =
      typeof rawStatus === 'string' && allowedStatuses.includes(rawStatus)
        ? (rawStatus as 'draft' | 'pending_review' | 'approved' | 'rejected' | 'sent' | 'failed')
        : undefined;

    const allowedWorkflowStatuses: UnifiedOutreachStatus[] = [
      'draft',
      'ready_for_review',
      'approved',
      'ready_for_manual_sending',
      'simulated',
      'sending',
      'sent',
      'failed',
      'skipped',
    ];
    const rawWorkflow = req.body?.workflowStatus;
    const workflowStatus =
      typeof rawWorkflow === 'string' &&
      allowedWorkflowStatuses.includes(rawWorkflow as UnifiedOutreachStatus)
        ? (rawWorkflow as UnifiedOutreachStatus)
        : undefined;

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
      reject: req.body?.reject === true,
      rejectedReason:
        typeof req.body?.rejectedReason === 'string' ? req.body.rejectedReason : undefined,
      status,
      workflowStatus,
    });
    res.json({ message });
  } catch (err) {
    next(err);
  }
});
