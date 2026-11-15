import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiClientError } from '../services/api/client';
import {
  addInfluencersToCampaignApi,
  CampaignDbRow,
  cancelDiscoveryRunApi,
  DiscoveryRunDbRow,
  enrichInfluencerApi,
  fetchCampaignsApi,
  fetchDiscoveryRunApi,
  fetchDiscoveryRunsApi,
  fetchInfluencersApi,
  reEvaluateInfluencersApi,
  resumeDiscoveryRunApi,
  startInstagramDiscoveryApi,
  startYouTubeDiscoveryApi,
  updateCreatorChannelsApi,
  WorkspaceCreatorApiItem,
} from '../services/api/workspaceApi';
import type { ContactChannelType, OutreachChannel } from '../types/database';
import {
  AppliedFilterChip,
  ContentEvidenceItem,
  InfluencerDemoProfile,
  InfluencerIndexMode,
  InfluencerPlatformKey,
  InfluencerQualFilter,
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
  const parsedEngagement =
    influencer.engagement_rate !== null &&
    influencer.engagement_rate !== undefined &&
    Number.isFinite(Number(influencer.engagement_rate))
      ? Number(influencer.engagement_rate)
      : null;
  const engRate = parsedEngagement ?? 0;
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

  const platformLower = (influencer.platform || 'youtube').toLowerCase();
  const igValue =
    platformLower === 'instagram'
      ? formatCompactCount(subCount) ?? (influencer.username ? `@${influencer.username}` : 'Profile')
      : null;
  const ytValue =
    platformLower === 'youtube' || !influencer.platform
      ? formatCompactCount(subCount) ?? 'Profile'
      : null;

  const metadata = (influencer.source_metadata ?? {}) as Record<string, unknown>;
  const contentEvidence: ContentEvidenceItem[] = Array.isArray(influencer.content_evidence)
    ? (influencer.content_evidence as ContentEvidenceItem[])
    : Array.isArray(metadata.contentEvidence)
      ? (metadata.contentEvidence as ContentEvidenceItem[])
      : [];

  return {
    id: influencer.id,
    name: influencer.name,
    initials: getInitials(influencer.name),
    avatarBg: avatarPalette.bg,
    avatarText: avatarPalette.text,
    contextLine: `${influencer.niche || 'Beauty & Skincare'}, ${locationLabel}`,
    location: influencer.country || 'Not Available',
    primaryNiche: influencer.niche || 'Beauty & Skincare',
    niches: themes,
    overflowCount: Math.max(0, themes.length - 3),
    isMyMember: qualStatus === 'qualified',
    engagementEstimate: engRate,
    engagementRate: parsedEngagement,
    platforms: {
      instagram: igValue,
      instagramCount: platformLower === 'instagram' ? subCount : 0,
      tiktok: null,
      tiktokCount: 0,
      youtube: ytValue,
      youtubeCount: platformLower === 'youtube' || !influencer.platform ? subCount : 0,
    },
    totalReachCount: subCount,
    thumbnails: LIVE_MOTIFS,
    isLiveRecord: true,
    isTopPick: Boolean(influencer.is_top_pick),
    qualificationStatus: qualStatus,
    classificationCode:
      (metadata.classificationCode as InfluencerDemoProfile['classificationCode']) ||
      (qualStatus === 'qualified'
        ? 'PASS'
        : qualStatus === 'needs_review'
          ? 'REVIEW_REQUIRED'
          : qualStatus === 'rejected'
            ? 'FAIL'
            : undefined),
    qualificationReason: campaignInfluencer?.qualification_reason || undefined,
    fitScore: influencer.fit_score ?? null,
    fitScoreBreakdown:
      metadata.fitScoreBreakdown && typeof metadata.fitScoreBreakdown === 'object'
        ? (metadata.fitScoreBreakdown as InfluencerDemoProfile['fitScoreBreakdown'])
        : null,
    evaluatedAt:
      typeof metadata.evaluatedAt === 'string'
        ? metadata.evaluatedAt
        : influencer.updated_at || null,
    contactEmail:
      influencer.contact_email && influencer.contact_email.toLowerCase() !== 'not found'
        ? influencer.contact_email
        : null,
    emailStatus: influencer.email_status,
    emailSource:
      influencer.email_source ||
      (typeof metadata.emailSource === 'string' ? metadata.emailSource : null),
    emailProvenanceStatus:
      typeof metadata.emailProvenanceStatus === 'string'
        ? metadata.emailProvenanceStatus
        : influencer.email_status === 'verified'
          ? 'Ready for Review'
          : influencer.email_status === 'unverified'
            ? 'Found Publicly'
            : 'Not Found',
    website: influencer.website ?? null,
    enrichmentStatus:
      influencer.enrichment_status ||
      (typeof metadata.enrichmentStatus === 'string' ? metadata.enrichmentStatus : 'pending'),
    enrichedAt:
      influencer.enriched_at ||
      (typeof metadata.enrichedAt === 'string' ? metadata.enrichedAt : null),
    contentEvidence,
    geographyVerification:
      (metadata.geographyVerification as InfluencerDemoProfile['geographyVerification']) ||
      (influencer.country ? 'Verified' : 'Unknown'),
    engagementSource: influencer.engagement_source ?? null,
    engagementSampleSize: influencer.engagement_sample_size ?? null,
    engagementMeta:
      metadata.engagementMeta && typeof metadata.engagementMeta === 'object'
        ? (metadata.engagementMeta as InfluencerDemoProfile['engagementMeta'])
        : null,
    profileDescription: influencer.profile_description ?? null,
    profileUrl: influencer.profile_url,
    dataSource: influencer.data_source || 'youtube_data_api_v3',
    retrievedAt: influencer.source_retrieved_at || influencer.created_at,
    contactChannels: item.contactChannels ?? [],
    channelAvailability: item.channelAvailability ?? [],
    recommendedChannel: item.recommendedChannel ?? null,
    preferredChannel: item.preferredChannel ?? null,
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
  const [qualFilter, setQualFilter] = useState<InfluencerQualFilter>('all');
  const [followerTier, setFollowerTier] = useState<'all' | 'micro'>('all');
  const [minEngagement, setMinEngagement] = useState<number>(0);

  const [discoveryBanner, setDiscoveryBanner] = useState<string | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignDbRow[]>([]);
  const [liveProfiles, setLiveProfiles] = useState<InfluencerDemoProfile[]>([]);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);
  const [activeRun, setActiveRun] = useState<DiscoveryRunDbRow | null>(null);
  const [discovering, setDiscovering] = useState<boolean>(false);
  const pollTimerRef = useRef<number | null>(null);
  const resumingRef = useRef<boolean>(false);
  const cancelRequestedRef = useRef<boolean>(false);

  const mergeDiscoveredCreators = useCallback((items: WorkspaceCreatorApiItem[]) => {
    if (!items || items.length === 0) return;
    const mapped = items.map(mapWorkspaceItemToProfile);
    setLiveProfiles((prev) => {
      const seenKeys = new Set<string>();
      const combined: InfluencerDemoProfile[] = [];
      for (const p of [...mapped, ...prev]) {
        const key = (p.profileUrl || p.id).toLowerCase();
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);
        combined.push(p);
      }
      return combined;
    });
  }, []);

  const loadWorkspaceRecords = useCallback(async () => {
    try {
      const [dbCampaigns, infRes, runs] = await Promise.all([
        fetchCampaignsApi(true),
        fetchInfluencersApi({ limit: 250 }),
        fetchDiscoveryRunsApi().catch(() => []),
      ]);
      setIsBackendConnected(true);
      setBackendError(null);
      setCampaigns(dbCampaigns);
      if (infRes.items.length > 0) {
        setLiveProfiles(infRes.items.map(mapWorkspaceItemToProfile));
      }

      const active = runs.find(
        (r) => r.status === 'pending' || r.status === 'running' || r.status === 'partial'
      );
      if (active) {
        setActiveRun(active);
        setDiscovering(true);
      }
    } catch (err) {
      setIsBackendConnected(false);
      if (err instanceof ApiClientError && err.code === 'supabase_not_configured') {
        setBackendError(
          'Supabase database is not configured (set SUPABASE_URL and SUPABASE_SECRET_KEY). Live YouTube and Instagram discovery will still display results directly.'
        );
      } else {
        setBackendError(
          err instanceof Error
            ? err.message
            : 'Unable to load stored creator records from Supabase.'
        );
      }
    }
  }, []);

  const continuePartialRun = useCallback(
    async (initialRun: DiscoveryRunDbRow) => {
      if (resumingRef.current) return;
      resumingRef.current = true;
      cancelRequestedRef.current = false;
      let current = initialRun;

      try {
        for (let chunk = 0; chunk < 6; chunk++) {
          if (cancelRequestedRef.current || current.status !== 'partial') {
            break;
          }
          setDiscoveryBanner(
            `Continuing YouTube discovery batch (${current.profiles_found ?? 0} evaluated so far)...`
          );
          const resumed = await resumeDiscoveryRunApi(current.id);
          current = resumed.run;
          setActiveRun(current);
          mergeDiscoveredCreators(resumed.creators);
          if (resumed.persistence?.persisted) {
            await loadWorkspaceRecords();
          }
        }

        if (current.status === 'completed') {
          setDiscovering(false);
          setDiscoveryBanner(
            `YouTube discovery completed: ${current.profiles_found ?? 0} real profiles evaluated.`
          );
        } else if (current.status === 'partial') {
          setDiscovering(false);
          setDiscoveryBanner(
            `YouTube discovery paused cleanly at ${current.profiles_found ?? 0} profiles. Click Find Influencers or resume to continue.`
          );
        } else if (current.status === 'failed') {
          setDiscovering(false);
          setDiscoveryBanner(current.error_message || 'YouTube discovery run failed.');
        } else if (current.status === 'cancelled') {
          setDiscovering(false);
          setDiscoveryBanner('YouTube discovery run was cancelled.');
        }
      } catch (err) {
        setDiscovering(false);
        setDiscoveryBanner(
          err instanceof Error ? err.message : 'Unable to resume discovery run.'
        );
      } finally {
        resumingRef.current = false;
      }
    },
    [loadWorkspaceRecords, mergeDiscoveredCreators]
  );

  useEffect(() => {
    void loadWorkspaceRecords();
    return () => {
      cancelRequestedRef.current = true;
      if (pollTimerRef.current !== null) {
        window.clearInterval(pollTimerRef.current);
      }
    };
  }, [loadWorkspaceRecords]);

  // Poll running discovery job or continue partial runs
  useEffect(() => {
    if (!activeRun) {
      setDiscovering(false);
      return;
    }

    if (activeRun.status === 'partial' && !resumingRef.current) {
      setDiscovering(true);
      void continuePartialRun(activeRun);
      return;
    }

    if (activeRun.status !== 'pending' && activeRun.status !== 'running') {
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

          if (latest.status === 'partial') {
            if (pollTimerRef.current !== null) {
              window.clearInterval(pollTimerRef.current);
              pollTimerRef.current = null;
            }
            void continuePartialRun(latest);
            return;
          }

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
  }, [activeRun, continuePartialRun, loadWorkspaceRecords]);

  const isShowingDemoFallback = false;
  const sourceProfiles = liveProfiles;

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
    if (qualFilter !== 'all') {
      const statusLabel =
        qualFilter === 'qualified'
          ? 'Status: Qualified'
          : qualFilter === 'needs_review'
            ? 'Status: Needs Review'
            : 'Status: Rejected';
      chips.push({ key: 'status', label: statusLabel, value: qualFilter });
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
  }, [nicheFilter, locationFilter, platformFilter, qualFilter, followerTier, minEngagement]);

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
      case 'status':
        setQualFilter('all');
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
    setQualFilter('all');
    setFollowerTier('all');
    setMinEngagement(0);
  };

  const filteredProfiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const list = sourceProfiles.filter((profile) => {
      if (indexMode === 'members' && !profile.isMyMember) return false;

      if (qualFilter !== 'all' && profile.qualificationStatus !== qualFilter) {
        return false;
      }

      if (locationFilter !== 'All') {
        if (locationFilter === 'India') {
          const locLower = profile.location.toLowerCase();
          // Keep verified India creators and unverified-location creators inspectable; exclude verified non-India countries
          const isIndiaOrUnverified =
            locLower.includes('india') ||
            locLower === 'in' ||
            locLower === 'not available' ||
            profile.qualificationStatus === 'needs_review' ||
            qualFilter !== 'all';
          if (!isIndiaOrUnverified) return false;
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

      if (
        minEngagement > 0 &&
        (profile.engagementRate === null ||
          profile.engagementRate === undefined ||
          profile.engagementRate < minEngagement)
      ) {
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
    } else {
      sorted.sort((a, b) => {
        if (a.isTopPick !== b.isTopPick) return a.isTopPick ? -1 : 1;
        return b.engagementEstimate - a.engagementEstimate;
      });
    }

    return sorted;
  }, [
    sourceProfiles,
    indexMode,
    qualFilter,
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
    if (platformFilter === 'tiktok') {
      setDiscoveryBanner(
        'TikTok discovery API is not connected. Select All Platforms, YouTube, or Instagram.'
      );
      return;
    }

    try {
      cancelRequestedRef.current = false;
      setDiscovering(true);
      setDiscoveryBanner(null);

      const activeCamp = campaigns[0];
      const defaultCampaignId = activeCamp?.id;
      const filterPayload = {
        campaignId: defaultCampaignId,
        queries: searchQuery.trim() ? [searchQuery.trim()] : undefined,
        minFollowers:
          followerTier === 'micro'
            ? activeCamp?.min_followers ?? 5000
            : activeCamp?.min_followers ?? undefined,
        maxFollowers:
          followerTier === 'micro'
            ? activeCamp?.max_followers ?? 100000
            : activeCamp?.max_followers ?? undefined,
        minEngagementRate:
          minEngagement > 0
            ? minEngagement
            : activeCamp?.min_engagement_rate
              ? Number(activeCamp.min_engagement_rate)
              : undefined,
        targetCountry: locationFilter,
        niche: nicheFilter,
      };

      if (platformFilter === 'instagram') {
        const res = await startInstagramDiscoveryApi({
          ...filterPayload,
          targetCount: 25,
        });
        setActiveRun(res.run);
        mergeDiscoveredCreators(res.creators);
        if (res.persistence?.persisted) {
          await loadWorkspaceRecords();
        } else if (res.persistence?.warning) {
          setBackendError(res.persistence.warning);
        }
        setDiscovering(false);
        const persistNote = res.persistence?.persisted
          ? `and verified ${res.persistence.verifiedCount} in Supabase`
          : '(displayed from live Apify response; database persistence unavailable)';
        setDiscoveryBanner(
          `Apify Instagram discovery completed: ${res.creators.length} unique creator(s) retrieved ${persistNote}.`
        );
        return;
      }

      if (platformFilter === 'youtube') {
        const res = await startYouTubeDiscoveryApi({
          ...filterPayload,
          targetCount: 55,
        });
        setActiveRun(res.run);
        mergeDiscoveredCreators(res.creators);
        if (res.persistence?.persisted) {
          await loadWorkspaceRecords();
        } else if (res.persistence?.warning) {
          setBackendError(res.persistence.warning);
        }

        if (res.run.status === 'partial') {
          await continuePartialRun(res.run);
        } else {
          setDiscovering(false);
          if (res.run.status === 'failed') {
            setDiscoveryBanner(res.run.error_message || 'YouTube discovery run failed.');
          } else if (res.run.status === 'cancelled') {
            setDiscoveryBanner('YouTube discovery run was cancelled.');
          } else {
            const persistNote = res.persistence?.persisted
              ? `and verified ${res.persistence.verifiedCount} in Supabase`
              : '(displayed from live YouTube Data API v3; database persistence unavailable)';
            setDiscoveryBanner(
              `YouTube discovery completed: ${res.creators.length} unique channel(s) retrieved ${persistNote}.`
            );
          }
        }
        return;
      }

      // platformFilter === 'all': trigger real discovery for both YouTube Data API v3 and Apify Instagram (50+ combined target)
      const [ytSettled, igSettled] = await Promise.allSettled([
        startYouTubeDiscoveryApi({
          ...filterPayload,
          targetCount: 40,
        }),
        startInstagramDiscoveryApi({
          ...filterPayload,
          targetCount: 20,
        }),
      ]);

      const notes: string[] = [];
      let anyPersisted = false;
      let partialYtRun: DiscoveryRunDbRow | null = null;
      const warnings: string[] = [];

      if (ytSettled.status === 'fulfilled') {
        const yt = ytSettled.value;
        setActiveRun(yt.run);
        mergeDiscoveredCreators(yt.creators);
        if (yt.persistence?.persisted) anyPersisted = true;
        if (yt.persistence?.warning) warnings.push(yt.persistence.warning);
        notes.push(`YouTube: ${yt.creators.length} channel(s)`);
        if (yt.run.status === 'partial') {
          partialYtRun = yt.run;
        }
      } else {
        const msg = ytSettled.reason instanceof Error ? ytSettled.reason.message : 'YouTube failed';
        notes.push(`YouTube error: ${msg}`);
      }

      if (igSettled.status === 'fulfilled') {
        const ig = igSettled.value;
        mergeDiscoveredCreators(ig.creators);
        if (ig.persistence?.persisted) anyPersisted = true;
        if (ig.persistence?.warning) warnings.push(ig.persistence.warning);
        notes.push(`Instagram (Apify): ${ig.creators.length} creator(s)`);
      } else {
        const msg = igSettled.reason instanceof Error ? igSettled.reason.message : 'Instagram failed';
        notes.push(`Instagram: ${msg}`);
      }

      if (anyPersisted) {
        await loadWorkspaceRecords();
      } else if (warnings.length > 0) {
        setBackendError(warnings[0]);
      }

      if (partialYtRun) {
        await continuePartialRun(partialYtRun);
      } else {
        setDiscovering(false);
      }

      setDiscoveryBanner(`Live discovery finished — ${notes.join(' | ')}.`);
    } catch (err) {
      setDiscovering(false);
      setDiscoveryBanner(
        err instanceof Error
          ? err.message
          : 'Discovery request failed. Check API integration configuration.'
      );
    }
  };

  const cancelActiveDiscovery = async () => {
    if (!activeRun) return;
    cancelRequestedRef.current = true;
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
        message: 'Select at least one stored creator profile before adding to a campaign.',
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

  const enrichCreatorProfile = async (
    influencerId: string
  ): Promise<InfluencerDemoProfile | null> => {
    try {
      const outcome = await enrichInfluencerApi(influencerId, true);
      const updated = mapWorkspaceItemToProfile(outcome.creator);
      setLiveProfiles((prev) =>
        prev.map((p) => (p.id === influencerId ? updated : p))
      );
      setDiscoveryBanner(
        `Enriched ${updated.name}: ${outcome.enrichmentStatus} (${outcome.themesCount} themes, ${outcome.emailFound ? 'public email found' : 'email Not Found'}).`
      );
      return updated;
    } catch (err) {
      setDiscoveryBanner(
        err instanceof Error ? err.message : 'Profile enrichment failed.'
      );
      return null;
    }
  };

  const updateCreatorChannels = async (
    influencerId: string,
    input: {
      preferredChannel?: OutreachChannel;
      addChannel?: { type: ContactChannelType; value: string; evidence?: string };
    }
  ): Promise<InfluencerDemoProfile | null> => {
    try {
      const detail = await updateCreatorChannelsApi(influencerId, input);
      const updated = mapWorkspaceItemToProfile(detail);
      setLiveProfiles((prev) =>
        prev.map((p) => (p.id === influencerId ? updated : p))
      );
      setDiscoveryBanner(
        `Updated verified contact channels / preferred outreach channel for ${updated.name}.`
      );
      return updated;
    } catch (err) {
      setDiscoveryBanner(
        err instanceof Error ? err.message : 'Failed to update contact channel.'
      );
      return null;
    }
  };

  const reEvaluateCreators = async () => {
    try {
      const activeCamp = campaigns[0];
      const summary = await reEvaluateInfluencersApi(activeCamp?.id);
      await loadWorkspaceRecords();
      setDiscoveryBanner(
        `Re-evaluated ${summary.totalEvaluated} creator(s): ${summary.after.qualified} qualified (PASS), ${summary.after.needs_review} needs review, ${summary.after.rejected} rejected (FAIL).`
      );
    } catch (err) {
      setDiscoveryBanner(
        err instanceof Error ? err.message : 'Failed to re-evaluate creators.'
      );
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
    qualFilter,
    setQualFilter,
    followerTier,
    setFollowerTier,
    minEngagement,
    setMinEngagement,
    appliedChips,
    removeChip,
    clearAllFilters,
    filteredProfiles,
    totalStoredCount: liveProfiles.length,
    isShowingDemoFallback,
    isBackendConnected,
    backendError,
    campaigns,
    activeRun,
    discovering,
    discoveryBanner,
    setDiscoveryBanner,
    triggerFindInfluencers,
    cancelActiveDiscovery,
    addSelectedToCampaign,
    enrichCreatorProfile,
    updateCreatorChannels,
    reEvaluateCreators,
  };
}
