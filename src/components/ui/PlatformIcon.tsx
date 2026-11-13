import React from 'react';
import { DashboardPlatform } from '../../types/dashboard';

interface PlatformIconProps {
  platform: DashboardPlatform | 'instagram' | 'tiktok' | 'youtube';
  size?: number;
  className?: string;
}

export const PlatformIcon: React.FC<PlatformIconProps> = ({
  platform,
  size = 16,
  className = '',
}) => {
  const key = platform.toLowerCase();

  if (key === 'instagram') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={`shrink-0 ${className}`}
        aria-label="Instagram"
      >
        <rect x="2" y="2" width="20" height="20" rx="6" stroke="#C13584" strokeWidth="2" />
        <circle cx="12" cy="12" r="4.2" stroke="#C13584" strokeWidth="2" />
        <circle cx="17.5" cy="6.5" r="1.3" fill="#C13584" />
      </svg>
    );
  }

  if (key === 'tiktok') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={`shrink-0 ${className}`}
        aria-label="TikTok"
      >
        <rect x="2" y="2" width="20" height="20" rx="5" fill="#111827" />
        <path
          d="M13.5 6.5V14.2C13.5 15.6 12.4 16.7 11 16.7C9.6 16.7 8.5 15.6 8.5 14.2C8.5 12.8 9.6 11.7 11 11.7C11.3 11.7 11.6 11.8 11.9 11.9V9.8C11.6 9.7 11.3 9.7 11 9.7C8.5 9.7 6.5 11.7 6.5 14.2C6.5 16.7 8.5 18.7 11 18.7C13.5 18.7 15.5 16.7 15.5 14.2V10.1C16.4 10.8 17.5 11.2 18.7 11.2V9.2C16.9 9.1 15.5 7.9 15.3 6.5H13.5Z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`shrink-0 ${className}`}
      aria-label="YouTube"
    >
      <rect x="2" y="4.5" width="20" height="15" rx="4.5" fill="#DC2626" />
      <path d="M10.2 9.2L15.6 12L10.2 14.8V9.2Z" fill="#FFFFFF" />
    </svg>
  );
};
