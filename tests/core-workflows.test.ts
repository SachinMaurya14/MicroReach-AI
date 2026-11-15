import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  enrichCreatorPublicContact,
  extractFirstValidEmail,
  extractPublicWebsiteFromDescription,
  isPrivateOrReservedIp,
  isSafePublicUrl,
} from '../server/services/enrichment/emailEnrichment.service.ts';
import {
  calculateEstimatedPublicEngagement,
  calculateInstagramPostEngagement,
  evaluateCreatorQualification,
  normalizeVerifiedProfileCountry,
} from '../server/services/filtering/qualification.service.ts';
import { mapGeminiProviderError } from '../server/services/gemini/geminiClient.service.ts';
import {
  COLLABORATION_TYPES,
  stripDisallowedFormatting,
  validateEmailPitchWordCount,
  validateInstagramDmWordCount,
  validateLinkedInMessageWordCount,
  validateNoUnsupportedClaims,
  validateYouTubeOutreachWordCount,
} from '../server/services/gemini/pitchGenerator.service.ts';
import {
  buildCreatorContactChannels,
  evaluateCreatorChannels,
  extractPublicContactChannelsFromText,
  mapToUnifiedOutreachStatus,
  validateManualContactChannelInput,
} from '../server/services/outreach/multiChannel.service.ts';
import {
  checkEmailEligibility,
  deterministicKey,
  serializeOutreachLogsToCsv,
} from '../server/services/outreach/outreach.service.ts';
import { serializeCreatorsToCsv } from '../server/services/supabase/sharedWorkspace.service.ts';
import {
  decryptSecretAes256Gcm,
  encryptSecretAes256Gcm,
  signDemoSessionToken,
  signOAuthState,
  verifyDemoSessionToken,
  verifyOAuthState,
} from '../server/utils/crypto.ts';
import {
  clampString,
  countWords,
  isValidEmail,
  isValidUuid,
  parseBoundedInt,
  sanitizeUntrustedText,
} from '../server/utils/validation.ts';

const DEFAULT_CRITERIA = {
  minFollowers: 5000,
  maxFollowers: 100000,
  minEngagementRate: 2.0,
  targetCountry: 'India',
  niche: 'Beauty & Skincare',
};

describe('Qualification & Engagement Engine', () => {
  it('enforces exact 5K-100K subscriber boundaries and >= 2% engagement', () => {
    const tooSmall = evaluateCreatorQualification(
      {
        name: 'Small Skincare',
        description: 'Daily skincare routine and sunscreen reviews',
        recentVideoTitles: ['Sunscreen review'],
        country: 'IN',
        subscriberCount: 4999,
        engagementRate: 4.5,
        contactEmail: 'creator@example-beauty.in',
      },
      DEFAULT_CRITERIA
    );
    assert.equal(tooSmall.status, 'rejected');

    const minBoundary = evaluateCreatorQualification(
      {
        name: 'Min Boundary Beauty',
        description: 'Indian skincare routine with niacinamide serum',
        recentVideoTitles: ['Best sunscreen for humid weather'],
        country: 'IN',
        subscriberCount: 5000,
        engagementRate: 2.0,
        contactEmail: 'hello@minbeauty.in',
      },
      DEFAULT_CRITERIA
    );
    assert.equal(minBoundary.status, 'qualified');
    assert.equal(minBoundary.verifiedCountry, 'India');

    const maxBoundary = evaluateCreatorQualification(
      {
        name: 'Max Boundary Skincare',
        description: 'Derm education, cleanser and vitamin c reviews',
        recentVideoTitles: ['Retinol beginner guide'],
        country: 'India',
        subscriberCount: 100000,
        engagementRate: 3.1,
        contactEmail: null,
      },
      DEFAULT_CRITERIA
    );
    assert.equal(maxBoundary.status, 'qualified');

    const tooLarge = evaluateCreatorQualification(
      {
        name: 'Mega Channel',
        description: 'Skincare reviews',
        recentVideoTitles: ['Serum test'],
        country: 'IN',
        subscriberCount: 100001,
        engagementRate: 4.0,
        contactEmail: null,
      },
      DEFAULT_CRITERIA
    );
    assert.equal(tooLarge.status, 'rejected');
  });

  it('rejects unrelated niches and never guesses India geography from bio keywords', () => {
    const unrelatedNiche = evaluateCreatorQualification(
      {
        name: 'Tech Unboxing',
        description: 'Smartphone camera benchmarks and laptop reviews',
        recentVideoTitles: ['Phone battery test'],
        country: 'IN',
        subscriberCount: 30000,
        engagementRate: 4.2,
        contactEmail: null,
      },
      DEFAULT_CRITERIA
    );
    assert.equal(unrelatedNiche.status, 'rejected');

    // Bio mentions India/Hindi/Mumbai/Nykaa but snippet.country is missing -> must be needs_review, never qualified
    const bioHintOnly = evaluateCreatorQualification(
      {
        name: 'Aanya Skincare',
        description: 'Mumbai skincare creator testing Nykaa sunscreens in Hindi',
        recentVideoTitles: ['Top skincare routine for acne-prone skin'],
        country: null,
        subscriberCount: 42000,
        engagementRate: 3.8,
        contactEmail: 'aanya@example-creator.in',
      },
      DEFAULT_CRITERIA
    );
    assert.equal(bioHintOnly.status, 'needs_review');
    assert.equal(bioHintOnly.verifiedCountry, null);
    assert.equal(bioHintOnly.geographyStatus, 'unavailable');
    assert.ok(bioHintOnly.fitScore <= 64);

    // Explicit non-India country is rejected
    const wrongCountry = evaluateCreatorQualification(
      {
        name: 'US Skincare',
        description: 'Daily cleanser and moisturizer routine',
        recentVideoTitles: ['SPF review'],
        country: 'US',
        subscriberCount: 45000,
        engagementRate: 3.5,
        contactEmail: null,
      },
      DEFAULT_CRITERIA
    );
    assert.equal(wrongCountry.status, 'rejected');
    assert.equal(normalizeVerifiedProfileCountry('IN'), 'India');
    assert.equal(normalizeVerifiedProfileCountry(null), null);
  });

  it('calculates public engagement honestly and avoids 0% when video/sub stats are hidden or disabled', () => {
    const valid = calculateEstimatedPublicEngagement({
      subscriberCount: 10000,
      hiddenSubscriberCount: false,
      videos: [
        { videoId: 'v1', title: 'SPF review', likeCount: 250, commentCount: 50 },
        { videoId: 'v2', title: 'Serum routine', likeCount: 350, commentCount: 50 },
      ],
    });
    assert.equal(valid.available, true);
    assert.equal(valid.engagementRate, 3.5);
    assert.equal(valid.sampleSize, 2);

    const hiddenSubs = calculateEstimatedPublicEngagement({
      subscriberCount: 10000,
      hiddenSubscriberCount: true,
      videos: [{ videoId: 'v1', title: 'SPF', likeCount: 100, commentCount: 10 }],
    });
    assert.equal(hiddenSubs.available, false);
    assert.equal(hiddenSubs.engagementRate, null);

    const disabledLikesAndComments = calculateEstimatedPublicEngagement({
      subscriberCount: 25000,
      hiddenSubscriberCount: false,
      videos: [
        { videoId: 'v1', title: 'Video 1', likeCount: null, commentCount: null },
        { videoId: 'v2', title: 'Video 2', likeCount: null, commentCount: null },
      ],
    });
    assert.equal(disabledLikesAndComments.available, false);
    assert.equal(disabledLikesAndComments.engagementRate, null);

    // Instagram engagement handles visible post likes and hidden (-1) likes honestly
    const igVisible = calculateInstagramPostEngagement({
      followerCount: 20000,
      posts: [
        { postId: 'p1', caption: 'Sunscreen test', likeCount: 550, commentCount: 50 },
        { postId: 'p2', caption: 'Cleanser routine', likeCount: 350, commentCount: 50 },
      ],
    });
    assert.equal(igVisible.available, true);
    assert.equal(igVisible.engagementRate, 2.5);
    assert.equal(igVisible.sampleSize, 2);

    const igHiddenLikes = calculateInstagramPostEngagement({
      followerCount: 20000,
      posts: [{ postId: 'p1', caption: 'Hidden', likeCount: -1, commentCount: 40 }],
    });
    assert.equal(igHiddenLikes.available, false);
    assert.equal(igHiddenLikes.engagementRate, null);
    assert.equal(igHiddenLikes.sampleSize, 0);
  });

  it('enforces strict 3-state classification so missing metrics trigger REVIEW_REQUIRED while known failures trigger FAIL', () => {
    const missingEngInRange = evaluateCreatorQualification(
      {
        name: 'Indian Skincare Studio',
        description: 'Daily sunscreen and niacinamide serum tips',
        recentVideoTitles: ['Morning SPF routine'],
        country: 'IN',
        subscriberCount: 25000,
        engagementRate: null,
        engagementSampleSize: 0,
        contactEmail: 'studio@indianskin.in',
        platform: 'instagram',
      },
      DEFAULT_CRITERIA
    );
    assert.equal(missingEngInRange.classificationCode, 'REVIEW_REQUIRED');
    assert.equal(missingEngInRange.status, 'needs_review');
    assert.ok(missingEngInRange.fitScore <= 64);

    // Hard follower failure still classifies as FAIL even when engagement is missing
    const tooSmallMissingEng = evaluateCreatorQualification(
      {
        name: 'Tiny Skincare',
        description: 'Skincare reviews',
        recentVideoTitles: [],
        country: 'IN',
        subscriberCount: 1200,
        engagementRate: null,
        engagementSampleSize: 0,
        contactEmail: null,
        platform: 'youtube',
      },
      DEFAULT_CRITERIA
    );
    assert.equal(tooSmallMissingEng.classificationCode, 'FAIL');
    assert.equal(tooSmallMissingEng.status, 'rejected');
    assert.ok(tooSmallMissingEng.fitScore <= 30);
    assert.ok(tooSmallMissingEng.fitScoreBreakdown.reasons.length >= 4);
  });
});

describe('SSRF Guard & Email Enrichment Honesty', () => {
  it('blocks loopback, RFC1918, CGNAT, link-local metadata, and IPv4-mapped private IPs', () => {
    for (const badIp of [
      '127.0.0.1',
      '10.0.0.1',
      '169.254.169.254',
      '172.16.5.4',
      '192.168.1.10',
      '100.64.0.1',
      '::1',
      '::ffff:127.0.0.1',
      '::ffff:169.254.169.254',
    ]) {
      assert.equal(isPrivateOrReservedIp(badIp), true, `Expected ${badIp} to be blocked`);
    }

    assert.equal(isPrivateOrReservedIp('8.8.8.8'), false);
    assert.equal(isSafePublicUrl('http://localhost:3000/test'), false);
    assert.equal(isSafePublicUrl('http://127.0.0.1/admin'), false);
    assert.equal(isSafePublicUrl('https://user:pass@creator.in'), false);
    assert.equal(isSafePublicUrl('ftp://creator.in'), false);
    assert.equal(isSafePublicUrl('https://www.instagram.com/skincare'), false);
    assert.equal(isSafePublicUrl('https://studio-glowcare-creator.in/contact'), true);
  });

  it('extracts public email as unverified and returns not_found when absent', async () => {
    assert.equal(
      extractFirstValidEmail('Collabs: noreply@brand.com or team@glowcreator.in!'),
      'team@glowcreator.in'
    );
    assert.equal(extractFirstValidEmail('Image banner@2x.png only'), null);
    assert.equal(
      extractPublicWebsiteFromDescription('Visit https://glowcreator.in/about and follow!'),
      'https://glowcreator.in/about'
    );

    const withEmail = await enrichCreatorPublicContact({
      description: 'Beauty & Skincare creator. Business inquiries: business@riya-skin.in',
      fetchWebsite: false,
    });
    assert.equal(withEmail.contactEmail, 'business@riya-skin.in');
    assert.equal(withEmail.emailStatus, 'unverified');

    const withoutEmail = await enrichCreatorPublicContact({
      description: 'Skincare reviews every Friday. DM only.',
      fetchWebsite: false,
    });
    assert.equal(withoutEmail.contactEmail, null);
    assert.equal(withoutEmail.emailStatus, 'not_found');
  });
});

describe('Gemini Pitch Validators & Input Validation', () => {
  it('validates 60-90 word email pitches and 15-30 word Instagram DMs', () => {
    const makeWords = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(' ');

    assert.equal(validateEmailPitchWordCount(makeWords(59)).valid, false);
    assert.equal(validateEmailPitchWordCount(makeWords(60)).valid, true);
    assert.equal(validateEmailPitchWordCount(makeWords(90)).valid, true);
    assert.equal(validateEmailPitchWordCount(makeWords(91)).valid, false);

    assert.equal(validateInstagramDmWordCount(makeWords(14)).valid, false);
    assert.equal(validateInstagramDmWordCount(makeWords(15)).valid, true);
    assert.equal(validateInstagramDmWordCount(makeWords(30)).valid, true);
    assert.equal(validateInstagramDmWordCount(makeWords(31)).valid, false);

    assert.equal(stripDisallowedFormatting('**Hello** ```json\nHi```'), 'Hello \nHi');

    const ctx = {
      productDescription: 'Gentle daily mineral sunscreen SPF 50',
      campaignBrief: 'Paid barter or sponsorship launch in India',
    };
    assert.equal(
      validateNoUnsupportedClaims('Hi [Creator Name], would love to partner!', ctx, 'email').valid,
      false
    );
    assert.equal(
      validateNoUnsupportedClaims('We offer ₹5000 plus 20% off for your audience.', ctx, 'email').valid,
      false
    );
    assert.equal(
      validateNoUnsupportedClaims('I watched your latest video about skincare.', ctx, 'email').valid,
      false
    );
    assert.equal(
      validateNoUnsupportedClaims('Sent you a YouTube DM about our sunscreen!', ctx, 'youtube_contact').valid,
      false
    );
    assert.equal(
      validateNoUnsupportedClaims(
        'Hi Ananya, we noticed your Skincare & SPF focus aligns well with GlowCare and our daily mineral sunscreen SPF 50 launch in India.',
        ctx,
        'email'
      ).valid,
      true
    );
  });

  it('maps Gemini provider HTTP failures distinctly and never leaks API keys', () => {
    const authErr = mapGeminiProviderError(new Error('401 API key not valid AQ.Secret12345'));
    assert.equal(authErr.code, 'gemini_auth_failed');
    assert.equal(authErr.statusCode, 503);
    assert.equal(authErr.message.includes('Secret12345'), false);

    const permErr = mapGeminiProviderError(new Error('403 PERMISSION_DENIED'));
    assert.equal(permErr.code, 'gemini_permission_denied');
    assert.equal(permErr.statusCode, 503);

    const notFoundErr = mapGeminiProviderError(new Error('404 model is not found'));
    assert.equal(notFoundErr.code, 'gemini_model_not_found');
    assert.equal(notFoundErr.statusCode, 502);

    const quotaErr = mapGeminiProviderError(new Error('429 RESOURCE_EXHAUSTED quota'));
    assert.equal(quotaErr.code, 'gemini_quota_exceeded');
    assert.equal(quotaErr.statusCode, 429);

    const timeoutErr = mapGeminiProviderError(new Error('Gemini request timed out after 16000ms'));
    assert.equal(timeoutErr.code, 'gemini_timeout');
    assert.equal(timeoutErr.statusCode, 504);
  });

  it('validates UUIDs, emails, bounds, and text sanitization', () => {
    assert.equal(isValidUuid('550e8400-e29b-41d4-a716-446655440000'), true);
    assert.equal(isValidUuid('not-a-uuid'), false);
    assert.equal(isValidEmail('creator@glowcare.in'), true);
    assert.equal(isValidEmail('bad-email'), false);
    assert.equal(clampString('  abc  ', 2), 'ab');
    assert.equal(parseBoundedInt('999', 10, 1, 50), 50);
    assert.equal(countWords('one two three'), 3);
    assert.equal(sanitizeUntrustedText('hello\u0000world\n'), 'hello world');
  });
});

describe('Demo Session, OAuth State, AES-256-GCM, Idempotency & CSV Security', () => {
  it('signs/verifies demo sessions and invalidates prior cookies on access token rotation', () => {
    const secret = 'test_session_secret_with_sufficient_entropy_1234';
    const tokenA = 'invite_token_alpha_12345';
    const tokenB = 'invite_token_rotated_67890';

    const signed = signDemoSessionToken(secret, tokenA, 3600);
    const verified = verifyDemoSessionToken(signed.token, secret, tokenA);
    assert.ok(verified);
    assert.equal(verified.sid, signed.payload.sid);

    // Token rotation invalidates old cookie immediately
    assert.equal(verifyDemoSessionToken(signed.token, secret, tokenB), null);

    // Expired session rejected
    const expired = signDemoSessionToken(secret, tokenA, -5);
    assert.equal(verifyDemoSessionToken(expired.token, secret, tokenA), null);
  });

  it('verifies single-use HMAC OAuth state and rejects replay or session mismatch', () => {
    const secret = 'oauth_hmac_secret_1234567890';
    const state = signOAuthState('session_1', secret, 300);

    const mismatch = verifyOAuthState(state, 'session_2', secret, { consumeNonce: false });
    assert.equal(mismatch.valid, false);
    assert.equal(mismatch.reason, 'session_mismatch');

    const firstUse = verifyOAuthState(state, 'session_1', secret, { consumeNonce: true });
    assert.equal(firstUse.valid, true);

    const replay = verifyOAuthState(state, 'session_1', secret, { consumeNonce: true });
    assert.equal(replay.valid, false);
    assert.equal(replay.reason, 'state_already_used');
  });

  it('encrypts and decrypts OAuth tokens via AES-256-GCM and detects tampering', () => {
    const key = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const encrypted = encryptSecretAes256Gcm('1//refresh-token-value', key);
    assert.equal(decryptSecretAes256Gcm(encrypted, key), '1//refresh-token-value');

    const tampered = { ...encrypted, authTag: Buffer.from('tampered-tag-1234').toString('base64') };
    assert.throws(() => decryptSecretAes256Gcm(tampered, key));
  });

  it('generates deterministic idempotency keys and neutralizes CSV formula injection', () => {
    const k1 = deterministicKey(['link1', 'msg1', 'Sub', 'Body']);
    const k2 = deterministicKey(['link1', 'msg1', 'Sub', 'Body']);
    const k3 = deterministicKey(['link1', 'msg1', 'Sub', 'Edited']);
    assert.equal(k1, k2);
    assert.notEqual(k1, k3);

    const creatorsCsv = serializeCreatorsToCsv([
      {
        influencer: {
          id: '11111111-1111-4111-8111-111111111111',
          owner_id: null,
          platform: 'youtube',
          name: '=CMD|calc',
          username: '@glow',
          profile_url: 'https://youtube.com/@glow',
          country: null,
          niche: 'Beauty & Skincare',
          content_themes: ['Skincare'],
          follower_count: 15000,
          engagement_rate: 3.2,
          engagement_source: 'Public likes+comments/subs',
          contact_email: 'team@glow.in',
          email_status: 'unverified',
          website: null,
          audience_age: null,
          audience_gender: null,
          audience_geography: null,
          fit_score: 50,
          is_top_pick: false,
          data_source: 'youtube_data_api_v3',
          source_metadata: null,
          source_retrieved_at: '2026-01-01T00:00:00.000Z',
          last_verified_at: null,
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        },
        campaignInfluencer: null,
        emailMessage: null,
        instagramDmMessage: null,
        linkedinMessage: null,
        youtubeContactMessage: null,
        latestOutreachLog: null,
      },
    ]);

    assert.ok(creatorsCsv.includes("'=CMD|calc"));
    assert.ok(creatorsCsv.includes('Publicly Listed (Unverified)'));
    assert.ok(creatorsCsv.includes('Not Available'));

    const logsCsv = serializeOutreachLogsToCsv([
      {
        id: '22222222-2222-4222-8222-222222222222',
        outreach_message_id: null,
        campaign_influencer_id: '33333333-3333-4333-8333-333333333333',
        campaign_id: null,
        channel: 'email',
        action: 'simulate_approve_queue',
        status: 'simulated',
        provider_message_id: null,
        error_message: null,
        idempotency_key: 'sim-abc',
        recipient: 'creator@glow.in',
        message_snapshot: '+HYPERLINK("http://evil")',
        created_at: '2026-01-01T00:00:00.000Z',
      },
    ]);
    assert.ok(logsCsv.includes("'+HYPERLINK"));
  });

  it('validates email eligibility rules, collaboration types, geography tiers, and classification codes', () => {
    assert.equal(
      checkEmailEligibility({ contactEmail: 'Not Found', emailStatus: 'not_found' }).eligible,
      false
    );
    assert.equal(
      checkEmailEligibility({ contactEmail: '', emailStatus: 'not_found' }).eligible,
      false
    );
    assert.equal(
      checkEmailEligibility({
        contactEmail: 'creator@glow.in',
        emailStatus: 'unverified',
        requireVerifiedForLive: false,
      }).eligible,
      true
    );
    assert.equal(
      checkEmailEligibility({
        contactEmail: 'creator@glow.in',
        emailStatus: 'unverified',
        requireVerifiedForLive: true,
        qualificationStatus: 'qualified',
      }).eligible,
      false
    );
    assert.equal(
      checkEmailEligibility({
        contactEmail: 'creator@glow.in',
        emailStatus: 'verified',
        requireVerifiedForLive: true,
        qualificationStatus: 'qualified',
      }).eligible,
      true
    );

    assert.equal(COLLABORATION_TYPES.length, 6);
    assert.ok(COLLABORATION_TYPES.includes('UGC creation'));
    assert.ok(COLLABORATION_TYPES.includes('Affiliate campaign'));

    const indiaPass = evaluateCreatorQualification(
      {
        name: 'Verified India Skincare',
        description: 'Daily cleanser and sunscreen review',
        recentVideoTitles: ['Sunscreen review'],
        country: 'IN',
        subscriberCount: 18000,
        engagementRate: 3.1,
        contactEmail: null,
      },
      DEFAULT_CRITERIA
    );
    assert.equal(indiaPass.geographyVerification, 'Verified');
    assert.equal(indiaPass.classificationCode, 'PASS');

    const dynamicNichePass = evaluateCreatorQualification(
      {
        name: 'Fit India Coach',
        description: 'Home strength fitness workout and nutrition guide',
        recentVideoTitles: ['15 minute workout'],
        country: 'IN',
        subscriberCount: 15000,
        engagementRate: 2.8,
        contactEmail: null,
      },
      { ...DEFAULT_CRITERIA, niche: 'Fitness' }
    );
    assert.equal(dynamicNichePass.classificationCode, 'PASS');
  });
});

describe('Multi-Platform Contact Discovery, Channel Selection & Status Mapping', () => {
  it('extracts Instagram, LinkedIn, YouTube, and external contact URLs strictly from explicit links without guessing by name', () => {
    const bio = [
      'Skincare & beauty educator based in Mumbai.',
      'IG: @ananya.skin | https://www.instagram.com/ananya.skin/',
      'LinkedIn: https://www.linkedin.com/in/ananya-skin-creator',
      'Contact form: https://ananyaskin.in/collaborate',
      'Recent reel: https://www.instagram.com/p/C9xyz123/',
    ].join('\n');

    const extracted = extractPublicContactChannelsFromText({
      text: bio,
      sourceLabel: 'youtube_channel_description',
      sourceUrl: 'https://www.youtube.com/channel/UCtest123',
      discoveredAt: '2026-11-14T00:00:00.000Z',
    });

    const ig = extracted.find((c) => c.type === 'instagram');
    const li = extracted.find((c) => c.type === 'linkedin');
    const other = extracted.find((c) => c.type === 'other_contact');

    assert.ok(ig);
    assert.equal(ig.url, 'https://www.instagram.com/ananya.skin/');
    assert.equal(ig.linkingConfidence, 'explicit_link');
    assert.ok(li);
    assert.equal(li.url, 'https://www.linkedin.com/in/ananya-skin-creator');
    assert.ok(other);
    assert.equal(other.url, 'https://ananyaskin.in/collaborate');

    // Bio with only a creator name and zero links must NOT guess Instagram or LinkedIn handles
    const nameOnlyExtracted = extractPublicContactChannelsFromText({
      text: 'Hi I am Ananya Verma, skincare creator!',
      sourceLabel: 'youtube_channel_description',
      discoveredAt: '2026-11-14T00:00:00.000Z',
    });
    assert.equal(nameOnlyExtracted.length, 0);
  });

  it('evaluates channel availability & fallback recommendations across all 5 creator scenarios', () => {
    const baseInf = {
      id: '11111111-1111-4111-8111-111111111111',
      owner_id: null,
      platform: 'youtube',
      name: 'Creator Test',
      username: '@creatortest',
      profile_url: 'https://www.youtube.com/channel/UC123',
      country: 'India',
      niche: 'Beauty & Skincare',
      content_themes: ['Skincare'],
      follower_count: 15000,
      engagement_rate: 3.5,
      engagement_source: null,
      contact_email: null as string | null,
      email_status: 'not_found' as 'verified' | 'unverified' | 'not_found',
      website: null as string | null,
      audience_age: null,
      audience_gender: null,
      audience_geography: null,
      fit_score: 80,
      is_top_pick: false,
      data_source: 'youtube_data_api_v3',
      source_metadata: null as Record<string, unknown> | null,
      source_retrieved_at: '2026-11-14T00:00:00.000Z',
      last_verified_at: null,
      created_at: '2026-11-14T00:00:00.000Z',
      updated_at: '2026-11-14T00:00:00.000Z',
      contact_channels: null as ReturnType<typeof buildCreatorContactChannels> | null,
      preferred_channel: null as 'email' | 'instagram_dm' | 'linkedin_message' | 'youtube_contact' | null,
    };

    // Scenario 1: Creator with Email + Instagram
    const s1Inf = {
      ...baseInf,
      contact_email: 'team@skincreator.in',
      email_status: 'unverified' as const,
      source_metadata: {
        contactChannels: [
          {
            type: 'instagram',
            value: '@skincreator',
            url: 'https://www.instagram.com/skincreator/',
            username: 'skincreator',
            source: 'youtube_channel_description',
            verificationStatus: 'found_publicly',
            linkingConfidence: 'explicit_link',
            discoveredAt: '2026-11-14T00:00:00.000Z',
          },
        ],
      },
    };
    const s1Eval = evaluateCreatorChannels({
      influencer: s1Inf,
      contactChannels: buildCreatorContactChannels(s1Inf),
      outreachMode: 'simulation',
    });
    assert.equal(s1Eval.recommendedChannel, 'email');
    assert.equal(s1Eval.availability.find((a) => a.channel === 'instagram_dm')?.available, true);
    assert.equal(s1Eval.availability.find((a) => a.channel === 'linkedin_message')?.available, false);

    // Scenario 2: Creator with LinkedIn + Email
    const s2Inf = {
      ...baseInf,
      contact_email: 'biz@creatorpro.in',
      email_status: 'verified' as const,
      source_metadata: {
        contactChannels: [
          {
            type: 'linkedin',
            value: 'https://www.linkedin.com/in/creatorpro',
            url: 'https://www.linkedin.com/in/creatorpro',
            source: 'user_manual_confirmation',
            verificationStatus: 'user_confirmed',
            linkingConfidence: 'user_confirmed',
            discoveredAt: '2026-11-14T00:00:00.000Z',
          },
        ],
      },
    };
    const s2Eval = evaluateCreatorChannels({
      influencer: s2Inf,
      contactChannels: buildCreatorContactChannels(s2Inf),
      outreachMode: 'simulation',
    });
    assert.equal(s2Eval.availability.find((a) => a.channel === 'email')?.available, true);
    assert.equal(s2Eval.availability.find((a) => a.channel === 'linkedin_message')?.available, true);
    assert.equal(s2Eval.availability.find((a) => a.channel === 'linkedin_message')?.sendingMethod, 'manual');

    // Scenario 3: Creator with YouTube + public email
    const s3Inf = {
      ...baseInf,
      contact_email: 'yt@glowchannel.in',
      email_status: 'unverified' as const,
    };
    const s3Eval = evaluateCreatorChannels({
      influencer: s3Inf,
      contactChannels: buildCreatorContactChannels(s3Inf),
      outreachMode: 'simulation',
    });
    assert.equal(s3Eval.availability.find((a) => a.channel === 'youtube_contact')?.available, true);
    assert.equal(s3Eval.availability.find((a) => a.channel === 'email')?.available, true);

    // Scenario 4: Creator with NO public email -> fallback recommendation
    const s4Inf = {
      ...baseInf,
      platform: 'instagram',
      username: 'igbeauty',
      profile_url: 'https://www.instagram.com/igbeauty/',
      contact_email: null,
      email_status: 'not_found' as const,
    };
    const s4Eval = evaluateCreatorChannels({
      influencer: s4Inf,
      contactChannels: buildCreatorContactChannels(s4Inf),
      outreachMode: 'simulation',
    });
    const emailAv = s4Eval.availability.find((a) => a.channel === 'email');
    assert.equal(emailAv?.available, false);
    assert.equal(emailAv?.recommendedAlternative, 'instagram_dm');
    assert.equal(s4Eval.recommendedChannel, 'instagram_dm');

    // Scenario 5: Creator with multiple verified channels and explicit preference
    const s5Inf = {
      ...s2Inf,
      preferred_channel: 'linkedin_message' as const,
      source_metadata: {
        preferredChannel: 'linkedin_message',
        contactChannels: [
          ...((s2Inf.source_metadata?.contactChannels as unknown[]) ?? []),
          {
            type: 'instagram',
            value: '@creatorpro',
            url: 'https://www.instagram.com/creatorpro/',
            username: 'creatorpro',
            source: 'website_html',
            verificationStatus: 'found_publicly',
            linkingConfidence: 'explicit_link',
            discoveredAt: '2026-11-14T00:00:00.000Z',
          },
        ],
      },
    };
    const s5Eval = evaluateCreatorChannels({
      influencer: s5Inf,
      contactChannels: buildCreatorContactChannels(s5Inf),
      outreachMode: 'simulation',
    });
    assert.equal(s5Eval.preferredChannel, 'linkedin_message');
    assert.equal(s5Eval.recommendedChannel, 'email');
    assert.equal(s5Eval.availability.filter((a) => a.available).length, 4);
  });

  it('validates LinkedIn/YouTube word counts, manual channel URLs, and unified status mapping', () => {
    const makeWords = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(' ');
    assert.equal(validateLinkedInMessageWordCount(makeWords(19)).valid, false);
    assert.equal(validateLinkedInMessageWordCount(makeWords(20)).valid, true);
    assert.equal(validateLinkedInMessageWordCount(makeWords(75)).valid, true);
    assert.equal(validateLinkedInMessageWordCount(makeWords(76)).valid, false);

    assert.equal(validateYouTubeOutreachWordCount(makeWords(29)).valid, false);
    assert.equal(validateYouTubeOutreachWordCount(makeWords(30)).valid, true);
    assert.equal(validateYouTubeOutreachWordCount(makeWords(90)).valid, true);
    assert.equal(validateYouTubeOutreachWordCount(makeWords(91)).valid, false);

    const validLi = validateManualContactChannelInput({
      type: 'linkedin',
      value: 'linkedin.com/in/priya-skincare',
    });
    assert.equal(validLi.url, 'https://www.linkedin.com/in/priya-skincare');
    assert.throws(() =>
      validateManualContactChannelInput({ type: 'linkedin', value: 'https://example.com/not-li' })
    );

    assert.equal(
      mapToUnifiedOutreachStatus({ messageStatus: 'pending_review' }),
      'ready_for_review'
    );
    assert.equal(
      mapToUnifiedOutreachStatus({ messageStatus: 'approved', latestLogAction: 'manual_linkedin_message_ready' }),
      'ready_for_manual_sending'
    );
    assert.equal(
      mapToUnifiedOutreachStatus({ messageStatus: 'approved', latestLogStatus: 'simulated' }),
      'simulated'
    );
    assert.equal(
      mapToUnifiedOutreachStatus({ messageStatus: 'rejected' }),
      'skipped'
    );
  });
});
