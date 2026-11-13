import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md';
  tone?: 'dark' | 'light';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 'md', tone = 'dark' }) => {
  const iconSize = size === 'sm' ? 28 : 34;
  const textColor = tone === 'light' ? 'text-white' : 'text-[#1F2937]';

  return (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 select-none">
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect width="36" height="36" rx="10" fill="#5B21B6" />
        <circle cx="18" cy="18" r="10.5" stroke="#DDD6FE" strokeWidth="1.6" strokeOpacity="0.55" />
        <circle cx="18" cy="18" r="6" stroke="#FFFFFF" strokeWidth="1.8" strokeOpacity="0.92" />
        <path d="M18 18L24.5 11.5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
        <circle cx="24.5" cy="11.5" r="2.2" fill="#A78BFA" stroke="#FFFFFF" strokeWidth="1.2" />
        <circle cx="18" cy="18" r="2.2" fill="#FFFFFF" />
      </svg>
      <span className={`font-bold tracking-tight ${size === 'sm' ? 'text-base' : 'text-[19px]'} ${textColor}`}>
        MicroReach AI
      </span>
    </span>
  );
};
