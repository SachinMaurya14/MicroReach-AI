import { Router } from 'express';
import { AppHttpError } from '../middleware/errorHandler.ts';
import { listAuditAndSystemOverview } from '../services/supabase/sharedWorkspace.service.ts';
import {
  computeWorkspaceReports,
  createContentIdea,
  createIncentive,
  createTask,
  deleteContentIdea,
  deleteIncentive,
  deleteTask,
  getWorkspaceSettings,
  listContentIdeas,
  listIncentives,
  listTasks,
  updateContentIdea,
  updateIncentive,
  updateTask,
  updateWorkspaceSettings,
} from '../services/workspace/workspaceModules.service.ts';
import { isValidUuid } from '../utils/validation.ts';

export const workspaceRouter = Router();

// --- Content Ideas ---

workspaceRouter.get('/content-ideas', async (req, res, next) => {
  try {
    const campaignId =
      typeof req.query.campaignId === 'string' && isValidUuid(req.query.campaignId)
        ? req.query.campaignId
        : undefined;
    const data = await listContentIdeas(campaignId);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

workspaceRouter.post('/content-ideas', async (req, res, next) => {
  try {
    const idea = await createContentIdea({
      campaignId: isValidUuid(req.body?.campaignId) ? req.body.campaignId : null,
      influencerId: isValidUuid(req.body?.influencerId) ? req.body.influencerId : null,
      title: String(req.body?.title || ''),
      format: typeof req.body?.format === 'string' ? req.body.format : undefined,
      angle: String(req.body?.angle || ''),
      contentThemes: Array.isArray(req.body?.contentThemes)
        ? req.body.contentThemes.filter((t: unknown): t is string => typeof t === 'string')
        : [],
      aiModel: typeof req.body?.aiModel === 'string' ? req.body.aiModel : null,
      source: typeof req.body?.source === 'string' ? req.body.source : 'manual',
      status:
        req.body?.status === 'approved' || req.body?.status === 'archived'
          ? req.body.status
          : 'draft',
    });
    res.status(201).json({ item: idea });
  } catch (err) {
    next(err);
  }
});

workspaceRouter.patch('/content-ideas/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      throw new AppHttpError(400, 'invalid_idea_id', 'Invalid content idea ID.');
    }
    const item = await updateContentIdea(id, {
      title: typeof req.body?.title === 'string' ? req.body.title : undefined,
      format: typeof req.body?.format === 'string' ? req.body.format : undefined,
      angle: typeof req.body?.angle === 'string' ? req.body.angle : undefined,
      contentThemes: Array.isArray(req.body?.contentThemes)
        ? req.body.contentThemes.filter((t: unknown): t is string => typeof t === 'string')
        : undefined,
      status: req.body?.status,
    });
    res.json({ item });
  } catch (err) {
    next(err);
  }
});

workspaceRouter.delete('/content-ideas/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      throw new AppHttpError(400, 'invalid_idea_id', 'Invalid content idea ID.');
    }
    await deleteContentIdea(id);
    res.json({ deleted: true, id });
  } catch (err) {
    next(err);
  }
});

// --- Creator Incentives ---

workspaceRouter.get('/incentives', async (req, res, next) => {
  try {
    const campaignId =
      typeof req.query.campaignId === 'string' && isValidUuid(req.query.campaignId)
        ? req.query.campaignId
        : undefined;
    const data = await listIncentives(campaignId);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

workspaceRouter.post('/incentives', async (req, res, next) => {
  try {
    const item = await createIncentive({
      campaignId: isValidUuid(req.body?.campaignId) ? req.body.campaignId : null,
      influencerId: isValidUuid(req.body?.influencerId) ? req.body.influencerId : null,
      outreachLogId: isValidUuid(req.body?.outreachLogId) ? req.body.outreachLogId : null,
      compensationType: String(req.body?.compensationType || ''),
      amount:
        req.body?.amount !== undefined && req.body?.amount !== null && req.body?.amount !== ''
          ? Number(req.body.amount)
          : null,
      currency: typeof req.body?.currency === 'string' ? req.body.currency : 'INR',
      commissionPercent:
        req.body?.commissionPercent !== undefined &&
        req.body?.commissionPercent !== null &&
        req.body?.commissionPercent !== ''
          ? Number(req.body.commissionPercent)
          : null,
      deliverables: typeof req.body?.deliverables === 'string' ? req.body.deliverables : null,
      status: req.body?.status,
      notes: typeof req.body?.notes === 'string' ? req.body.notes : null,
    });
    res.status(201).json({ item });
  } catch (err) {
    next(err);
  }
});

workspaceRouter.patch('/incentives/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      throw new AppHttpError(400, 'invalid_incentive_id', 'Invalid incentive ID.');
    }
    const item = await updateIncentive(id, {
      compensationType:
        typeof req.body?.compensationType === 'string' ? req.body.compensationType : undefined,
      amount:
        req.body?.amount !== undefined
          ? req.body.amount === null || req.body.amount === ''
            ? null
            : Number(req.body.amount)
          : undefined,
      currency: typeof req.body?.currency === 'string' ? req.body.currency : undefined,
      commissionPercent:
        req.body?.commissionPercent !== undefined
          ? req.body.commissionPercent === null || req.body.commissionPercent === ''
            ? null
            : Number(req.body.commissionPercent)
          : undefined,
      deliverables:
        req.body?.deliverables !== undefined ? req.body.deliverables : undefined,
      status: req.body?.status,
      notes: req.body?.notes !== undefined ? req.body.notes : undefined,
      outreachLogId: isValidUuid(req.body?.outreachLogId) ? req.body.outreachLogId : undefined,
    });
    res.json({ item });
  } catch (err) {
    next(err);
  }
});

workspaceRouter.delete('/incentives/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      throw new AppHttpError(400, 'invalid_incentive_id', 'Invalid incentive ID.');
    }
    await deleteIncentive(id);
    res.json({ deleted: true, id });
  } catch (err) {
    next(err);
  }
});

// --- Workspace Tasks ---

workspaceRouter.get('/tasks', async (req, res, next) => {
  try {
    const campaignId =
      typeof req.query.campaignId === 'string' && isValidUuid(req.query.campaignId)
        ? req.query.campaignId
        : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const data = await listTasks({ campaignId, status });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

workspaceRouter.post('/tasks', async (req, res, next) => {
  try {
    const item = await createTask({
      campaignId: isValidUuid(req.body?.campaignId) ? req.body.campaignId : null,
      influencerId: isValidUuid(req.body?.influencerId) ? req.body.influencerId : null,
      outreachMessageId: isValidUuid(req.body?.outreachMessageId)
        ? req.body.outreachMessageId
        : null,
      title: String(req.body?.title || ''),
      description: typeof req.body?.description === 'string' ? req.body.description : null,
      priority: req.body?.priority,
      status: req.body?.status,
      dueDate: typeof req.body?.dueDate === 'string' ? req.body.dueDate : null,
    });
    res.status(201).json({ item });
  } catch (err) {
    next(err);
  }
});

workspaceRouter.patch('/tasks/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      throw new AppHttpError(400, 'invalid_task_id', 'Invalid task ID.');
    }
    const item = await updateTask(id, {
      title: typeof req.body?.title === 'string' ? req.body.title : undefined,
      description: req.body?.description !== undefined ? req.body.description : undefined,
      priority: req.body?.priority,
      status: req.body?.status,
      dueDate: req.body?.dueDate !== undefined ? req.body.dueDate : undefined,
    });
    res.json({ item });
  } catch (err) {
    next(err);
  }
});

workspaceRouter.delete('/tasks/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      throw new AppHttpError(400, 'invalid_task_id', 'Invalid task ID.');
    }
    await deleteTask(id);
    res.json({ deleted: true, id });
  } catch (err) {
    next(err);
  }
});

// --- Workspace Settings ---

workspaceRouter.get('/settings', async (_req, res, next) => {
  try {
    const data = await getWorkspaceSettings();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

workspaceRouter.put('/settings', async (req, res, next) => {
  try {
    const settings = await updateWorkspaceSettings({
      default_niche:
        typeof req.body?.default_niche === 'string' ? req.body.default_niche : undefined,
      default_country:
        typeof req.body?.default_country === 'string' ? req.body.default_country : undefined,
      default_min_followers: req.body?.default_min_followers,
      default_max_followers: req.body?.default_max_followers,
      default_min_engagement: req.body?.default_min_engagement,
      default_collaboration_type:
        typeof req.body?.default_collaboration_type === 'string'
          ? req.body.default_collaboration_type
          : undefined,
      require_manual_review_before_send:
        typeof req.body?.require_manual_review_before_send === 'boolean'
          ? req.body.require_manual_review_before_send
          : undefined,
    });
    res.json({ settings });
  } catch (err) {
    next(err);
  }
});

// --- Reports & Administration Overview ---

workspaceRouter.get('/reports', async (req, res, next) => {
  try {
    const campaignId =
      typeof req.query.campaignId === 'string' && isValidUuid(req.query.campaignId)
        ? req.query.campaignId
        : undefined;
    const fromDate =
      typeof req.query.fromDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.fromDate)
        ? req.query.fromDate
        : undefined;
    const toDate =
      typeof req.query.toDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.toDate)
        ? req.query.toDate
        : undefined;
    const report = await computeWorkspaceReports({ campaignId, fromDate, toDate });
    res.json(report);
  } catch (err) {
    next(err);
  }
});

workspaceRouter.get('/admin/overview', async (_req, res, next) => {
  try {
    const overview = await listAuditAndSystemOverview();
    res.json(overview);
  } catch (err) {
    next(err);
  }
});
