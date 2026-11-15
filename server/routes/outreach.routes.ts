import { Router } from 'express';
import { AppHttpError } from '../middleware/errorHandler.ts';
import {
  addSuppression,
  listOutreachLogs,
  listSuppressions,
  logManualInstagramDm,
  logManualMultiChannelOutreach,
  type ManualChannelType,
  removeSuppression,
  sendLiveEmailOutreach,
  serializeOutreachLogsToCsv,
  simulateEmailOutreach,
} from '../services/outreach/outreach.service.ts';
import { recordAuditLog } from '../services/supabase/sharedWorkspace.service.ts';
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

    const allowedStages = [
      'ready_for_manual_sending',
      'manually_sent',
      'failed',
      'skipped',
    ] as const;
    const rawStage = req.body?.stage;
    const stage =
      typeof rawStage === 'string' && (allowedStages as readonly string[]).includes(rawStage)
        ? (rawStage as (typeof allowedStages)[number])
        : 'ready_for_manual_sending';

    const result = await logManualInstagramDm({
      campaignInfluencerId,
      outreachMessageId: isValidUuid(req.body?.outreachMessageId)
        ? req.body.outreachMessageId
        : undefined,
      dmText,
      stage,
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

outreachRouter.post('/outreach/manual-channel', async (req, res, next) => {
  try {
    const campaignInfluencerId = req.body?.campaignInfluencerId;
    const messageText =
      typeof req.body?.messageText === 'string' ? req.body.messageText.trim() : '';
    const allowedChannels: ManualChannelType[] = [
      'instagram_dm',
      'linkedin_message',
      'youtube_contact',
    ];
    const rawChannel = req.body?.channel;

    if (
      !isValidUuid(campaignInfluencerId) ||
      !messageText ||
      typeof rawChannel !== 'string' ||
      !allowedChannels.includes(rawChannel as ManualChannelType)
    ) {
      throw new AppHttpError(
        400,
        'invalid_manual_outreach_request',
        'Valid campaignInfluencerId, channel (instagram_dm | linkedin_message | youtube_contact), and messageText are required.'
      );
    }

    const allowedStages = [
      'ready_for_manual_sending',
      'manually_sent',
      'failed',
      'skipped',
    ] as const;
    const rawStage = req.body?.stage;
    const stage =
      typeof rawStage === 'string' && (allowedStages as readonly string[]).includes(rawStage)
        ? (rawStage as (typeof allowedStages)[number])
        : 'ready_for_manual_sending';

    const result = await logManualMultiChannelOutreach({
      campaignInfluencerId,
      channel: rawChannel as ManualChannelType,
      outreachMessageId: isValidUuid(req.body?.outreachMessageId)
        ? req.body.outreachMessageId
        : undefined,
      messageText,
      subject:
        req.body?.subject !== undefined
          ? req.body.subject === null
            ? null
            : String(req.body.subject)
          : undefined,
      stage,
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

outreachRouter.get('/outreach/logs/export.csv', async (req, res, next) => {
  try {
    const campaignId =
      typeof req.query.campaignId === 'string' && isValidUuid(req.query.campaignId)
        ? req.query.campaignId
        : undefined;
    const logs = await listOutreachLogs(campaignId, 200);
    const csv = serializeOutreachLogsToCsv(logs);

    await recordAuditLog('export_outreach_logs_csv', 'outreach_log_export', null, {
      rowCount: logs.length,
      campaignId: campaignId ?? null,
    });

    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="microreach-outreach-logs-${stamp}.csv"`
    );
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

outreachRouter.get('/outreach/suppressions', async (_req, res, next) => {
  try {
    const suppressions = await listSuppressions();
    res.json({ suppressions });
  } catch (err) {
    next(err);
  }
});

outreachRouter.post('/outreach/suppressions', async (req, res, next) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email : '';
    const reason = typeof req.body?.reason === 'string' ? req.body.reason : undefined;
    const suppression = await addSuppression({ email, reason });
    res.status(201).json({ suppression });
  } catch (err) {
    next(err);
  }
});

outreachRouter.delete('/outreach/suppressions/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      throw new AppHttpError(400, 'invalid_suppression_id', 'Invalid suppression ID.');
    }
    await removeSuppression(id);
    res.json({ deleted: true, id });
  } catch (err) {
    next(err);
  }
});
