import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { QualificationBadge } from '../ui/Badge';

const DISCOVERY_DEMO_RESULTS = [
  {
    creator: 'Creator A',
    source: 'YouTube Public Channel',
    niche: 'Beauty & Skincare',
    geography: 'India',
    followers: '24.5K',
    status: 'Qualified' as const,
  },
  {
    creator: 'Creator B',
    source: 'YouTube Public Channel',
    niche: 'Beauty & Skincare',
    geography: 'India',
    followers: '58.2K',
    status: 'Review' as const,
  },
  {
    creator: 'Creator C',
    source: 'YouTube Public Channel',
    niche: 'Beauty & Skincare',
    geography: 'India',
    followers: '14.1K',
    status: 'Qualified' as const,
  },
  {
    creator: 'Creator D',
    source: 'YouTube Public Channel',
    niche: 'Lifestyle & Beauty',
    geography: 'India',
    followers: '3.2K',
    status: 'Failed' as const,
  },
];

export const DiscoveryTablePreview: React.FC = () => {
  const [niche, setNiche] = useState('Beauty & Skincare');
  const [geo, setGeo] = useState('India');
  const [size, setSize] = useState('5K - 100K');

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E5E7EB]">
        <span className="text-xs font-semibold text-[#1F2937]">
          Creator Discovery Query — Illustrative Demo Data
        </span>
        <span className="text-[11px] font-medium text-[#5B21B6]">
          Primary source: YouTube Data API v3
        </span>
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <label className="block">
          <span className="block text-[11px] font-medium text-[#6B7280] mb-1">Niche</span>
          <select
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            className="w-full rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-xs font-medium text-[#1F2937]"
          >
            <option>Beauty &amp; Skincare</option>
            <option>Skincare Routines</option>
            <option>Ingredient Reviews</option>
          </select>
        </label>
        <label className="block">
          <span className="block text-[11px] font-medium text-[#6B7280] mb-1">Geography</span>
          <select
            value={geo}
            onChange={(e) => setGeo(e.target.value)}
            className="w-full rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-xs font-medium text-[#1F2937]"
          >
            <option>India</option>
            <option>India (Preferred)</option>
          </select>
        </label>
        <label className="block">
          <span className="block text-[11px] font-medium text-[#6B7280] mb-1">Creator Size</span>
          <select
            value={size}
            onChange={(e) => setSize(e.target.value)}
            className="w-full rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-xs font-medium text-[#1F2937]"
          >
            <option>5K - 100K</option>
            <option>10K - 50K</option>
          </select>
        </label>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 border border-[#E5E7EB]">
        <div className="flex items-center gap-2 text-xs text-[#4B5563]">
          <Search className="h-3.5 w-3.5 text-[#5B21B6]" aria-hidden="true" />
          <span>
            Query: {niche} · {geo} · {size}
          </span>
        </div>
        <span className="text-[11px] font-semibold text-[#5B21B6]">50+ profile test target</span>
      </div>

      <div className="mt-3 overflow-x-auto rounded-lg border border-[#E5E7EB] bg-white">
        <table className="w-full min-w-[440px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB] text-[11px] font-semibold text-[#6B7280]">
              <th className="py-2 px-3">Creator</th>
              <th className="py-2 px-3">Public Source</th>
              <th className="py-2 px-3">Followers</th>
              <th className="py-2 px-3">Fit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB] mr-tabular">
            {DISCOVERY_DEMO_RESULTS.map((row) => (
              <tr key={row.creator}>
                <td className="py-2.5 px-3 font-semibold text-[#1F2937]">{row.creator}</td>
                <td className="py-2.5 px-3 text-[#4B5563]">{row.source}</td>
                <td className="py-2.5 px-3 text-[#1F2937] font-medium">{row.followers}</td>
                <td className="py-2.5 px-3">
                  <QualificationBadge status={row.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-[#6B7280]">
        Initial discovery target: at least 50 genuine creator profiles for the assignment test run.
        Actual volume depends on API access and available public data.
      </p>
    </div>
  );
};
