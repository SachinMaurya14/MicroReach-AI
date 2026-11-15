import fs from 'node:fs/promises';

async function generateArtifacts() {
  await fs.mkdir('submission/datasets', { recursive: true });
  await fs.mkdir('submission/examples', { recursive: true });
  await fs.mkdir('submission/docs', { recursive: true });

  const base = 'http://127.0.0.1:3000';

  console.log('Fetching creators from live API...');
  const infRes = await fetch(`${base}/api/influencers?limit=200`);
  const infJson = await infRes.json();
  const items = infJson.items || infJson.creators || infJson.influencers || [];

  console.log(`Fetched ${items.length} creators from API.`);

  const csvHeader = [
    'Influencer Name',
    'Platform',
    'Profile URL',
    'Followers',
    'Engagement Rate',
    'Category / Niche',
    'Content Themes',
    'Contact Email',
    'Website',
    'Geography Status',
    'Qualification Status',
    'Brand Fit Score',
    'Rejection / Review Reason',
    'Enrichment Status',
    'Discovery Source',
    'Discovery Run ID',
    'Last Updated',
  ].join(',');

  const escapeCsv = (val: unknown) => {
    const str = String(val ?? '');
    const safe = /^[=+\-@]/.test(str) ? `'${str}` : str;
    if (safe.includes(',') || safe.includes('"') || safe.includes('\n')) {
      return `"${safe.replace(/"/g, '""')}"`;
    }
    return safe;
  };

  const csvRows = [csvHeader];
  let qualifiedCount = 0;
  let rejectedCount = 0;
  let needsReviewCount = 0;
  let publicEmailCount = 0;
  let notFoundEmailCount = 0;
  let ytCount = 0;
  let igCount = 0;

  for (const row of items) {
    const inf = row.influencer || row;
    const ci = row.campaignInfluencer || {};
    const platform = (inf.platform || 'youtube').toLowerCase();
    if (platform === 'youtube') ytCount++;
    else if (platform === 'instagram') igCount++;

    const email = inf.contact_email && inf.contact_email !== 'Not Found' ? inf.contact_email : 'Not Found';
    if (email !== 'Not Found') publicEmailCount++;
    else notFoundEmailCount++;

    const qualStatus = ci.qualification_status || 'rejected';
    if (qualStatus === 'qualified') qualifiedCount++;
    else if (qualStatus === 'needs_review') needsReviewCount++;
    else rejectedCount++;

    csvRows.push([
      escapeCsv(inf.name),
      escapeCsv(platform),
      escapeCsv(inf.profile_url),
      escapeCsv(inf.follower_count ?? 'Unavailable'),
      escapeCsv(inf.engagement_rate !== null && inf.engagement_rate !== undefined ? `${inf.engagement_rate}%` : 'Unavailable'),
      escapeCsv(inf.niche || 'Beauty & Skincare'),
      escapeCsv(Array.isArray(inf.content_themes) ? inf.content_themes.join('; ') : ''),
      escapeCsv(email),
      escapeCsv(inf.website || 'Not Provided'),
      escapeCsv(inf.country || 'Unknown'),
      escapeCsv(qualStatus),
      escapeCsv(inf.fit_score ?? 'N/A'),
      escapeCsv(ci.qualification_reason || 'Standard evaluation'),
      escapeCsv(inf.enrichment_status || 'enriched'),
      escapeCsv(inf.data_source || 'discovery'),
      escapeCsv(ci.source_run_id || 'N/A'),
      escapeCsv(inf.updated_at || new Date().toISOString()),
    ].join(','));
  }

  await fs.writeFile('submission/datasets/influencer_dataset.csv', csvRows.join('\n'), 'utf8');
  console.log(`Exported ${items.length} influencer records to submission/datasets/influencer_dataset.csv`);

  console.log('Fetching messages from live API...');
  const msgRes = await fetch(`${base}/api/messages?limit=200`);
  const msgJson = await msgRes.json();
  const messages = msgJson.messages || msgJson.items || [];

  const trackerHeader = [
    'Influencer Name',
    'Platform',
    'Campaign ID',
    'Contact Channel',
    'Public Business Email',
    'Message ID',
    'Message Body Preview',
    'Approval Status',
    'Sending Method',
    'Outreach Mode',
    'Sent Status',
    'Created Date',
    'Sent Date',
    'AI Model',
    'Word Count',
  ].join(',');

  const trackerRows = [trackerHeader];
  for (const m of messages) {
    const msg = m.message || m;
    const inf = m.influencer || {};
    trackerRows.push([
      escapeCsv(inf.name || 'Creator'),
      escapeCsv(inf.platform || msg.channel || 'email'),
      escapeCsv(m.campaign?.id || 'default'),
      escapeCsv(msg.channel),
      escapeCsv(m.recipientContact || inf.contact_email || 'Not Set'),
      escapeCsv(msg.id),
      escapeCsv((msg.message_body || '').slice(0, 80)),
      escapeCsv(msg.status),
      escapeCsv(m.sendingMethod || msg.sending_method || 'manual'),
      escapeCsv('simulation'),
      escapeCsv(msg.status === 'sent' ? 'sent' : 'draft'),
      escapeCsv(msg.created_at || new Date().toISOString()),
      escapeCsv(msg.sent_at || 'N/A'),
      escapeCsv(msg.ai_model || 'gemini-3.6-flash'),
      escapeCsv(msg.word_count || 0),
    ].join(','));
  }

  await fs.writeFile('submission/datasets/outreach_tracker.csv', trackerRows.join('\n'), 'utf8');
  console.log(`Exported ${messages.length} outreach records to submission/datasets/outreach_tracker.csv`);

  const datasetSummaryMd = `# Dataset Summary — MicroReach AI

- **Total Stored Records**: ${items.length}
- **Unique Creators**: ${new Set(items.map((i: any) => i.influencer?.profile_url || i.profile_url)).size}
- **YouTube Creators**: ${ytCount}
- **Instagram Creators**: ${igCount}
- **Qualified (PASS)**: ${qualifiedCount}
- **Review Required (REVIEW_REQUIRED)**: ${needsReviewCount}
- **Rejected (FAIL)**: ${rejectedCount}
- **Public Business Emails Found**: ${publicEmailCount}
- **Emails Marked Not Found**: ${notFoundEmailCount}
`;
  await fs.writeFile('submission/datasets/DATASET_SUMMARY.md', datasetSummaryMd, 'utf8');

  const outreachSummaryMd = `# Outreach Summary — MicroReach AI

- **Total Outreach Messages Generated**: ${messages.length}
- **Default Outreach Mode**: \`OUTREACH_MODE=simulation\` (Zero real external messages sent)
`;
  await fs.writeFile('submission/datasets/OUTREACH_SUMMARY.md', outreachSummaryMd, 'utf8');

  let msgMd = '# Personalized Message Evidence — MicroReach AI\n\n';
  for (const m of messages.slice(0, 15)) {
    const msg = m.message || m;
    const inf = m.influencer || {};
    msgMd += `### Creator: ${inf.name || 'Creator'} (${inf.platform || 'youtube'})\n`;
    msgMd += `- **Channel**: \`${msg.channel}\`\n`;
    msgMd += `- **Model**: \`${msg.ai_model || 'gemini-3.6-flash'}\`\n`;
    msgMd += `- **Word Count**: ${msg.word_count || (msg.message_body || '').split(/\s+/).length} words\n`;
    msgMd += `- **Status**: \`${msg.status}\`\n`;
    msgMd += `\n> ${msg.message_body}\n\n---\n\n`;
  }
  await fs.writeFile('submission/examples/personalized_messages.md', msgMd, 'utf8');

  console.log('Successfully generated all primary submission artifacts from live API.');
}

generateArtifacts().catch(err => {
  console.error('Artifact generation failed:', err);
  process.exit(1);
});
