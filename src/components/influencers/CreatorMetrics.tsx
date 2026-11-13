import React from 'react';
import { InfluencerDemoProfile } from '../../types/influencer';
import { PlatformIcon } from '../ui/PlatformIcon';

interface CreatorMetricsProps {
  platforms: InfluencerDemoProfile['platforms'];
  isLiveRecord?: boolean;
}

export const CreatorMetrics: React.FC<CreatorMetricsProps> = ({
  platforms,
  isLiveRecord = false,
}) => {
  const items: {
    key: 'instagram' | 'tiktok' | 'youtube';
    value: string | null;
  }[] = [
    { key: 'instagram', value: platforms.instagram },
    { key: 'tiktok', value: platforms.tiktok },
    { key: 'youtube', value: platforms.youtube },
  ];

  const disconnectedLabel = isLiveRecord ? 'Not Connected' : 'N/A';

  return (
    <div className="grid grid-cols-3 gap-1.5 pt-2.5 border-t border-[#F3F4F6] w-full">
      {items.map((item) => (
        <div
          key={item.key}
          className="flex flex-col items-center justify-center text-center"
        >
          <PlatformIcon
            platform={item.key}
            size={14}
            className={item.value ? 'opacity-100' : 'opacity-30'}
          />
          <span
            className={`mt-1 text-[10.5px] font-semibold mr-tabular truncate max-w-full ${
              item.value ? 'text-[#111827]' : 'text-[#9CA3AF]'
            }`}
          >
            {item.value ?? disconnectedLabel}
          </span>
        </div>
      ))}
    </div>
  );
};
