import React, { useMemo, useState } from 'react';
import { Check, Copy, Hand, MessageSquare } from 'lucide-react';

const DEFAULT_DM_TEXT =
  'Hi Creator B, we enjoy your humid-weather skincare tips on YouTube and are partnering with India skincare creators for GlowCare. Open to a quick brief?';

export const InstagramDMPreview: React.FC = () => {
  const [dmText, setDmText] = useState(DEFAULT_DM_TEXT);
  const [copied, setCopied] = useState(false);

  const wordCount = useMemo(() => {
    const trimmed = dmText.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  }, [dmText]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(dmText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E5E7EB]">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1F2937]">
          <MessageSquare className="h-3.5 w-3.5 text-[#5B21B6]" aria-hidden="true" />
          <span>Direct Message Draft — Illustrative Demo</span>
        </span>
        <span className="text-[11px] font-semibold text-[#5B21B6] mr-tabular">
          {wordCount} words (Target: 15–30 words)
        </span>
      </div>

      {/* Original DM Thread Preview Card (no third-party trademarked artwork) */}
      <div className="mt-3 rounded-xl border border-[#E5E7EB] bg-white p-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-[#EDE9FE] flex items-center justify-center text-xs font-bold text-[#5B21B6]">
              CB
            </div>
            <div>
              <p className="text-xs font-semibold text-[#1F2937]">Creator B (Demo)</p>
              <p className="text-[11px] text-[#6B7280]">@creator_b_routines · Beauty &amp; Skincare</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-md bg-[#FEF3C7] px-2 py-0.5 text-[11px] font-semibold text-[#92400E]">
            <Hand className="h-3 w-3" aria-hidden="true" />
            <span>Manual Sending</span>
          </span>
        </div>

        <div className="my-4 flex justify-end">
          <div className="max-w-[90%] rounded-2xl rounded-br-sm bg-[#5B21B6] px-4 py-3 text-xs leading-relaxed text-white">
            {dmText}
          </div>
        </div>

        <div className="space-y-2 border-t border-[#F3F4F6] pt-3">
          <label htmlFor="demo-dm-editor" className="block text-[11px] font-medium text-[#6B7280]">
            Adjust DM draft before copying
          </label>
          <textarea
            id="demo-dm-editor"
            rows={2}
            value={dmText}
            onChange={(e) => setDmText(e.target.value)}
            className="w-full rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-2 text-xs text-[#1F2937]"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-[#6B7280]">
              Manual workflow unless an officially permitted API integration is configured.
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#5B21B6] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#7C3AED] transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Copy Message</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
