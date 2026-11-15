import React from 'react';
import { Award, ExternalLink } from 'lucide-react';
import { InfluencerDemoProfile } from '../../types/influencer';
import { PlatformIcon } from '../ui/PlatformIcon';

interface CreatorListViewProps {
  profiles: InfluencerDemoProfile[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onClearFilters: () => void;
  onInspectProfile?: (profile: InfluencerDemoProfile) => void;
}

export const CreatorListView: React.FC<CreatorListViewProps> = ({
  profiles,
  selectedIds,
  onToggleSelect,
  onClearFilters,
  onInspectProfile,
}) => {
  if (profiles.length === 0) {
    return (
      <div className="mr-influencers-card p-10 text-center">
        <p className="text-base font-semibold text-[#111827]">
          No creators match these filters
        </p>
        <button
          type="button"
          onClick={onClearFilters}
          className="mt-4 inline-flex items-center rounded-full bg-[#5B21B6] px-4 py-2 text-xs font-semibold text-white hover:bg-[#6D28D9] cursor-pointer"
        >
          Clear Filters
        </button>
      </div>
    );
  }

  return (
    <div className="mr-influencers-card overflow-x-auto mr-scroll-thin">
      <table className="w-full min-w-[780px] border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB] text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
            <th className="py-3 pl-4 pr-2 w-10">Select</th>
            <th className="py-3 px-3">Creator</th>
            <th className="py-3 px-3">Status &amp; Niche</th>
            <th className="py-3 px-3">Est. Public Eng.</th>
            <th className="py-3 px-3">Contact Email</th>
            <th className="py-3 px-3">Instagram / TikTok</th>
            <th className="py-3 px-3">YouTube</th>
            {onInspectProfile && <th className="py-3 px-4 text-right">Enrichment</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E5E7EB] mr-tabular">
          {profiles.map((profile) => {
            const isSelected = selectedIds.includes(profile.id);
            const disconnectedText = profile.isLiveRecord ? 'Not Connected' : 'N/A';

            return (
              <tr
                key={profile.id}
                className={isSelected ? 'bg-[#F5F3FF]/60' : 'hover:bg-[#F9FAFB]'}
              >
                <td className="py-3 pl-4 pr-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(profile.id)}
                    aria-label={`Select ${profile.name}`}
                    className="h-4 w-4 rounded border-[#D1D5DB] text-[#5B21B6] cursor-pointer"
                  />
                </td>
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                      style={{
                        backgroundColor: profile.avatarBg,
                        color: profile.avatarText,
                      }}
                    >
                      {profile.initials}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5 font-semibold text-[#111827]">
                        <span>{profile.name}</span>
                        {profile.isTopPick && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-[#EDE9FE] px-1.5 py-0.5 text-[10px] font-bold text-[#5B21B6]">
                            <Award className="h-2.5 w-2.5" aria-hidden="true" />
                            <span>Top 5</span>
                          </span>
                        )}
                        {profile.profileUrl && (
                          <a
                            href={profile.profileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Open ${profile.name} profile`}
                            className="text-[#6B7280] hover:text-[#5B21B6]"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      <div className="text-[11px] text-[#6B7280]">{profile.contextLine}</div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="inline-block rounded-full bg-[#EDE9FE] px-2.5 py-0.5 text-[11px] font-medium text-[#5B21B6]">
                        {profile.primaryNiche}
                      </span>
                      {profile.qualificationStatus && (
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            profile.qualificationStatus === 'qualified'
                              ? 'bg-[#D1FAE5] text-[#059669]'
                              : profile.qualificationStatus === 'needs_review'
                                ? 'bg-[#FEF3C7] text-[#92400E]'
                                : 'bg-[#FEE2E2] text-[#DC2626]'
                          }`}
                        >
                          {profile.qualificationStatus === 'qualified'
                            ? 'PASS'
                            : profile.qualificationStatus === 'needs_review'
                              ? 'REVIEW'
                              : 'FAIL'}
                        </span>
                      )}
                    </div>
                    {profile.qualificationReason && (
                      <div className="text-[10.5px] text-[#6B7280] max-w-[220px] truncate" title={profile.qualificationReason}>
                        {profile.qualificationReason}
                      </div>
                    )}
                  </div>
                </td>
                <td className="py-3 px-3 font-medium text-[#111827]">
                  {profile.engagementRate !== null && profile.engagementRate !== undefined
                    ? `${profile.engagementRate.toFixed(1)}% est.`
                    : 'Unavailable'}
                </td>
                <td className="py-3 px-3 text-[#4B5563]">
                  <div>
                    <div>
                      {profile.isLiveRecord
                        ? profile.contactEmail || 'Not Found'
                        : 'Demo Preview'}
                    </div>
                    {profile.contactChannels && profile.contactChannels.length > 0 && (
                      <div className="mt-0.5 text-[10px] text-[#5B21B6] font-medium">
                        {Array.from(
                          new Set(
                            profile.contactChannels.map((c) =>
                              c.type === 'instagram'
                                ? 'IG'
                                : c.type === 'linkedin'
                                  ? 'LinkedIn'
                                  : c.type === 'youtube'
                                    ? 'YouTube'
                                    : c.type === 'email'
                                      ? 'Email'
                                      : 'Link'
                            )
                          )
                        ).join(' · ')}
                      </div>
                    )}
                  </div>
                </td>
                <td className="py-3 px-3 text-[#6B7280]">
                  <span className="inline-flex items-center gap-1.5">
                    <PlatformIcon platform="instagram" size={13} />
                    <span>{profile.platforms.instagram ?? disconnectedText}</span>
                    <span>/</span>
                    <span>{profile.platforms.tiktok ?? disconnectedText}</span>
                  </span>
                </td>
                <td className="py-3 px-3 font-medium text-[#111827]">
                  <span className="inline-flex items-center gap-1.5">
                    <PlatformIcon platform="youtube" size={14} />
                    <span>{profile.platforms.youtube ?? 'Unavailable'}</span>
                  </span>
                </td>
                {onInspectProfile && (
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => onInspectProfile(profile)}
                      className="text-[11px] font-semibold text-[#5B21B6] hover:underline cursor-pointer"
                    >
                      Enrich / Details
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
