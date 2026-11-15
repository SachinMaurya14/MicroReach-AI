import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buildCreatorsExportCsvUrl,
  buildOutreachLogsExportCsvUrl,
  createCampaignApi,
  deleteCampaignApi,
  fetchCampaignsApi,
  fetchGmailStatusApi,
  fetchInfluencersApi,
  fetchOutreachLogsApi,
  generateEmailPitchApi,
  generateFollowUpDraftApi,
  generateInstagramDmApi,
  generateLinkedInMessageApi,
  generateYouTubeContactApi,
  GmailStatusApiResponse,
  logManualInstagramDmApi,
  logManualMultiChannelApi,
  OutreachLogDbRow,
  removeCreatorFromCampaignApi,
  saveManualDraftApi,
  sendLiveOutreachApi,
  simulateOutreachApi,
  updateCreatorChannelsApi,
  updateInfluencerManualApi,
  updateMessageDraftApi,
  WorkspaceCreatorApiItem,
} from '../services/api/workspaceApi';
import { ApiClientError } from '../services/api/client';
import type { ContactChannelType, OutreachChannel } from '../types/database';
import {
  CampaignOption,
  DashboardCreatorRow,
  DashboardPlatform,
  DashboardQualFilter,
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
  const {
    influencer,
    campaignInfluencer,
    emailMessage,
    instagramDmMessage,
    linkedinMessage,
    youtubeContactMessage,
    latestOutreachLog,
    contactChannels,
    channelAvailability,
    recommendedChannel,
    preferredChannel,
  } = item;

  const platformName = influencer.platform.toLowerCase();
  const platforms: DashboardPlatform[] =
    platformName === 'instagram'
      ? ['Instagram']
      : platformName === 'tiktok'
        ? ['TikTok']
        : ['YouTube'];

  let qualStatus: DashboardQualStatus = 'Passed';
  const dbQual = campaignInfluencer?.qualification_status;
  if (
    latestOutreachLog &&
    (['simulated', 'sent', 'delivered'].includes(latestOutreachLog.status) ||
      (latestOutreachLog.status === 'manual' && latestOutreachLog.action.endsWith('_sent')))
  ) {
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
          : latestOutreachLog?.status === 'manual' && latestOutreachLog.action.endsWith('_sent')
            ? `Manually sent via ${latestOutreachLog.channel.replace('_', ' ')}`
            : campaignInfluencer?.qualification_reason || 'Pending qualification check',
    email: influencer.contact_email || 'Not Found',
    emailVerifiedDemo:
      influencer.email_status === 'verified' &&
      Boolean(influencer.contact_email) &&
      (influencer.contact_email ?? '').toLowerCase() !== 'not found',
    emailStatus: influencer.email_status,
    niche: influencer.niche || 'Beauty & Skincare',
    geography: influencer.country || 'Not Available',
    emailPitchDraft:
      emailMessage?.message_body ||
      'No AI email pitch generated yet. Click "Regenerate" to generate a personalized 60-90 word pitch via Gemini or edit and Save Draft manually.',
    instagramDmDraft:
      instagramDmMessage?.message_body ||
      'No AI Instagram DM generated yet. Click "Generate DM" via Gemini or write and save a manual DM.',
    linkedinMessageDraft:
      linkedinMessage?.message_body ||
      'No LinkedIn outreach message generated yet. Link/confirm a public LinkedIn URL or write a 20-75 word message.',
    youtubeContactDraft:
      youtubeContactMessage?.message_body ||
      'No YouTube business-contact outreach pitch generated yet. Generate via Gemini or write a 30-90 word collaboration pitch.',
    youtubeContactSubject: youtubeContactMessage?.subject || undefined,
    isLiveRecord: true,
    isTopPick: Boolean(influencer.is_top_pick),
    campaignInfluencerId: campaignInfluencer?.id,
    influencerId: influencer.id,
    emailMessageId: emailMessage?.id,
    instagramDmMessageId: instagramDmMessage?.id,
    linkedinMessageId: linkedinMessage?.id,
    youtubeContactMessageId: youtubeContactMessage?.id,
    emailSubject: emailMessage?.subject || undefined,
    emailMessageStatus: emailMessage?.status || undefined,
    emailWorkflowStatus: emailMessage?.workflow_status ?? undefined,
    instagramDmStatus: instagramDmMessage?.status || undefined,
    instagramDmWorkflowStatus: instagramDmMessage?.workflow_status ?? undefined,
    linkedinMessageStatus: linkedinMessage?.status || undefined,
    linkedinWorkflowStatus: linkedinMessage?.workflow_status ?? undefined,
    youtubeContactStatus: youtubeContactMessage?.status || undefined,
    youtubeContactWorkflowStatus: youtubeContactMessage?.workflow_status ?? undefined,
    collaborationType: emailMessage?.collaboration_type || undefined,
    personalizationSignals: Array.isArray(emailMessage?.personalization_signals)
      ? emailMessage.personalization_signals
      : [],
    aiModel: emailMessage?.ai_model ?? null,
    emailWordCount: emailMessage?.word_count ?? null,
    dmWordCount: instagramDmMessage?.word_count ?? null,
    linkedinWordCount: linkedinMessage?.word_count ?? null,
    youtubeWordCount: youtubeContactMessage?.word_count ?? null,
    engagementSource: influencer.engagement_source ?? null,
    profileUrl: influencer.profile_url,
    website: influencer.website ?? null,
    emailSource: influencer.email_source ?? null,
    enrichmentStatus: influencer.enrichment_status ?? null,
    dataSource: influencer.data_source || 'youtube_data_api_v3',
    retrievedAt: influencer.source_retrieved_at || influencer.created_at,
    outreachStatusLabel: latestOutreachLog?.status,
    contactChannels: contactChannels ?? [],
    channelAvailability: channelAvailability ?? [],
    recommendedChannel: recommendedChannel ?? null,
    preferredChannel: preferredChannel ?? null,
  };
}

export function useDashboardState() {
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [creators, setCreators] = useState<DashboardCreatorRow[]>([]);
  const [outreachLogs, setOutreachLogs] = useState<OutreachLogDbRow[]>([]);
  const [gmailStatus, setGmailStatus] = useState<GmailStatusApiResponse>({
    oauthConfigured: false,
    connected: false,
    senderEmail: null,
    outreachMode: 'simulation',
    message: 'Gmail not connected.',
  });

  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [loadingWorkspace, setLoadingWorkspace] = useState<boolean>(true);
  const [busyAction, setBusyAction] = useState<boolean>(false);

  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [activeCreatorId, setActiveCreatorId] = useState<string>('');
  const [drawerOpen, setDrawerOpen] = useState<boolean>(true);
  const [globalSearch, setGlobalSearch] = useState<string>('');
  const [qualFilter, setQualFilter] = useState<DashboardQualFilter>('all');
  const [demoNotice, setDemoNotice] = useState<string | null>(null);

  const loadCampaignWorkspace = useCallback(async (campaignId: string) => {
    try {
      const [{ items }, logs] = await Promise.all([
        fetchInfluencersApi({ campaignId }),
        fetchOutreachLogsApi(campaignId),
      ]);
      setOutreachLogs(logs);
      setBackendError(null);

      const mapped = items.map(mapApiCreatorToRow);
      setCreators(mapped);
      setActiveCreatorId((prev) =>
        mapped.length === 0
          ? ''
          : mapped.some((m) => m.id === prev)
            ? prev
            : mapped[0].id
      );
    } catch (err) {
      setBackendError(
        err instanceof Error ? err.message : 'Unable to load campaign creators from Supabase.'
      );
      setCreators([]);
      setOutreachLogs([]);
      setActiveCreatorId('');
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
      setBackendError(null);

      if (dbCampaigns.length > 0) {
        const mappedCampaigns: CampaignOption[] = dbCampaigns.map((c) => ({
          id: c.id,
          label: c.name,
          breadcrumbName: c.name,
          brandName: c.brand_name,
          niche: c.niche,
          targetCountry: c.target_country,
          status: c.status,
          minFollowers: c.min_followers ?? undefined,
          maxFollowers: c.max_followers ?? undefined,
          minEngagementRate: Number(c.min_engagement_rate ?? 2),
          collaborationType: c.collaboration_type ?? 'Sponsorship',
          productDescription: c.product_description ?? null,
          campaignBrief: c.campaign_brief ?? null,
          targetPlatforms: c.target_platforms ?? ['youtube', 'instagram'],
        }));
        setCampaigns(mappedCampaigns);

        const activeId = mappedCampaigns.some((c) => c.id === selectedCampaignId)
          ? selectedCampaignId
          : mappedCampaigns[0].id;
        setSelectedCampaignId(activeId);
        await loadCampaignWorkspace(activeId);
      } else {
        setCampaigns([]);
        setSelectedCampaignId('');
        setCreators([]);
        setOutreachLogs([]);
        setActiveCreatorId('');
      }
    } catch (err) {
      setIsBackendConnected(false);
      setCampaigns([]);
      setCreators([]);
      setOutreachLogs([]);
      setActiveCreatorId('');
      if (err instanceof ApiClientError && err.code === 'supabase_not_configured') {
        setBackendError(
          'Supabase backend is not configured yet (set SUPABASE_URL and SUPABASE_SECRET_KEY).'
        );
      } else {
        setBackendError(
          err instanceof Error
            ? err.message
            : 'Unable to reach workspace API. Verify invitation access and server health.'
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
      } else if (gmailParam === 'connected') {
        setDemoNotice('Gmail OAuth authorization completed successfully.');
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
      if (isBackendConnected && nextCampaignId) {
        await loadCampaignWorkspace(nextCampaignId);
      }
    },
    [isBackendConnected, loadCampaignWorkspace]
  );

  const selectedCampaign =
    campaigns.find((c) => c.id === selectedCampaignId) ?? campaigns[0];

  const filteredCreators = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    return creators.filter((c) => {
      if (qualFilter === 'qualified') {
        if (c.qualStatus !== 'Passed' && c.qualStatus !== 'Approved / Queued') return false;
      } else if (qualFilter === 'needs_review') {
        if (c.qualStatus !== 'Needs Review') return false;
      } else if (qualFilter === 'rejected') {
        if (c.qualStatus !== 'Failed') return false;
      }

      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.handle.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.qualReason.toLowerCase().includes(q)
      );
    });
  }, [creators, globalSearch, qualFilter]);

  const activeCreator = useMemo(
    () => creators.find((c) => c.id === activeCreatorId) ?? creators[0] ?? null,
    [creators, activeCreatorId]
  );

  const kpiMetrics = useMemo(() => {
    return {
      discoveredCount: creators.length,
      qualifiedCount: creators.filter(
        (c) => c.qualStatus === 'Passed' || c.qualStatus === 'Approved / Queued'
      ).length,
      enrichedCount: creators.filter((c) => c.email !== 'Not Found').length,
      outreachQueuedCount: outreachLogs.length,
    };
  }, [creators, outreachLogs.length]);

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

  const updateEmailSubject = (creatorId: string, nextSubject: string) => {
    setCreators((prev) =>
      prev.map((c) => (c.id === creatorId ? { ...c, emailSubject: nextSubject } : c))
    );
  };

  const updateChannelDraft = (
    creatorId: string,
    channel: OutreachChannel,
    nextDraft: string,
    nextSubject?: string
  ) => {
    setCreators((prev) =>
      prev.map((c) => {
        if (c.id !== creatorId) return c;
        if (channel === 'email') {
          return {
            ...c,
            emailPitchDraft: nextDraft,
            emailSubject: nextSubject !== undefined ? nextSubject : c.emailSubject,
          };
        }
        if (channel === 'instagram_dm') {
          return { ...c, instagramDmDraft: nextDraft };
        }
        if (channel === 'linkedin_message') {
          return { ...c, linkedinMessageDraft: nextDraft };
        }
        return {
          ...c,
          youtubeContactDraft: nextDraft,
          youtubeContactSubject: nextSubject !== undefined ? nextSubject : c.youtubeContactSubject,
        };
      })
    );
  };

  const saveEmailDraftToBackend = async (creatorId: string) => {
    const target = creators.find((c) => c.id === creatorId);
    if (!target?.isLiveRecord || !target.campaignInfluencerId) return;
    setBusyAction(true);
    try {
      if (target.emailMessageId) {
        await updateMessageDraftApi(target.emailMessageId, {
          subject: target.emailSubject,
          messageBody: target.emailPitchDraft,
        });
      } else {
        await saveManualDraftApi({
          campaignInfluencerId: target.campaignInfluencerId,
          channel: 'email',
          subject: target.emailSubject,
          messageBody: target.emailPitchDraft,
        });
      }
      await loadCampaignWorkspace(selectedCampaignId);
      setDemoNotice('Saved edited email subject & pitch draft to Supabase.');
    } catch (err) {
      setDemoNotice(
        err instanceof Error ? err.message : 'Unable to save edited email draft.'
      );
    } finally {
      setBusyAction(false);
    }
  };

  const saveChannelDraftToBackend = async (creatorId: string, channel: OutreachChannel) => {
    const target = creators.find((c) => c.id === creatorId);
    if (!target?.campaignInfluencerId) return;

    const existingId =
      channel === 'email'
        ? target.emailMessageId
        : channel === 'instagram_dm'
          ? target.instagramDmMessageId
          : channel === 'linkedin_message'
            ? target.linkedinMessageId
            : target.youtubeContactMessageId;

    const body =
      channel === 'email'
        ? target.emailPitchDraft
        : channel === 'instagram_dm'
          ? target.instagramDmDraft
          : channel === 'linkedin_message'
            ? target.linkedinMessageDraft || ''
            : target.youtubeContactDraft || '';

    const subject =
      channel === 'email'
        ? target.emailSubject ?? null
        : channel === 'youtube_contact'
          ? target.youtubeContactSubject ?? null
          : null;

    setBusyAction(true);
    try {
      if (existingId) {
        await updateMessageDraftApi(existingId, {
          subject,
          messageBody: body,
        });
      } else {
        await saveManualDraftApi({
          campaignInfluencerId: target.campaignInfluencerId,
          channel,
          subject,
          messageBody: body,
        });
      }
      await loadCampaignWorkspace(selectedCampaignId);
      setDemoNotice(`Saved ${channel.replace('_', ' ')} draft for ${target.name}.`);
    } catch (err) {
      setDemoNotice(
        err instanceof Error ? err.message : 'Unable to save channel draft.'
      );
    } finally {
      setBusyAction(false);
    }
  };

  const rejectEmailDraft = async (creatorId: string, reason: string) => {
    const target = creators.find((c) => c.id === creatorId);
    if (!target?.emailMessageId) return;
    setBusyAction(true);
    try {
      await updateMessageDraftApi(target.emailMessageId, {
        reject: true,
        rejectedReason: reason,
      });
      await loadCampaignWorkspace(selectedCampaignId);
      setDemoNotice(`Marked email draft for ${target.name} as Rejected.`);
    } catch (err) {
      setDemoNotice(err instanceof Error ? err.message : 'Unable to reject draft.');
    } finally {
      setBusyAction(false);
    }
  };

  const generateFollowUpForCreator = async (
    creatorId: string,
    channel: OutreachChannel
  ) => {
    const target = creators.find((c) => c.id === creatorId);
    if (!target?.campaignInfluencerId) return;
    setBusyAction(true);
    try {
      const prevMessage =
        channel === 'email'
          ? target.emailPitchDraft
          : channel === 'instagram_dm'
            ? target.instagramDmDraft
            : channel === 'linkedin_message'
              ? target.linkedinMessageDraft
              : target.youtubeContactDraft;

      const draft = await generateFollowUpDraftApi({
        campaignInfluencerId: target.campaignInfluencerId,
        channel,
        previousMessage: prevMessage,
      });
      setCreators((prev) =>
        prev.map((c) => {
          if (c.id !== creatorId) return c;
          if (channel === 'email') {
            return {
              ...c,
              emailSubject: draft.subject || c.emailSubject,
              emailPitchDraft: draft.body,
              emailWordCount: draft.wordCount,
              aiModel: draft.modelUsed,
            };
          }
          if (channel === 'instagram_dm') {
            return {
              ...c,
              instagramDmDraft: draft.body,
              dmWordCount: draft.wordCount,
            };
          }
          if (channel === 'linkedin_message') {
            return {
              ...c,
              linkedinMessageDraft: draft.body,
              linkedinWordCount: draft.wordCount,
            };
          }
          return {
            ...c,
            youtubeContactSubject: draft.subject || c.youtubeContactSubject,
            youtubeContactDraft: draft.body,
            youtubeWordCount: draft.wordCount,
          };
        })
      );
      setDemoNotice(
        `Generated Gemini ${channel.replace('_', ' ')} follow-up draft for ${target.name} (${draft.wordCount}w).`
      );
    } catch (err) {
      setDemoNotice(err instanceof Error ? err.message : 'Unable to generate follow-up draft.');
    } finally {
      setBusyAction(false);
    }
  };

  const generateChannelDraft = async (
    creatorId: string,
    channel: OutreachChannel,
    collaborationType?: string
  ) => {
    const target = creators.find((c) => c.id === creatorId);
    if (!target?.campaignInfluencerId) {
      setDemoNotice('Select a stored campaign creator before generating Gemini AI drafts.');
      return;
    }

    setBusyAction(true);
    try {
      const msg =
        channel === 'email'
          ? await generateEmailPitchApi(target.campaignInfluencerId, collaborationType)
          : channel === 'instagram_dm'
            ? await generateInstagramDmApi(target.campaignInfluencerId, collaborationType)
            : channel === 'linkedin_message'
              ? await generateLinkedInMessageApi(target.campaignInfluencerId, collaborationType)
              : await generateYouTubeContactApi(target.campaignInfluencerId, collaborationType);

      await loadCampaignWorkspace(selectedCampaignId);
      setDemoNotice(
        `Generated personalized Gemini ${channel.replace('_', ' ')} draft for ${target.name} (${msg.word_count ?? 0}w).`
      );
    } catch (err) {
      setDemoNotice(
        err instanceof Error ? err.message : `Unable to generate ${channel.replace('_', ' ')} draft.`
      );
    } finally {
      setBusyAction(false);
    }
  };

  const regeneratePitchDrafts = async (creatorId: string, collaborationType?: string) => {
    const target = creators.find((c) => c.id === creatorId);
    if (!target?.campaignInfluencerId) {
      setDemoNotice('Select a stored campaign creator before generating Gemini AI pitches.');
      return;
    }

    setBusyAction(true);
    try {
      const [emailMsg, dmMsg] = await Promise.all([
        generateEmailPitchApi(target.campaignInfluencerId, collaborationType),
        generateInstagramDmApi(target.campaignInfluencerId, collaborationType),
      ]);

      setCreators((prev) =>
        prev.map((c) =>
          c.id === creatorId
            ? {
                ...c,
                emailPitchDraft: emailMsg.message_body,
                emailMessageId: emailMsg.id,
                emailSubject: emailMsg.subject || undefined,
                emailMessageStatus: emailMsg.status,
                collaborationType: emailMsg.collaboration_type || collaborationType || c.collaborationType,
                personalizationSignals: Array.isArray(emailMsg.personalization_signals)
                  ? emailMsg.personalization_signals
                  : [],
                aiModel: emailMsg.ai_model ?? null,
                emailWordCount: emailMsg.word_count ?? null,
                instagramDmDraft: dmMsg.message_body,
                instagramDmMessageId: dmMsg.id,
                instagramDmStatus: dmMsg.status,
                dmWordCount: dmMsg.word_count ?? null,
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
    if (!target?.campaignInfluencerId) {
      setDemoNotice('Creator must be attached to a campaign in Supabase before logging outreach.');
      return;
    }
    if (!target.email || target.email.toLowerCase() === 'not found') {
      setDemoNotice(
        `${target.name} has no public email ("Not Found"). Enrich the profile or switch to Instagram DM / LinkedIn / YouTube Contact.`
      );
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
          subject: target.emailSubject,
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

  const logManualInstagramDm = async (
    creatorId: string,
    stage: 'ready_for_manual_sending' | 'manually_sent' | 'failed' | 'skipped' = 'ready_for_manual_sending'
  ) => {
    const target = creators.find((c) => c.id === creatorId);
    if (!target?.campaignInfluencerId) {
      setDemoNotice('Creator must be linked to a campaign before updating Instagram DM status.');
      return;
    }

    setBusyAction(true);
    try {
      const res = await logManualInstagramDmApi({
        campaignInfluencerId: target.campaignInfluencerId,
        outreachMessageId: target.instagramDmMessageId,
        dmText: target.instagramDmDraft,
        stage,
      });
      setDemoNotice(res.message);
      await loadCampaignWorkspace(selectedCampaignId);
    } catch (err) {
      setDemoNotice(
        err instanceof Error ? err.message : 'Unable to update manual Instagram DM status.'
      );
    } finally {
      setBusyAction(false);
    }
  };

  const logManualChannelStage = async (
    creatorId: string,
    channel: 'instagram_dm' | 'linkedin_message' | 'youtube_contact',
    stage: 'ready_for_manual_sending' | 'manually_sent' | 'failed' | 'skipped'
  ) => {
    const target = creators.find((c) => c.id === creatorId);
    if (!target?.campaignInfluencerId) {
      setDemoNotice('Creator must be linked to a campaign before updating outreach status.');
      return;
    }

    const messageText =
      channel === 'instagram_dm'
        ? target.instagramDmDraft
        : channel === 'linkedin_message'
          ? target.linkedinMessageDraft || ''
          : target.youtubeContactDraft || '';

    const outreachMessageId =
      channel === 'instagram_dm'
        ? target.instagramDmMessageId
        : channel === 'linkedin_message'
          ? target.linkedinMessageId
          : target.youtubeContactMessageId;

    const subject =
      channel === 'youtube_contact' ? target.youtubeContactSubject ?? null : null;

    setBusyAction(true);
    try {
      const res = await logManualMultiChannelApi({
        campaignInfluencerId: target.campaignInfluencerId,
        channel,
        outreachMessageId,
        messageText,
        subject,
        stage,
      });
      setDemoNotice(res.message);
      await loadCampaignWorkspace(selectedCampaignId);
    } catch (err) {
      setDemoNotice(
        err instanceof Error ? err.message : `Unable to update ${channel.replace('_', ' ')} status.`
      );
    } finally {
      setBusyAction(false);
    }
  };

  const setCreatorPreferredChannel = async (
    creatorId: string,
    preferredChannel: OutreachChannel,
    addChannel?: { type: ContactChannelType; value: string; evidence?: string }
  ) => {
    setBusyAction(true);
    try {
      await updateCreatorChannelsApi(creatorId, {
        preferredChannel,
        addChannel,
      });
      await loadCampaignWorkspace(selectedCampaignId);
      setDemoNotice(`Updated outreach channel configuration (${preferredChannel.replace('_', ' ')}).`);
    } catch (err) {
      setDemoNotice(
        err instanceof Error ? err.message : 'Unable to update creator outreach channel.'
      );
    } finally {
      setBusyAction(false);
    }
  };

  const updateCreatorProfile = async (updated: DashboardCreatorRow) => {
    if (!updated.influencerId) return;

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
        emailStatus: updated.emailStatus,
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
    if (!target?.campaignInfluencerId) return;

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
    brandName?: string;
    niche: string;
    targetCountry: string;
    minFollowers?: number;
    maxFollowers?: number;
    minEngagementRate?: number;
    collaborationType?: string;
    productDescription?: string;
    campaignBrief?: string;
  }): Promise<boolean> => {
    if (!isBackendConnected) {
      return false;
    }
    setBusyAction(true);
    try {
      const created = await createCampaignApi({
        name: input.name,
        brand_name: input.brandName || 'GlowCare',
        niche: input.niche,
        target_country: input.targetCountry,
        min_followers: input.minFollowers,
        max_followers: input.maxFollowers,
        min_engagement_rate: input.minEngagementRate,
        collaboration_type: input.collaborationType,
        product_description: input.productDescription,
        campaign_brief: input.campaignBrief,
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
    if (!isBackendConnected || campaigns.length <= 1 || !selectedCampaignId) return;
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

  const handleExportCreatorsCsv = () => {
    if (!isBackendConnected) {
      setDemoNotice('Connect workspace backend before exporting creators CSV.');
      return;
    }
    const url = buildCreatorsExportCsvUrl({
      campaignId: selectedCampaignId || undefined,
      search: globalSearch.trim() || undefined,
      qualificationStatus: qualFilter !== 'all' ? qualFilter : undefined,
    });
    window.location.assign(url);
  };

  const handleExportOutreachCsv = () => {
    if (!isBackendConnected) {
      setDemoNotice('Connect workspace backend before exporting outreach logs CSV.');
      return;
    }
    window.location.assign(buildOutreachLogsExportCsvUrl(selectedCampaignId || undefined));
  };

  return {
    campaigns,
    creators,
    filteredCreators,
    outreachLogs,
    gmailStatus,
    kpiMetrics,
    isBackendConnected,
    isShowingDemoFallback: false,
    backendError,
    loadingWorkspace,
    busyAction,
    selectedRowIds,
    activeCreator,
    drawerOpen,
    setDrawerOpen,
    globalSearch,
    setGlobalSearch,
    qualFilter,
    setQualFilter,
    selectedCampaign,
    selectedCampaignId,
    setSelectedCampaignId: handleSelectCampaign,
    demoNotice,
    setDemoNotice,
    toggleRowSelection,
    toggleAllVisibleSelection,
    openPitchPreview,
    updateEmailDraft,
    updateEmailSubject,
    updateChannelDraft,
    saveEmailDraftToBackend,
    saveChannelDraftToBackend,
    rejectEmailDraft,
    generateFollowUpForCreator,
    generateChannelDraft,
    regenerateLocalDraft: regeneratePitchDrafts,
    simulateApproveOutreach: approveAndSendOrSimulate,
    logManualInstagramDm,
    logManualChannelStage,
    setCreatorPreferredChannel,
    updateCreatorProfile,
    deleteCreatorRow,
    createNewCampaign,
    deleteSelectedCampaign,
    handleExportCreatorsCsv,
    handleExportOutreachCsv,
    refreshAll,
  };
}
