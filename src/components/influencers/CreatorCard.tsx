import React from 'react';
import { Award, Check, ExternalLink } from 'lucide-react';
import { InfluencerDemoProfile } from '../../types/influencer';
import { CreatorMetrics } from './CreatorMetrics';
import { CreatorThumbnailGrid } from './CreatorThumbnailGrid';

interface CreatorCardProps {
  profile: InfluencerDemoProfile;
  selected: boolean;
  onToggleSelect: (id: string) => void;
}

export const CreatorCard: React.FC<CreatorCardProps> = ({
  profile,
  selected,
  onToggleSelect,
}) => {
  const qualBadge =
    profile.qualificationStatus === 'qualified'
      ? { label: 'Qualified', cls: 'bg-[#D1FAE5] text-[#059669]' }
      : profile.qualificationStatus === 'needs_review'
        ? { label: 'Needs Review', cls: 'bg-[#FEF3C7] text-[#92400E]' }
        : profile.qualificationStatus === 'rejected'
          ? { label: 'Rejected', cls: 'bg-[#FEE2E2] text-[#DC2626]' }
          : null;

  return (
    <article
      className={`relative flex flex-col items-center rounded-[12px] border bg-white p-3 text-center transition-all ${
        selected
          ? 'border-[#5B21B6] ring-1 ring-[#5B21B6]/20'
          : 'border-[#E5E7EB] hover:border-[#D1D5DB]'
      }`}
      style={{ boxShadow: '0 2px 8px rgba(17, 24, 39, 0.04)' }}
    >
      {/* Top-left Selection Checkbox */}
      <button
        type="button"
        onClick={() => onToggleSelect(profile.id)}
        aria-label={`Select ${profile.name}`}
        aria-pressed={selected}
        className={`absolute left-3 top-3 inline-flex h-[18px] w-[18px] items-center justify-center rounded-[4px] border transition-colors cursor-pointer ${
          selected
            ? 'border-[#111827] bg-[#111827] text-white'
            : 'border-[#D1D5DB] bg-white hover:border-[#6B7280]'
        }`}
      >
        {selected && <Check className="h-3 w-3 stroke-[3]" aria-hidden="true" />}
      </button>

      {/* Top-right Top-5 Pick indicator */}
      {profile.isTopPick && (
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#EDE9FE] px-2 py-0.5 text-[10px] font-bold text-[#5B21B6]">
          <Award className="h-3 w-3" aria-hidden="true" />
          <span>Top 5</span>
        </span>
      )}

      {/* Centered 42px Circular Avatar */}
      <div
        className="mt-1 flex h-[42px] w-[42px] items-center justify-center rounded-full text-xs font-bold border border-[#E5E7EB]"
        style={{ backgroundColor: profile.avatarBg, color: profile.avatarText }}
      >
        {profile.initials}
      </div>

      {/* Creator Identity */}
      <div className="mt-2.5 flex items-center justify-center gap-1 max-w-full">
        <h3 className="text-[14px] font-semibold text-[#111827] leading-tight truncate">
          {profile.name}
        </h3>
        {profile.profileUrl && (
          <a
            href={profile.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${profile.name} YouTube channel`}
            className="text-[#6B7280] hover:text-[#5B21B6] shrink-0"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      <p className="mt-0.5 text-[11px] text-[#6B7280] truncate max-w-full">
        {profile.contextLine}
      </p>

      {/* Niche Tags Pill + Qualification Pill */}
      <div className="mt-2 mb-3 flex flex-wrap items-center justify-center gap-1">
        <span className="inline-block max-w-full truncate rounded-full bg-[#EDE9FE] px-2.5 py-0.5 text-[10.5px] font-medium text-[#5B21B6]">
          {profile.niches.slice(0, 3).join(', ')}
          {profile.overflowCount > 0 ? `, +${profile.overflowCount}` : ''}
        </span>
        {qualBadge && (
          <span
            title={profile.qualificationReason}
            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${qualBadge.cls}`}
          >
            {qualBadge.label}
          </span>
        )}
      </div>

      {/* 3x2 Content Thumbnail Collage */}
      <div className="w-full mb-3">
        <CreatorThumbnailGrid thumbnails={profile.thumbnails} />
      </div>

      {/* Bottom Platform Metrics */}
      <CreatorMetrics
        platforms={profile.platforms}
        isLiveRecord={profile.isLiveRecord}
      />
    </article>
  );
};
