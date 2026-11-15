import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, describe, it } from 'node:test';
import { createApp } from '../server/app.ts';

describe('Express API Security & Route Contracts', () => {
  const savedEnv: Record<string, string | undefined> = {};
  const managedKeys = [
    'DEMO_ACCESS_TOKEN',
    'DEMO_SESSION_SECRET',
    'OUTREACH_MODE',
    'SUPABASE_URL',
    'SUPABASE_SECRET_KEY',
  ];

  let server: http.Server;
  let baseUrl = '';
  let hostHeader = '';

  before(async () => {
    for (const k of managedKeys) {
      savedEnv[k] = process.env[k];
    }
    process.env.DEMO_ACCESS_TOKEN = 'test_invitation_token_secret_123456';
    process.env.DEMO_SESSION_SECRET = 'test_hmac_session_secret_9876543210abcdef';
    process.env.OUTREACH_MODE = 'simulation';

    const app = createApp();
    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });
    const addr = server.address() as AddressInfo;
    hostHeader = `127.0.0.1:${addr.port}`;
    baseUrl = `http://${hostHeader}`;
  });

  after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    for (const k of managedKeys) {
      if (savedEnv[k] === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = savedEnv[k];
      }
    }
  });

  it('serves /api/health without leaking secrets', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const bodyText = await res.text();
    const json = JSON.parse(bodyText) as Record<string, unknown>;
    assert.equal(json.status, 'ok');
    assert.equal(json.outreachMode, 'simulation');
    assert.equal(bodyText.includes('test_invitation_token_secret_123456'), false);
    assert.equal(bodyText.includes('test_hmac_session_secret_9876543210abcdef'), false);
  });

  it('allows direct workspace access without a demo session cookie while enforcing UUID and simulation guards', async () => {
    const badUuidRes = await fetch(`${baseUrl}/api/influencers/not-a-uuid`);
    assert.equal(badUuidRes.status, 400);
    const badUuidJson = (await badUuidRes.json()) as { error: string };
    assert.equal(badUuidJson.error, 'invalid_influencer_id');

    // Live email outreach remains blocked while OUTREACH_MODE=simulation
    const liveSendRes = await fetch(`${baseUrl}/api/outreach/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: baseUrl,
      },
      body: JSON.stringify({
        campaignInfluencerId: '11111111-1111-4111-8111-111111111111',
        outreachMessageId: '22222222-2222-4222-8222-222222222222',
        confirmSend: true,
      }),
    });
    assert.equal(liveSendRes.status, 409);
    const liveSendJson = (await liveSendRes.json()) as { error: string };
    assert.equal(liveSendJson.error, 'live_outreach_disabled');
  });

  it('rejects cross-origin state-changing requests via validateSameOrigin', async () => {
    const res = await fetch(`${baseUrl}/api/demo/access`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://untrusted-origin.example',
      },
      body: JSON.stringify({ token: 'test_invitation_token_secret_123456' }),
    });
    assert.equal(res.status, 403);
    const json = (await res.json()) as { error: string };
    assert.equal(json.error, 'origin_mismatch');
  });

  it('rejects invalid invitation token and issues HttpOnly session cookie on valid token', async () => {
    const badRes = await fetch(`${baseUrl}/api/demo/access`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: baseUrl,
      },
      body: JSON.stringify({ token: 'wrong_token' }),
    });
    assert.equal(badRes.status, 401);

    const okRes = await fetch(`${baseUrl}/api/demo/access`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: baseUrl,
      },
      body: JSON.stringify({ token: 'test_invitation_token_secret_123456' }),
    });
    assert.equal(okRes.status, 200);
    const setCookie = okRes.headers.get('set-cookie') || '';
    assert.ok(setCookie.includes('mr_demo_session='));
    assert.ok(setCookie.includes('HttpOnly'));
    assert.ok(setCookie.includes('SameSite=Strict'));

    const cookiePair = setCookie.split(';')[0];

    const sessionRes = await fetch(`${baseUrl}/api/demo/session`, {
      headers: { Cookie: cookiePair },
    });
    assert.equal(sessionRes.status, 200);
    const sessionJson = (await sessionRes.json()) as { authenticated: boolean };
    assert.equal(sessionJson.authenticated, true);
  });

  it('rejects OAuth callback missing parameters with 400 JSON', async () => {
    const res = await fetch(`${baseUrl}/api/integrations/gmail/callback`, {
      headers: { Accept: 'application/json' },
    });
    assert.equal(res.status, 400);
    const json = (await res.json()) as { error: string };
    assert.equal(json.error, 'invalid_oauth_callback');
  });
});
