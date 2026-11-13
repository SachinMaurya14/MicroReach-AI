import React from 'react';
import { QualificationBadge } from '../ui/Badge';

const FILTERING_ROWS = [
  {
    creator: 'Creator A',
    followers: '24.5K',
    engagement: '3.4% est.',
    outcome: 'Passed' as const,
    reason: 'Beauty & Skincare, India, meets all thresholds',
  },
  {
    creator: 'Creator D',
    followers: '3.2K',
    engagement: '1.3% est.',
    outcome: 'Failed' as const,
    reason: 'Followers below 5K',
  },
  {
    creator: 'Creator F',
    followers: '142.0K',
    engagement: '3.2% est.',
    outcome: 'Failed' as const,
    reason: 'Followers above 100K',
  },
  {
    creator: 'Creator H',
    followers: '11.4K',
    engagement: '0.9% est.',
    outcome: 'Failed' as const,
    reason: 'Low estimated engagement',
  },
  {
    creator: 'Creator L',
    followers: '31.5K',
    engagement: '2.4% est.',
    outcome: 'Failed' as const,
    reason: 'Content not sufficiently relevant',
  },
  {
    creator: 'Creator K',
    followers: '9.6K',
    engagement: 'N/A',
    outcome: 'Failed' as const,
    reason: 'Insufficient public metrics',
  },
];

export const SmartFilteringPreview: React.FC = () => {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E5E7EB]">
        <span className="text-xs font-semibold text-[#1F2937]">
          Qualification Rules — Illustrative Demo Data
        </span>
        <span className="text-[11px] font-medium text-[#6B7280]">
          Metrics shown are public estimates
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-medium text-[#4B5563]">
        <span className="rounded-md bg-white px-2.5 py-1 border border-[#E5E7EB]">
          Niche: Beauty &amp; Skincare
        </span>
        <span className="rounded-md bg-white px-2.5 py-1 border border-[#E5E7EB]">
          Geography: India preferred
        </span>
        <span className="rounded-md bg-white px-2.5 py-1 border border-[#E5E7EB]">
          Followers: 5K–100K
        </span>
        <span className="rounded-md bg-white px-2.5 py-1 border border-[#E5E7EB]">
          Est. Engagement: &ge; 2%
        </span>
      </div>

      <div className="mt-3 overflow-x-auto rounded-lg border border-[#E5E7EB] bg-white">
        <table className="w-full min-w-[460px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB] text-[11px] font-semibold text-[#6B7280]">
              <th className="py-2 px-3">Creator</th>
              <th className="py-2 px-2.5">Followers</th>
              <th className="py-2 px-2.5">Est. Eng.</th>
              <th className="py-2 px-2.5">Outcome</th>
              <th className="py-2 px-3">Criteria Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB] mr-tabular">
            {FILTERING_ROWS.map((row) => (
              <tr key={row.creator}>
                <td className="py-2 px-3 font-semibold text-[#1F2937]">{row.creator}</td>
                <td className="py-2 px-2.5 text-[#4B5563]">{row.followers}</td>
                <td className="py-2 px-2.5 text-[#4B5563]">{row.engagement}</td>
                <td className="py-2 px-2.5">
                  <QualificationBadge status={row.outcome} />
                </td>
                <td className="py-2 px-3 text-[#4B5563]">{row.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[11px] text-[#6B7280]">
        Engagement rates are public estimates computed from likes, comments, and subscriber counts—not official YouTube Studio analytics.
      </p>
    </div>
  );
};
