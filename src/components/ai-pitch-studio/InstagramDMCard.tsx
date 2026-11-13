import React, { useMemo, useState } from 'react';
import { Check, Copy, Hand } from 'lucide-react';
import { copyToClipboard } from '../../utils/copyToClipboard';
import { PlatformIcon } from '../ui/PlatformIcon';

interface InstagramDMCardProps {
  dmText: string;
  isLiveRecord?: boolean;
  onLogManualDm?: () => void;
}

export const InstagramDMCard: React.FC<InstagramDMCardProps> = ({
  dmText,
  isLiveRecord = false,
  onLogManualDm,
}) => {
  const [copied, setCopied] = useState(false);

  const wordCount = useMemo(() => {
    const trimmed = dmText.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [dmText]);

  const handleCopy = async () => {
    const ok = await copyToClipboard(dmText);
    if (ok) {
      setCopied(true);
      if (isLiveRecord && onLogManualDm) {
        onLogManualDm();
      }
      setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <div className="rounded-xl border border-[#DDD6FE] bg-[#F5F3FF] p-3.5">
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className="text-[13px] font-semibold text-[#111827]">
          Instagram DM (15–30w)
        </span>
        <span className="text-[11px] font-semibold text-[#5B21B6] mr-tabular">
          {wordCount}w
        </span>
      </div>

      <div className="flex items-start gap-2.5">
        <div className="mt-1 shrink-0">
          <PlatformIcon platform="instagram" size={18} />
        </div>
        <div className="flex-1 rounded-xl border border-[#E5E7EB] bg-white p-3 text-xs leading-relaxed text-[#111827] shadow-xs">
          {dmText}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 rounded-md bg-[#FEF3C7] px-2 py-0.5 text-[10.5px] font-semibold text-[#92400E]">
          <Hand className="h-3 w-3" aria-hidden="true" />
          <span>Manual Sending</span>
        </span>

        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#D1D5DB] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#111827] hover:bg-[#F9FAFB] transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-[#059669]" aria-hidden="true" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 text-[#4B5563]" aria-hidden="true" />
              <span>Copy to Clipboard</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
