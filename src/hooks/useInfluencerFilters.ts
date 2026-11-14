import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { INFLUENCER_DEMO_PROFILES } from '../data/influencerDemoData';
import { ApiClientError } from '../services/api/client';
import {
  addInfluencersToCampaignApi,
  CampaignDbRow,
  cancelDiscoveryRunApi,
  DiscoveryRunDbRow,
  fetchCampaignsApi,
  fetchDiscoveryRunApi,
  fetchDiscoveryRunsApi,
  fetchInfluencersApi,
  startYouTubeDiscoveryApi,
  WorkspaceCreatorApiItem,
} from '../services/api/workspaceApi';
import {
  AppliedFilterChip,
  InfluencerDemoProfile,
  InfluencerIndexMode,
  InfluencerPlatformKey,
  InfluencerSortOption,
  InfluencerThumbnailSpec,
  InfluencerTopTab,
  InfluencerViewMode,
} from '../types/influencer';

function formatCompactCount(num: number | null | undefined): string | null {
  if (!num || num <= 0) return null;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return String(num);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'YT';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

const LIVE_MOTIFS: InfluencerThumbnailSpec[] = [
  { id: 'l1', motif: 'serum', label: 'Skincare', paletteBg: '#F5F3FF', paletteAccent: '#5B21B6' },
  { id: 'l2', motif: 'routine', label: 'Routine', paletteBg: '#EEF2FF', paletteAccent: '#4338CA' },
  { id: 'l3', motif: 'sunscreen', label: 'SPF', paletteBg: '#FFFBEB', paletteAccent: '#B45309' },
  { id: 'l4', motif: 'botanical', label: 'Care', paletteBg: '#ECFDF5', paletteAccent: '#047857' },
  { id: 'l5', motif: 'review', label: 'Review', paletteBg: '#FDF2F8', paletteAccent: '#BE185D' },
  { id: 'l6', motif: 'cleanser', label: 'Cleanser', paletteBg: '#F0F9FF', paletteAccent: '#0369A1' },
];

function mapWorkspaceItemToProfile(item: WorkspaceCreatorApiItem): InfluencerDemoProfile {
  const { influencer, campaignInfluencer } = item;
  const subCount = influencer.follower_count ?? 0;
  const engRate = Number(influencer.engagement_rate ?? 0);
  const themes =
    influencer.content_themes && influencer.content_themes.length > 0
      ? influencer.content_themes
      : ['Beauty & Skincare'];

  const qualStatus = campaignInfluencer?.qualification_status ?? 'discovered';
  const avatarPalette =
    qualStatus === 'qualified'
      ? { bg: '#EDE9FE', text: '#5B21B6' }
      : qualStatus === 'needs_review'
        ? { bg: '#FEF3C7', text: '#92400E' }
        : { bg: '#F3F4F6', text: '#4B5563' };

  const locationLabel = influencer.country || 'Country Unavailable';

  return {
    id: influencer.id,
    name: influencer.name,
    initials: getInitials(influencer.name),
    avatarBg: avatarPalette.bg,
    avatarText: avatarPalette.text,
    contextLine: `${influencer.niche || 'Beauty & Skincare'}, ${locationLabel}`,
    location: influencer.country || 'Unavailable',
    primaryNiche: influencer.niche || 'Beauty & Skincare',
    niches: themes,
    overflowCount: Math.max(0, themes.length - 3),
    isMyMember: qualStatus === 'qualified',
    engagementEstimate: engRate,
    platforms: {
      instagram: null,
      instagramCount: 0,
      tiktok: null,
      tiktokCount: 0,
      youtube: formatCompactCount(subCount),
      youtubeCount: subCount,
    },
    totalReachCount: subCount,
    thumbnails: LIVE_MOTIFS,
    isLiveRecord: true,
    isTopPick: Boolean(influencer.is_top_pick),
    qualificationStatus: qualStatus,
    qualificationReason: campaignInfluencer?.qualification_reason || undefined,
    contactEmail: influencer.contact_email,
    emailStatus: influencer.email_status,
    profileUrl: influencer.profile_url,
    dataSource: influencer.data_source || 'youtube_data_api_v3',
    retrievedAt: influencer.source_retrieved_at || influencer.created_at,
  };
}

export function useInfluencerFilters() {
  const [topTab, setTopTab] = useState<InfluencerTopTab>('search');
  const [indexMode, setIndexMode] = useState<InfluencerIndexMode>('index');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<InfluencerSortOption>('relevance');
  const [viewMode, setViewMode] = useState<InfluencerViewMode>('grid');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Filter controls
  const [locationFilter, setLocationFilter] = useState<string>('India');
  const [nicheFilter, setNicheFilter] = useState<string>('Beauty & Skincare');
  const [platformFilter, setPlatformFilter] = useState<InfluencerPlatformKey | 'all'>('all');
  const [followerTier, setFollowerTier] = useState<'all' | 'micro'>('all');
  const [minEngagement, setMinEngagement] = useState<number>(0);

  const [discoveryBanner, setDiscoveryBanner] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignDbRow[]>([]);
  const [liveProfiles, setLiveProfiles] = useState<InfluencerDemoProfile[]>([]);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);
  const [activeRun, setActiveRun] = useState<DiscoveryRunDbRow | null>(null);
  const [discovering, setDiscovering] = useState<boolean>(false);
  const pollTimerRef = useRef<number | null>(null);

  const loadWorkspaceRecords = useCallback(async () => {
    try {
      const [dbCampaigns, infRes, runs] = await Promise.all([
        fetchCampaignsApi(true),
        fetchInfluencersApi({ limit: 200 }),
        fetchDiscoveryRunsApi().catch(() => []),
      ]);
      setIsBackendConnected(true);
      setCampaigns(dbCampaigns);
      setLiveProfiles(infRes.items.map(mapWorkspaceItemToProfile));

      const running = runs.find((r) => r.status === 'pending' || r.status === 'running');
      if (running) {
        setActiveRun(running);
        setDiscovering(true);
      }
    } catch (err) {
      setIsBackendConnected(false);
      if (err instanceof ApiClientError && err.code === 'supabase_not_configured') {
        setDiscoveryBanner(
          'Supabase server secret key not configured yet — showing Illustrative Demo Data.'
        );
      }
    }
  }, []);

  useEffect(() => {
    void loadWorkspaceRecords();
    return () => {
      if (pollTimerRef.current !== null) {
        window.clearInterval(pollTimerRef.current);
      }
    };
  }, [loadWorkspaceRecords]);

  // Poll running discovery job until terminal state
  useEffect(() => {
    if (!activeRun || (activeRun.status !== 'pending' && activeRun.status !== 'running')) {
      if (pollTimerRef.current !== null) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      setDiscovering(false);
      return;
    }

    setDiscovering(true);
    if (pollTimerRef.current === null) {
      pollTimerRef.current = window.setInterval(async () => {
        try {
          const latest = await fetchDiscoveryRunApi(activeRun.id);
          setActiveRun(latest);

          if (
            latest.status === 'completed' ||
            latest.status === 'failed' ||
            latest.status === 'cancelled'
          ) {
            if (pollTimerRef.current !== null) {
              window.clearInterval(pollTimerRef.current);
              pollTimerRef.current = null;
            }
            setDiscovering(false);
            await loadWorkspaceRecords();
            if (latest.status === 'completed') {
              setDiscoveryBanner(
                `YouTube discovery completed: ${latest.profiles_found ?? 0} real profiles evaluated and stored.`
              );
            } else if (latest.status === 'failed') {
              setDiscoveryBanner(
                latest.error_message || 'YouTube discovery run failed.'
              );
            } else {
              setDiscoveryBanner('YouTube discovery run was cancelled.');
            }
          }
        } catch {
          // Transient polling errors are ignored until next interval
        }
      }, 2500);
    }

    return () => {
      if (pollTimerRef.current !== null) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [activeRun, loadWorkspaceRecords]);

  const isShowingDemoFallback = liveProfiles.length === 0;
  const sourceProfiles = isShowingDemoFallback ? INFLUENCER_DEMO_PROFILES : liveProfiles;

  const appliedChips = useMemo<AppliedFilterChip[]>(() => {
    const chips: AppliedFilterChip[] = [];
    if (nicheFilter !== 'All') {
      chips.push({ key: 'niche', label: nicheFilter, value: nicheFilter });
    }
    if (locationFilter !== 'All') {
      chips.push({ key: 'location', label: locationFilter, value: locationFilter });
    }
    if (platformFilter !== 'all') {
      const cap = platformFilter.charAt(0).toUpperCase() + platformFilter.slice(1);
      chips.push({ key: 'platform', label: `Platform: ${cap}`, value: platformFilter });
    }
    if (followerTier === 'micro') {
      chips.push({ key: 'followers', label: '5K–100K Reach', value: 'micro' });
    }
    if (minEngagement > 0) {
      chips.push({
        key: 'engagement',
        label: `Eng. >= ${minEngagement}%`,
        value: String(minEngagement),
      });
    }
    return chips;
  }, [nicheFilter, locationFilter, platformFilter, followerTier, minEngagement]);

  const removeChip = (key: AppliedFilterChip['key']) => {
    switch (key) {
      case 'niche':
        setNicheFilter('All');
        break;
      case 'location':
        setLocationFilter('All');
        break;
      case 'platform':
        setPlatformFilter('all');
        break;
      case 'followers':
        setFollowerTier('all');
        break;
      case 'engagement':
        setMinEngagement(0);
        break;
    }
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setLocationFilter('All');
    setNicheFilter('All');
    setPlatformFilter('all');
    setFollowerTier('all');
    setMinEngagement(0);
  };

  const filteredProfiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const list = sourceProfiles.filter((profile) => {
      if (indexMode === 'members' && !profile.isMyMember) return false;

      if (locationFilter !== 'All') {
        if (locationFilter === 'India') {
          const locLower = profile.location.toLowerCase();
          // Keep India and Needs Review (Country Unavailable) visible when browsing live YouTube creators
          const isIndiaOrNeedsReview =
            locLower.includes('india') ||
            locLower === 'in' ||
            (profile.isLiveRecord && profile.qualificationStatus === 'needs_review');
          if (!isIndiaOrNeedsReview) return false;
        } else if (profile.location !== locationFilter) {
          return false;
        }
      }

      if (
        nicheFilter !== 'All' &&
        profile.primaryNiche !== nicheFilter &&
        !profile.niches.some((n) => n.toLowerCase() === nicheFilter.toLowerCase())
      ) {
        return false;
      }

      if (platformFilter !== 'all' && profile.platforms[platformFilter] === null) {
        return false;
      }

      if (
        followerTier === 'micro' &&
        (profile.totalReachCount < 5000 || profile.totalReachCount > 100000)
      ) {
        return false;
      }

      if (minEngagement > 0 && profile.engagementEstimate < minEngagement) {
        return false;
      }

      if (q) {
        const matchesText =
          profile.name.toLowerCase().includes(q) ||
          profile.contextLine.toLowerCase().includes(q) ||
          (profile.qualificationReason ?? '').toLowerCase().includes(q) ||
          profile.niches.some((n) => n.toLowerCase().includes(q));
        if (!matchesText) return false;
      }

      return true;
    });

    const sorted = [...list];
    if (sortBy === 'followers-desc') {
      sorted.sort((a, b) => b.totalReachCount - a.totalReachCount);
    } else if (sortBy === 'followers-asc') {
      sorted.sort((a, b) => a.totalReachCount - b.totalReachCount);
    } else if (sortBy === 'engagement-desc') {
      sorted.sort((a, b) => b.engagementEstimate - a.engagementEstimate);
    } else if (!isShowingDemoFallback) {
      sorted.sort((a, b) => {
        if (a.isTopPick !== b.isTopPick) return a.isTopPick ? -1 : 1;
        return b.engagementEstimate - a.engagementEstimate;
      });
    }

    return sorted;
  }, [
    sourceProfiles,
    isShowingDemoFallback,
    indexMode,
    locationFilter,
    nicheFilter,
    platformFilter,
    followerTier,
    minEngagement,
    searchQuery,
    sortBy,
  ]);

  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllVisible = () => {
    const visibleIds = filteredProfiles.map((p) => p.id);
    const allSelected =
      visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const triggerFindInfluencers = async () => {
    if (!isBackendConnected) {
      setDiscoveryBanner(
        'Supabase server backend requires configuration before running live discovery.'
      );
      return;
    }

    try {
      setDiscovering(true);
      const defaultCampaignId = campaigns[0]?.id;
      const run = await startYouTubeDiscoveryApi({
        campaignId: defaultCampaignId,
        targetCount: 50,
      });
      setActiveRun(run);
      if (run.status === 'completed') {
        setDiscovering(false);
        await loadWorkspaceRecords();
        setDiscoveryBanner(
          `YouTube discovery completed: ${run.profiles_found ?? 0} real profiles evaluated and stored.`
        );
      } else if (run.status === 'failed') {
        setDiscovering(false);
        setDiscoveryBanner(run.error_message || 'YouTube discovery run failed.');
      } else if (run.status === 'cancelled') {
        setDiscovering(false);
        setDiscoveryBanner('YouTube discovery run was cancelled.');
      } else {
        setDiscoveryBanner(
          'YouTube Data API v3 discovery started (targeting up to 50 genuine Beauty & Skincare profiles)...'
        );
      }
    } catch (err) {
      setDiscovering(false);
      setDiscoveryBanner(
        err instanceof Error
          ? err.message
          : 'YouTube integration requires configuration.'
      );
    }
  };

  const cancelActiveDiscovery = async () => {
    if (!activeRun) return;
    try {
      const updated = await cancelDiscoveryRunApi(activeRun.id);
      setActiveRun(updated);
      setDiscovering(false);
      setDiscoveryBanner('YouTube discovery cancelled.');
    } catch (err) {
      setDiscoveryBanner(
        err instanceof Error ? err.message : 'Unable to cancel discovery run.'
      );
    }
  };

  const addSelectedToCampaign = async (
    campaignId: string
  ): Promise<{ ok: boolean; message: string }> => {
    const liveIds = selectedIds.filter((id) =>
      liveProfiles.some((p) => p.id === id)
    );
    if (liveIds.length === 0) {
      return {
        ok: false,
        message: 'Illustrative demo profiles cannot be written to Supabase. Run YouTube discovery first.',
      };
    }
    try {
      const res = await addInfluencersToCampaignApi(campaignId, liveIds);
      setDiscoveryBanner(`Added ${res.added} creator(s) to campaign.`);
      await loadWorkspaceRecords();
      return {
        ok: true,
        message: `Saved ${res.added} creator(s) to campaign in Supabase.`,
      };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : 'Failed to save campaign association.',
      };
    }
  };

  return {
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
  };
}
