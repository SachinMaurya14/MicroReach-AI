import React from 'react';
import { X } from 'lucide-react';
import { AppliedFilterChip } from '../../types/influencer';

interface AppliedFiltersProps {
  chips: AppliedFilterChip[];
  onRemoveChip: (key: AppliedFilterChip['key']) => void;
  onClearAll: () => void;
}

export const AppliedFilters: React.FC<AppliedFiltersProps> = ({
  chips,
  onRemoveChip,
  onClearAll,
}) => {
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#EDE9FE] px-3 py-1 text-xs font-medium text-[#5B21B6]"
        >
          <span>{chip.label}</span>
          <button
            type="button"
            onClick={() => onRemoveChip(chip.key)}
            aria-label={`Remove ${chip.label} filter`}
            className="rounded-full p-0.5 hover:bg-[#DDD6FE] cursor-pointer"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}

      <button
        type="button"
        onClick={onClearAll}
        className="text-xs font-semibold text-[#4B5563] hover:text-[#111827] underline underline-offset-2 cursor-pointer ml-1"
      >
        Clear Filters
      </button>
    </div>
  );
};
