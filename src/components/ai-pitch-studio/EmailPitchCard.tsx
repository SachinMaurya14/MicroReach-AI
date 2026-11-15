import React, { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  MessageSquarePlus,
  RefreshCw,
  Save,
  XCircle,
} from 'lucide-react';
import { copyToClipboard } from '../../utils/copyToClipboard';

const COLLABORATION_TYPES = [
  'Sponsorship',
  'Affiliate campaign',
  'UGC creation',
  'Brand ambassador program',
  'Paid product placement',
  'Barter collaboration',
] as const;

interface EmailPitchCardProps {
  draft: string;
  subject?: string;
  collaborationType?: string;
  personalizationSignals?: string[];
  isLiveRecord?: boolean;
  aiModel?: string | null;
  messageStatus?: string;
  busy?: boolean;
  onChangeDraft: (value: string) => void;
  onChangeSubject?: (value: string) => void;
  onSaveDraft?: () => void;
  onRejectDraft?: (reason: string) => void;
  onGenerateFollowUp?: () => void;
  onRegenerate: (collaborationType?: string) => void;
}

export const EmailPitchCard: React.FC<EmailPitchCardProps> = ({
  draft,
  subject = '',
  collaborationType = 'Sponsorship',
  personalizationSignals = [],
  isLiveRecord = false,
  aiModel = null,
  messageStatus,
  busy = false,
  onChangeDraft,
  onChangeSubject,
  onSaveDraft,
  onRejectDraft,
  onGenerateFollowUp,
  onRegenerate,
}) => {
  const [copied, setCopied] = useState(false);
  const [selectedCollab, setSelectedCollab] = useState<string>(collaborationType || 'Sponsorship');
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const wordCount = useMemo(() => {
    const trimmed = draft.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [draft]);

  const inRange = wordCount >= 60 && wordCount <= 90;

  const handleCopy = async () => {
    const fullText = subject ? `Subject: ${subject}\n\n${draft}` : draft;
    const ok = await copyToClipboard(fullText);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <div className="rounded-xl border border-[#DDD6FE] bg-[#F5F3FF] p-3.5 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold text-[#111827]">
          Email Pitch (60–90w)
        </span>
        <span
          className={`text-[11px] font-semibold mr-tabular ${
            inRange ? 'text-[#059669]' : 'text-[#5B21B6]'
          }`}
        >
          {wordCount}w
        </span>
      </div>

      {/* Collaboration Type Selector */}
      <div>
        <label
          htmlFor="studio-collab-type"
          className="block text-[10.5px] font-semibold uppercase tracking-wide text-[#6B7280] mb-1"
        >
          Collaboration Type
        </label>
        <select
          id="studio-collab-type"
          value={selectedCollab}
          onChange={(e) => setSelectedCollab(e.target.value)}
          disabled={busy}
          className="h-8 w-full rounded-lg border border-[#DDD6FE] bg-white px-2 text-xs font-medium text-[#111827]"
        >
          {COLLABORATION_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* White Inner Email Window with macOS-style Window Dots */}
      <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-[#F3F4F6] bg-[#F9FAFB] px-3 py-2">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-[#EF4444]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#F59E0B]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#10B981]" />
          </div>
          <div className="flex items-center gap-1">
            {isLiveRecord && onSaveDraft && (
              <button
                type="button"
                onClick={onSaveDraft}
                disabled={busy}
                aria-label="Save edited email draft"
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-[#4B5563] hover:bg-[#EDE9FE] hover:text-[#5B21B6] cursor-pointer"
              >
                <Save className="h-3 w-3" />
                <span>Save</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleCopy}
              aria-label="Copy email pitch text"
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-[#4B5563] hover:bg-[#EDE9FE] hover:text-[#5B21B6] cursor-pointer"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {onChangeSubject && (
          <div className="border-b border-[#F3F4F6] px-3 py-1.5 bg-white">
            <label htmlFor="studio-email-subject" className="sr-only">
              Email subject
            </label>
            <input
              id="studio-email-subject"
              type="text"
              value={subject}
              onChange={(e) => onChangeSubject(e.target.value)}
              placeholder="Subject line..."
              className="w-full text-[11.5px] font-semibold text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none"
            />
          </div>
        )}

        <label htmlFor="studio-email-draft" className="sr-only">
          Editable email pitch
        </label>
        <textarea
          id="studio-email-draft"
          rows={6}
          value={draft}
          onChange={(e) => onChangeDraft(e.target.value)}
          className="w-full resize-y bg-white p-3 text-xs leading-relaxed text-[#111827] focus:outline-none"
        />
      </div>

      {personalizationSignals.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {personalizationSignals.slice(0, 3).map((sig) => (
            <span
              key={sig}
              className="rounded-md bg-white border border-[#DDD6FE] px-1.5 py-0.5 text-[10px] font-medium text-[#5B21B6]"
            >
              {sig}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-[#6B7280] truncate">
          {aiModel ? `${aiModel}${messageStatus ? ` · ${messageStatus}` : ''}` : 'Gemini AI Draft'}
        </span>
        <button
          type="button"
          onClick={() => onRegenerate(selectedCollab)}
          disabled={busy}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#5B21B6] hover:text-[#7C3AED] disabled:opacity-50 cursor-pointer shrink-0"
        >
          <RefreshCw
            className={`h-3 w-3 ${busy ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          <span>{busy ? 'Generating...' : 'Regenerate'}</span>
        </button>
      </div>

      {isLiveRecord && (onGenerateFollowUp || onRejectDraft) && (
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#DDD6FE]/70">
          {onGenerateFollowUp && (
            <button
              type="button"
              onClick={onGenerateFollowUp}
              disabled={busy}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#4B5563] hover:text-[#5B21B6] disabled:opacity-50 cursor-pointer"
            >
              <MessageSquarePlus className="h-3 w-3" aria-hidden="true" />
              <span>Follow-up Draft</span>
            </button>
          )}
          {onRejectDraft && (
            <button
              type="button"
              onClick={() => setRejecting((prev) => !prev)}
              disabled={busy}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#DC2626] hover:underline disabled:opacity-50 cursor-pointer"
            >
              <XCircle className="h-3 w-3" aria-hidden="true" />
              <span>Reject Draft</span>
            </button>
          )}
        </div>
      )}

      {rejecting && onRejectDraft && (
        <div className="space-y-1.5 rounded-lg border border-[#FECACA] bg-white p-2">
          <input
            type="text"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason for rejecting draft..."
            className="w-full rounded border border-[#D1D5DB] px-2 py-1 text-[11px] text-[#111827]"
          />
          <div className="flex justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setRejecting(false)}
              className="text-[11px] text-[#6B7280] px-2 py-0.5 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onRejectDraft(rejectReason.trim() || 'Rejected in Pitch Studio review');
                setRejecting(false);
                setRejectReason('');
              }}
              className="rounded bg-[#DC2626] px-2 py-0.5 text-[11px] font-semibold text-white cursor-pointer"
            >
              Confirm Reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
