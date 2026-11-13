import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DASHBOARD_CAMPAIGNS,
  INITIAL_DASHBOARD_CREATORS,
  LOCAL_TEMPLATE_VARIATIONS,
} from '../data/dashboardDemoData';
import {
  createCampaignApi,
  deleteCampaignApi,
  fetchCampaignsApi,
  fetchGmailStatusApi,
  fetchInfluencersApi,
  fetchOutreachLogsApi,
  generateEmailPitchApi,
  generateInstagramDmApi,
  GmailStatusApiResponse,
  logManualInstagramDmApi,
  OutreachLogDbRow,
  removeCreatorFromCampaignApi,
  sendLiveOutreachApi,
  simulateOutreachApi,
  updateInfluencerManualApi,
  updateMessageDraftApi,
  WorkspaceCreatorApiItem,
} from '../services/api/workspaceApi';
import { ApiClientError } from '../services/api/client';
import {
  CampaignOption,
  DashboardCreatorRow,
  DashboardPlatform,
  DashboardQualStatus,
} from '../types/dashboard';

function formatCompactCount(num: number | null | undefined): string {
  if (!num || num <= 0) return 'Unavailable';
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return String(num);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'CR';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function mapApiCreatorToRow(item: WorkspaceCreatorApiItem): DashboardCreatorRow {
  const { influencer, campaignInfluencer, emailMessage, instagramDmMessage, latestOutreachLog } =
    item;

  const platformName = influencer.platform.toLowerCase();
  const platforms: DashboardPlatform[] =
    platformName === 'instagram'
      ? ['Instagram']
      : platformName === 'tiktok'
        ? ['TikTok']
        : ['YouTube'];

  let qualStatus: DashboardQualStatus = 'Passed';
  const dbQual = campaignInfluencer?.qualification_status;
  if (latestOutreachLog && ['simulated', 'sent', 'delivered'].includes(latestOutreachLog.status)) {
    qualStatus = 'Approved / Queued';
  } else if (dbQual === 'rejected') {
    qualStatus = 'Failed';
  } else if (dbQual === 'needs_review') {
    qualStatus = 'Needs Review';
  } else if (dbQual === 'qualified') {
    qualStatus = 'Passed';
  } else {
    qualStatus = 'Needs Review';
  }

  const handle = influencer.username
    ? influencer.username.startsWith('@')
      ? influencer.username
      : `@${influencer.username}`
    : `@${influencer.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 18)}`;

  const handleStyles =
    qualStatus === 'Failed'
      ? { bg: 'bg-[#FEE2E2]', text: 'text-[#991B1B]' }
      : qualStatus === 'Needs Review'
        ? { bg: 'bg-[#FEF3C7]', text: 'text-[#92400E]' }
        : { bg: 'bg-[#EDE9FE]', text: 'text-[#5B21B6]' };

  const followersCount = influencer.follower_count ?? 0;
  const engagementRate = Number(influencer.engagement_rate ?? 0);

  return {
    id: influencer.id,
    name: influencer.name,
    initials: getInitials(influencer.name),
    handle,
    handleBgClass: handleStyles.bg,
    handleTextClass: handleStyles.text,
    platforms,
    followers: formatCompactCount(influencer.follower_count),
    followersCount,
    engagement:
      influencer.engagement_rate !== null && influencer.engagement_rate !== undefined
        ? `${engagementRate.toFixed(1)}%`
        : 'Unavailable',
    engagementRate,
    qualStatus,
    qualReason:
      latestOutreachLog?.status === 'simulated'
        ? 'Simulated outreach logged (no real email sent)'
        : latestOutreachLog?.status === 'sent'
          ? 'Sent via Gmail'
          : campaignInfluencer?.qualification_reason || 'Pending qualification check',
    email: influencer.contact_email || 'Not Found',
    emailVerifiedDemo: influencer.email_status === 'verified' && Boolean(influencer.contact_email),
    niche: influencer.niche || 'Beauty & Skincare',
    geography: influencer.country || 'Unavailable',
    emailPitchDraft:
      emailMessage?.message_body ||
      'No AI email pitch generated yet. Click "Regenerate Draft" to generate a personalized 60-90 word pitch via Gemini.',
    instagramDmDraft:
      instagramDmMessage?.message_body ||
      'No AI Instagram DM generated yet. Click "Regenerate DM" to generate a 15-30 word DM via Gemini.',
    isLiveRecord: true,
    isTopPick: Boolean(influencer.is_top_pick),
    campaignInfluencerId: campaignInfluencer?.id,
    influencerId: influencer.id,
    emailMessageId: emailMessage?.id,
    instagramDmMessageId: instagramDmMessage?.id,
    emailSubject: emailMessage?.subject || undefined,
    profileUrl: influencer.profile_url,
    dataSource: influencer.data_source || 'youtube_data_api_v3',
    retrievedAt: influencer.source_retrieved_at || influencer.created_at,
    outreachStatusLabel: latestOutreachLog?.status,
  };
}

export function useDashboardState() {
  const [campaigns, setCampaigns] = useState<CampaignOption[]>(DASHBOARD_CAMPAIGNS);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(
    DASHBOARD_CAMPAIGNS[0].id
  );
  const [creators, setCreators] = useState<DashboardCreatorRow[]>(INITIAL_DASHBOARD_CREATORS);
  const [outreachLogs, setOutreachLogs] = useState<OutreachLogDbRow[]>([]);
  const [gmailStatus, setGmailStatus] = useState<GmailStatusApiResponse>({
    oauthConfigured: false,
    connected: false,
    senderEmail: null,
    outreachMode: 'simulation',
    message: 'Gmail not connected.',
  });

  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);
  const [isShowingDemoFallback, setIsShowingDemoFallback] = useState<boolean>(true);
  const [loadingWorkspace, setLoadingWorkspace] = useState<boolean>(true);
  const [busyAction, setBusyAction] = useState<boolean>(false);

  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [activeCreatorId, setActiveCreatorId] = useState<string>(
    INITIAL_DASHBOARD_CREATORS[0].id
  );
  const [drawerOpen, setDrawerOpen] = useState<boolean>(true);
  const [globalSearch, setGlobalSearch] = useState<string>('');
  const [templateCycleIndex, setTemplateCycleIndex] = useState<Record<string, number>>({});
  const [demoNotice, setDemoNotice] = useState<string | null>(null);

  const loadCampaignWorkspace = useCallback(async (campaignId: string) => {
    try {
      const [{ items }, logs] = await Promise.all([
        fetchInfluencersApi({ campaignId }),
        fetchOutreachLogsApi(campaignId),
      ]);
      setOutreachLogs(logs);

      if (items.length > 0) {
        const mapped = items.map(mapApiCreatorToRow);
        setCreators(mapped);
        setActiveCreatorId((prev) =>
          mapped.some((m) => m.id === prev) ? prev : mapped[0].id
        );
        setIsShowingDemoFallback(false);
      } else {
        setCreators(INITIAL_DASHBOARD_CREATORS);
        setActiveCreatorId(INITIAL_DASHBOARD_CREATORS[0].id);
        setIsShowingDemoFallback(true);
      }
    } catch {
      setCreators(INITIAL_DASHBOARD_CREATORS);
      setIsShowingDemoFallback(true);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoadingWorkspace(true);
    try {
      const [dbCampaigns, gmail] = await Promise.all([
        fetchCampaignsApi(true),
        fetchGmailStatusApi().catch(() => ({
          oauthConfigured: false,
          connected: false,
          senderEmail: null,
          outreachMode: 'simulation' as const,
          message: 'Gmail not connected.',
        })),
      ]);
      setGmailStatus(gmail);
      setIsBackendConnected(true);

      if (dbCampaigns.length > 0) {
        const mappedCampaigns: CampaignOption[] = dbCampaigns.map((c) => ({
          id: c.id,
          label: c.name,
          breadcrumbName: c.name,
          brandName: c.brand_name,
          niche: c.niche,
          targetCountry: c.target_country,
          status: c.status,
        }));
        setCampaigns(mappedCampaigns);

        const activeId = mappedCampaigns.some((c) => c.id === selectedCampaignId)
          ? selectedCampaignId
          : mappedCampaigns[0].id;
        setSelectedCampaignId(activeId);
        await loadCampaignWorkspace(activeId);
      } else {
        setCampaigns(DASHBOARD_CAMPAIGNS);
        setCreators(INITIAL_DASHBOARD_CREATORS);
        setIsShowingDemoFallback(true);
      }
    } catch (err) {
      setIsBackendConnected(false);
      setCampaigns(DASHBOARD_CAMPAIGNS);
      setCreators(INITIAL_DASHBOARD_CREATORS);
      setIsShowingDemoFallback(true);
      if (err instanceof ApiClientError && err.code === 'supabase_not_configured') {
        setDemoNotice(
          'Supabase server secret key not configured yet — displaying Illustrative Demo Data.'
        );
      }
    } finally {
      setLoadingWorkspace(false);
    }
  }, [loadCampaignWorkspace, selectedCampaignId]);

  useEffect(() => {
    void refreshAll();
    if (typeof window !== 'undefined' && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      const gmailParam = params.get('gmail');
      if (gmailParam === 'error') {
        const reason = params.get('reason') || 'authorization_failed';
        setDemoNotice(`Gmail OAuth did not complete (${reason}).`);
      }
      if (gmailParam) {
        params.delete('gmail');
        params.delete('reason');
        const nextQuery = params.toString();
        const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`;
        window.history.replaceState(null, '', nextUrl);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectCampaign = useCallback(
    async (nextCampaignId: string) => {
      setSelectedCampaignId(nextCampaignId);
      if (isBackendConnected) {
        await loadCampaignWorkspace(nextCampaignId);
      }
    },
    [isBackendConnected, loadCampaignWorkspace]
  );

  const selectedCampaign =
    campaigns.find((c) => c.id === selectedCampaignId) ?? campaigns[0];

  const filteredCreators = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    if (!q) return creators;
    return creators.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.handle.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.qualReason.toLowerCase().includes(q)
    );
  }, [creators, globalSearch]);

  const activeCreator = useMemo(
    () => creators.find((c) => c.id === activeCreatorId) ?? creators[0] ?? null,
    [creators, activeCreatorId]
  );

  const kpiMetrics = useMemo(() => {
    if (isShowingDemoFallback) {
      const approvedExtra = creators.filter(
        (c) => c.qualStatus === 'Approved / Queued'
      ).length;
      return {
        discoveredCount: 54,
        qualifiedCount: 32,
        enrichedCount: 26,
        outreachQueuedCount: 18 + approvedExtra,
      };
    }

    return {
      discoveredCount: creators.length,
      qualifiedCount: creators.filter(
        (c) => c.qualStatus === 'Passed' || c.qualStatus === 'Approved / Queued'
      ).length,
      enrichedCount: creators.filter((c) => c.email !== 'Not Found').length,
      outreachQueuedCount: outreachLogs.length,
    };
  }, [creators, isShowingDemoFallback, outreachLogs.length]);

  const toggleRowSelection = (id: string) => {
    setSelectedRowIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleAllVisibleSelection = () => {
    const visibleIds = filteredCreators.map((c) => c.id);
    const allSelected =
      visibleIds.length > 0 && visibleIds.every((id) => selectedRowIds.includes(id));

    if (allSelected) {
      setSelectedRowIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedRowIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const openPitchPreview = (creatorId: string) => {
    setActiveCreatorId(creatorId);
    setDrawerOpen(true);
  };

  const updateEmailDraft = (creatorId: string, nextDraft: string) => {
    setCreators((prev) =>
      prev.map((c) => (c.id === creatorId ? { ...c, emailPitchDraft: nextDraft } : c))
    );
  };

  const saveEmailDraftToBackend = async (creatorId: string) => {
    const target = creators.find((c) => c.id === creatorId);
    if (!target?.isLiveRecord || !target.emailMessageId) return;
    try {
      await updateMessageDraftApi(target.emailMessageId, {
        messageBody: target.emailPitchDraft,
      });
      setDemoNotice('Saved edited email pitch draft to Supabase.');
    } catch (err) {
      setDemoNotice(
        err instanceof Error ? err.message : 'Unable to save edited email draft.'
      );
    }
  };

  const regeneratePitchDrafts = async (creatorId: string) => {
    const target = creators.find((c) => c.id === creatorId);
    if (!target) return;

    if (!target.isLiveRecord || !target.campaignInfluencerId) {
      const nextIdx =
        ((templateCycleIndex[creatorId] ?? -1) + 1) % LOCAL_TEMPLATE_VARIATIONS.length;
      const newDraft = LOCAL_TEMPLATE_VARIATIONS[nextIdx](target.name);
      setTemplateCycleIndex((prev) => ({ ...prev, [creatorId]: nextIdx }));
      updateEmailDraft(creatorId, newDraft);
      return;
    }

    setBusyAction(true);
    try {
      const [emailMsg, dmMsg] = await Promise.all([
        generateEmailPitchApi(target.campaignInfluencerId),
        generateInstagramDmApi(target.campaignInfluencerId),
      ]);

      setCreators((prev) =>
        prev.map((c) =>
          c.id === creatorId
            ? {
                ...c,
                emailPitchDraft: emailMsg.message_body,
                emailMessageId: emailMsg.id,
                emailSubject: emailMsg.subject || undefined,
                instagramDmDraft: dmMsg.message_body,
                instagramDmMessageId: dmMsg.id,
              }
            : c
        )
      );
      setDemoNotice(
        `Generated personalized Gemini pitches for ${target.name} (${emailMsg.word_count ?? 0}w email, ${dmMsg.word_count ?? 0}w DM).`
      );
    } catch (err) {
      setDemoNotice(
        err instanceof Error ? err.message : 'Unable to generate Gemini AI pitch.'
      );
    } finally {
      setBusyAction(false);
    }
  };

  const approveAndSendOrSimulate = async (creatorId: string) => {
    const target = creators.find((c) => c.id === creatorId);
    if (!target) return;

    if (!target.isLiveRecord || !target.campaignInfluencerId) {
      setCreators((prev) =>
        prev.map((c) =>
          c.id === creatorId
            ? {
                ...c,
                qualStatus: 'Approved / Queued',
                qualReason: 'Approved in local demo queue',
              }
            : c
        )
      );
      setDemoNotice('Demo action only — no real email was sent.');
      return;
    }

    setBusyAction(true);
    try {
      const canSendLive =
        gmailStatus.outreachMode === 'live' &&
        gmailStatus.connected &&
        Boolean(target.emailMessageId);

      if (canSendLive && target.emailMessageId) {
        await updateMessageDraftApi(target.emailMessageId, {
          messageBody: target.emailPitchDraft,
          approve: true,
        });
        const res = await sendLiveOutreachApi({
          campaignInfluencerId: target.campaignInfluencerId,
          outreachMessageId: target.emailMessageId,
          confirmSend: true,
        });
        setDemoNotice(res.message);
      } else {
        const res = await simulateOutreachApi({
          campaignInfluencerId: target.campaignInfluencerId,
          outreachMessageId: target.emailMessageId,
          subject: target.emailSubject,
          messageBody: target.emailPitchDraft,
        });
        setDemoNotice(res.message);
      }

      await loadCampaignWorkspace(selectedCampaignId);
    } catch (err) {
      setDemoNotice(
        err instanceof Error ? err.message : 'Unable to process outreach approval.'
      );
    } finally {
      setBusyAction(false);
    }
  };

  const logManualInstagramDm = async (creatorId: string) => {
    const target = creators.find((c) => c.id === creatorId);
    if (!target?.isLiveRecord || !target.campaignInfluencerId) {
      setDemoNotice('Copied Instagram DM (demo preview — manual sending only).');
      return;
    }

    try {
      const res = await logManualInstagramDmApi({
        campaignInfluencerId: target.campaignInfluencerId,
        outreachMessageId: target.instagramDmMessageId,
        dmText: target.instagramDmDraft,
      });
      setDemoNotice(res.message);
      await loadCampaignWorkspace(selectedCampaignId);
    } catch (err) {
      setDemoNotice(
        err instanceof Error ? err.message : 'Unable to log manual Instagram DM.'
      );
    }
  };

  const updateCreatorProfile = async (updated: DashboardCreatorRow) => {
    if (!updated.isLiveRecord || !updated.influencerId) {
      setCreators((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      return;
    }

    const dbQual =
      updated.qualStatus === 'Passed' || updated.qualStatus === 'Approved / Queued'
        ? 'qualified'
        : updated.qualStatus === 'Needs Review'
          ? 'needs_review'
          : 'rejected';

    setBusyAction(true);
    try {
      await updateInfluencerManualApi(updated.influencerId, {
        name: updated.name,
        contactEmail: updated.email,
        qualificationStatus: dbQual,
        qualificationReason: updated.qualReason,
        campaignInfluencerId: updated.campaignInfluencerId,
      });
      await loadCampaignWorkspace(selectedCampaignId);
      setDemoNotice(`Updated manual review details for ${updated.name}.`);
    } catch (err) {
      setDemoNotice(
        err instanceof Error ? err.message : 'Unable to update creator record.'
      );
    } finally {
      setBusyAction(false);
    }
  };

  const deleteCreatorRow = async (creatorId: string) => {
    const target = creators.find((c) => c.id === creatorId);
    if (!target?.isLiveRecord || !target.campaignInfluencerId) {
      setCreators((prev) => prev.filter((c) => c.id !== creatorId));
      setSelectedRowIds((prev) => prev.filter((id) => id !== creatorId));
      return;
    }

    setBusyAction(true);
    try {
      await removeCreatorFromCampaignApi(target.campaignInfluencerId);
      setSelectedRowIds((prev) => prev.filter((id) => id !== creatorId));
      await loadCampaignWorkspace(selectedCampaignId);
      setDemoNotice(`Removed ${target.name} from campaign queue.`);
    } catch (err) {
      setDemoNotice(
        err instanceof Error ? err.message : 'Unable to remove creator from campaign.'
      );
    } finally {
      setBusyAction(false);
    }
  };

  const createNewCampaign = async (input: {
    name: string;
    niche: string;
    targetCountry: string;
  }): Promise<boolean> => {
    if (!isBackendConnected) {
      return false;
    }
    setBusyAction(true);
    try {
      const created = await createCampaignApi({
        name: input.name,
        brand_name: 'GlowCare',
        niche: input.niche,
        target_country: input.targetCountry,
      });
      await refreshAll();
      setSelectedCampaignId(created.id);
      await loadCampaignWorkspace(created.id);
      setDemoNotice(`Created shared campaign "${created.name}".`);
      return true;
    } catch (err) {
      setDemoNotice(err instanceof Error ? err.message : 'Unable to create campaign.');
      return false;
    } finally {
      setBusyAction(false);
    }
  };

  const deleteSelectedCampaign = async (): Promise<void> => {
    if (!isBackendConnected || campaigns.length <= 1) return;
    setBusyAction(true);
    try {
      await deleteCampaignApi(selectedCampaignId);
      setDemoNotice('Campaign deleted.');
      await refreshAll();
    } catch (err) {
      setDemoNotice(err instanceof Error ? err.message : 'Unable to delete campaign.');
    } finally {
      setBusyAction(false);
    }
  };

  return {
    campaigns,
    creators,
    filteredCreators,
    outreachLogs,
    gmailStatus,
    kpiMetrics,
    isBackendConnected,
    isShowingDemoFallback,
    loadingWorkspace,
    busyAction,
    selectedRowIds,
    activeCreator,
    drawerOpen,
    setDrawerOpen,
    globalSearch,
    setGlobalSearch,
    selectedCampaign,
    selectedCampaignId,
    setSelectedCampaignId: handleSelectCampaign,
    demoNotice,
    setDemoNotice,
    toggleRowSelection,
    toggleAllVisibleSelection,
    openPitchPreview,
    updateEmailDraft,
    saveEmailDraftToBackend,
    regenerateLocalDraft: regeneratePitchDrafts,
    simulateApproveOutreach: approveAndSendOrSimulate,
    logManualInstagramDm,
    updateCreatorProfile,
    deleteCreatorRow,
    createNewCampaign,
    deleteSelectedCampaign,
    refreshAll,
  };
}
