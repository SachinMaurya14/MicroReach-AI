import React from 'react';
import {
  AlertCircle,
  Award,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Mail,
  Pencil,
  Trash2,
} from 'lucide-react';
import { DashboardCreatorRow } from '../../types/dashboard';
import { PlatformIcon } from '../ui/PlatformIcon';

interface CreatorTableRowProps {
  creator: DashboardCreatorRow;
  isSelected: boolean;
  isActiveInStudio: boolean;
  onToggleSelect: (id: string) => void;
  onPreviewPitch: (id: string) => void;
  onEdit: (creator: DashboardCreatorRow) => void;
  onDelete: (creator: DashboardCreatorRow) => void;
}

export const CreatorTableRow: React.FC<CreatorTableRowProps> = ({
  creator,
  isSelected,
  isActiveInStudio,
  onToggleSelect,
  onPreviewPitch,
  onEdit,
  onDelete,
}) => {
  const isPassed = creator.qualStatus === 'Passed';
  const isNeedsReview = creator.qualStatus === 'Needs Review';
  const isApproved = creator.qualStatus === 'Approved / Queued';

  return (
    <tr
      className={`transition-colors ${
        isActiveInStudio ? 'bg-[#F5F3FF]/60' : 'hover:bg-[#F9FAFB]'
      }`}
    >
      {/* Checkbox */}
      <td className="py-3.5 pl-4 pr-2 align-middle">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(creator.id)}
          aria-label={`Select ${creator.name}`}
          className="h-4 w-4 rounded border-[#D1D5DB] text-[#5B21B6] cursor-pointer"
        />
      </td>

      {/* Creator */}
      <td className="py-3.5 px-3 align-middle">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 shrink-0 rounded-full bg-[#EDE9FE] border border-[#DDD6FE] flex items-center justify-center text-xs font-bold text-[#5B21B6]">
            {creator.initials}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[13.5px] font-semibold text-[#111827] whitespace-nowrap">
                {creator.name}
              </span>
              {creator.isTopPick && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#EDE9FE] px-2 py-0.5 text-[10px] font-bold text-[#5B21B6]">
                  <Award className="h-2.5 w-2.5" aria-hidden="true" />
                  <span>Top 5</span>
                </span>
              )}
              {creator.profileUrl && (
                <a
                  href={creator.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open ${creator.name} public profile`}
                  className="text-[#6B7280] hover:text-[#5B21B6]"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            <span
              className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${creator.handleBgClass} ${creator.handleTextClass}`}
            >
              {creator.handle}
            </span>
          </div>
        </div>
      </td>

      {/* Platform */}
      <td className="py-3.5 px-3 align-middle">
        <div className="flex items-center gap-1.5">
          {creator.platforms.map((platform) => (
            <PlatformIcon key={platform} platform={platform} size={18} />
          ))}
        </div>
      </td>

      {/* Followers */}
      <td className="py-3.5 px-3 align-middle mr-tabular">
        <div className="text-[13.5px] font-bold text-[#111827]">{creator.followers}</div>
        <div className="text-[11px] text-[#6B7280]">subscribers</div>
      </td>

      {/* Engagement */}
      <td className="py-3.5 px-3 align-middle mr-tabular">
        <div className="text-[13.5px] font-bold text-[#111827]">{creator.engagement}</div>
        <div className="text-[11px] text-[#6B7280]">Est. Public Eng.</div>
      </td>

      {/* Qual. Status */}
      <td className="py-3.5 px-3 align-middle">
        {isPassed && (
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#D1FAE5] px-2.5 py-0.5 text-[11px] font-bold uppercase text-[#059669]">
              <Check className="h-3 w-3" aria-hidden="true" />
              <span>QUALIFIED</span>
            </span>
            <p className="mt-1 text-[11px] text-[#4B5563] leading-snug max-w-[180px]">
              ({creator.qualReason})
            </p>
          </div>
        )}

        {isNeedsReview && (
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF3C7] px-2.5 py-0.5 text-[11px] font-bold uppercase text-[#92400E]">
              <Clock className="h-3 w-3" aria-hidden="true" />
              <span>NEEDS REVIEW</span>
            </span>
            <p className="mt-1 text-[11px] text-[#92400E] leading-snug max-w-[180px]">
              ({creator.qualReason})
            </p>
          </div>
        )}

        {isApproved && (
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#EDE9FE] px-2.5 py-0.5 text-[11px] font-bold uppercase text-[#5B21B6]">
              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
              <span>APPROVED / QUEUED</span>
            </span>
            <p className="mt-1 text-[11px] text-[#5B21B6] leading-snug max-w-[180px]">
              ({creator.qualReason})
            </p>
          </div>
        )}

        {!isPassed && !isNeedsReview && !isApproved && (
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#FEE2E2] px-2.5 py-0.5 text-[11px] font-bold uppercase text-[#DC2626]">
              <AlertCircle className="h-3 w-3" aria-hidden="true" />
              <span>REJECTED</span>
            </span>
            <p className="mt-1 text-[11px] text-[#4B5563] leading-snug max-w-[180px]">
              ({creator.qualReason})
            </p>
          </div>
        )}
      </td>

      {/* Email / Contact */}
      <td className="py-3.5 px-3 align-middle">
        {creator.email === 'Not Found' ? (
          <span className="text-xs font-medium text-[#9CA3AF]">[Not Found]</span>
        ) : (
          <div>
            <div className="text-xs font-medium text-[#111827] whitespace-nowrap">
              {creator.email}
            </div>
            {creator.emailVerifiedDemo && (
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#D1FAE5] px-2 py-0.5 text-[10.5px] font-semibold text-[#059669]">
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                <span>
                  {creator.isLiveRecord ? 'public business email' : 'verified email (demo)'}
                </span>
              </span>
            )}
          </div>
        )}
      </td>

      {/* Actions */}
      <td className="py-3.5 pl-3 pr-4 align-middle">
        {isPassed || isNeedsReview || isApproved ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onPreviewPitch(creator.id)}
              className="rounded-lg border border-[#D1D5DB] bg-white px-3 py-1.5 text-xs font-semibold text-[#111827] hover:bg-[#F5F3FF] hover:border-[#5B21B6] hover:text-[#5B21B6] transition-colors cursor-pointer whitespace-nowrap"
            >
              Preview AI Pitch
            </button>
            <button
              type="button"
              onClick={() => onEdit(creator)}
              aria-label={`Edit ${creator.name}`}
              title="Manual review edit"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#4B5563] hover:bg-[#F9FAFB] hover:text-[#111827] cursor-pointer"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(creator)}
              aria-label={`Remove ${creator.name}`}
              title="Remove from campaign"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#4B5563] hover:bg-[#FEE2E2] hover:text-[#DC2626] cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onEdit(creator)}
              aria-label={`Edit ${creator.name}`}
              title="Manual review edit"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#4B5563] hover:bg-[#F9FAFB] hover:text-[#111827] cursor-pointer"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onPreviewPitch(creator.id)}
              aria-label={`Open AI Pitch Studio for ${creator.name}`}
              title="Preview Pitch Draft"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#4B5563] hover:bg-[#F5F3FF] hover:text-[#5B21B6] cursor-pointer"
            >
              <Mail className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(creator)}
              aria-label={`Delete ${creator.name}`}
              title="Remove from campaign"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#4B5563] hover:bg-[#FEE2E2] hover:text-[#DC2626] cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </td>
    </tr>
  );
};
