import React, { useState } from 'react';
import {
  LayoutGrid,
  List,
  Mic,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  X,
} from 'lucide-react';
import { InfluencerQualFilter, InfluencerSortOption, InfluencerViewMode } from '../../types/influencer';

interface InfluencerSearchToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  allSelected: boolean;
  onToggleSelectAll: () => void;
  resultCount: number;
  selectedCount: number;
  sortBy: InfluencerSortOption;
  onSortChange: (value: InfluencerSortOption) => void;
  qualFilter: InfluencerQualFilter;
  onQualFilterChange: (value: InfluencerQualFilter) => void;
  viewMode: InfluencerViewMode;
  onViewModeChange: (mode: InfluencerViewMode) => void;
  onOpenAddToList: () => void;
  onOpenAddToCampaign: () => void;
}

export const InfluencerSearchToolbar: React.FC<InfluencerSearchToolbarProps> = ({
  searchQuery,
  onSearchChange,
  allSelected,
  onToggleSelectAll,
  resultCount,
  selectedCount,
  sortBy,
  onSortChange,
  qualFilter,
  onQualFilterChange,
  viewMode,
  onViewModeChange,
  onOpenAddToList,
  onOpenAddToCampaign,
}) => {
  const [utilityNote, setUtilityNote] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {/* Row 1: Search Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 flex items-center h-10 rounded-lg border border-[#E5E7EB] bg-white px-3 focus-within:border-[#5B21B6]">
          <Search className="h-4 w-4 text-[#9CA3AF] shrink-0" aria-hidden="true" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search creators by name, niche, or keyword"
              aria-label="Search creators"
              className="flex-1 bg-transparent px-2.5 text-[13.5px] text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none"
            />
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() =>
                  setUtilityNote('Voice search is not enabled in this browser workspace.')
                }
                title="Voice search (unavailable)"
                aria-label="Voice search (unavailable)"
                className="rounded p-1 text-[#6B7280] hover:bg-[#F3F4F6] cursor-pointer"
              >
                <Mic className="h-3.5 w-3.5" />
              </button>

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  title="Clear search"
                  aria-label="Clear search"
                  className="rounded p-1 text-[#6B7280] hover:bg-[#F3F4F6] cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  setUtilityNote('Use the left Discovery Filters panel to refine YouTube creator criteria.')
                }
                title="Search settings"
                aria-label="Search settings"
                className="rounded p-1 text-[#6B7280] hover:bg-[#F3F4F6] cursor-pointer"
              >
                <Settings className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setUtilityNote('Showing YouTube Data API v3 records stored in Supabase PostgreSQL.')
            }
            aria-label="More search options"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#4B5563] hover:bg-[#F9FAFB] cursor-pointer shrink-0"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
      </div>

      {utilityNote && (
        <div className="flex items-center justify-between rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs text-[#4B5563]">
          <span>{utilityNote}</span>
          <button
            type="button"
            onClick={() => setUtilityNote(null)}
            className="font-semibold text-[#5B21B6] cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Row 2: Sorting & Selection Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left side */}
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 cursor-pointer text-[13px] font-medium text-[#111827]">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={onToggleSelectAll}
              className="h-4 w-4 rounded border-[#D1D5DB] text-[#5B21B6] cursor-pointer"
            />
            <span className="mr-tabular">{resultCount} stored profiles</span>
          </label>

          <div className="flex items-center gap-1.5 text-xs text-[#4B5563]">
            <span>Sort by</span>
            <select
              aria-label="Sort creators"
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as InfluencerSortOption)}
              className="rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#111827] cursor-pointer"
            >
              <option value="relevance">Relevance</option>
              <option value="followers-desc">Followers: High to Low</option>
              <option value="followers-asc">Followers: Low to High</option>
              <option value="engagement-desc">Engagement: High to Low</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-[#4B5563]">
            <span>Status</span>
            <select
              aria-label="Filter by qualification status"
              value={qualFilter}
              onChange={(e) => onQualFilterChange(e.target.value as InfluencerQualFilter)}
              className="rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#111827] cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="qualified">Qualified</option>
              <option value="needs_review">Needs Review</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Right side */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-[#4B5563] mr-tabular mr-1">
            {selectedCount} Selected
          </span>

          <button
            type="button"
            onClick={onOpenAddToList}
            className="inline-flex h-8 items-center gap-1 rounded-full border border-[#D1D5DB] bg-white px-3 text-xs font-semibold text-[#111827] hover:bg-[#F9FAFB] transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5 text-[#5B21B6]" aria-hidden="true" />
            <span>List</span>
          </button>

          <button
            type="button"
            onClick={onOpenAddToCampaign}
            className="inline-flex h-8 items-center gap-1 rounded-full bg-[#5B21B6] px-3.5 text-xs font-semibold text-white hover:bg-[#6D28D9] transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Campaign</span>
          </button>

          {/* List / Grid View Toggle */}
          <div className="inline-flex rounded-lg border border-[#E5E7EB] bg-white p-0.5">
            <button
              type="button"
              onClick={() => onViewModeChange('list')}
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
              className={`rounded-md p-1.5 transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-[#EDE9FE] text-[#5B21B6]'
                  : 'text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              aria-label="Grid view"
              aria-pressed={viewMode === 'grid'}
              className={`rounded-md p-1.5 transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-[#EDE9FE] text-[#5B21B6]'
                  : 'text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
