import React, { useState } from 'react';
import { AlertCircle, Info, Loader2, XCircle } from 'lucide-react';
import { AppSidebar } from '../../components/app-shell/AppSidebar';
import { AddToCampaignModal } from '../../components/influencers/AddToCampaignModal';
import { AppliedFilters } from '../../components/influencers/AppliedFilters';
import { CreatorGrid } from '../../components/influencers/CreatorGrid';
import { CreatorListView } from '../../components/influencers/CreatorListView';
import { InfluencerFilterPanel } from '../../components/influencers/InfluencerFilterPanel';
import { InfluencerSearchToolbar } from '../../components/influencers/InfluencerSearchToolbar';
import { InfluencerTopTabs } from '../../components/influencers/InfluencerTopTabs';
import { useInfluencerFilters } from '../../hooks/useInfluencerFilters';
import { downloadDemoCSV } from '../../utils/downloadDemoCSV';

export const InfluencersPage: React.FC = () => {
  const {
    topTab,
    setTopTab,
    indexMode,
    setIndexMode,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    viewMode,
    setViewMode,
    selectedIds,
    toggleSelectId,
    toggleSelectAllVisible,
    locationFilter,
    setLocationFilter,
    nicheFilter,
    setNicheFilter,
    platformFilter,
    setPlatformFilter,
    followerTier,
    setFollowerTier,
    minEngagement,
    setMinEngagement,
    appliedChips,
    removeChip,
    clearAllFilters,
    filteredProfiles,
    isShowingDemoFallback,
    isBackendConnected,
    campaigns,
    activeRun,
    discovering,
    discoveryBanner,
    setDiscoveryBanner,
    triggerFindInfluencers,
    cancelActiveDiscovery,
    addSelectedToCampaign,
  } = useInfluencerFilters();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'list' | 'campaign' | null>(null);

  const allVisibleSelected =
    filteredProfiles.length > 0 &&
    filteredProfiles.every((p) => selectedIds.includes(p.id));

  const handleExportCsv = () => {
    if (!isShowingDemoFallback && isBackendConnected) {
      const qs = new URLSearchParams();
      if (searchQuery.trim()) qs.set('search', searchQuery.trim());
      if (nicheFilter !== 'All') qs.set('niche', nicheFilter);
      if (locationFilter !== 'All') qs.set('country', locationFilter);
      if (platformFilter !== 'all') qs.set('platform', platformFilter);
      if (minEngagement > 0) qs.set('minEngagement', String(minEngagement));
      qs.set('sortBy', sortBy);
      window.location.assign(`/api/influencers/export.csv?${qs.toString()}`);
      return;
    }
    downloadDemoCSV(filteredProfiles);
  };

  const renderWorkspaceContent = () => {
    if (topTab === 'summary') {
      const youtubeCount = filteredProfiles.filter((p) => p.platforms.youtube).length;
      const qualifiedCount = filteredProfiles.filter(
        (p) => p.qualificationStatus === 'qualified'
      ).length;
      const topPickCount = filteredProfiles.filter((p) => p.isTopPick).length;

      return (
        <div className="space-y-4">
          <div className="mr-influencers-card p-6">
            <h2 className="text-lg font-bold text-[#111827]">
              {isShowingDemoFallback
                ? 'Current Local Demo Result Summary'
                : 'Shared Discovery Cohort Summary'}
            </h2>
            <p className="mt-1 text-sm text-[#6B7280]">
              {isShowingDemoFallback
                ? 'Reflects the locally filtered illustrative demo set only — run YouTube Discovery to collect live profiles.'
                : 'Reflects live YouTube Data API v3 creator profiles persisted in Supabase PostgreSQL.'}
            </p>

            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4 mr-tabular">
              <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                <p className="text-xs font-medium text-[#6B7280]">Matching Profiles</p>
                <p className="mt-1 text-2xl font-bold text-[#111827]">
                  {filteredProfiles.length}
                </p>
              </div>
              <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                <p className="text-xs font-medium text-[#6B7280]">Currently Selected</p>
                <p className="mt-1 text-2xl font-bold text-[#5B21B6]">{selectedIds.length}</p>
              </div>
              <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                <p className="text-xs font-medium text-[#6B7280]">YouTube Channels</p>
                <p className="mt-1 text-2xl font-bold text-[#111827]">{youtubeCount}</p>
              </div>
              <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                <p className="text-xs font-medium text-[#6B7280]">Qualified / Top 5</p>
                <p className="mt-1 text-2xl font-bold text-[#111827]">
                  {qualifiedCount} / {topPickCount}
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (topTab === 'facebook') {
      return (
        <div className="mr-influencers-card p-8 max-w-[640px]">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EDE9FE] text-[#5B21B6]">
              <AlertCircle className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-[#111827]">
                Facebook Creator Search — Not Connected
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-[#4B5563]">
                Facebook Creator Search requires an officially authorized Meta API integration.
                Currently YouTube Data API v3 is the active automated discovery source.
              </p>
              <button
                type="button"
                onClick={() => setTopTab('search')}
                className="mt-4 inline-flex items-center rounded-full bg-[#5B21B6] px-4 py-2 text-xs font-semibold text-white hover:bg-[#6D28D9] cursor-pointer"
              >
                Return to Search
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <InfluencerSearchToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          allSelected={allVisibleSelected}
          onToggleSelectAll={toggleSelectAllVisible}
          resultCount={filteredProfiles.length}
          selectedCount={selectedIds.length}
          sortBy={sortBy}
          onSortChange={setSortBy}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onOpenAddToList={() => setModalMode('list')}
          onOpenAddToCampaign={() => setModalMode('campaign')}
        />

        <AppliedFilters
          chips={appliedChips}
          onRemoveChip={removeChip}
          onClearAll={clearAllFilters}
        />

        {discovering && activeRun && (
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#DDD6FE] bg-[#F5F3FF] px-4 py-3 text-xs text-[#5B21B6]"
          >
            <div className="flex items-center gap-2.5">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />
              <span className="font-semibold">
                YouTube Discovery Running ({activeRun.progress_percent ?? 15}% ·{' '}
                {activeRun.profiles_found ?? 0} stored so far)
              </span>
            </div>
            <button
              type="button"
              onClick={() => void cancelActiveDiscovery()}
              className="inline-flex items-center gap-1 rounded-full border border-[#DDD6FE] bg-white px-3 py-1 text-[11px] font-semibold text-[#DC2626] hover:bg-[#FEE2E2] cursor-pointer"
            >
              <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Cancel Run</span>
            </button>
          </div>
        )}

        {discoveryBanner && (
          <div
            role="status"
            className="flex items-center justify-between gap-3 rounded-xl border border-[#DDD6FE] bg-[#EDE9FE] px-4 py-2.5 text-xs font-medium text-[#5B21B6]"
          >
            <span>{discoveryBanner}</span>
            <button
              type="button"
              onClick={() => setDiscoveryBanner(null)}
              className="font-semibold underline cursor-pointer shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {viewMode === 'grid' ? (
          <CreatorGrid
            profiles={filteredProfiles}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelectId}
            onClearFilters={clearAllFilters}
          />
        ) : (
          <CreatorListView
            profiles={filteredProfiles}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelectId}
            onClearFilters={clearAllFilters}
          />
        )}
      </div>
    );
  };

  return (
    <div className="mr-app-shell min-h-screen lg:h-screen lg:overflow-hidden flex bg-[#F7F7FA] text-[#111827]">
      {/* Pane 1: 220px White Application Sidebar */}
      <AppSidebar
        variant="light"
        activePath="/dashboard/influencers"
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Right Shell: Top Tab Bar + (Pane 2 Filters + Pane 3 Discovery Workspace) */}
      <div className="flex-1 flex flex-col min-w-0 lg:h-screen">
        <InfluencerTopTabs
          activeTab={topTab}
          onTabChange={setTopTab}
          onOpenMobileMenu={() => setMobileSidebarOpen(true)}
          onOpenMobileFilters={() => setMobileFilterOpen(true)}
        />

        <div className="flex-1 flex min-h-0">
          {/* Pane 2: 260px Filters Sidebar */}
          <InfluencerFilterPanel
            indexMode={indexMode}
            onIndexModeChange={setIndexMode}
            locationFilter={locationFilter}
            onLocationChange={setLocationFilter}
            nicheFilter={nicheFilter}
            onNicheChange={setNicheFilter}
            platformFilter={platformFilter}
            onPlatformChange={setPlatformFilter}
            followerTier={followerTier}
            onFollowerTierChange={setFollowerTier}
            minEngagement={minEngagement}
            onMinEngagementChange={setMinEngagement}
            appliedFilterCount={appliedChips.length}
            resultCount={filteredProfiles.length}
            discovering={discovering}
            isShowingDemoFallback={isShowingDemoFallback}
            onFindInfluencers={() => void triggerFindInfluencers()}
            onExportCsv={handleExportCsv}
            mobileOpen={mobileFilterOpen}
            onCloseMobile={() => setMobileFilterOpen(false)}
          />

          {/* Pane 3: Main Discovery Workspace */}
          <main className="flex-1 min-w-0 overflow-y-auto mr-scroll-thin p-4 sm:p-5 space-y-4">
            {/* Honest Data Provenance Notice */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-xs text-[#4B5563]">
              <span className="inline-flex items-center gap-2 font-medium text-[#111827]">
                <Info className="h-4 w-4 text-[#5B21B6] shrink-0" aria-hidden="true" />
                <span>
                  {isShowingDemoFallback
                    ? 'Illustrative Demo Data — click Find Influencers to run live YouTube discovery'
                    : 'Live YouTube Data API v3 Records — stored in shared Supabase workspace'}
                </span>
              </span>
              <span className="text-[#6B7280]">
                {isShowingDemoFallback
                  ? 'Illustrative Demo Data — Instagram/TikTok Not Connected'
                  : 'Instagram / TikTok: Not Connected'}
              </span>
            </div>

            {renderWorkspaceContent()}
          </main>
        </div>
      </div>

      <AddToCampaignModal
        mode={modalMode}
        selectedCount={selectedIds.length}
        campaigns={campaigns}
        isBackendConnected={isBackendConnected}
        onAddToCampaign={addSelectedToCampaign}
        onClose={() => setModalMode(null)}
      />
    </div>
  );
};
