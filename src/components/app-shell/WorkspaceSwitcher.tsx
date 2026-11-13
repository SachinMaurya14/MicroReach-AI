import React, { useState } from 'react';
import { ChevronsUpDown } from 'lucide-react';

interface WorkspaceSwitcherProps {
  variant: 'dark' | 'light';
}

export const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({ variant }) => {
  const [infoOpen, setInfoOpen] = useState(false);

  const isDark = variant === 'dark';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setInfoOpen((prev) => !prev)}
        aria-expanded={infoOpen}
        className={`flex w-full items-center justify-between gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors cursor-pointer ${
          isDark
            ? 'border-white/15 bg-white/5 text-white hover:bg-white/10'
            : 'border-[#E5E7EB] bg-[#F9FAFB] text-[#111827] hover:bg-[#F3F4F6]'
        }`}
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <span
            className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-xs font-bold ${
              isDark
                ? 'border-[#A78BFA] bg-[#2E1A4E] text-white'
                : 'border-[#5B21B6] bg-[#EDE9FE] text-[#5B21B6]'
            }`}
          >
            L
          </span>
          <span className="truncate text-sm font-semibold">Later</span>
        </span>
        <ChevronsUpDown
          className={`h-4 w-4 shrink-0 ${isDark ? 'text-[#DDD6FE]' : 'text-[#6B7280]'}`}
          aria-hidden="true"
        />
      </button>

      {infoOpen && (
        <div
          className={`mt-2 rounded-lg border p-2.5 text-[11px] leading-snug ${
            isDark
              ? 'border-white/15 bg-[#2E1A4E] text-[#DDD6FE]'
              : 'border-[#E5E7EB] bg-white text-[#4B5563] shadow-sm'
          }`}
        >
          Visual workspace switcher preview (Later). No external workspace integration is
          connected.
        </div>
      )}
    </div>
  );
};
