import React, { useMemo, useState } from 'react';
import { Check, Copy, MoreVertical, RefreshCw, Save } from 'lucide-react';
import { copyToClipboard } from '../../utils/copyToClipboard';

interface EmailPitchCardProps {
  draft: string;
  isLiveRecord?: boolean;
  busy?: boolean;
  onChangeDraft: (value: string) => void;
  onSaveDraft?: () => void;
  onRegenerate: () => void;
}

export const EmailPitchCard: React.FC<EmailPitchCardProps> = ({
  draft,
  isLiveRecord = false,
  busy = false,
  onChangeDraft,
  onSaveDraft,
  onRegenerate,
}) => {
  const [copied, setCopied] = useState(false);

  const wordCount = useMemo(() => {
    const trimmed = draft.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [draft]);

  const inRange = wordCount >= 60 && wordCount <= 90;

  const handleCopy = async () => {
    const ok = await copyToClipboard(draft);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <div className="rounded-xl border border-[#DDD6FE] bg-[#F5F3FF] p-3.5">
      <div className="flex items-center justify-between gap-2 mb-2.5">
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

      {/* White Inner Email Window with macOS-style Window Dots */}
      <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-[#F3F4F6] bg-[#F9FAFB] px-3 py-2">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-[#EF4444]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#F59E0B]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#10B981]" />
          </div>
          <div className="flex items-center gap-1.5">
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
            <MoreVertical className="h-3.5 w-3.5 text-[#9CA3AF]" aria-hidden="true" />
          </div>
        </div>

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

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className="text-[11px] text-[#6B7280]">
          {isLiveRecord ? 'Gemini AI Draft' : 'Illustrative demo copy'}
        </span>
        <button
          type="button"
          onClick={onRegenerate}
          disabled={busy}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#5B21B6] hover:text-[#7C3AED] disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw
            className={`h-3 w-3 ${busy ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          <span>{busy ? 'Generating...' : 'Regenerate Draft'}</span>
        </button>
      </div>
    </div>
  );
};
