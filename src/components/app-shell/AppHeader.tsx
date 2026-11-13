import React from 'react';
import {
  ChevronDown,
  HelpCircle,
  LogOut,
  Menu,
  PanelRightOpen,
  Plus,
  Search,
} from 'lucide-react';
import { useDemoSession } from '../../hooks/useDemoSession';
import { CampaignOption } from '../../types/dashboard';

interface AppHeaderProps {
  campaigns: CampaignOption[];
  selectedCampaign: CampaignOption;
  onSelectCampaign: (id: string) => void;
  globalSearch: string;
  onSearchChange: (value: string) => void;
  onOpenNewCampaign: () => void;
  onOpenHelp: () => void;
  onOpenMobileMenu: () => void;
  drawerOpen: boolean;
  onReopenDrawer: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  campaigns,
  selectedCampaign,
  onSelectCampaign,
  globalSearch,
  onSearchChange,
  onOpenNewCampaign,
  onOpenHelp,
  onOpenMobileMenu,
  drawerOpen,
  onReopenDrawer,
}) => {
  const { logoutDemoSession } = useDemoSession();

  return (
    <header className="h-16 shrink-0 bg-white border-b border-[#E5E7EB] px-4 sm:px-6 flex items-center justify-between gap-3">
      {/* Left: Mobile Sidebar Toggle + Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="lg:hidden rounded-lg border border-[#E5E7EB] p-2 text-[#111827] hover:bg-[#F9FAFB] cursor-pointer shrink-0"
        >
          <Menu className="h-4 w-4" />
        </button>

        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm min-w-0">
          <span className="text-[#6B7280] whitespace-nowrap">Workspace</span>
          <span className="text-[#9CA3AF]" aria-hidden="true">
            &gt;
          </span>
          <span className="font-semibold text-[#111827] truncate">
            {selectedCampaign.breadcrumbName}
          </span>
        </nav>
      </div>

      {/* Center / Right Controls */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Global Search */}
        <div className="relative hidden md:block w-[210px] xl:w-[240px]">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]"
            aria-hidden="true"
          />
          <input
            type="text"
            value={globalSearch}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Global Search"
            aria-label="Global Search"
            className="h-[38px] w-full rounded-lg border border-[#D1D5DB] bg-[#F9FAFB] pl-9 pr-3 text-[13px] text-[#111827] placeholder:text-[#9CA3AF] focus:bg-white focus:border-[#5B21B6] focus:outline-none"
          />
        </div>

        {/* Campaign Selector */}
        <div className="relative hidden sm:block">
          <select
            aria-label="Select campaign"
            value={selectedCampaign.id}
            onChange={(e) => onSelectCampaign(e.target.value)}
            className="h-[38px] max-w-[210px] appearance-none rounded-lg border border-[#D1D5DB] bg-white pl-3 pr-8 text-[13px] font-medium text-[#111827] hover:bg-[#F9FAFB] cursor-pointer truncate"
          >
            {campaigns.map((camp) => (
              <option key={camp.id} value={camp.id}>
                {camp.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]"
            aria-hidden="true"
          />
        </div>

        {/* + New Campaign */}
        <button
          type="button"
          onClick={onOpenNewCampaign}
          className="inline-flex h-[38px] items-center gap-1.5 rounded-lg bg-[#5B21B6] px-3.5 text-[13px] font-semibold text-white hover:bg-[#6D28D9] transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>New Campaign</span>
        </button>

        {/* Help / FAQ */}
        <button
          type="button"
          onClick={onOpenHelp}
          className="relative hidden xl:inline-flex h-[38px] items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 text-[13px] font-medium text-[#111827] hover:bg-[#F9FAFB] transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <HelpCircle className="h-4 w-4 text-[#4B5563]" aria-hidden="true" />
          <span>Help/FAQ</span>
        </button>

        {/* Reopen AI Pitch Studio button when drawer is closed */}
        {!drawerOpen && (
          <button
            type="button"
            onClick={onReopenDrawer}
            className="inline-flex h-[38px] items-center gap-1.5 rounded-lg border border-[#DDD6FE] bg-[#EDE9FE] px-3 text-[13px] font-semibold text-[#5B21B6] hover:bg-[#DDD6FE] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <PanelRightOpen className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">AI Pitch Studio</span>
          </button>
        )}

        {/* Lock / End Demo Session */}
        <button
          type="button"
          onClick={() => void logoutDemoSession()}
          title="Lock shared demo session"
          aria-label="Lock shared demo session"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#4B5563] hover:bg-[#F9FAFB] hover:text-[#111827] cursor-pointer shrink-0"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
        </button>

        {/* Shared Workspace Avatar Initials */}
        <div
          title="Shared Demo Workspace"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#DDD6FE] bg-[#EDE9FE] text-xs font-bold text-[#5B21B6] shrink-0"
        >
          MR
        </div>
      </div>
    </header>
  );
};
