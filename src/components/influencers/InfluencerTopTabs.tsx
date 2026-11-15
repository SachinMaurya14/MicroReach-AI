import React from 'react';
import { ArrowLeft, Menu, SlidersHorizontal } from 'lucide-react';
import { useAppRouter } from '../../app/routes';
import { InfluencerTopTab } from '../../types/influencer';

interface InfluencerTopTabsProps {
  activeTab: InfluencerTopTab;
  onTabChange: (tab: InfluencerTopTab) => void;
  onOpenMobileMenu: () => void;
  onOpenMobileFilters: () => void;
}

const TABS: { id: InfluencerTopTab; label: string }[] = [
  { id: 'search', label: 'Search' },
  { id: 'summary', label: 'Summary' },
  { id: 'facebook', label: 'Facebook Creator Search' },
];

export const InfluencerTopTabs: React.FC<InfluencerTopTabsProps> = ({
  activeTab,
  onTabChange,
  onOpenMobileMenu,
  onOpenMobileFilters,
}) => {
  const { navigate } = useAppRouter();

  return (
    <header className="h-[60px] shrink-0 bg-white border-b border-[#E5E7EB] px-4 sm:px-6 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 lg:hidden">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open application navigation"
          className="rounded-lg border border-[#E5E7EB] p-2 text-[#111827] hover:bg-[#F9FAFB] cursor-pointer"
        >
          <Menu className="h-4 w-4" />
        </button>
      </div>

      {/* Centered Tabs matching Reference B */}
      <nav
        aria-label="Creator discovery sections"
        className="flex-1 flex items-center justify-start sm:justify-center gap-2 overflow-x-auto mr-scrollbar-hide"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`rounded-full px-4 py-1.5 text-[13.5px] font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-[#5B21B6] text-white shadow-xs'
                  : 'bg-transparent text-[#111827] hover:bg-[#F3F4F6]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-semibold text-[#111827] hover:bg-[#F9FAFB] cursor-pointer whitespace-nowrap"
        >
          <ArrowLeft className="h-3.5 w-3.5 text-[#5B21B6]" aria-hidden="true" />
          <span className="hidden sm:inline">Back to Dashboard</span>
          <span className="sm:hidden">Dashboard</span>
        </button>

        {/* Mobile / Tablet Filter Drawer Trigger */}
        <div className="xl:hidden shrink-0">
          <button
            type="button"
            onClick={onOpenMobileFilters}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-semibold text-[#111827] hover:bg-[#F9FAFB] cursor-pointer"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-[#5B21B6]" aria-hidden="true" />
            <span>Filters</span>
          </button>
        </div>
      </div>
    </header>
  );
};
