import React, { useMemo, useState } from 'react';
import { FileText, Mail } from 'lucide-react';

const DEFAULT_EMAIL_BODY = `Hi Creator A,

We noticed your YouTube tutorials on barrier care and daily sunscreen routines for Indian skincare audiences.

We are launching a creator collaboration for GlowCare (fictional demo skincare brand) and think our gentle ceramide moisturizer aligns naturally with the routines you already share. We would love to send a complimentary product kit and discuss a sponsored review partnership.

Would you be open to receiving the brief this week?

Best regards,
GlowCare Partnerships Team`;

export const EmailPitchPreview: React.FC = () => {
  const [subject, setSubject] = useState(
    'Collaboration idea for your skincare routines — GlowCare'
  );
  const [body, setBody] = useState(DEFAULT_EMAIL_BODY);

  const wordCount = useMemo(() => {
    const trimmed = body.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  }, [body]);

  const inTargetRange = wordCount >= 60 && wordCount <= 90;

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E5E7EB]">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1F2937]">
          <Mail className="h-3.5 w-3.5 text-[#5B21B6]" aria-hidden="true" />
          <span>AI Email Composer — Illustrative Demo Data</span>
        </span>
        <span
          className={`text-[11px] font-semibold mr-tabular ${
            inTargetRange ? 'text-[#065F46]' : 'text-[#92400E]'
          }`}
        >
          {wordCount} words (Target: 60–90 words)
        </span>
      </div>

      <div className="mt-3 space-y-2.5 rounded-lg border border-[#E5E7EB] bg-white p-3.5 text-xs">
        <div className="flex flex-wrap items-center gap-2 border-b border-[#F3F4F6] pb-2">
          <span className="font-medium text-[#6B7280] w-16">To:</span>
          <span className="font-medium text-[#1F2937]">
            Creator A &lt;creator-a-demo@example.invalid&gt;
          </span>
        </div>

        <label className="flex flex-wrap sm:flex-nowrap items-center gap-2 border-b border-[#F3F4F6] pb-2">
          <span className="font-medium text-[#6B7280] w-16 shrink-0">Subject:</span>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            aria-label="Editable email subject"
            className="w-full font-semibold text-[#1F2937] bg-transparent focus:outline-none"
          />
        </label>

        <div>
          <label htmlFor="demo-email-pitch" className="sr-only">
            Editable collaboration pitch body
          </label>
          <textarea
            id="demo-email-pitch"
            rows={7}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full resize-y rounded-md border border-[#E5E7EB] bg-[#F9FAFB] p-2.5 text-xs leading-relaxed text-[#1F2937]"
          />
        </div>
      </div>

      <div className="mt-3 rounded-lg bg-[#F5F3FF] p-3 border border-[#DDD6FE] text-[11px] text-[#4B5563]">
        <div className="flex items-center gap-1.5 font-semibold text-[#5B21B6]">
          <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Personalization Context Used</span>
        </div>
        <p className="mt-1">
          Verified niche (Beauty &amp; Skincare), observed public themes (barrier care, daily sunscreen), and GlowCare demo campaign brief. No fabricated posts or personal details.
        </p>
      </div>
    </div>
  );
};
