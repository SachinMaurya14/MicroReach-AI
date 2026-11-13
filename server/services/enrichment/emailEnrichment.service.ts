import net from 'node:net';

const EMAIL_FINDER_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const URL_FINDER_REGEX = /https?:\/\/[^\s<>"')]+/gi;

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

export interface EmailEnrichmentResult {
  contactEmail: string | null;
  emailStatus: 'verified' | 'not_found';
  website: string | null;
  emailSource: string | null;
  retrievedAt: string;
}

function isDisallowedEmail(email: string): boolean {
  const lower = email.toLowerCase().trim();
  if (lower.length < 6 || lower.length > 180) return true;
  if (BLOCKED_EMAIL_PREFIXES.some((prefix) => lower.startsWith(prefix))) return true;
  const domain = lower.split('@')[1] || '';
  if (BLOCKED_EMAIL_DOMAINS.has(domain)) return true;
  if (domain.endsWith('.png') || domain.endsWith('.jpg') || domain.endsWith('.svg')) {
    return true;
  }
  return false;
}

function extractFirstValidEmail(text: string): string | null {
  if (!text) return null;
  const matches = text.match(EMAIL_FINDER_REGEX);
  if (!matches) return null;
  for (const candidate of matches) {
    const cleaned = candidate.replace(/[.,;:!?]+$/, '');
    if (!isDisallowedEmail(cleaned)) {
      return cleaned;
    }
  }
  return null;
}

function isSafePublicUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      host === 'metadata.google.internal'
    ) {
      return false;
    }

    const ipType = net.isIP(host);
    if (ipType === 4) {
      const octets = host.split('.').map(Number);
      if (
        octets[0] === 10 ||
        octets[0] === 127 ||
        octets[0] === 0 ||
        (octets[0] === 169 && octets[1] === 254) ||
        (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
        (octets[0] === 192 && octets[1] === 168)
      ) {
        return false;
      }
    } else if (ipType === 6) {
      if (host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80')) {
        return false;
      }
    }

    // Skip social login walls or giant redirectors where contact scraping isn't allowed
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
    ];
    if (blockedHosts.includes(host)) return false;

    return true;
  } catch {
    return false;
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

async function fetchPublicWebsiteEmail(websiteUrl: string): Promise<string | null> {
  if (!isSafePublicUrl(websiteUrl)) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);

  try {
    const response = await fetch(websiteUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'MicroReachAI-PublicProfileVerifier/1.0',
        Accept: 'text/html,text/plain;q=0.8',
      },
    });
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
      return null;
    }

    const rawText = await response.text();
    const bounded = rawText.slice(0, 200_000);
    // Strip tags lightly so mailto: and visible emails are easily detected
    const normalized = bounded.replace(/mailto:/gi, ' ').replace(/<[^>]+>/g, ' ');
    return extractFirstValidEmail(normalized);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function enrichCreatorPublicContact(input: {
  description: string;
  explicitWebsite?: string | null;
  fetchWebsite?: boolean;
}): Promise<EmailEnrichmentResult> {
  const retrievedAt = new Date().toISOString();
  const website =
    (input.explicitWebsite && isSafePublicUrl(input.explicitWebsite)
      ? input.explicitWebsite
      : null) ?? extractPublicWebsiteFromDescription(input.description);

  // 1. Direct extraction from public YouTube channel description
  const emailFromDescription = extractFirstValidEmail(input.description);
  if (emailFromDescription) {
    return {
      contactEmail: emailFromDescription,
      emailStatus: 'verified',
      website,
      emailSource: 'youtube_channel_description',
      retrievedAt,
    };
  }

  // 2. Optional safe public creator website lookup (never bypasses walls/captchas)
  if (input.fetchWebsite && website) {
    const emailFromWebsite = await fetchPublicWebsiteEmail(website);
    if (emailFromWebsite) {
      return {
        contactEmail: emailFromWebsite,
        emailStatus: 'verified',
        website,
        emailSource: 'public_creator_website',
        retrievedAt,
      };
    }
  }

  // 3. Never guess or invent email addresses
  return {
    contactEmail: null,
    emailStatus: 'not_found',
    website,
    emailSource: null,
    retrievedAt,
  };
}
