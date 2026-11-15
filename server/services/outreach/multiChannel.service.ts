import crypto from 'node:crypto';
import { getSupabaseAdmin } from '../../lib/supabaseAdmin.ts';
import type {
  ChannelAvailabilityItem,
  ContactChannelRecord,
  ContactChannelType,
  ContactVerificationStatus,
  Database,
  OutreachChannel,
  SendingMethod,
  UnifiedOutreachStatus,
} from '../../../src/types/database.ts';
import { clampString, isValidEmail } from '../../utils/validation.ts';

type InfluencerRow = Database['public']['Tables']['influencers']['Row'];
type OutreachMessageRow = Database['public']['Tables']['outreach_messages']['Row'];
type OutreachLogRow = Database['public']['Tables']['outreach_logs']['Row'];

const URL_EXTRACT_REGEX = /https?:\/\/[^\s<>"')\]}]+/gi;
const INSTAGRAM_HANDLE_MENTION_REGEX =
  /(?:instagram|insta|ig)\s*(?:handle|id|profile|:|-)?\s*[@/]([a-z0-9._]{2,30})/gi;

export const MULTI_CHANNEL_MESSAGE_ENTITY = 'multi_channel_message_record';
export const MULTI_CHANNEL_LOG_ENTITY = 'multi_channel_outreach_log';

export function isChannelConstraintError(
  err: { code?: string; message?: string } | null | undefined
): boolean {
  if (!err) return false;
  const code = err.code || '';
  const msg = (err.message || '').toLowerCase();
  return (
    code === '23514' ||
    code === '42703' ||
    code === 'PGRST204' ||
    msg.includes('channel_check') ||
    msg.includes('check constraint') ||
    msg.includes('column') ||
    msg.includes('schema cache')
  );
}

function cleanUrlTrailingPunctuation(raw: string): string {
  return raw.replace(/[.,;:!?)]+$/, '').trim();
}

export function normalizeLinkedInUrl(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();
    if (host !== 'linkedin.com' && host !== 'www.linkedin.com' && !host.endsWith('.linkedin.com')) {
      return null;
    }
    const cleanPath = parsed.pathname.replace(/\/+$/, '');
    if (!/^\/(in|company)\/[a-z0-9._%-]{2,100}$/i.test(cleanPath)) {
      return null;
    }
    return `https://www.linkedin.com${cleanPath}`;
  } catch {
    return null;
  }
}

export function normalizeInstagramProfileUrl(rawUrl: string): {
  url: string;
  username: string;
} | null {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();
    if (host !== 'instagram.com' && host !== 'www.instagram.com') {
      return null;
    }
    const segs = parsed.pathname.split('/').filter(Boolean);
    if (segs.length === 0) return null;
    const candidate = segs[0].replace(/^@/, '').trim();
    const blocked = new Set([
      'p',
      'reel',
      'reels',
      'stories',
      'explore',
      'accounts',
      'directory',
      'tv',
    ]);
    if (!candidate || blocked.has(candidate.toLowerCase()) || !/^[a-z0-9._]{2,30}$/i.test(candidate)) {
      return null;
    }
    return {
      url: `https://www.instagram.com/${candidate}/`,
      username: candidate,
    };
  } catch {
    return null;
  }
}

export function normalizeYouTubeUrl(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();
    if (host !== 'youtube.com' && host !== 'www.youtube.com' && host !== 'm.youtube.com') {
      return null;
    }
    const cleanPath = parsed.pathname.replace(/\/+$/, '');
    if (!cleanPath || cleanPath === '/') return null;
    if (/^\/(@[a-z0-9._-]+|channel\/[a-z0-9_-]+|c\/[a-z0-9._%-]+|user\/[a-z0-9._%-]+)$/i.test(cleanPath)) {
      return `https://www.youtube.com${cleanPath}`;
    }
    return null;
  } catch {
    return null;
  }
}

function normalizeOtherContactUrl(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    const host = parsed.hostname.toLowerCase();
    if (
      host.includes('instagram.com') ||
      host.includes('linkedin.com') ||
      host.includes('youtube.com') ||
      host === 'youtu.be' ||
      host === 'localhost' ||
      host.endsWith('.local')
    ) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Extracts public contact channels strictly from explicit links, URLs, and creator profile metadata.
 * NEVER links external profiles by creator name similarity alone.
 */
export function extractPublicContactChannelsFromText(input: {
  text: string;
  sourceLabel: string;
  sourceUrl?: string | null;
  discoveredAt?: string;
}): ContactChannelRecord[] {
  const discoveredAt = input.discoveredAt || new Date().toISOString();
  const text = input.text || '';
  const results: ContactChannelRecord[] = [];
  const seenKey = new Set<string>();

  const pushUnique = (rec: ContactChannelRecord) => {
    const key = `${rec.type}:${(rec.url || rec.value).toLowerCase()}`;
    if (seenKey.has(key)) return;
    seenKey.add(key);
    results.push(rec);
  };

  const rawUrls = text.match(URL_EXTRACT_REGEX) ?? [];
  for (const raw of rawUrls) {
    const cleaned = cleanUrlTrailingPunctuation(raw);

    const ig = normalizeInstagramProfileUrl(cleaned);
    if (ig) {
      pushUnique({
        type: 'instagram',
        value: `@${ig.username}`,
        url: ig.url,
        username: ig.username,
        source: input.sourceLabel,
        sourceUrl: input.sourceUrl ?? null,
        verificationStatus: 'found_publicly',
        linkingConfidence: 'explicit_link',
        evidence: `Explicitly linked Instagram URL (${ig.url}) in ${input.sourceLabel}`,
        discoveredAt,
      });
      continue;
    }

    const li = normalizeLinkedInUrl(cleaned);
    if (li) {
      pushUnique({
        type: 'linkedin',
        value: li,
        url: li,
        source: input.sourceLabel,
        sourceUrl: input.sourceUrl ?? null,
        verificationStatus: 'found_publicly',
        linkingConfidence: 'explicit_link',
        evidence: `Explicitly linked LinkedIn URL (${li}) in ${input.sourceLabel}`,
        discoveredAt,
      });
      continue;
    }

    const yt = normalizeYouTubeUrl(cleaned);
    if (yt) {
      pushUnique({
        type: 'youtube',
        value: yt,
        url: yt,
        source: input.sourceLabel,
        sourceUrl: input.sourceUrl ?? null,
        verificationStatus: 'found_publicly',
        linkingConfidence: 'explicit_link',
        evidence: `Explicitly linked YouTube URL (${yt}) in ${input.sourceLabel}`,
        discoveredAt,
      });
      continue;
    }

    const other = normalizeOtherContactUrl(cleaned);
    if (other) {
      pushUnique({
        type: 'other_contact',
        value: other,
        url: other,
        source: input.sourceLabel,
        sourceUrl: input.sourceUrl ?? null,
        verificationStatus: 'found_publicly',
        linkingConfidence: 'explicit_link',
        evidence: `Explicitly linked external contact/website URL in ${input.sourceLabel}`,
        discoveredAt,
      });
    }
  }

  // Also detect explicit "IG: @handle" / "Instagram: @handle" declarations in the creator's own bio
  let mentionMatch: RegExpExecArray | null;
  const igRegex = new RegExp(INSTAGRAM_HANDLE_MENTION_REGEX.source, 'gi');
  while ((mentionMatch = igRegex.exec(text)) !== null) {
    const handle = mentionMatch[1]?.trim();
    if (handle && /^[a-z0-9._]{2,30}$/i.test(handle)) {
      pushUnique({
        type: 'instagram',
        value: `@${handle}`,
        url: `https://www.instagram.com/${handle}/`,
        username: handle,
        source: input.sourceLabel,
        sourceUrl: input.sourceUrl ?? null,
        verificationStatus: 'found_publicly',
        linkingConfidence: 'explicit_link',
        evidence: `Explicitly stated Instagram handle @${handle} in ${input.sourceLabel}`,
        discoveredAt,
      });
    }
  }

  return results;
}

export function mergeContactChannels(
  existing: ContactChannelRecord[],
  incoming: ContactChannelRecord[]
): ContactChannelRecord[] {
  const byKey = new Map<string, ContactChannelRecord>();

  const makeKey = (item: ContactChannelRecord) =>
    `${item.type}:${(item.url || item.value).toLowerCase().replace(/\/+$/, '')}`;

  for (const item of existing) {
    if (!item?.type || !item?.value) continue;
    byKey.set(makeKey(item), item);
  }

  for (const item of incoming) {
    if (!item?.type || !item?.value) continue;
    const key = makeKey(item);
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, item);
      continue;
    }
    // Preserve user confirmation over automated re-discovery
    if (prev.verificationStatus === 'user_confirmed') {
      byKey.set(key, {
        ...item,
        ...prev,
        discoveredAt: prev.discoveredAt || item.discoveredAt,
      });
    } else {
      byKey.set(key, { ...prev, ...item });
    }
  }

  return Array.from(byKey.values());
}

export function buildCreatorContactChannels(
  inf: InfluencerRow,
  extraExtracted: ContactChannelRecord[] = []
): ContactChannelRecord[] {
  const nowIso = inf.source_retrieved_at || inf.created_at || new Date().toISOString();
  const meta = (inf.source_metadata ?? {}) as Record<string, unknown>;
  const storedRaw = Array.isArray(inf.contact_channels)
    ? inf.contact_channels
    : Array.isArray(meta.contactChannels)
      ? meta.contactChannels
      : [];

  const storedChannels: ContactChannelRecord[] = storedRaw.filter(
    (item): item is ContactChannelRecord =>
      Boolean(item && typeof item === 'object' && 'type' in item && 'value' in item)
  );

  const baseline: ContactChannelRecord[] = [];
  const platformLower = (inf.platform || 'youtube').toLowerCase();

  // Primary discovered platform profile
  if (platformLower === 'youtube' && inf.profile_url) {
    baseline.push({
      type: 'youtube',
      value: inf.username ? `@${inf.username.replace(/^@/, '')}` : inf.profile_url,
      url: inf.profile_url,
      username: inf.username,
      source: inf.data_source || 'youtube_data_api_v3',
      sourceUrl: inf.profile_url,
      verificationStatus: 'found_publicly',
      linkingConfidence: 'primary_profile',
      evidence: 'Primary discovered YouTube channel',
      discoveredAt: nowIso,
    });
  } else if (platformLower === 'instagram' && inf.profile_url) {
    const cleanHandle = inf.username ? inf.username.replace(/^@/, '') : null;
    baseline.push({
      type: 'instagram',
      value: cleanHandle ? `@${cleanHandle}` : inf.profile_url,
      url: inf.profile_url,
      username: cleanHandle,
      source: inf.data_source || 'apify_instagram_search',
      sourceUrl: inf.profile_url,
      verificationStatus: 'found_publicly',
      linkingConfidence: 'primary_profile',
      evidence: 'Primary discovered Instagram profile',
      discoveredAt: nowIso,
    });
  }

  // Public business email if valid
  if (
    inf.contact_email &&
    inf.contact_email.toLowerCase() !== 'not found' &&
    isValidEmail(inf.contact_email)
  ) {
    baseline.push({
      type: 'email',
      value: inf.contact_email.trim(),
      url: `mailto:${inf.contact_email.trim()}`,
      source: inf.email_source || (typeof meta.emailSource === 'string' ? meta.emailSource : 'public_profile'),
      sourceUrl: inf.profile_url,
      verificationStatus: inf.email_status === 'verified' ? 'user_confirmed' : 'found_publicly',
      linkingConfidence: inf.email_status === 'verified' ? 'user_confirmed' : 'explicit_link',
      evidence:
        inf.email_status === 'verified'
          ? 'Manually confirmed business email'
          : 'Extracted from public profile or linked website',
      discoveredAt: inf.last_verified_at || nowIso,
    });
  }

  // Explicitly linked website
  if (inf.website) {
    const li = normalizeLinkedInUrl(inf.website);
    if (li) {
      baseline.push({
        type: 'linkedin',
        value: li,
        url: li,
        source: 'profile_external_url',
        sourceUrl: inf.profile_url,
        verificationStatus: 'found_publicly',
        linkingConfidence: 'explicit_link',
        evidence: 'Creator profile external URL points to LinkedIn',
        discoveredAt: nowIso,
      });
    } else {
      const other = normalizeOtherContactUrl(inf.website);
      if (other) {
        baseline.push({
          type: 'other_contact',
          value: other,
          url: other,
          source: 'profile_external_url',
          sourceUrl: inf.profile_url,
          verificationStatus: 'found_publicly',
          linkingConfidence: 'explicit_link',
          evidence: 'Creator public website or link-in-bio URL',
          discoveredAt: nowIso,
        });
      }
    }
  }

  // Also parse stored profile description & metadata website excerpt cleanly
  const descChannels = extractPublicContactChannelsFromText({
    text: `${inf.profile_description ?? ''}\n${typeof meta.websiteTextExcerpt === 'string' ? meta.websiteTextExcerpt : ''}`,
    sourceLabel:
      platformLower === 'instagram' ? 'instagram_public_bio' : 'youtube_channel_description',
    sourceUrl: inf.profile_url,
    discoveredAt: nowIso,
  });

  return mergeContactChannels(mergeContactChannels(baseline, descChannels), mergeContactChannels(storedChannels, extraExtracted));
}

export function validateManualContactChannelInput(input: {
  type: ContactChannelType;
  value: string;
}): {
  value: string;
  url: string | null;
  username?: string | null;
} {
  const raw = clampString(input.value, 320);
  if (!raw) {
    throw new Error('Contact channel value cannot be empty.');
  }

  if (input.type === 'email') {
    if (!isValidEmail(raw)) {
      throw new Error('Provide a valid email address.');
    }
    return {
      value: raw.toLowerCase(),
      url: `mailto:${raw.toLowerCase()}`,
    };
  }

  if (input.type === 'instagram') {
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      const parsed = normalizeInstagramProfileUrl(raw);
      if (!parsed) throw new Error('Provide a valid public Instagram profile URL (e.g. https://www.instagram.com/handle/).');
      return { value: `@${parsed.username}`, url: parsed.url, username: parsed.username };
    }
    const handle = raw.replace(/^@/, '').trim();
    if (!/^[a-z0-9._]{2,30}$/i.test(handle)) {
      throw new Error('Provide a valid Instagram handle or profile URL.');
    }
    return {
      value: `@${handle}`,
      url: `https://www.instagram.com/${handle}/`,
      username: handle,
    };
  }

  if (input.type === 'linkedin') {
    const cleanInput = raw.replace(/^\/+/, '');
    const candidate = /^https?:\/\//i.test(cleanInput)
      ? cleanInput
      : /^(?:www\.)?linkedin\.com\//i.test(cleanInput)
        ? `https://${cleanInput}`
        : `https://www.linkedin.com/${cleanInput}`;
    const normalized = normalizeLinkedInUrl(candidate);
    if (!normalized) {
      throw new Error('Provide a valid public LinkedIn profile or company URL (https://www.linkedin.com/in/...).');
    }
    return {
      value: normalized,
      url: normalized,
    };
  }

  if (input.type === 'youtube') {
    const normalized = normalizeYouTubeUrl(raw);
    if (!normalized) {
      throw new Error('Provide a valid public YouTube channel URL.');
    }
    return { value: normalized, url: normalized };
  }

  const other = normalizeOtherContactUrl(raw);
  if (!other) {
    throw new Error('Provide a valid public HTTP/HTTPS contact URL.');
  }
  return { value: other, url: other };
}

export function evaluateCreatorChannels(params: {
  influencer: InfluencerRow;
  contactChannels: ContactChannelRecord[];
  qualificationStatus?: string | null;
  outreachMode?: 'simulation' | 'live';
  gmailConnected?: boolean;
  preferredChannel?: OutreachChannel | null;
}): {
  availability: ChannelAvailabilityItem[];
  recommendedChannel: OutreachChannel;
  preferredChannel: OutreachChannel;
} {
  const channels = params.contactChannels;
  const emailRec = channels.find((c) => c.type === 'email');
  const igRec = channels.find((c) => c.type === 'instagram');
  const liRec = channels.find((c) => c.type === 'linkedin');
  const ytRec = channels.find((c) => c.type === 'youtube');
  const otherRec = channels.find((c) => c.type === 'other_contact');

  const hasValidEmail = Boolean(emailRec && isValidEmail(emailRec.value));
  const hasInstagram = Boolean(igRec?.url);
  const hasLinkedIn = Boolean(liRec?.url);
  const hasYouTube = Boolean(ytRec?.url);

  const emailSendingMethod: SendingMethod =
    params.outreachMode === 'live' && params.gmailConnected ? 'api' : 'simulation';

  const pickAlternative = (exclude: OutreachChannel): {
    channel: OutreachChannel | null;
    reason: string | null;
  } => {
    if (exclude !== 'email' && hasValidEmail) {
      return {
        channel: 'email',
        reason: `Public business email (${emailRec!.value}) is available for outreach.`,
      };
    }
    if (exclude !== 'instagram_dm' && hasInstagram) {
      return {
        channel: 'instagram_dm',
        reason: `Use Manual Instagram DM via ${igRec!.value}.`,
      };
    }
    if (exclude !== 'linkedin_message' && hasLinkedIn) {
      return {
        channel: 'linkedin_message',
        reason: `Use Manual LinkedIn Message via linked profile.`,
      };
    }
    if (exclude !== 'youtube_contact' && (hasYouTube || otherRec)) {
      return {
        channel: 'youtube_contact',
        reason: otherRec
          ? `Use publicly linked contact URL (${otherRec.url}).`
          : `Inspect creator's public YouTube channel for business contact links.`,
      };
    }
    return { channel: null, reason: null };
  };

  const altForEmail = !hasValidEmail ? pickAlternative('email') : { channel: null, reason: null };
  const altForIg = !hasInstagram ? pickAlternative('instagram_dm') : { channel: null, reason: null };
  const altForLi = !hasLinkedIn ? pickAlternative('linkedin_message') : { channel: null, reason: null };
  const altForYt = pickAlternative('youtube_contact');

  const emailItem: ChannelAvailabilityItem = {
    channel: 'email',
    label: 'Business Email',
    available: hasValidEmail,
    eligible: hasValidEmail,
    sendingMethod: emailSendingMethod,
    recipientDisplay: hasValidEmail ? emailRec!.value : null,
    recipientUrl: hasValidEmail ? emailRec!.url : null,
    verificationStatus: emailRec?.verificationStatus ?? 'not_found',
    unavailableReason: hasValidEmail
      ? null
      : 'Public business email is Not Found on creator profile or website.',
    recommendedAlternative: altForEmail.channel,
    recommendedReason: altForEmail.reason,
  };

  const igItem: ChannelAvailabilityItem = {
    channel: 'instagram_dm',
    label: 'Instagram DM',
    available: hasInstagram,
    eligible: hasInstagram,
    sendingMethod: 'manual',
    recipientDisplay: igRec ? igRec.value : null,
    recipientUrl: igRec?.url ?? null,
    verificationStatus: igRec?.verificationStatus ?? 'not_found',
    unavailableReason: hasInstagram
      ? null
      : 'No explicitly linked Instagram profile found for this creator.',
    recommendedAlternative: altForIg.channel,
    recommendedReason: altForIg.reason,
  };

  const liItem: ChannelAvailabilityItem = {
    channel: 'linkedin_message',
    label: 'LinkedIn Message',
    available: hasLinkedIn,
    eligible: hasLinkedIn,
    sendingMethod: 'manual',
    recipientDisplay: liRec ? liRec.value : null,
    recipientUrl: liRec?.url ?? null,
    verificationStatus: liRec?.verificationStatus ?? 'not_found',
    unavailableReason: hasLinkedIn
      ? null
      : 'No publicly linked LinkedIn profile found (never inferred by name alone).',
    recommendedAlternative: altForLi.channel,
    recommendedReason: altForLi.reason,
  };

  const ytRecipientUrl = hasValidEmail
    ? ytRec?.url ?? otherRec?.url ?? null
    : otherRec?.url ?? ytRec?.url ?? null;
  const ytItem: ChannelAvailabilityItem = {
    channel: 'youtube_contact',
    label: 'YouTube Contact',
    available: hasYouTube || Boolean(otherRec),
    eligible: hasYouTube || Boolean(otherRec),
    sendingMethod: hasValidEmail && emailSendingMethod === 'api' ? 'api' : 'manual',
    recipientDisplay: hasValidEmail
      ? `${emailRec!.value} (via YouTube business email)`
      : otherRec?.value ?? ytRec?.value ?? null,
    recipientUrl: ytRecipientUrl,
    verificationStatus: ytRec?.verificationStatus ?? otherRec?.verificationStatus ?? 'not_found',
    unavailableReason:
      hasYouTube || otherRec
        ? null
        : 'Creator has no discovered YouTube channel or external contact link.',
    recommendedAlternative: hasValidEmail ? 'email' : altForYt.channel,
    recommendedReason: hasValidEmail
      ? `YouTube has no DM API; route outreach to public business email ${emailRec!.value}.`
      : 'YouTube has no direct DM API; prepare contact brief for creator website/linked channel.',
  };

  const availability = [emailItem, igItem, liItem, ytItem];
  const recommendedChannel: OutreachChannel = hasValidEmail
    ? 'email'
    : hasInstagram
      ? 'instagram_dm'
      : hasLinkedIn
        ? 'linkedin_message'
        : 'youtube_contact';

  const meta = (params.influencer.source_metadata ?? {}) as Record<string, unknown>;
  const savedPref =
    (params.influencer.preferred_channel as OutreachChannel | null | undefined) ??
    (meta.preferredChannel as OutreachChannel | undefined) ??
    null;

  const preferredChannel: OutreachChannel =
    params.preferredChannel ??
    (savedPref && ['email', 'instagram_dm', 'linkedin_message', 'youtube_contact'].includes(savedPref)
      ? savedPref
      : recommendedChannel);

  return { availability, recommendedChannel, preferredChannel };
}

export function mapToUnifiedOutreachStatus(params: {
  messageStatus?: string | null;
  workflowStatus?: string | null;
  latestLogStatus?: string | null;
  latestLogAction?: string | null;
}): UnifiedOutreachStatus {
  const wf = (params.workflowStatus || '').toLowerCase();
  const msg = (params.messageStatus || '').toLowerCase();
  const log = (params.latestLogStatus || '').toLowerCase();
  const action = (params.latestLogAction || '').toLowerCase();

  if (
    log === 'sent' ||
    log === 'delivered' ||
    msg === 'sent' ||
    msg === 'delivered' ||
    wf === 'sent' ||
    action.endsWith('_sent')
  ) {
    return 'sent';
  }
  if (log === 'failed' || msg === 'failed' || wf === 'failed') {
    return 'failed';
  }
  if (log === 'simulated' || wf === 'simulated') {
    return 'simulated';
  }
  if (log === 'queued' || msg === 'queued' || wf === 'sending') {
    return 'sending';
  }
  if (
    wf === 'skipped' ||
    msg === 'rejected' ||
    action.endsWith('_skipped')
  ) {
    return 'skipped';
  }
  if (
    wf === 'ready_for_manual_sending' ||
    action.endsWith('_ready')
  ) {
    return 'ready_for_manual_sending';
  }
  if (msg === 'approved') {
    return 'approved';
  }
  if (msg === 'pending_review') {
    return 'ready_for_review';
  }
  return 'draft';
}

export async function saveMultiChannelFallbackMessage(
  record: OutreachMessageRow
): Promise<OutreachMessageRow> {
  const admin = getSupabaseAdmin();
  if (!admin) return record;
  await admin
    .from('demo_audit_logs')
    .delete()
    .eq('entity_type', MULTI_CHANNEL_MESSAGE_ENTITY)
    .eq('entity_id', record.id);

  await admin.from('demo_audit_logs').insert({
    action: 'upsert_multi_channel_message',
    entity_type: MULTI_CHANNEL_MESSAGE_ENTITY,
    entity_id: record.id,
    details: record as unknown as Record<string, unknown>,
  });
  return record;
}

export async function loadMultiChannelFallbackMessages(filters?: {
  campaignInfluencerIds?: string[];
  messageId?: string;
}): Promise<OutreachMessageRow[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];
  try {
    let query = admin
      .from('demo_audit_logs')
      .select('entity_id, details, created_at')
      .eq('entity_type', MULTI_CHANNEL_MESSAGE_ENTITY)
      .order('created_at', { ascending: false })
      .limit(300);

    if (filters?.messageId) {
      query = query.eq('entity_id', filters.messageId);
    }

    const { data } = await query;
    const seen = new Set<string>();
    const rows: OutreachMessageRow[] = [];
    for (const row of data ?? []) {
      const details = row.details as unknown as OutreachMessageRow | null;
      if (!details?.id || seen.has(details.id)) continue;
      seen.add(details.id);
      if (
        filters?.campaignInfluencerIds &&
        !filters.campaignInfluencerIds.includes(details.campaign_influencer_id)
      ) {
        continue;
      }
      rows.push(details);
    }
    return rows;
  } catch {
    return [];
  }
}

export async function saveMultiChannelFallbackLog(
  log: OutreachLogRow
): Promise<OutreachLogRow> {
  const admin = getSupabaseAdmin();
  if (!admin) return log;
  await admin.from('demo_audit_logs').insert({
    action: log.action,
    entity_type: MULTI_CHANNEL_LOG_ENTITY,
    entity_id: log.id,
    details: log as unknown as Record<string, unknown>,
  });
  return log;
}

export async function loadMultiChannelFallbackLogs(
  campaignInfluencerIds?: string[]
): Promise<OutreachLogRow[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];
  try {
    const { data } = await admin
      .from('demo_audit_logs')
      .select('details, created_at')
      .eq('entity_type', MULTI_CHANNEL_LOG_ENTITY)
      .order('created_at', { ascending: false })
      .limit(300);

    const rows: OutreachLogRow[] = [];
    for (const row of data ?? []) {
      const details = row.details as unknown as OutreachLogRow | null;
      if (!details?.id) continue;
      if (
        campaignInfluencerIds &&
        !campaignInfluencerIds.includes(details.campaign_influencer_id)
      ) {
        continue;
      }
      rows.push(details);
    }
    return rows;
  } catch {
    return [];
  }
}

export function createDeterministicUuid(): string {
  return crypto.randomUUID();
}
