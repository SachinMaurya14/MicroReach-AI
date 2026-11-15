import crypto from 'node:crypto';
import { getServerConfig } from '../../config/env.ts';
import { getSupabaseAdmin } from '../../lib/supabaseAdmin.ts';
import { AppHttpError } from '../../middleware/errorHandler.ts';
import type { Database, OutreachChannel } from '../../../src/types/database.ts';
import { isValidEmail } from '../../utils/validation.ts';
import { getGmailConnectionStatus, sendEmailViaGmailApi } from '../gmail/gmailOAuth.service.ts';
import { recordAuditLog } from '../supabase/sharedWorkspace.service.ts';
import {
  buildCreatorContactChannels,
  createDeterministicUuid,
  isChannelConstraintError,
  loadMultiChannelFallbackLogs,
  loadMultiChannelFallbackMessages,
  saveMultiChannelFallbackLog,
  saveMultiChannelFallbackMessage,
} from './multiChannel.service.ts';

type OutreachLogRow = Database['public']['Tables']['outreach_logs']['Row'];
type SuppressionRow = Database['public']['Tables']['outreach_suppressions']['Row'];

const MAX_LIVE_EMAILS_PER_CAMPAIGN_PER_DAY = 5;

export interface OutreachActionResult {
  mode: 'simulation' | 'live' | 'manual';
  status:
    | 'simulated'
    | 'sent'
    | 'manual'
    | 'ready_for_manual_sending'
    | 'manually_sent'
    | 'skipped'
    | 'failed';
  message: string;
  log: OutreachLogRow;
}

export type ManualInstagramDmStage =
  | 'ready_for_manual_sending'
  | 'manually_sent'
  | 'failed'
  | 'skipped';

export function checkEmailEligibility(input: {
  contactEmail?: string | null;
  emailStatus?: string | null;
  qualificationStatus?: string | null;
  requireVerifiedForLive?: boolean;
}): { eligible: boolean; reason: string | null } {
  const email = (input.contactEmail ?? '').trim();
  if (!email || email.toLowerCase() === 'not found' || input.emailStatus === 'not_found' || !isValidEmail(email)) {
    return {
      eligible: false,
      reason: 'Creator has no valid public email ("Not Found"). Enrich profile or use Manual Instagram DM instead.',
    };
  }
  if (input.requireVerifiedForLive) {
    if (input.qualificationStatus && input.qualificationStatus !== 'qualified') {
      return {
        eligible: false,
        reason: 'Live email sending is permitted only for Qualified creators.',
      };
    }
    if (input.emailStatus !== 'verified') {
      return {
        eligible: false,
        reason: 'Publicly extracted email must be confirmed as verified before live sending.',
      };
    }
  }
  return { eligible: true, reason: null };
}

export function deterministicKey(parts: string[]): string {
  return crypto
    .createHash('sha256')
    .update(parts.join(':'))
    .digest('hex')
    .slice(0, 32);
}

async function resolveOutreachBundle(params: {
  campaignInfluencerId: string;
  outreachMessageId?: string;
  channel: OutreachChannel;
}) {
  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new AppHttpError(503, 'supabase_not_configured', 'Supabase backend not configured.');
  }

  const { data: link, error: linkErr } = await admin
    .from('campaign_influencers')
    .select('*')
    .eq('id', params.campaignInfluencerId)
    .single();

  if (linkErr || !link) {
    throw new AppHttpError(
      404,
      'campaign_influencer_not_found',
      'Campaign creator link not found.'
    );
  }

  const { data: inf, error: infErr } = await admin
    .from('influencers')
    .select('*')
    .eq('id', link.influencer_id)
    .single();

  if (infErr || !inf) {
    throw new AppHttpError(404, 'influencer_not_found', 'Creator profile not found.');
  }

  let messageRow: Database['public']['Tables']['outreach_messages']['Row'] | null = null;
  if (params.outreachMessageId) {
    const { data: msg } = await admin
      .from('outreach_messages')
      .select('*')
      .eq('id', params.outreachMessageId)
      .eq('campaign_influencer_id', link.id)
      .single();
    messageRow = msg ?? null;
    if (!messageRow) {
      const fb = await loadMultiChannelFallbackMessages({ messageId: params.outreachMessageId });
      messageRow =
        fb.find((m) => m.id === params.outreachMessageId && m.campaign_influencer_id === link.id) ??
        null;
    }
  } else {
    const { data: msgs } = await admin
      .from('outreach_messages')
      .select('*')
      .eq('campaign_influencer_id', link.id)
      .eq('channel', params.channel)
      .order('updated_at', { ascending: false })
      .limit(1);
    messageRow = msgs?.[0] ?? null;
    if (!messageRow) {
      const fb = await loadMultiChannelFallbackMessages({ campaignInfluencerIds: [link.id] });
      messageRow =
        fb.find((m) => m.campaign_influencer_id === link.id && m.channel === params.channel) ??
        null;
    }
  }

  return { admin, link, inf, messageRow };
}

async function insertOutreachLogSafe(
  payload: Database['public']['Tables']['outreach_logs']['Insert']
): Promise<OutreachLogRow> {
  const admin = getSupabaseAdmin()!;
  const { data, error } = await admin
    .from('outreach_logs')
    .insert(payload)
    .select()
    .single();

  if (!error && data) return data;

  if (error?.code === '23505') {
    throw new AppHttpError(
      409,
      'duplicate_outreach_prevented',
      'This outreach action was already claimed or logged.'
    );
  }

  const basePayload: Database['public']['Tables']['outreach_logs']['Insert'] = {
    outreach_message_id: payload.outreach_message_id ?? null,
    campaign_influencer_id: payload.campaign_influencer_id,
    channel: payload.channel,
    action: payload.action,
    status: payload.status === 'queued' || payload.status === 'uncertain' ? 'failed' : payload.status,
    provider_message_id: payload.provider_message_id ?? null,
    error_message: payload.error_message ?? null,
  };

  const { data: fallback, error: fbErr } = await admin
    .from('outreach_logs')
    .insert(basePayload)
    .select()
    .single();

  if (!fbErr && fallback) return fallback;

  if (isChannelConstraintError(fbErr) || isChannelConstraintError(error)) {
    const fallbackLog: OutreachLogRow = {
      id: createDeterministicUuid(),
      outreach_message_id: payload.outreach_message_id ?? null,
      campaign_influencer_id: payload.campaign_influencer_id,
      campaign_id: payload.campaign_id ?? null,
      channel: payload.channel,
      action: payload.action,
      status: payload.status,
      provider_message_id: payload.provider_message_id ?? null,
      error_message: payload.error_message ?? null,
      idempotency_key: payload.idempotency_key ?? null,
      recipient: payload.recipient ?? null,
      message_snapshot: payload.message_snapshot ?? null,
      sending_method: payload.sending_method ?? null,
      recipient_url: payload.recipient_url ?? null,
      created_at: new Date().toISOString(),
    };
    return saveMultiChannelFallbackLog(fallbackLog);
  }

  throw new AppHttpError(500, 'outreach_log_failed', fbErr?.message || 'Unable to log outreach.');
}

async function assertNotSuppressed(recipientEmail: string): Promise<void> {
  const admin = getSupabaseAdmin()!;
  const { data: suppressed, error } = await admin
    .from('outreach_suppressions')
    .select('id')
    .ilike('email', recipientEmail)
    .limit(1);

  if (!error && suppressed && suppressed.length > 0) {
    throw new AppHttpError(
      403,
      'recipient_suppressed',
      'Recipient has opted out or is on the outreach suppression list.'
    );
  }
}

export async function simulateEmailOutreach(input: {
  campaignInfluencerId: string;
  outreachMessageId?: string;
  editedSubject?: string;
  editedBody?: string;
  idempotencyKey?: string;
}): Promise<OutreachActionResult> {
  const { admin, link, inf, messageRow } = await resolveOutreachBundle({
    campaignInfluencerId: input.campaignInfluencerId,
    outreachMessageId: input.outreachMessageId,
    channel: 'email',
  });

  const nowIso = new Date().toISOString();
  const emailCheck = checkEmailEligibility({
    contactEmail: inf.contact_email,
    emailStatus: inf.email_status,
    requireVerifiedForLive: false,
  });
  if (!emailCheck.eligible) {
    throw new AppHttpError(
      400,
      'email_not_found',
      emailCheck.reason || 'Creator does not have a valid contact email for email outreach.'
    );
  }

  const recipient = inf.contact_email!.trim().toLowerCase();
  const subject =
    input.editedSubject?.trim() ||
    messageRow?.subject ||
    `GlowCare India Collaboration — ${inf.name}`;
  const bodyText = input.editedBody?.trim() || messageRow?.message_body || '';

  if (!bodyText) {
    throw new AppHttpError(
      400,
      'missing_message_body',
      'Generate or enter an email pitch before simulating outreach.'
    );
  }

  let activeMessageId = messageRow?.id ?? null;
  if (activeMessageId) {
    await admin
      .from('outreach_messages')
      .update({
        subject,
        message_body: bodyText,
        status: 'approved',
        approved_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', activeMessageId);
  } else {
    const { data: created } = await admin
      .from('outreach_messages')
      .insert({
        campaign_influencer_id: link.id,
        channel: 'email',
        subject,
        message_body: bodyText,
        word_count: bodyText.split(/\s+/).length,
        status: 'approved',
        approved_at: nowIso,
      })
      .select('id')
      .single();
    activeMessageId = created?.id ?? null;
  }

  // Deterministic content-based idempotency prevents double-click race conditions
  const key =
    input.idempotencyKey?.trim() ||
    `sim-${deterministicKey([link.id, activeMessageId ?? 'new', subject, bodyText])}`;

  const { data: existingSim } = await admin
    .from('outreach_logs')
    .select('*')
    .eq('campaign_influencer_id', link.id)
    .eq('channel', 'email')
    .eq('idempotency_key', key)
    .limit(1);

  if (existingSim?.[0]) {
    return {
      mode: 'simulation',
      status: 'simulated',
      message: `Simulation already logged for ${inf.name} (${recipient}). No real email was sent.`,
      log: existingSim[0],
    };
  }

  const log = await insertOutreachLogSafe({
    outreach_message_id: activeMessageId,
    campaign_influencer_id: link.id,
    campaign_id: link.campaign_id,
    channel: 'email',
    action: 'simulate_approve_queue',
    status: 'simulated',
    provider_message_id: null,
    idempotency_key: key,
    recipient,
    message_snapshot: `Subject: ${subject}\n\n${bodyText}`,
  });

  await recordAuditLog('simulate_email_outreach', 'campaign_influencer', link.id, {
    recipient,
    outreachMessageId: activeMessageId,
    idempotencyKey: key,
  });

  return {
    mode: 'simulation',
    status: 'simulated',
    message: `Simulation logged for ${inf.name} (${recipient}). No real email was sent.`,
    log,
  };
}

export async function sendLiveEmailOutreach(input: {
  campaignInfluencerId: string;
  outreachMessageId: string;
  confirmSend: boolean;
  idempotencyKey?: string;
}): Promise<OutreachActionResult> {
  const cfg = getServerConfig();
  if (cfg.outreachMode !== 'live') {
    throw new AppHttpError(
      409,
      'live_outreach_disabled',
      'Live email sending is disabled while OUTREACH_MODE=simulation. Use simulation or enable live Gmail mode after OAuth setup.'
    );
  }

  const gmailStatus = await getGmailConnectionStatus();
  if (!gmailStatus.connected) {
    throw new AppHttpError(503, 'gmail_not_connected', 'Gmail not connected.');
  }

  if (!input.confirmSend) {
    throw new AppHttpError(
      400,
      'explicit_confirmation_required',
      'Live email sending requires explicit final confirmation.'
    );
  }

  const { admin, link, inf, messageRow } = await resolveOutreachBundle({
    campaignInfluencerId: input.campaignInfluencerId,
    outreachMessageId: input.outreachMessageId,
    channel: 'email',
  });

  // 1. Qualified creators only
  if (link.qualification_status !== 'qualified') {
    throw new AppHttpError(
      403,
      'creator_not_qualified',
      'Live email sending is permitted only for Qualified creators.'
    );
  }

  // 2. Verified contact email strictly required (reject Not Found and unverified addresses)
  if (!isValidEmail(inf.contact_email) || inf.email_status === 'not_found') {
    throw new AppHttpError(
      400,
      'verified_email_required',
      'A valid contact email is required before sending.'
    );
  }
  if (inf.email_status !== 'verified') {
    throw new AppHttpError(
      400,
      'email_verification_required',
      'Publicly extracted email must be confirmed as verified in Manual Review before live sending.'
    );
  }

  const recipientEmail = inf.contact_email.trim().toLowerCase();

  // 3. Explicit message approval required
  if (!messageRow || !messageRow.approved_at || messageRow.status === 'rejected') {
    throw new AppHttpError(
      400,
      'approval_required',
      'Outreach message must be explicitly approved before live sending.'
    );
  }

  // 4. Suppression / opt-out check
  await assertNotSuppressed(recipientEmail);

  const subject = messageRow.subject || `Collaboration with GlowCare India`;
  const snapshot = `Subject: ${subject}\n\n${messageRow.message_body}`;
  const idempotencyKey =
    input.idempotencyKey?.trim() ||
    `live-${deterministicKey([link.id, messageRow.id, recipientEmail])}`;

  // 5. Atomic database claim BEFORE calling Gmail API (prevents concurrent race duplicates & daily cap overflow)
  let claimedLogId: string | null = null;
  const { data: claimData, error: claimErr } = await admin.rpc(
    'claim_live_email_outreach',
    {
      p_campaign_influencer_id: link.id,
      p_campaign_id: link.campaign_id,
      p_outreach_message_id: messageRow.id,
      p_idempotency_key: idempotencyKey,
      p_recipient: recipientEmail,
      p_message_snapshot: snapshot,
      p_daily_cap: MAX_LIVE_EMAILS_PER_CAMPAIGN_PER_DAY,
    }
  );

  if (!claimErr && Array.isArray(claimData) && claimData[0]) {
    const claimRow = claimData[0];
    if (!claimRow.claimed) {
      if (claimRow.conflict_code === 'recipient_suppressed') {
        throw new AppHttpError(
          403,
          'recipient_suppressed',
          'Recipient is on the outreach suppression list.'
        );
      }
      if (claimRow.conflict_code === 'daily_campaign_send_cap_reached') {
        throw new AppHttpError(
          429,
          'daily_campaign_send_cap_reached',
          `Daily demo safety limit reached (${MAX_LIVE_EMAILS_PER_CAMPAIGN_PER_DAY} live emails per campaign per day).`
        );
      }
      throw new AppHttpError(
        409,
        'duplicate_send_prevented',
        'A live email has already been claimed or sent for this creator in this campaign.'
      );
    }
    claimedLogId = claimRow.log_id;
  } else {
    // Defense-in-depth fallback if migration 002 RPC is not yet applied
    const { data: priorSent } = await admin
      .from('outreach_logs')
      .select('id, status')
      .eq('campaign_influencer_id', link.id)
      .eq('channel', 'email')
      .in('status', ['queued', 'sent', 'delivered', 'uncertain'])
      .limit(1);

    if (priorSent && priorSent.length > 0) {
      throw new AppHttpError(
        409,
        'duplicate_send_prevented',
        'A live email has already been sent or claimed for this creator in this campaign.'
      );
    }

    const utcDayStart = new Date();
    utcDayStart.setUTCHours(0, 0, 0, 0);
    const { data: campaignLinks } = await admin
      .from('campaign_influencers')
      .select('id')
      .eq('campaign_id', link.campaign_id);
    const campaignLinkIds = (campaignLinks ?? []).map((l) => l.id);

    if (campaignLinkIds.length > 0) {
      const { count } = await admin
        .from('outreach_logs')
        .select('id', { count: 'exact', head: true })
        .in('campaign_influencer_id', campaignLinkIds)
        .eq('channel', 'email')
        .in('status', ['queued', 'sent', 'delivered', 'uncertain'])
        .gte('created_at', utcDayStart.toISOString());

      if ((count ?? 0) >= MAX_LIVE_EMAILS_PER_CAMPAIGN_PER_DAY) {
        throw new AppHttpError(
          429,
          'daily_campaign_send_cap_reached',
          `Daily demo safety limit reached (${MAX_LIVE_EMAILS_PER_CAMPAIGN_PER_DAY} live emails per campaign per day).`
        );
      }
    }

    const preClaimLog = await insertOutreachLogSafe({
      outreach_message_id: messageRow.id,
      campaign_influencer_id: link.id,
      campaign_id: link.campaign_id,
      channel: 'email',
      action: 'send_gmail_live_claim',
      status: 'queued',
      idempotency_key: idempotencyKey,
      recipient: recipientEmail,
      message_snapshot: snapshot,
    });
    claimedLogId = preClaimLog.id;
  }

  // 6. Execute Gmail API send; reconcile uncertain outcomes without blind retry
  try {
    const sent = await sendEmailViaGmailApi({
      to: recipientEmail,
      subject,
      body: messageRow.message_body,
    });

    const nowIso = new Date().toISOString();
    await admin
      .from('outreach_messages')
      .update({
        status: 'sent',
        confirmed_at: nowIso,
        sent_at: nowIso,
        idempotency_key: idempotencyKey,
        recipient_email: recipientEmail,
        updated_at: nowIso,
      })
      .eq('id', messageRow.id);

    const { data: updatedLog, error: updateLogErr } = await admin
      .from('outreach_logs')
      .update({
        action: 'send_gmail_live',
        status: 'sent',
        provider_message_id: sent.providerMessageId,
      })
      .eq('id', claimedLogId!)
      .select()
      .single();

    const finalLog =
      !updateLogErr && updatedLog
        ? updatedLog
        : await insertOutreachLogSafe({
            outreach_message_id: messageRow.id,
            campaign_influencer_id: link.id,
            campaign_id: link.campaign_id,
            channel: 'email',
            action: 'send_gmail_live',
            status: 'sent',
            provider_message_id: sent.providerMessageId,
            recipient: recipientEmail,
            message_snapshot: snapshot,
          });

    await recordAuditLog('send_live_gmail', 'campaign_influencer', link.id, {
      recipientEmail,
      providerMessageId: sent.providerMessageId,
    });

    return {
      mode: 'live',
      status: 'sent',
      message: `Email sent via Gmail (${sent.senderEmail}) to ${recipientEmail}.`,
      log: finalLog,
    };
  } catch (err) {
    const isDefinitePreSendAuthFailure =
      err instanceof AppHttpError &&
      (err.code === 'gmail_reauth_required' ||
        err.code === 'gmail_not_connected' ||
        err.code === 'gmail_oauth_not_configured');

    const errorMsg = err instanceof Error ? err.message : 'Uncertain Gmail delivery outcome.';
    const reconciledStatus = isDefinitePreSendAuthFailure ? 'failed' : 'uncertain';
    const reconciledAction = isDefinitePreSendAuthFailure
      ? 'send_gmail_live_failed'
      : 'send_gmail_live_uncertain';

    if (claimedLogId) {
      const { error: recErr } = await admin
        .from('outreach_logs')
        .update({
          action: reconciledAction,
          status: reconciledStatus,
          error_message: isDefinitePreSendAuthFailure
            ? errorMsg
            : `${errorMsg} (Uncertain Gmail outcome — manual check required before retrying)`,
        })
        .eq('id', claimedLogId);

      if (recErr && reconciledStatus === 'uncertain') {
        await admin
          .from('outreach_logs')
          .update({
            action: reconciledAction,
            status: 'failed',
            error_message: `${errorMsg} (Uncertain Gmail outcome — manual check required before retrying)`,
          })
          .eq('id', claimedLogId);
      }
    }

    throw err;
  }
}

export type ManualChannelType = 'instagram_dm' | 'linkedin_message' | 'youtube_contact';

export async function logManualMultiChannelOutreach(input: {
  campaignInfluencerId: string;
  channel: ManualChannelType;
  outreachMessageId?: string;
  messageText: string;
  subject?: string | null;
  stage?: ManualInstagramDmStage;
}): Promise<OutreachActionResult> {
  const { admin, link, inf, messageRow } = await resolveOutreachBundle({
    campaignInfluencerId: input.campaignInfluencerId,
    outreachMessageId: input.outreachMessageId,
    channel: input.channel,
  });

  const stage: ManualInstagramDmStage = input.stage ?? 'ready_for_manual_sending';
  const nowIso = new Date().toISOString();
  const trimmedText = input.messageText.trim();
  const contactChannels = buildCreatorContactChannels(inf);

  const channelLabel =
    input.channel === 'linkedin_message'
      ? 'LinkedIn Message'
      : input.channel === 'youtube_contact'
        ? 'YouTube Contact Outreach'
        : 'Instagram DM';

  const recipientContact =
    input.channel === 'linkedin_message'
      ? contactChannels.find((c) => c.type === 'linkedin')?.value ?? null
      : input.channel === 'instagram_dm'
        ? contactChannels.find((c) => c.type === 'instagram')?.value ?? inf.username ?? null
        : contactChannels.find((c) => c.type === 'email')?.value ??
          contactChannels.find((c) => c.type === 'other_contact')?.value ??
          inf.profile_url;

  const recipientUrl =
    input.channel === 'linkedin_message'
      ? contactChannels.find((c) => c.type === 'linkedin')?.url ?? null
      : input.channel === 'instagram_dm'
        ? contactChannels.find((c) => c.type === 'instagram')?.url ?? inf.profile_url
        : contactChannels.find((c) => c.type === 'other_contact')?.url ?? inf.profile_url;

  if (input.channel === 'linkedin_message' && !recipientUrl) {
    throw new AppHttpError(
      400,
      'linkedin_profile_unavailable',
      'Cannot mark LinkedIn outreach without an explicitly linked or confirmed LinkedIn profile URL.'
    );
  }
  if (input.channel === 'instagram_dm' && !recipientUrl) {
    throw new AppHttpError(
      400,
      'instagram_profile_unavailable',
      'Cannot mark Instagram DM outreach without a linked Instagram profile.'
    );
  }

  // Strict duplicate outreach prevention for manually_sent on the same creator + campaign + channel
  if (stage === 'manually_sent') {
    const [{ data: existingNativeLogs }, fbLogs] = await Promise.all([
      admin
        .from('outreach_logs')
        .select('*')
        .eq('campaign_influencer_id', link.id)
        .eq('channel', input.channel)
        .order('created_at', { ascending: false }),
      loadMultiChannelFallbackLogs([link.id]),
    ]);
    const priorSent = [...(existingNativeLogs ?? []), ...fbLogs].find(
      (l) =>
        l.campaign_influencer_id === link.id &&
        l.channel === input.channel &&
        (l.status === 'sent' ||
          l.status === 'delivered' ||
          l.action.endsWith('_sent') ||
          l.action === 'manual_dm_sent')
    );

    if (priorSent) {
      throw new AppHttpError(
        409,
        'duplicate_outreach_prevented',
        `${channelLabel} has already been sent for ${inf.name} in this campaign.`
      );
    }
  }

  let msgId = messageRow?.id ?? null;
  const messageStatus: Database['public']['Tables']['outreach_messages']['Row']['status'] =
    stage === 'manually_sent'
      ? 'sent'
      : stage === 'skipped'
        ? 'rejected'
        : stage === 'failed'
          ? 'failed'
          : 'approved';

  const workflowStatus =
    stage === 'manually_sent'
      ? ('sent' as const)
      : stage === 'skipped'
        ? ('skipped' as const)
        : stage === 'failed'
          ? ('failed' as const)
          : ('ready_for_manual_sending' as const);

  if (msgId) {
    const updatePayload: Database['public']['Tables']['outreach_messages']['Update'] = {
      message_body: trimmedText,
      subject: input.subject ?? messageRow?.subject ?? null,
      word_count: trimmedText.split(/\s+/).filter(Boolean).length,
      status: messageStatus,
      workflow_status: workflowStatus,
      sending_method: 'manual',
      recipient_url: recipientUrl,
      approved_at:
        stage === 'ready_for_manual_sending' || stage === 'manually_sent' ? nowIso : null,
      confirmed_at: stage === 'manually_sent' ? nowIso : null,
      sent_at: stage === 'manually_sent' ? nowIso : null,
      updated_at: nowIso,
    };

    const { data: updRows, error: updErr } = await admin
      .from('outreach_messages')
      .update(updatePayload)
      .eq('id', msgId)
      .select('id');

    let updatedNative = !updErr && Array.isArray(updRows) && updRows.length > 0;
    if (updErr && !isChannelConstraintError(updErr)) {
      const { data: baseRows, error: baseUpdErr } = await admin
        .from('outreach_messages')
        .update({
          message_body: trimmedText,
          status: messageStatus,
          approved_at:
            stage === 'ready_for_manual_sending' || stage === 'manually_sent' ? nowIso : null,
          updated_at: nowIso,
        })
        .eq('id', msgId)
        .select('id');
      updatedNative = !baseUpdErr && Array.isArray(baseRows) && baseRows.length > 0;
    }

    if (!updatedNative && messageRow) {
      await saveMultiChannelFallbackMessage({
        ...messageRow,
        ...updatePayload,
        id: msgId,
        subject: updatePayload.subject ?? messageRow.subject,
        message_body: trimmedText,
        word_count: updatePayload.word_count ?? messageRow.word_count,
        status: messageStatus,
        workflow_status: workflowStatus,
        sending_method: 'manual',
        recipient_url: recipientUrl,
        updated_at: nowIso,
      });
    }
  } else {
    const { data: created, error: createErr } = await admin
      .from('outreach_messages')
      .insert({
        campaign_influencer_id: link.id,
        channel: input.channel,
        subject: input.subject ?? null,
        message_body: trimmedText,
        word_count: trimmedText.split(/\s+/).filter(Boolean).length,
        status: messageStatus,
        workflow_status: workflowStatus,
        sending_method: 'manual',
        recipient_url: recipientUrl,
        approved_at:
          stage === 'ready_for_manual_sending' || stage === 'manually_sent' ? nowIso : null,
        confirmed_at: stage === 'manually_sent' ? nowIso : null,
        sent_at: stage === 'manually_sent' ? nowIso : null,
      })
      .select('id')
      .single();

    if (!createErr && created) {
      msgId = created.id;
    } else if (isChannelConstraintError(createErr)) {
      msgId = createDeterministicUuid();
      await saveMultiChannelFallbackMessage({
        id: msgId,
        campaign_influencer_id: link.id,
        channel: input.channel,
        subject: input.subject ?? null,
        message_body: trimmedText,
        ai_model: 'manual_operator_draft',
        word_count: trimmedText.split(/\s+/).filter(Boolean).length,
        status: messageStatus,
        workflow_status: workflowStatus,
        sending_method: 'manual',
        recipient_url: recipientUrl,
        approved_at:
          stage === 'ready_for_manual_sending' || stage === 'manually_sent' ? nowIso : null,
        confirmed_at: stage === 'manually_sent' ? nowIso : null,
        sent_at: stage === 'manually_sent' ? nowIso : null,
        created_at: nowIso,
        updated_at: nowIso,
      });
    }
  }

  const actionByStage: Record<ManualInstagramDmStage, string> = {
    ready_for_manual_sending: `manual_${input.channel}_ready`,
    manually_sent: `manual_${input.channel}_sent`,
    skipped: `manual_${input.channel}_skipped`,
    failed: `manual_${input.channel}_failed`,
  };

  const logStatus: Database['public']['Tables']['outreach_logs']['Row']['status'] =
    stage === 'failed' ? 'failed' : 'manual';

  const log = await insertOutreachLogSafe({
    outreach_message_id: msgId,
    campaign_influencer_id: link.id,
    campaign_id: link.campaign_id,
    channel: input.channel,
    action: actionByStage[stage],
    status: logStatus,
    sending_method: 'manual',
    recipient: recipientContact || inf.name,
    recipient_url: recipientUrl,
    message_snapshot: trimmedText,
    idempotency_key: `manual-${deterministicKey([link.id, input.channel, stage, trimmedText])}`,
  });

  await recordAuditLog(actionByStage[stage], 'campaign_influencer', link.id, {
    creator: inf.name,
    channel: input.channel,
    stage,
    messageId: msgId,
    recipientUrl,
  });

  const userMessages: Record<ManualInstagramDmStage, string> = {
    ready_for_manual_sending: `${channelLabel} approved and marked Ready for Manual Sending for ${inf.name}. Open profile, send manually, and confirm once sent.`,
    manually_sent: `${channelLabel} confirmed as Manually Sent to ${inf.name}.`,
    skipped: `${channelLabel} marked as Skipped for ${inf.name}.`,
    failed: `${channelLabel} marked as Failed for ${inf.name}.`,
  };

  return {
    mode: 'manual',
    status: stage,
    message: userMessages[stage],
    log,
  };
}

export async function logManualInstagramDm(input: {
  campaignInfluencerId: string;
  outreachMessageId?: string;
  dmText: string;
  stage?: ManualInstagramDmStage;
}): Promise<OutreachActionResult> {
  return logManualMultiChannelOutreach({
    campaignInfluencerId: input.campaignInfluencerId,
    channel: 'instagram_dm',
    outreachMessageId: input.outreachMessageId,
    messageText: input.dmText,
    stage: input.stage,
  });
}

export async function listOutreachLogs(
  campaignId?: string,
  limit = 50
): Promise<OutreachLogRow[]> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new AppHttpError(503, 'supabase_not_configured', 'Supabase backend not configured.');
  }

  if (campaignId) {
    const { data: links } = await admin
      .from('campaign_influencers')
      .select('id')
      .eq('campaign_id', campaignId);
    const linkIds = (links ?? []).map((l) => l.id);
    if (linkIds.length === 0) return [];

    const [{ data, error }, fbLogs] = await Promise.all([
      admin
        .from('outreach_logs')
        .select('*')
        .in('campaign_influencer_id', linkIds)
        .order('created_at', { ascending: false })
        .limit(limit),
      loadMultiChannelFallbackLogs(linkIds),
    ]);

    if (error) throw new AppHttpError(500, 'supabase_query_error', error.message);
    return [...(data ?? []), ...fbLogs]
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      .slice(0, limit);
  }

  const [{ data, error }, fbLogs] = await Promise.all([
    admin
      .from('outreach_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit),
    loadMultiChannelFallbackLogs(),
  ]);

  if (error) throw new AppHttpError(500, 'supabase_query_error', error.message);
  return [...(data ?? []), ...fbLogs]
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .slice(0, limit);
}

function escapeCsvCell(value: unknown): string {
  const str = String(value ?? '');
  const safeFormula = /^[=+\-@]/.test(str) ? `'${str}` : str;
  if (safeFormula.includes(',') || safeFormula.includes('"') || safeFormula.includes('\n')) {
    return `"${safeFormula.replace(/"/g, '""')}"`;
  }
  return safeFormula;
}

export function serializeOutreachLogsToCsv(logs: OutreachLogRow[]): string {
  const headers = [
    'Log ID',
    'Campaign ID',
    'Campaign Creator Link ID',
    'Channel',
    'Action',
    'Status',
    'Recipient',
    'Provider Message ID',
    'Error Message',
    'Idempotency Key',
    'Message Snapshot',
    'Created At',
  ];

  const rows = logs.map((l) => [
    l.id,
    l.campaign_id ?? '',
    l.campaign_influencer_id,
    l.channel,
    l.action,
    l.status,
    l.recipient ?? '',
    l.provider_message_id ?? '',
    l.error_message ?? '',
    l.idempotency_key ?? '',
    l.message_snapshot ?? '',
    l.created_at,
  ]);

  return [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((r) => r.map(escapeCsvCell).join(',')),
  ].join('\n');
}

export async function listSuppressions(limit = 100): Promise<SuppressionRow[]> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new AppHttpError(503, 'supabase_not_configured', 'Supabase backend not configured.');
  }
  const { data, error } = await admin
    .from('outreach_suppressions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new AppHttpError(500, 'supabase_query_error', error.message);
  return data ?? [];
}

export async function addSuppression(input: {
  email: string;
  reason?: string;
}): Promise<SuppressionRow> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new AppHttpError(503, 'supabase_not_configured', 'Supabase backend not configured.');
  }
  const cleaned = input.email.trim().toLowerCase();
  if (!isValidEmail(cleaned)) {
    throw new AppHttpError(400, 'invalid_email', 'A valid email address is required.');
  }
  const { data, error } = await admin
    .from('outreach_suppressions')
    .upsert(
      {
        email: cleaned,
        reason: input.reason?.trim().slice(0, 240) || 'Manual opt-out / suppression',
      },
      { onConflict: 'email' }
    )
    .select()
    .single();
  if (error || !data) {
    throw new AppHttpError(500, 'supabase_upsert_error', error?.message || 'Unable to add suppression.');
  }
  await recordAuditLog('add_outreach_suppression', 'outreach_suppression', data.id, {
    email: cleaned,
  });
  return data;
}

export async function removeSuppression(id: string): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new AppHttpError(503, 'supabase_not_configured', 'Supabase backend not configured.');
  }
  const { error } = await admin.from('outreach_suppressions').delete().eq('id', id);
  if (error) throw new AppHttpError(500, 'supabase_delete_error', error.message);
  await recordAuditLog('remove_outreach_suppression', 'outreach_suppression', id, {});
}
