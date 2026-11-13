import crypto from 'node:crypto';
import { getServerConfig } from '../../config/env.ts';
import { getSupabaseAdmin } from '../../lib/supabaseAdmin.ts';
import { AppHttpError } from '../../middleware/errorHandler.ts';
import type { Database } from '../../../src/types/database.ts';
import { isValidEmail } from '../../utils/validation.ts';
import { getGmailConnectionStatus, sendEmailViaGmailApi } from '../gmail/gmailOAuth.service.ts';
import { recordAuditLog } from '../supabase/sharedWorkspace.service.ts';

type OutreachLogRow = Database['public']['Tables']['outreach_logs']['Row'];

const MAX_LIVE_EMAILS_PER_CAMPAIGN_PER_DAY = 5;

export interface OutreachActionResult {
  mode: 'simulation' | 'live' | 'manual';
  status: 'simulated' | 'sent' | 'manual';
  message: string;
  log: OutreachLogRow;
}

async function resolveOutreachBundle(params: {
  campaignInfluencerId: string;
  outreachMessageId?: string;
  channel: 'email' | 'instagram_dm';
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
  } else {
    const { data: msgs } = await admin
      .from('outreach_messages')
      .select('*')
      .eq('campaign_influencer_id', link.id)
      .eq('channel', params.channel)
      .order('updated_at', { ascending: false })
      .limit(1);
    messageRow = msgs?.[0] ?? null;
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

  // Fallback without additive migration columns if 001 has not run yet
  const basePayload: Database['public']['Tables']['outreach_logs']['Insert'] = {
    outreach_message_id: payload.outreach_message_id ?? null,
    campaign_influencer_id: payload.campaign_influencer_id,
    channel: payload.channel,
    action: payload.action,
    status: payload.status,
    provider_message_id: payload.provider_message_id ?? null,
    error_message: payload.error_message ?? null,
  };

  const { data: fallback, error: fbErr } = await admin
    .from('outreach_logs')
    .insert(basePayload)
    .select()
    .single();

  if (fbErr || !fallback) {
    throw new AppHttpError(500, 'outreach_log_failed', fbErr?.message || 'Unable to log outreach.');
  }
  return fallback;
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
  const recipient = inf.contact_email || 'Not Found';
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

  const key = input.idempotencyKey || `sim-${link.id}-${Date.now()}`;
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

  // 2. Verified public email required
  if (inf.email_status !== 'verified' || !isValidEmail(inf.contact_email)) {
    throw new AppHttpError(
      400,
      'verified_email_required',
      'A publicly verified contact email is required for live sending.'
    );
  }

  const recipientEmail = inf.contact_email.trim().toLowerCase();

  // 3. Explicit message approval required
  if (!messageRow || !messageRow.approved_at) {
    throw new AppHttpError(
      400,
      'approval_required',
      'Outreach message must be explicitly approved before live sending.'
    );
  }

  // 4. Suppression / opt-out check
  try {
    const { data: suppressed } = await admin
      .from('outreach_suppressions')
      .select('id')
      .eq('email', recipientEmail)
      .limit(1);
    if (suppressed && suppressed.length > 0) {
      throw new AppHttpError(
        403,
        'recipient_suppressed',
        'Recipient has opted out or is on the outreach suppression list.'
      );
    }
  } catch (err) {
    if (err instanceof AppHttpError) throw err;
  }

  // 5. Duplicate-send prevention
  const { data: priorSent } = await admin
    .from('outreach_logs')
    .select('id, status')
    .eq('campaign_influencer_id', link.id)
    .eq('channel', 'email')
    .in('status', ['sent', 'delivered'])
    .limit(1);

  if (priorSent && priorSent.length > 0) {
    throw new AppHttpError(
      409,
      'duplicate_send_prevented',
      'A live email has already been sent to this creator for this campaign.'
    );
  }

  // 6. Enforce max 5 real emails per campaign per UTC day
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
      .in('status', ['sent', 'delivered'])
      .gte('created_at', utcDayStart.toISOString());

    if ((count ?? 0) >= MAX_LIVE_EMAILS_PER_CAMPAIGN_PER_DAY) {
      throw new AppHttpError(
        429,
        'daily_campaign_send_cap_reached',
        `Daily demo safety limit reached (${MAX_LIVE_EMAILS_PER_CAMPAIGN_PER_DAY} live emails per campaign per day).`
      );
    }
  }

  const idempotencyKey =
    input.idempotencyKey?.trim() ||
    crypto
      .createHash('sha256')
      .update(`${link.id}:${messageRow.id}:${recipientEmail}`)
      .digest('hex')
      .slice(0, 32);

  // Guard idempotency key
  const { data: existingIdem } = await admin
    .from('outreach_logs')
    .select('id')
    .eq('campaign_influencer_id', link.id)
    .eq('channel', 'email')
    .eq('idempotency_key', idempotencyKey)
    .limit(1);

  if (existingIdem && existingIdem.length > 0) {
    throw new AppHttpError(
      409,
      'idempotency_conflict',
      'This outreach send request was already processed.'
    );
  }

  // 7. Send via Gmail API (never blindly retry uncertain sends)
  const subject = messageRow.subject || `Collaboration with GlowCare India`;
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

    const log = await insertOutreachLogSafe({
      outreach_message_id: messageRow.id,
      campaign_influencer_id: link.id,
      campaign_id: link.campaign_id,
      channel: 'email',
      action: 'send_gmail_live',
      status: 'sent',
      provider_message_id: sent.providerMessageId,
      idempotency_key: idempotencyKey,
      recipient: recipientEmail,
      message_snapshot: `Subject: ${subject}\n\n${messageRow.message_body}`,
    });

    await recordAuditLog('send_live_gmail', 'campaign_influencer', link.id, {
      recipientEmail,
      providerMessageId: sent.providerMessageId,
    });

    return {
      mode: 'live',
      status: 'sent',
      message: `Email sent via Gmail (${sent.senderEmail}) to ${recipientEmail}.`,
      log,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Uncertain send failure.';
    await insertOutreachLogSafe({
      outreach_message_id: messageRow.id,
      campaign_influencer_id: link.id,
      campaign_id: link.campaign_id,
      channel: 'email',
      action: 'send_gmail_live_failed',
      status: 'failed',
      error_message: errorMsg,
      idempotency_key: idempotencyKey,
      recipient: recipientEmail,
    });
    throw err;
  }
}

export async function logManualInstagramDm(input: {
  campaignInfluencerId: string;
  outreachMessageId?: string;
  dmText: string;
}): Promise<OutreachActionResult> {
  const { admin, link, inf, messageRow } = await resolveOutreachBundle({
    campaignInfluencerId: input.campaignInfluencerId,
    outreachMessageId: input.outreachMessageId,
    channel: 'instagram_dm',
  });

  const nowIso = new Date().toISOString();
  let msgId = messageRow?.id ?? null;
  if (msgId) {
    await admin
      .from('outreach_messages')
      .update({
        message_body: input.dmText.trim(),
        status: 'sent',
        approved_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', msgId);
  }

  const log = await insertOutreachLogSafe({
    outreach_message_id: msgId,
    campaign_influencer_id: link.id,
    campaign_id: link.campaign_id,
    channel: 'instagram_dm',
    action: 'manual_instagram_dm_copied',
    status: 'manual',
    recipient: inf.username || inf.name,
    message_snapshot: input.dmText.trim(),
  });

  await recordAuditLog('manual_instagram_dm_log', 'campaign_influencer', link.id, {
    creator: inf.name,
  });

  return {
    mode: 'manual',
    status: 'manual',
    message: `Manual Instagram DM logged for ${inf.name}. Send directly from your Instagram app.`,
    log,
  };
}

export async function listOutreachLogs(campaignId?: string, limit = 50): Promise<OutreachLogRow[]> {
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

    const { data, error } = await admin
      .from('outreach_logs')
      .select('*')
      .in('campaign_influencer_id', linkIds)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new AppHttpError(500, 'supabase_query_error', error.message);
    return data ?? [];
  }

  const { data, error } = await admin
    .from('outreach_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new AppHttpError(500, 'supabase_query_error', error.message);
  return data ?? [];
}
