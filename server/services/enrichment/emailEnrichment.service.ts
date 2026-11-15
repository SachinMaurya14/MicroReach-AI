import dns from 'node:dns/promises';
import net from 'node:net';
import { getServerConfig } from '../../config/env.ts';
import { getSupabaseAdmin } from '../../lib/supabaseAdmin.ts';
import { AppHttpError } from '../../middleware/errorHandler.ts';
import type { ContactChannelRecord, Database } from '../../../src/types/database.ts';
import { isValidEmail } from '../../utils/validation.ts';
import { extractContentThemes } from '../filtering/qualification.service.ts';
import { extractContentThemesWithAi } from '../gemini/pitchGenerator.service.ts';
import {
  buildCreatorContactChannels,
  extractPublicContactChannelsFromText,
  mergeContactChannels,
} from '../outreach/multiChannel.service.ts';
import {
  getInfluencerById,
  recordAuditLog,
  type WorkspaceCreatorDetail,
} from '../supabase/sharedWorkspace.service.ts';

const EMAIL_FINDER_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const URL_FINDER_REGEX = /https?:\/\/[^\s<>"')]+/gi;
const MAX_REDIRECT_HOPS = 3;
const MAX_RESPONSE_BYTES = 200_000;
const FETCH_TIMEOUT_MS = 4500;

const BLOCKED_EMAIL_DOMAINS = new Set([
  'example.com',
  'example.org',
  'example.net',
  'youtube.com',
  'youtu.be',
  'google.com',
  'gmail.com.example',
  'sentry.io',
  'wixpress.com',
]);

const BLOCKED_EMAIL_PREFIXES = ['noreply@', 'no-reply@', 'donotreply@', 'support@wix'];

export type EmailProvenanceStatus =
  | 'Not Found'
  | 'Found Publicly'
  | 'Syntax Valid'
  | 'Ready for Review'
  | 'Approved for Outreach'
  | 'Sent'
  | 'Failed';

export interface EmailEnrichmentResult {
  contactEmail: string | null;
  emailStatus: 'unverified' | 'not_found';
  emailProvenanceStatus: EmailProvenanceStatus;
  emailVerificationNote: string;
  website: string | null;
  emailSource: string | null;
  emailSourceUrl: string | null;
  websiteTextExcerpt: string | null;
  syntaxValid: boolean;
  retrievedAt: string;
  discoveredChannels: ContactChannelRecord[];
}

function isDisallowedEmail(email: string): boolean {
  const lower = email.toLowerCase().trim();
  if (lower.length < 6 || lower.length > 180) return true;
  if (BLOCKED_EMAIL_PREFIXES.some((prefix) => lower.startsWith(prefix))) return true;
  const domain = lower.split('@')[1] || '';
  if (BLOCKED_EMAIL_DOMAINS.has(domain)) return true;
  if (
    domain.endsWith('.png') ||
    domain.endsWith('.jpg') ||
    domain.endsWith('.jpeg') ||
    domain.endsWith('.svg') ||
    domain.endsWith('.webp')
  ) {
    return true;
  }
  return false;
}

export function extractFirstValidEmail(text: string): string | null {
  if (!text) return null;
  const matches = text.match(EMAIL_FINDER_REGEX);
  if (!matches) return null;
  for (const candidate of matches) {
    const cleaned = candidate.replace(/[.,;:!?]+$/, '');
    if (!isDisallowedEmail(cleaned) && isValidEmail(cleaned)) {
      return cleaned;
    }
  }
  return null;
}

export function isPrivateOrReservedIp(ip: string): boolean {
  const normalized = ip.toLowerCase().trim();
  if (!normalized) return true;

  // Handle IPv4-mapped IPv6 addresses like ::ffff:127.0.0.1
  if (normalized.startsWith('::ffff:')) {
    return isPrivateOrReservedIp(normalized.slice(7));
  }

  const ipType = net.isIP(normalized);
  if (ipType === 4) {
    const octets = normalized.split('.').map(Number);
    if (octets.length !== 4 || octets.some((o) => !Number.isInteger(o) || o < 0 || o > 255)) {
      return true;
    }
    const [a, b] = octets;
    if (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) || // CGNAT 100.64.0.0/10
      (a === 169 && b === 254) || // Link-local / cloud metadata
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) || // Benchmarking
      a >= 224 // Multicast / reserved
    ) {
      return true;
    }
    return false;
  }

  if (ipType === 6) {
    if (
      normalized === '::' ||
      normalized === '::1' ||
      normalized.startsWith('fc') ||
      normalized.startsWith('fd') ||
      normalized.startsWith('fe8') ||
      normalized.startsWith('fe9') ||
      normalized.startsWith('fea') ||
      normalized.startsWith('feb') ||
      normalized.startsWith('ff')
    ) {
      return true;
    }
    return false;
  }

  return true;
}

export function isSafePublicUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return false;
    }
    if (parsed.username || parsed.password) {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    if (
      !host ||
      host === 'localhost' ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      host.endsWith('.localhost') ||
      host === 'metadata.google.internal'
    ) {
      return false;
    }

    if (net.isIP(host) !== 0 && isPrivateOrReservedIp(host)) {
      return false;
    }

    // Skip social login walls or giant redirectors where contact scraping isn't permitted
    const blockedHosts = [
      'instagram.com',
      'www.instagram.com',
      'facebook.com',
      'www.facebook.com',
      'twitter.com',
      'x.com',
      'tiktok.com',
      'www.tiktok.com',
      'youtube.com',
      'www.youtube.com',
      'youtu.be',
      'bit.ly',
      'amzn.to',
      'linktr.ee',
    ];
    if (blockedHosts.includes(host)) return false;

    return true;
  } catch {
    return false;
  }
}

async function validatePublicUrlWithDns(rawUrl: string): Promise<URL | null> {
  if (!isSafePublicUrl(rawUrl)) return null;
  const parsed = new URL(rawUrl);
  const host = parsed.hostname.toLowerCase();

  if (net.isIP(host) !== 0) {
    return isPrivateOrReservedIp(host) ? null : parsed;
  }

  try {
    const records = await dns.lookup(host, { all: true, verbatim: true });
    if (!records || records.length === 0) return null;
    for (const rec of records) {
      if (isPrivateOrReservedIp(rec.address)) {
        return null;
      }
    }
    return parsed;
  } catch {
    return null;
  }
}

export function extractPublicWebsiteFromDescription(description: string): string | null {
  if (!description) return null;
  const urls = description.match(URL_FINDER_REGEX);
  if (!urls) return null;
  for (const raw of urls) {
    const cleaned = raw.replace(/[.,;!?)]+$/, '');
    if (isSafePublicUrl(cleaned)) {
      return cleaned;
    }
  }
  return null;
}

async function readBoundedText(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) {
    const txt = await response.text();
    return txt.slice(0, maxBytes);
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (totalBytes < maxBytes) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      const remaining = maxBytes - totalBytes;
      if (value.byteLength > remaining) {
        chunks.push(value.subarray(0, remaining));
        totalBytes += remaining;
        await reader.cancel().catch(() => undefined);
        break;
      }
      chunks.push(value);
      totalBytes += value.byteLength;
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf8');
}

async function fetchBoundedPublicHtml(targetUrl: string): Promise<{
  finalUrl: string;
  rawHtml: string;
  plainText: string;
} | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    let currentUrl = targetUrl;
    let finalUrl = targetUrl;
    let finalResponse: Response | null = null;

    for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop++) {
      const safeParsed = await validatePublicUrlWithDns(currentUrl);
      if (!safeParsed) return null;

      const response = await fetch(safeParsed.toString(), {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': 'MicroReachAI-PublicProfileVerifier/1.0',
          Accept: 'text/html,text/plain;q=0.8',
        },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        await response.body?.cancel().catch(() => undefined);
        if (!location || hop === MAX_REDIRECT_HOPS) return null;
        currentUrl = new URL(location, safeParsed).toString();
        continue;
      }

      finalUrl = safeParsed.toString();
      finalResponse = response;
      break;
    }

    if (!finalResponse || !finalResponse.ok) return null;
    const contentType = finalResponse.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
      return null;
    }

    const rawHtml = await readBoundedText(finalResponse, MAX_RESPONSE_BYTES);
    const plainText = rawHtml
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/mailto:/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return { finalUrl, rawHtml, plainText };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function findSameOriginContactHref(rawHtml: string, baseUrl: string): string | null {
  try {
    const base = new URL(baseUrl);
    const hrefRegex = /href\s*=\s*["']([^"'#]+)["']/gi;
    let match: RegExpExecArray | null;
    while ((match = hrefRegex.exec(rawHtml)) !== null) {
      const rawHref = match[1].trim();
      if (!rawHref || rawHref.startsWith('mailto:') || rawHref.startsWith('javascript:')) {
        continue;
      }
      if (!/(contact|about|collab|work-with|business|press)/i.test(rawHref)) {
        continue;
      }
      const resolved = new URL(rawHref, base);
      if (resolved.hostname.toLowerCase() === base.hostname.toLowerCase() && isSafePublicUrl(resolved.toString())) {
        return resolved.toString();
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchPublicWebsiteEmail(websiteUrl: string): Promise<{
  email: string | null;
  sourceUrl: string | null;
  textExcerpt: string | null;
  channels: ContactChannelRecord[];
}> {
  const home = await fetchBoundedPublicHtml(websiteUrl);
  if (!home) {
    return { email: null, sourceUrl: null, textExcerpt: null, channels: [] };
  }

  let discoveredChannels = extractPublicContactChannelsFromText({
    text: `${home.rawHtml}\n${home.plainText}`,
    sourceLabel: 'public_creator_website',
    sourceUrl: home.finalUrl,
  });

  const homeEmail = extractFirstValidEmail(home.plainText);
  if (homeEmail) {
    return {
      email: homeEmail,
      sourceUrl: home.finalUrl,
      textExcerpt: home.plainText.slice(0, 600),
      channels: discoveredChannels,
    };
  }

  // Safely check at most 1 discovered same-origin contact/about page
  const contactUrl = findSameOriginContactHref(home.rawHtml, home.finalUrl);
  if (contactUrl && contactUrl !== home.finalUrl) {
    const contactPage = await fetchBoundedPublicHtml(contactUrl);
    if (contactPage) {
      discoveredChannels = mergeContactChannels(
        discoveredChannels,
        extractPublicContactChannelsFromText({
          text: `${contactPage.rawHtml}\n${contactPage.plainText}`,
          sourceLabel: 'public_creator_website_contact',
          sourceUrl: contactPage.finalUrl,
        })
      );
      const contactEmail = extractFirstValidEmail(contactPage.plainText);
      if (contactEmail) {
        return {
          email: contactEmail,
          sourceUrl: contactPage.finalUrl,
          textExcerpt: contactPage.plainText.slice(0, 600),
          channels: discoveredChannels,
        };
      }
    }
  }

  return {
    email: null,
    sourceUrl: null,
    textExcerpt: home.plainText.slice(0, 600),
    channels: discoveredChannels,
  };
}

export async function enrichCreatorPublicContact(input: {
  description: string;
  explicitWebsite?: string | null;
  fetchWebsite?: boolean;
  platform?: string;
  profileUrl?: string | null;
}): Promise<EmailEnrichmentResult> {
  const retrievedAt = new Date().toISOString();
  const website =
    (input.explicitWebsite && isSafePublicUrl(input.explicitWebsite)
      ? input.explicitWebsite
      : null) ?? extractPublicWebsiteFromDescription(input.description);

  const bioSourceLabel =
    input.platform === 'instagram'
      ? 'instagram_public_profile'
      : 'youtube_channel_description';

  let discoveredChannels = extractPublicContactChannelsFromText({
    text: `${input.description}\n${input.explicitWebsite ?? ''}`,
    sourceLabel: bioSourceLabel,
    sourceUrl: input.profileUrl ?? null,
    discoveredAt: retrievedAt,
  });

  // 1. Direct extraction from public channel description / Instagram bio
  const emailFromDescription = extractFirstValidEmail(input.description);
  if (emailFromDescription) {
    discoveredChannels = mergeContactChannels(discoveredChannels, [
      {
        type: 'email',
        value: emailFromDescription,
        url: `mailto:${emailFromDescription}`,
        source: bioSourceLabel,
        sourceUrl: input.profileUrl ?? null,
        verificationStatus: 'found_publicly',
        linkingConfidence: 'explicit_link',
        evidence: `Extracted email from ${bioSourceLabel}`,
        discoveredAt: retrievedAt,
      },
    ]);
    return {
      contactEmail: emailFromDescription,
      emailStatus: 'unverified',
      emailProvenanceStatus: 'Found Publicly',
      emailVerificationNote:
        'Extracted from public creator bio/description (syntax valid; mailbox deliverability unverified)',
      website,
      emailSource: bioSourceLabel,
      emailSourceUrl: input.profileUrl ?? null,
      websiteTextExcerpt: null,
      syntaxValid: true,
      retrievedAt,
      discoveredChannels,
    };
  }

  // 2. Optional safe public creator website + contact page lookup with SSRF + redirect + byte limits
  let websiteTextExcerpt: string | null = null;
  if (input.fetchWebsite && website) {
    const siteLookup = await fetchPublicWebsiteEmail(website);
    websiteTextExcerpt = siteLookup.textExcerpt;
    discoveredChannels = mergeContactChannels(discoveredChannels, siteLookup.channels);
    if (siteLookup.email) {
      discoveredChannels = mergeContactChannels(discoveredChannels, [
        {
          type: 'email',
          value: siteLookup.email,
          url: `mailto:${siteLookup.email}`,
          source: 'public_creator_website',
          sourceUrl: siteLookup.sourceUrl ?? website,
          verificationStatus: 'found_publicly',
          linkingConfidence: 'explicit_link',
          evidence: `Extracted email from public creator website (${siteLookup.sourceUrl ?? website})`,
          discoveredAt: retrievedAt,
        },
      ]);
      return {
        contactEmail: siteLookup.email,
        emailStatus: 'unverified',
        emailProvenanceStatus: 'Found Publicly',
        emailVerificationNote:
          'Extracted from publicly linked creator website (syntax valid; mailbox deliverability unverified)',
        website,
        emailSource: 'public_creator_website',
        emailSourceUrl: siteLookup.sourceUrl ?? website,
        websiteTextExcerpt,
        syntaxValid: true,
        retrievedAt,
        discoveredChannels,
      };
    }
  }

  // 3. Never guess or invent email addresses
  return {
    contactEmail: null,
    emailStatus: 'not_found',
    emailProvenanceStatus: 'Not Found',
    emailVerificationNote: 'Not Found in public profile text or linked website',
    website,
    emailSource: null,
    emailSourceUrl: null,
    websiteTextExcerpt,
    syntaxValid: false,
    retrievedAt,
    discoveredChannels,
  };
}

export interface ContentThemeEvidenceItem {
  theme: string;
  evidence: string;
  source: 'keywords' | 'gemini_ai';
  extractedAt: string;
}

export interface ProfileEnrichmentOutcome {
  creator: WorkspaceCreatorDetail;
  enrichmentStatus: 'enriched' | 'partial' | 'failed';
  emailFound: boolean;
  emailSource: string | null;
  websiteFound: boolean;
  themesCount: number;
  enrichedAt: string;
  notes: string[];
}

export async function enrichInfluencerRecordById(
  influencerId: string,
  opts?: { useAiThemes?: boolean }
): Promise<ProfileEnrichmentOutcome> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new AppHttpError(
      503,
      'supabase_not_configured',
      'Supabase server backend requires configuration.'
    );
  }

  const { data: inf, error } = await admin
    .from('influencers')
    .select('*')
    .eq('id', influencerId)
    .single();

  if (error || !inf) {
    throw new AppHttpError(404, 'influencer_not_found', 'Creator profile not found.');
  }

  const nowIso = new Date().toISOString();
  const description = inf.profile_description ?? '';
  const metadata = (inf.source_metadata ?? {}) as Record<string, unknown>;
  const recentVideoTitles = Array.isArray(metadata.recentVideoTitles)
    ? metadata.recentVideoTitles.filter((t): t is string => typeof t === 'string')
    : [];

  const notes: string[] = [];

  // 1. Public email + website enrichment
  const contact = await enrichCreatorPublicContact({
    description,
    explicitWebsite: inf.website,
    fetchWebsite: true,
    platform: inf.platform,
    profileUrl: inf.profile_url,
  });

  const existingValidEmail =
    inf.contact_email &&
    inf.contact_email.toLowerCase() !== 'not found' &&
    isValidEmail(inf.contact_email)
      ? inf.contact_email
      : null;

  const resolvedEmail = existingValidEmail ?? contact.contactEmail ?? 'Not Found';
  const resolvedEmailStatus: Database['public']['Tables']['influencers']['Row']['email_status'] =
    existingValidEmail
      ? inf.email_status === 'verified'
        ? 'verified'
        : 'unverified'
      : contact.contactEmail
        ? 'unverified'
        : 'not_found';

  const resolvedEmailSource =
    contact.emailSourceUrl ??
    contact.emailSource ??
    inf.email_source ??
    (existingValidEmail ? 'existing_public_profile' : null);

  if (resolvedEmail === 'Not Found') {
    notes.push('No public business email listed on profile or website.');
  } else {
    notes.push(`Public email (${resolvedEmail}) retained from ${resolvedEmailSource || 'profile'}.`);
  }

  // 2. Content theme extraction with evidence
  const keywordThemes = extractContentThemes(
    `${description} ${contact.websiteTextExcerpt ?? ''}`,
    recentVideoTitles
  );
  let evidenceItems: ContentThemeEvidenceItem[] = keywordThemes.map((theme) => ({
    theme,
    evidence: recentVideoTitles.length > 0
      ? `Matched in public bio or recent titles (${recentVideoTitles[0].slice(0, 60)})`
      : 'Matched in public creator bio/description',
    source: 'keywords',
    extractedAt: nowIso,
  }));

  const cfg = getServerConfig();
  if (
    opts?.useAiThemes !== false &&
    cfg.geminiApiKey &&
    (description.trim().length > 15 || recentVideoTitles.length > 0 || contact.websiteTextExcerpt)
  ) {
    try {
      const aiThemes = await extractContentThemesWithAi({
        creatorName: inf.name,
        description,
        recentVideoTitles,
        websiteText: contact.websiteTextExcerpt ?? undefined,
      });
      if (aiThemes.evidence.length > 0) {
        evidenceItems = aiThemes.evidence.map((item) => ({
          theme: item.theme,
          evidence: item.evidence,
          source: 'gemini_ai',
          extractedAt: nowIso,
        }));
        notes.push(`Extracted ${aiThemes.evidence.length} content theme(s) via ${aiThemes.modelUsed}.`);
      }
    } catch (aiErr) {
      const errMsg = aiErr instanceof Error ? aiErr.message : 'unavailable';
      notes.push(`AI theme extraction skipped (${errMsg}); used deterministic public keyword signals.`);
    }
  }

  const finalThemes = Array.from(
    new Set(evidenceItems.map((e) => e.theme).filter(Boolean))
  ).slice(0, 6);

  const mergedChannels = buildCreatorContactChannels(inf, contact.discoveredChannels);

  const enrichmentStatus: 'enriched' | 'partial' | 'failed' =
    resolvedEmail !== 'Not Found' || contact.website || finalThemes.length > 0 || mergedChannels.length > 1
      ? resolvedEmail !== 'Not Found' && finalThemes.length > 0
        ? 'enriched'
        : 'partial'
      : 'failed';

  const nextMetadata: Record<string, unknown> = {
    ...metadata,
    emailSource: resolvedEmailSource,
    emailVerificationNote: existingValidEmail
      ? metadata.emailVerificationNote || 'Existing public/reviewed email retained'
      : contact.emailVerificationNote,
    emailProvenanceStatus:
      resolvedEmailStatus === 'verified'
        ? 'Ready for Review'
        : resolvedEmail !== 'Not Found'
          ? 'Found Publicly'
          : 'Not Found',
    enrichmentStatus,
    enrichedAt: nowIso,
    contentEvidence: evidenceItems,
    websiteTextExcerpt: contact.websiteTextExcerpt,
    contactChannels: mergedChannels,
  };

  const extUpdate: Database['public']['Tables']['influencers']['Update'] = {
    contact_email: resolvedEmail,
    email_status: resolvedEmailStatus,
    website: contact.website ?? inf.website,
    content_themes: finalThemes.length > 0 ? finalThemes : inf.content_themes,
    source_metadata: nextMetadata,
    email_source: resolvedEmailSource,
    enrichment_status: enrichmentStatus,
    enriched_at: nowIso,
    content_evidence: evidenceItems,
    contact_channels: mergedChannels,
    updated_at: nowIso,
  };

  const { error: extErr } = await admin
    .from('influencers')
    .update(extUpdate)
    .eq('id', influencerId);

  if (extErr) {
    // Graceful fallback if 003/004 columns are not yet applied in Supabase
    const { error: baseErr } = await admin
      .from('influencers')
      .update({
        contact_email: resolvedEmail,
        email_status: resolvedEmailStatus,
        website: contact.website ?? inf.website,
        content_themes: finalThemes.length > 0 ? finalThemes : inf.content_themes,
        source_metadata: nextMetadata,
        updated_at: nowIso,
      })
      .eq('id', influencerId);

    if (baseErr) {
      throw new AppHttpError(500, 'supabase_update_error', baseErr.message);
    }
  }

  await recordAuditLog('enrich_creator_profile', 'influencer', influencerId, {
    enrichmentStatus,
    emailFound: resolvedEmail !== 'Not Found',
    emailSource: resolvedEmailSource,
    channelsCount: mergedChannels.length,
    themesCount: finalThemes.length,
  });

  const creator = await getInfluencerById(influencerId);
  return {
    creator,
    enrichmentStatus,
    emailFound: resolvedEmail !== 'Not Found',
    emailSource: resolvedEmailSource,
    websiteFound: Boolean(contact.website ?? inf.website),
    themesCount: finalThemes.length,
    enrichedAt: nowIso,
    notes,
  };
}

export async function enrichInfluencersBatch(
  influencerIds: string[],
  opts?: { useAiThemes?: boolean }
): Promise<{
  total: number;
  enrichedCount: number;
  partialCount: number;
  failedCount: number;
  results: ProfileEnrichmentOutcome[];
}> {
  const uniqueIds = Array.from(new Set(influencerIds)).slice(0, 15);
  const results: ProfileEnrichmentOutcome[] = [];
  let enrichedCount = 0;
  let partialCount = 0;
  let failedCount = 0;

  for (const id of uniqueIds) {
    try {
      const outcome = await enrichInfluencerRecordById(id, opts);
      results.push(outcome);
      if (outcome.enrichmentStatus === 'enriched') enrichedCount += 1;
      else if (outcome.enrichmentStatus === 'partial') partialCount += 1;
      else failedCount += 1;
    } catch {
      failedCount += 1;
    }
  }

  return {
    total: uniqueIds.length,
    enrichedCount,
    partialCount,
    failedCount,
    results,
  };
}

