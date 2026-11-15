import React, { useState } from 'react';
import { ArrowRight, ChevronDown, Download, Loader2, X } from 'lucide-react';
import { InfluencerIndexMode, InfluencerPlatformKey } from '../../types/influencer';

interface InfluencerFilterPanelProps {
  indexMode: InfluencerIndexMode;
  onIndexModeChange: (mode: InfluencerIndexMode) => void;
  locationFilter: string;
  onLocationChange: (value: string) => void;
  nicheFilter: string;
  onNicheChange: (value: string) => void;
  platformFilter: InfluencerPlatformKey | 'all';
  onPlatformChange: (value: InfluencerPlatformKey | 'all') => void;
  followerTier: 'all' | 'micro';
  onFollowerTierChange: (value: 'all' | 'micro') => void;
  minEngagement: number;
  onMinEngagementChange: (value: number) => void;
  appliedFilterCount: number;
  resultCount: number;
  discovering?: boolean;
  isShowingDemoFallback?: boolean;
  onFindInfluencers: () => void;
  onExportCsv: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const InfluencerFilterPanel: React.FC<InfluencerFilterPanelProps> = ({
  indexMode,
  onIndexModeChange,
  locationFilter,
  onLocationChange,
  nicheFilter,
  onNicheChange,
  platformFilter,
  onPlatformChange,
  followerTier,
  onFollowerTierChange,
  minEngagement,
  onMinEngagementChange,
  appliedFilterCount,
  resultCount,
  discovering = false,
  isShowingDemoFallback = true,
  onFindInfluencers,
  onExportCsv,
  mobileOpen = false,
  onCloseMobile,
}) => {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    location: true,
    attributes: false,
    performance: false,
    demographics: false,
    connected: false,
    instagram: false,
    tiktok: false,
    audienceLoc: false,
    audienceDemo: false,
  });
  const [showMoreInfluencer, setShowMoreInfluencer] = useState(false);

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const expandAllFilters = () => {
    setOpenGroups({
      location: true,
      attributes: true,
      performance: true,
      demographics: true,
      connected: true,
      instagram: true,
      tiktok: true,
      audienceLoc: true,
      audienceDemo: true,
    });
    setShowMoreInfluencer(true);
  };

  const renderPanelContent = () => (
    <div className="flex h-full flex-col bg-[#F7F7FA] border-r border-[#E5E7EB]">
      <div className="flex-1 overflow-y-auto mr-scroll-thin px-3 py-4 space-y-3">
        {onCloseMobile && (
          <div className="flex items-center justify-between px-1 xl:hidden">
            <span className="text-sm font-bold text-[#111827]">Discovery Filters</span>
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close filters"
              className="rounded-lg p-1.5 text-[#4B5563] hover:bg-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Card 1: Influencer Index / My Members */}
        <div className="mr-influencers-card p-2 space-y-1">
          <button
            type="button"
            onClick={() => onIndexModeChange('index')}
            className={`h-9 w-full rounded-[6px] px-3 text-left text-[13px] font-semibold transition-all cursor-pointer ${
              indexMode === 'index'
                ? 'mr-index-active shadow-xs'
                : 'bg-white text-[#111827] hover:bg-[#F9FAFB]'
            }`}
          >
            Influencer Index
          </button>
          <button
            type="button"
            onClick={() => onIndexModeChange('members')}
            className={`h-9 w-full rounded-[6px] px-3 text-left text-[13px] font-semibold transition-all cursor-pointer ${
              indexMode === 'members'
                ? 'mr-index-active shadow-xs'
                : 'bg-white text-[#111827] hover:bg-[#F9FAFB]'
            }`}
          >
            Qualified Cohort
          </button>
        </div>

        {/* Card 2: Filters */}
        <div className="mr-influencers-card p-3.5 space-y-4">
          <div className="pb-2.5 border-b border-[#E5E7EB]">
            <h2 className="text-[15px] font-semibold text-[#111827]">Filters</h2>
            <button
              type="button"
              onClick={expandAllFilters}
              className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-[#5B21B6] hover:text-[#6D28D9] cursor-pointer"
            >
              <span>View All Filters</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          {/* Group 1: Influencer */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#111827]">Influencer</span>
              <button
                type="button"
                onClick={() => setShowMoreInfluencer((prev) => !prev)}
                className="text-[11px] font-semibold text-[#5B21B6] hover:underline cursor-pointer"
              >
                {showMoreInfluencer ? 'Less filters' : 'More filters'}
              </button>
            </div>

            {/* Location */}
            <div>
              <button
                type="button"
                onClick={() => toggleGroup('location')}
                aria-expanded={openGroups.location}
                className="flex h-9 w-full items-center justify-between rounded-[6px] border border-[#E5E7EB] bg-white px-2.5 text-xs font-medium text-[#111827] hover:bg-[#F9FAFB] cursor-pointer"
              >
                <span>Location</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-[#6B7280] transition-transform ${
                    openGroups.location ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openGroups.location && (
                <div className="mt-1.5 rounded-md bg-[#F9FAFB] p-2 border border-[#E5E7EB]">
                  <select
                    aria-label="Filter by location"
                    value={locationFilter}
                    onChange={(e) => onLocationChange(e.target.value)}
                    className="w-full rounded border border-[#D1D5DB] bg-white px-2 py-1 text-xs text-[#111827]"
                  >
                    <option value="India">India (Preferred)</option>
                    <option value="All">All Locations</option>
                  </select>
                </div>
              )}
            </div>

            {/* Demographics */}
            <div>
              <button
                type="button"
                onClick={() => toggleGroup('demographics')}
                aria-expanded={openGroups.demographics}
                className="flex h-9 w-full items-center justify-between rounded-[6px] border border-[#E5E7EB] bg-white px-2.5 text-xs font-medium text-[#111827] hover:bg-[#F9FAFB] cursor-pointer"
              >
                <span>Demographics</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-[#6B7280] transition-transform ${
                    openGroups.demographics ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openGroups.demographics && (
                <div className="mt-1.5 rounded-md bg-[#F9FAFB] p-2 border border-[#E5E7EB] text-[11px] text-[#6B7280]">
                  Unavailable public audience age/gender fields display as Not Available.
                </div>
              )}
            </div>

            {/* Attributes (Niche) */}
            <div>
              <button
                type="button"
                onClick={() => toggleGroup('attributes')}
                aria-expanded={openGroups.attributes}
                className="flex h-9 w-full items-center justify-between rounded-[6px] border border-[#E5E7EB] bg-white px-2.5 text-xs font-medium text-[#111827] hover:bg-[#F9FAFB] cursor-pointer"
              >
                <span>Attributes</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-[#6B7280] transition-transform ${
                    openGroups.attributes ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openGroups.attributes && (
                <div className="mt-1.5 rounded-md bg-[#F9FAFB] p-2 border border-[#E5E7EB]">
                  <select
                    aria-label="Filter by niche"
                    value={nicheFilter}
                    onChange={(e) => onNicheChange(e.target.value)}
                    className="w-full rounded border border-[#D1D5DB] bg-white px-2 py-1 text-xs text-[#111827]"
                  >
                    <option value="Beauty & Skincare">Beauty &amp; Skincare</option>
                    <option value="Wellness">Wellness</option>
                    <option value="Lifestyle">Lifestyle</option>
                    <option value="All">All Niches</option>
                  </select>
                </div>
              )}
            </div>

            {/* Performance */}
            <div>
              <button
                type="button"
                onClick={() => toggleGroup('performance')}
                aria-expanded={openGroups.performance}
                className="flex h-9 w-full items-center justify-between rounded-[6px] border border-[#E5E7EB] bg-white px-2.5 text-xs font-medium text-[#111827] hover:bg-[#F9FAFB] cursor-pointer"
              >
                <span>Performance</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-[#6B7280] transition-transform ${
                    openGroups.performance ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openGroups.performance && (
                <div className="mt-1.5 space-y-2 rounded-md bg-[#F9FAFB] p-2 border border-[#E5E7EB]">
                  <select
                    aria-label="Filter by minimum estimated engagement"
                    value={minEngagement}
                    onChange={(e) => onMinEngagementChange(Number(e.target.value))}
                    className="w-full rounded border border-[#D1D5DB] bg-white px-2 py-1 text-xs text-[#111827]"
                  >
                    <option value={0}>Any Engagement</option>
                    <option value={2}>Est. Engagement &ge; 2%</option>
                    <option value={2.5}>Est. Engagement &ge; 2.5%</option>
                    <option value={3.5}>Est. Engagement &ge; 3.5%</option>
                  </select>
                  <select
                    aria-label="Filter by follower reach range"
                    value={followerTier}
                    onChange={(e) =>
                      onFollowerTierChange(e.target.value as 'all' | 'micro')
                    }
                    className="w-full rounded border border-[#D1D5DB] bg-white px-2 py-1 text-xs text-[#111827]"
                  >
                    <option value="all">All Follower Ranges</option>
                    <option value="micro">5K–100K Subscribers</option>
                  </select>
                </div>
              )}
            </div>

            {showMoreInfluencer && (
              <div className="rounded-md bg-[#F5F3FF] p-2 text-[11px] text-[#5B21B6] border border-[#DDD6FE]">
                YouTube Data API v3 channel statistics and public video samples power Estimated
                Public Engagement.
              </div>
            )}
          </div>

          {/* Group 2: Social Platforms */}
          <div className="space-y-2 pt-2 border-t border-[#E5E7EB]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#111827]">Social Platforms</span>
              <button
                type="button"
                onClick={() => toggleGroup('connected')}
                className="text-[11px] font-semibold text-[#5B21B6] hover:underline cursor-pointer"
              >
                More filters
              </button>
            </div>

            <div>
              <button
                type="button"
                onClick={() => toggleGroup('connected')}
                aria-expanded={openGroups.connected}
                className="flex h-9 w-full items-center justify-between rounded-[6px] border border-[#E5E7EB] bg-white px-2.5 text-xs font-medium text-[#111827] hover:bg-[#F9FAFB] cursor-pointer"
              >
                <span>Connected Platforms</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-[#6B7280] transition-transform ${
                    openGroups.connected ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openGroups.connected && (
                <div className="mt-1.5 rounded-md bg-[#F9FAFB] p-2 border border-[#E5E7EB]">
                  <select
                    aria-label="Filter by social platform"
                    value={platformFilter}
                    onChange={(e) =>
                      onPlatformChange(e.target.value as InfluencerPlatformKey | 'all')
                    }
                    className="w-full rounded border border-[#D1D5DB] bg-white px-2 py-1 text-xs text-[#111827]"
                  >
                    <option value="all">All Platforms</option>
                    <option value="youtube">YouTube</option>
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                  </select>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                onPlatformChange(platformFilter === 'instagram' ? 'all' : 'instagram')
              }
              className={`flex h-9 w-full items-center justify-between rounded-[6px] border px-2.5 text-xs font-medium cursor-pointer ${
                platformFilter === 'instagram'
                  ? 'border-[#5B21B6] bg-[#EDE9FE] text-[#5B21B6]'
                  : 'border-[#E5E7EB] bg-white text-[#111827] hover:bg-[#F9FAFB]'
              }`}
            >
              <span>Instagram</span>
              <ChevronDown className="h-3.5 w-3.5 text-[#6B7280]" />
            </button>

            <button
              type="button"
              onClick={() =>
                onPlatformChange(platformFilter === 'tiktok' ? 'all' : 'tiktok')
              }
              className={`flex h-9 w-full items-center justify-between rounded-[6px] border px-2.5 text-xs font-medium cursor-pointer ${
                platformFilter === 'tiktok'
                  ? 'border-[#5B21B6] bg-[#EDE9FE] text-[#5B21B6]'
                  : 'border-[#E5E7EB] bg-white text-[#111827] hover:bg-[#F9FAFB]'
              }`}
            >
              <span>TikTok</span>
              <ChevronDown className="h-3.5 w-3.5 text-[#6B7280]" />
            </button>
          </div>

          {/* Group 3: Instagram Audience */}
          <div className="space-y-2 pt-2 border-t border-[#E5E7EB]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#111827]">
                Instagram Audience
              </span>
              <button
                type="button"
                onClick={() => toggleGroup('audienceLoc')}
                className="text-[11px] font-semibold text-[#5B21B6] hover:underline cursor-pointer"
              >
                More filters
              </button>
            </div>

            <div>
              <button
                type="button"
                onClick={() => toggleGroup('audienceLoc')}
                aria-expanded={openGroups.audienceLoc}
                className="flex h-9 w-full items-center justify-between rounded-[6px] border border-[#E5E7EB] bg-white px-2.5 text-xs font-medium text-[#111827] hover:bg-[#F9FAFB] cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <span>Location</span>
                  {appliedFilterCount > 0 && (
                    <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#EDE9FE] px-1.5 text-[11px] font-bold text-[#5B21B6] mr-tabular">
                      {appliedFilterCount}
                    </span>
                  )}
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-[#6B7280] transition-transform ${
                    openGroups.audienceLoc ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openGroups.audienceLoc && (
                <div className="mt-1.5 rounded-md bg-[#F9FAFB] p-2 border border-[#E5E7EB] text-[11px] text-[#6B7280]">
                  Geography preference currently set to <strong>{locationFilter}</strong>.
                </div>
              )}
            </div>

            <div>
              <button
                type="button"
                onClick={() => toggleGroup('audienceDemo')}
                aria-expanded={openGroups.audienceDemo}
                className="flex h-9 w-full items-center justify-between rounded-[6px] border border-[#E5E7EB] bg-white px-2.5 text-xs font-medium text-[#111827] hover:bg-[#F9FAFB] cursor-pointer"
              >
                <span>Demographics</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-[#6B7280] transition-transform ${
                    openGroups.audienceDemo ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openGroups.audienceDemo && (
                <div className="mt-1.5 rounded-md bg-[#F9FAFB] p-2 border border-[#E5E7EB] text-[11px] text-[#6B7280]">
                  Audience demographics: Not Available until permitted analytics API is configured.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Actions */}
      <div className="shrink-0 border-t border-[#E5E7EB] bg-white p-3 space-y-2">
        <button
          type="button"
          disabled={discovering}
          onClick={() => {
            onFindInfluencers();
            onCloseMobile?.();
          }}
          className="flex h-[38px] w-full items-center justify-center gap-2 rounded-full bg-[#5B21B6] px-4 text-[13px] font-semibold text-white hover:bg-[#6D28D9] disabled:opacity-60 transition-colors cursor-pointer"
        >
          {discovering && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          <span>{discovering ? 'Discovering Creators...' : 'Find Influencers'}</span>
        </button>

        <div className="flex items-center justify-between px-1 text-[11px] text-[#6B7280] mr-tabular">
          <span>
            {resultCount} {resultCount === 1 ? 'stored profile' : 'stored profiles'}
          </span>
          <button
            type="button"
            onClick={onExportCsv}
            className="inline-flex items-center gap-1 font-semibold text-[#111827] hover:text-[#5B21B6] cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop 260px Filter Panel */}
      <aside aria-label="Creator discovery filters" className="hidden xl:block w-[260px] shrink-0 h-full">
        {renderPanelContent()}
      </aside>

      {/* Mobile / Tablet Slide-Over Filter Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 xl:hidden flex justify-end">
          <div
            className="fixed inset-0 bg-[#111827]/45 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside
            aria-label="Creator discovery filters"
            className="relative z-10 w-[290px] max-w-[85vw] h-full shadow-2xl"
          >
            {renderPanelContent()}
          </aside>
        </div>
      )}
    </>
  );
};
