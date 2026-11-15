import 'dotenv/config';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', override: false });

function resolveBaseUrl(): string {
  const argIdx = process.argv.indexOf('--url');
  if (argIdx >= 0 && process.argv[argIdx + 1]) {
    return process.argv[argIdx + 1].replace(/\/+$/, '');
  }
  return (process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '');
}

async function runSmokeTest(): Promise<void> {
  const baseUrl = resolveBaseUrl();
  console.log(`Running MicroReach AI read-only smoke test against: ${baseUrl}`);

  const healthRes = await fetch(`${baseUrl}/api/health`);
  if (!healthRes.ok) {
    throw new Error(`/api/health failed with HTTP ${healthRes.status}`);
  }
  const health = (await healthRes.json()) as Record<string, unknown>;
  console.log('Health check:', JSON.stringify(health));

  const campaignsRes = await fetch(`${baseUrl}/api/campaigns?init=true`);
  if (campaignsRes.status === 503) {
    console.log('Supabase not configured (HTTP 503); skipping Supabase-dependent smoke checks.');
    return;
  }
  if (!campaignsRes.ok) {
    throw new Error(`/api/campaigns?init=true failed (${campaignsRes.status})`);
  }
  const campaignsJson = (await campaignsRes.json()) as { campaigns?: Array<{ id: string; name: string }> };
  console.log(`Campaigns accessible directly: ${campaignsJson.campaigns?.length ?? 0}`);

  const influencersRes = await fetch(`${baseUrl}/api/influencers?limit=25`);
  if (!influencersRes.ok) {
    throw new Error(`/api/influencers failed (${influencersRes.status})`);
  }
  const influencersJson = (await influencersRes.json()) as { totalCount?: number };
  console.log(`Stored creators accessible: ${influencersJson.totalCount ?? 0}`);

  const gmailRes = await fetch(`${baseUrl}/api/integrations/gmail/status`);
  if (!gmailRes.ok) {
    throw new Error(`/api/integrations/gmail/status failed (${gmailRes.status})`);
  }
  const gmailJson = (await gmailRes.json()) as { connected?: boolean; outreachMode?: string };
  console.log(
    `Gmail status: connected=${Boolean(gmailJson.connected)} outreachMode=${gmailJson.outreachMode ?? 'unknown'}`
  );

  const csvCreatorsRes = await fetch(`${baseUrl}/api/influencers/export.csv`);
  if (!csvCreatorsRes.ok) {
    throw new Error(`/api/influencers/export.csv failed (${csvCreatorsRes.status})`);
  }
  console.log(`Creators CSV export OK (${csvCreatorsRes.headers.get('content-type')})`);

  const csvLogsRes = await fetch(`${baseUrl}/api/outreach/logs/export.csv`);
  if (!csvLogsRes.ok) {
    throw new Error(`/api/outreach/logs/export.csv failed (${csvLogsRes.status})`);
  }
  console.log(`Outreach logs CSV export OK (${csvLogsRes.headers.get('content-type')})`);

  console.log('All read-only smoke checks passed.');
}

runSmokeTest().catch((err) => {
  console.error('Smoke test failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
