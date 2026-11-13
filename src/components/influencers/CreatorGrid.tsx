import React from 'react';
import { InfluencerDemoProfile } from '../../types/influencer';
import { CreatorCard } from './CreatorCard';

interface CreatorGridProps {
  profiles: InfluencerDemoProfile[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onClearFilters: () => void;
}

export const CreatorGrid: React.FC<CreatorGridProps> = ({
  profiles,
  selectedIds,
  onToggleSelect,
  onClearFilters,
}) => {
  if (profiles.length === 0) {
    return (
      <div className="mr-influencers-card p-10 text-center">
        <p className="text-base font-semibold text-[#111827]">
          No illustrative demo creators match these filters
        </p>
        <p className="mt-1.5 text-sm text-[#6B7280]">
          Adjust your local filters or clear filters to view all sample profiles.
        </p>
        <button
          type="button"
          onClick={onClearFilters}
          className="mt-4 inline-flex items-center rounded-full bg-[#5B21B6] px-4 py-2 text-xs font-semibold text-white hover:bg-[#6D28D9] cursor-pointer"
        >
          Clear Filters
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
      {profiles.map((profile) => (
        <CreatorCard
          key={profile.id}
          profile={profile}
          selected={selectedIds.includes(profile.id)}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </div>
  );
};
