import React, { useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Hand,
  MessageSquarePlus,
  RefreshCw,
  Save,
  SkipForward,
} from 'lucide-react';
import { copyToClipboard } from '../../utils/copyToClipboard';
import { PlatformIcon } from '../ui/PlatformIcon';

type ManualDmStage = 'ready_for_manual_sending' | 'manually_sent' | 'failed' | 'skipped';

interface InstagramDMCardProps {
  dmText: string;
  dmStatus?: string;
  workflowStatus?: string;
  profileUrl?: string;
  isLiveRecord?: boolean;
  busy?: boolean;
  onChangeDraft?: (value: string) => void;
  onSaveDraft?: () => void;
  onRegenerate?: () => void;
  onGenerateFollowUp?: () => void;
  onLogManualDm?: (stage: ManualDmStage) => void;
}

export const InstagramDMCard: React.FC<InstagramDMCardProps> = ({
  dmText,
  dmStatus,
  workflowStatus,
  profileUrl,
  isLiveRecord = false,
  busy = false,
  onChangeDraft,
  onSaveDraft,
  onRegenerate,
  onGenerateFollowUp,
  onLogManualDm,
}) => {
  const [copied, setCopied] = useState(false);

  const wordCount = useMemo(() => {
    const trimmed = dmText.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [dmText]);

  // Copying to clipboard NEVER marks the DM as sent
  const handleCopy = async () => {
    const ok = await copyToClipboard(dmText);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const effectiveStatus = workflowStatus || dmStatus;
  const statusBadge =
    effectiveStatus === 'sent'
      ? { label: 'Sent (Manual)', cls: 'bg-[#D1FAE5] text-[#059669]' }
      : effectiveStatus === 'ready_for_manual_sending' || effectiveStatus === 'approved'
        ? { label: 'Ready for Manual Sending', cls: 'bg-[#EDE9FE] text-[#5B21B6]' }
        : effectiveStatus === 'skipped' || effectiveStatus === 'rejected'
          ? { label: 'Skipped', cls: 'bg-[#F3F4F6] text-[#4B5563]' }
          : effectiveStatus === 'failed'
            ? { label: 'Failed', cls: 'bg-[#FEE2E2] text-[#DC2626]' }
            : { label: 'Manual Workflow', cls: 'bg-[#FEF3C7] text-[#92400E]' };

  return (
    <div className="rounded-xl border border-[#DDD6FE] bg-[#F5F3FF] p-3.5 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold text-[#111827]">
          Instagram DM (15–30w)
        </span>
        <span
          className={`text-[11px] font-semibold mr-tabular ${
            wordCount >= 15 && wordCount <= 30 ? 'text-[#059669]' : 'text-[#5B21B6]'
          }`}
        >
          {wordCount}w
        </span>
      </div>

      <div className="flex items-start gap-2.5">
        <div className="mt-1 shrink-0">
          <PlatformIcon platform="instagram" size={18} />
        </div>
        <div className="flex-1 rounded-xl border border-[#E5E7EB] bg-white p-2.5 shadow-xs">
          {onChangeDraft ? (
            <textarea
              rows={4}
              aria-label="Instagram DM message draft"
              value={dmText}
              onChange={(e) => onChangeDraft(e.target.value)}
              className="w-full resize-y bg-white text-xs leading-relaxed text-[#111827] focus:outline-none"
            />
          ) : (
            <div className="text-xs leading-relaxed text-[#111827]">{dmText}</div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-semibold ${statusBadge.cls}`}
        >
          <Hand className="h-3 w-3" aria-hidden="true" />
          <span>{statusBadge.label}</span>
        </span>

        <div className="flex items-center gap-1.5">
          {isLiveRecord && onSaveDraft && (
            <button
              type="button"
              disabled={busy}
              onClick={onSaveDraft}
              className="inline-flex items-center gap-1 rounded-lg border border-[#D1D5DB] bg-white px-2 py-1 text-[11px] font-semibold text-[#4B5563] hover:text-[#5B21B6] cursor-pointer"
            >
              <Save className="h-3 w-3" aria-hidden="true" />
              <span>Save</span>
            </button>
          )}
          {profileUrl && (
            <a
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-[#D1D5DB] bg-white px-2 py-1 text-[11px] font-semibold text-[#4B5563] hover:text-[#5B21B6]"
            >
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
              <span>Open Profile</span>
            </a>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#D1D5DB] bg-white px-2.5 py-1 text-xs font-semibold text-[#111827] hover:bg-[#F9FAFB] transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-[#059669]" aria-hidden="true" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-[#4B5563]" aria-hidden="true" />
                <span>Copy DM</span>
              </>
            )}
          </button>
        </div>
      </div>

      {isLiveRecord && (onRegenerate || onGenerateFollowUp) && (
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#DDD6FE]/70">
          {onGenerateFollowUp && (
            <button
              type="button"
              disabled={busy}
              onClick={onGenerateFollowUp}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#4B5563] hover:text-[#5B21B6] disabled:opacity-50 cursor-pointer"
            >
              <MessageSquarePlus className="h-3 w-3" aria-hidden="true" />
              <span>Follow-up</span>
            </button>
          )}
          {onRegenerate && (
            <button
              type="button"
              disabled={busy}
              onClick={onRegenerate}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#5B21B6] hover:text-[#7C3AED] disabled:opacity-50 cursor-pointer ml-auto"
            >
              <RefreshCw className={`h-3 w-3 ${busy ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span>{busy ? 'Generating...' : 'Generate DM'}</span>
            </button>
          )}
        </div>
      )}

      {isLiveRecord && onLogManualDm && (
        <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-[#DDD6FE]/70">
          <button
            type="button"
            disabled={busy}
            onClick={() => onLogManualDm('ready_for_manual_sending')}
            className="rounded-md border border-[#D1D5DB] bg-white px-1.5 py-1 text-[10.5px] font-semibold text-[#5B21B6] hover:bg-[#EDE9FE] disabled:opacity-50 cursor-pointer"
          >
            Mark Ready
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onLogManualDm('manually_sent')}
            className="inline-flex items-center justify-center gap-1 rounded-md bg-[#059669] px-1.5 py-1 text-[10.5px] font-semibold text-white hover:bg-[#047857] disabled:opacity-50 cursor-pointer"
          >
            <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span>Confirm Sent</span>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onLogManualDm('skipped')}
            className="inline-flex items-center justify-center gap-1 rounded-md border border-[#D1D5DB] bg-white px-1.5 py-1 text-[10.5px] font-semibold text-[#6B7280] hover:bg-[#F3F4F6] disabled:opacity-50 cursor-pointer"
          >
            <SkipForward className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span>Skip</span>
          </button>
        </div>
      )}
    </div>
  );
};
