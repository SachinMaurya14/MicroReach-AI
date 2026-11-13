import { InfluencerDemoProfile } from '../types/influencer';

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function downloadDemoCSV(profiles: InfluencerDemoProfile[]): void {
  const headers = [
    'Demo Notice',
    'Creator Name',
    'Location',
    'Primary Niche',
    'Est. Engagement (%)',
    'Instagram Followers (Demo)',
    'TikTok Followers (Demo)',
    'YouTube Subscribers (Demo)',
  ];

  const rows = profiles.map((p) => [
    'Illustrative Demo Data Only',
    p.name,
    p.location,
    p.primaryNiche,
    p.engagementEstimate.toFixed(1),
    p.platforms.instagram ?? 'Unavailable',
    p.platforms.tiktok ?? 'Unavailable',
    p.platforms.youtube ?? 'Unavailable',
  ]);

  const csvContent = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((r) => r.map(escapeCsvCell).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'microreach-illustrative-demo-creators.csv';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
