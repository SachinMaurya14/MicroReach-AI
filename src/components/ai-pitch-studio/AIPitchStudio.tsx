import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Hand,
  MessageSquarePlus,
  Plus,
  RefreshCw,
  Save,
  SkipForward,
  Star,
  X,
} from 'lucide-react';
import type { ContactChannelType, OutreachChannel } from '../../types/database';
import { DashboardCreatorRow } from '../../types/dashboard';
import { copyToClipboard } from '../../utils/copyToClipboard';
import { EmailPitchCard } from './EmailPitchCard';
import { InstagramDMCard } from './InstagramDMCard';
import { OutreachApprovalFooter } from './OutreachApprovalFooter';

type ManualStage = 'ready_for_manual_sending' | 'manually_sent' | 'failed' | 'skipped';

interface AIPitchStudioProps {
  isOpen: boolean;
  creator: DashboardCreatorRow | null;
  busy?: boolean;
  isLiveSendingEnabled?: boolean;
  gmailConnected?: boolean;
  onClose: () => void;
  onChangeEmailDraft: (creatorId: string, nextDraft: string) => void;
  onChangeEmailSubject?: (creatorId: string, nextSubject: string) => void;
  onChangeChannelDraft?: (
    creatorId: string,
    channel: OutreachChannel,
    nextDraft: string,
    nextSubject?: string
  ) => void;
  onSaveEmailDraft?: (creatorId: string) => void;
  onSaveChannelDraft?: (creatorId: string, channel: OutreachChannel) => void;
  onRejectEmailDraft?: (creatorId: string, reason: string) => void;
  onGenerateFollowUp?: (creatorId: string, channel: OutreachChannel) => void;
  onGenerateChannelDraft?: (
    creatorId: string,
    channel: OutreachChannel,
    collaborationType?: string
  ) => void;
  onRegenerateDraft: (creatorId: string, collaborationType?: string) => void;
  onLogManualDm?: (creatorId: string, stage: ManualStage) => void;
  onLogManualChannel?: (
    creatorId: string,
    channel: 'instagram_dm' | 'linkedin_message' | 'youtube_contact',
    stage: ManualStage
  ) => void;
  onSetPreferredChannel?: (
    creatorId: string,
    preferredChannel: OutreachChannel,
    addChannel?: { type: ContactChannelType; value: string; evidence?: string }
  ) => void;
  onRequestApprove: () => void;
}

const CHANNEL_TABS: Array<{ id: OutreachChannel; shortLabel: string; title: string }> = [
  { id: 'email', shortLabel: 'Email', title: 'Email Pitch (60-90w)' },
  { id: 'instagram_dm', shortLabel: 'IG DM', title: 'Instagram DM (15-30w)' },
  { id: 'linkedin_message', shortLabel: 'LinkedIn', title: 'LinkedIn Message (20-75w)' },
  { id: 'youtube_contact', shortLabel: 'YouTube', title: 'YouTube Contact (30-90w)' },
];

export const AIPitchStudio: React.FC<AIPitchStudioProps> = ({
  isOpen,
  creator,
  busy = false,
  isLiveSendingEnabled = false,
  gmailConnected = false,
  onClose,
  onChangeEmailDraft,
  onChangeEmailSubject,
  onChangeChannelDraft,
  onSaveEmailDraft,
  onSaveChannelDraft,
  onRejectEmailDraft,
  onGenerateFollowUp,
  onGenerateChannelDraft,
  onRegenerateDraft,
  onLogManualDm,
  onLogManualChannel,
  onSetPreferredChannel,
  onRequestApprove,
}) => {
  const [activeChannel, setActiveChannel] = useState<OutreachChannel>('email');
  const [linkInput, setLinkInput] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!creator) return;
    const defaultCh =
      creator.preferredChannel ||
      creator.recommendedChannel ||
      (creator.email && creator.email !== 'Not Found'
        ? 'email'
        : creator.platforms.includes('Instagram')
          ? 'instagram_dm'
          : 'youtube_contact');
    setActiveChannel(defaultCh);
    setLinkInput('');
  }, [creator?.id]);

  if (!isOpen || !creator) return null;

  const availabilityList = creator.channelAvailability ?? [];
  const activeAvailability = availabilityList.find((a) => a.channel === activeChannel);
  const instagramChannelRec = (creator.contactChannels ?? []).find((c) => c.type === 'instagram');
  const linkedInChannelRec = (creator.contactChannels ?? []).find((c) => c.type === 'linkedin');
  const youtubeChannelRec = (creator.contactChannels ?? []).find((c) => c.type === 'youtube');
  const otherContactRec = (creator.contactChannels ?? []).find((c) => c.type === 'other_contact');

  const instagramUrl = instagramChannelRec?.url || creator.profileUrl;
  const linkedInUrl = linkedInChannelRec?.url || null;
  const youtubeTargetUrl = otherContactRec?.url || youtubeChannelRec?.url || creator.profileUrl;

  const handleCopyManual = async (key: string, text: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    }
  };

  const renderManualChannelCard = (params: {
    channel: 'linkedin_message' | 'youtube_contact';
    title: string;
    subtitleNote: string;
    draft: string;
    subject?: string;
    status?: string;
    workflowStatus?: string;
    recipientUrl: string | null;
    minWords: number;
    maxWords: number;
  }) => {
    const words = params.draft.trim() ? params.draft.trim().split(/\s+/).length : 0;
    const effectiveStatus = params.workflowStatus || params.status;
    const badge =
      effectiveStatus === 'sent'
        ? { label: 'Sent (Manual)', cls: 'bg-[#D1FAE5] text-[#059669]' }
        : effectiveStatus === 'ready_for_manual_sending' || effectiveStatus === 'approved'
          ? { label: 'Ready for Manual Sending', cls: 'bg-[#EDE9FE] text-[#5B21B6]' }
          : effectiveStatus === 'skipped' || effectiveStatus === 'rejected'
            ? { label: 'Skipped', cls: 'bg-[#F3F4F6] text-[#4B5563]' }
            : effectiveStatus === 'failed'
              ? { label: 'Failed', cls: 'bg-[#FEE2E2] text-[#DC2626]' }
              : { label: 'Manual Workflow', cls: 'bg-[#FEF3C7] text-[#92400E]' };

    const canSendChannel = params.channel === 'linkedin_message' ? Boolean(params.recipientUrl) : true;

    return (
      <div className="rounded-xl border border-[#DDD6FE] bg-[#F5F3FF] p-3.5 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-semibold text-[#111827]">{params.title}</span>
          <span
            className={`text-[11px] font-semibold mr-tabular ${
              words >= params.minWords && words <= params.maxWords
                ? 'text-[#059669]'
                : 'text-[#5B21B6]'
            }`}
          >
            {words}w
          </span>
        </div>

        <p className="text-[11px] text-[#4B5563] leading-snug">{params.subtitleNote}</p>

        <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-xs">
          {params.channel === 'youtube_contact' && onChangeChannelDraft && (
            <div className="border-b border-[#F3F4F6] px-2.5 py-1.5">
              <input
                type="text"
                aria-label="YouTube outreach subject"
                value={params.subject || ''}
                onChange={(e) =>
                  onChangeChannelDraft(creator.id, 'youtube_contact', params.draft, e.target.value)
                }
                placeholder="Collaboration subject..."
                className="w-full text-[11.5px] font-semibold text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none"
              />
            </div>
          )}
          <textarea
            rows={5}
            aria-label={params.title}
            value={params.draft}
            onChange={(e) =>
              onChangeChannelDraft?.(creator.id, params.channel, e.target.value, params.subject)
            }
            className="w-full resize-y bg-white p-2.5 text-xs leading-relaxed text-[#111827] focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <span
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-semibold ${badge.cls}`}
          >
            <Hand className="h-3 w-3" aria-hidden="true" />
            <span>{badge.label}</span>
          </span>

          <div className="flex items-center gap-1">
            {creator.isLiveRecord && onSaveChannelDraft && (
              <button
                type="button"
                disabled={busy}
                onClick={() => onSaveChannelDraft(creator.id, params.channel)}
                className="inline-flex items-center gap-1 rounded-lg border border-[#D1D5DB] bg-white px-2 py-1 text-[11px] font-semibold text-[#4B5563] hover:text-[#5B21B6] cursor-pointer"
              >
                <Save className="h-3 w-3" aria-hidden="true" />
                <span>Save</span>
              </button>
            )}
            {params.recipientUrl && (
              <a
                href={params.recipientUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-[#D1D5DB] bg-white px-2 py-1 text-[11px] font-semibold text-[#4B5563] hover:text-[#5B21B6]"
              >
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                <span>Open</span>
              </a>
            )}
            <button
              type="button"
              onClick={() =>
                void handleCopyManual(
                  params.channel,
                  params.subject ? `Subject: ${params.subject}\n\n${params.draft}` : params.draft
                )
              }
              className="inline-flex items-center gap-1 rounded-lg border border-[#D1D5DB] bg-white px-2 py-1 text-[11px] font-semibold text-[#111827] hover:bg-[#F9FAFB] cursor-pointer"
            >
              {copiedKey === params.channel ? (
                <>
                  <Check className="h-3 w-3 text-[#059669]" aria-hidden="true" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 text-[#4B5563]" aria-hidden="true" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {creator.isLiveRecord && (onGenerateChannelDraft || onGenerateFollowUp) && (
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#DDD6FE]/70">
            {onGenerateFollowUp && (
              <button
                type="button"
                disabled={busy}
                onClick={() => onGenerateFollowUp(creator.id, params.channel)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#4B5563] hover:text-[#5B21B6] disabled:opacity-50 cursor-pointer"
              >
                <MessageSquarePlus className="h-3 w-3" aria-hidden="true" />
                <span>Follow-up</span>
              </button>
            )}
            {onGenerateChannelDraft && (
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  onGenerateChannelDraft(creator.id, params.channel, creator.collaborationType)
                }
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#5B21B6] hover:text-[#7C3AED] disabled:opacity-50 cursor-pointer ml-auto"
              >
                <RefreshCw className={`h-3 w-3 ${busy ? 'animate-spin' : ''}`} aria-hidden="true" />
                <span>{busy ? 'Generating...' : 'Generate via Gemini'}</span>
              </button>
            )}
          </div>
        )}

        {creator.isLiveRecord && onLogManualChannel && (
          <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-[#DDD6FE]/70">
            <button
              type="button"
              disabled={busy || !canSendChannel}
              onClick={() =>
                onLogManualChannel(creator.id, params.channel, 'ready_for_manual_sending')
              }
              className="rounded-md border border-[#D1D5DB] bg-white px-1.5 py-1 text-[10.5px] font-semibold text-[#5B21B6] hover:bg-[#EDE9FE] disabled:opacity-50 cursor-pointer"
            >
              Mark Ready
            </button>
            <button
              type="button"
              disabled={busy || !canSendChannel}
              onClick={() => onLogManualChannel(creator.id, params.channel, 'manually_sent')}
              className="inline-flex items-center justify-center gap-1 rounded-md bg-[#059669] px-1.5 py-1 text-[10.5px] font-semibold text-white hover:bg-[#047857] disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span>Confirm Sent</span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onLogManualChannel(creator.id, params.channel, 'skipped')}
              className="inline-flex items-center justify-center gap-1 rounded-md border border-[#D1D5DB] bg-white px-1.5 py-1 text-[10.5px] font-semibold text-[#6B7280] hover:bg-[#F3F4F6] disabled:opacity-50 cursor-pointer"
            >
              <SkipForward className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span>Skip</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  const drawerContent = (
    <div className="flex h-full flex-col bg-white border-l border-[#E5E7EB] mr-pitch-drawer">
      {/* Header */}
      <div className="shrink-0 border-b border-[#E5E7EB] px-4 py-3.5 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[16px] font-bold text-[#111827]">AI Pitch Studio</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close AI Pitch Studio"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-[12.5px] font-medium text-[#4B5563] truncate">
            Creator: <span className="text-[#111827] font-semibold">{creator.name}</span>
          </p>
          {onSetPreferredChannel && creator.isLiveRecord && (
            <button
              type="button"
              disabled={busy || creator.preferredChannel === activeChannel}
              onClick={() => onSetPreferredChannel(creator.id, activeChannel)}
              title="Set active tab as preferred outreach channel for this creator"
              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold cursor-pointer shrink-0 ${
                creator.preferredChannel === activeChannel
                  ? 'bg-[#EDE9FE] text-[#5B21B6]'
                  : 'border border-[#E5E7EB] bg-white text-[#6B7280] hover:text-[#5B21B6]'
              }`}
            >
              <Star className="h-2.5 w-2.5" aria-hidden="true" />
              <span>{creator.preferredChannel === activeChannel ? 'Preferred' : 'Set Preferred'}</span>
            </button>
          )}
        </div>

        {/* 4-Channel Tabs */}
        <div className="grid grid-cols-4 gap-1 rounded-lg bg-[#F3F4F6] p-1">
          {CHANNEL_TABS.map((tab) => {
            const av = availabilityList.find((a) => a.channel === tab.id);
            const isAvailable = av ? av.available : tab.id === 'email' ? creator.email !== 'Not Found' : true;
            const isActive = activeChannel === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                title={tab.title}
                onClick={() => setActiveChannel(tab.id)}
                className={`flex items-center justify-center gap-1 rounded-md px-1 py-1 text-[10.5px] font-semibold transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-white text-[#5B21B6] shadow-xs'
                    : 'text-[#4B5563] hover:text-[#111827]'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                    isAvailable ? 'bg-[#10B981]' : 'bg-[#D1D5DB]'
                  }`}
                />
                <span className="truncate">{tab.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable Pitch Cards */}
      <div className="flex-1 overflow-y-auto mr-scroll-thin p-4 space-y-3">
        {/* Unavailable / Fallback Channel Guidance */}
        {activeAvailability && !activeAvailability.available && (
          <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-3 text-[11px] text-[#92400E] space-y-2">
            <div className="flex items-start gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-semibold">{activeAvailability.label} Unavailable</p>
                <p className="mt-0.5 leading-snug">{activeAvailability.unavailableReason}</p>
              </div>
            </div>
            {activeAvailability.recommendedAlternative && (
              <button
                type="button"
                onClick={() => setActiveChannel(activeAvailability.recommendedAlternative!)}
                className="w-full rounded-md border border-[#F59E0B] bg-white px-2 py-1 text-[11px] font-semibold text-[#92400E] hover:bg-[#FEF3C7] cursor-pointer"
              >
                Switch to {CHANNEL_TABS.find((t) => t.id === activeAvailability.recommendedAlternative)?.shortLabel}
              </button>
            )}
            {activeChannel === 'linkedin_message' && onSetPreferredChannel && creator.isLiveRecord && (
              <div className="flex gap-1 pt-1">
                <input
                  type="text"
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  placeholder="Confirm https://linkedin.com/in/..."
                  className="flex-1 min-w-0 rounded border border-[#D1D5DB] bg-white px-2 py-1 text-[11px] text-[#111827]"
                />
                <button
                  type="button"
                  disabled={busy || !linkInput.trim()}
                  onClick={() => {
                    onSetPreferredChannel(creator.id, 'linkedin_message', {
                      type: 'linkedin',
                      value: linkInput.trim(),
                      evidence: 'Confirmed in AI Pitch Studio',
                    });
                    setLinkInput('');
                  }}
                  className="inline-flex items-center gap-0.5 rounded bg-[#5B21B6] px-2 py-1 text-[10.5px] font-semibold text-white disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  <span>Link</span>
                </button>
              </div>
            )}
          </div>
        )}

        {activeChannel === 'email' && (
          <EmailPitchCard
            draft={creator.emailPitchDraft}
            subject={creator.emailSubject}
            collaborationType={creator.collaborationType}
            personalizationSignals={creator.personalizationSignals}
            isLiveRecord={Boolean(creator.isLiveRecord)}
            aiModel={creator.aiModel}
            messageStatus={creator.emailWorkflowStatus || creator.emailMessageStatus}
            busy={busy}
            onChangeDraft={(value) => onChangeEmailDraft(creator.id, value)}
            onChangeSubject={
              onChangeEmailSubject ? (val) => onChangeEmailSubject(creator.id, val) : undefined
            }
            onSaveDraft={
              onSaveEmailDraft ? () => onSaveEmailDraft(creator.id) : undefined
            }
            onRejectDraft={
              onRejectEmailDraft
                ? (reason) => onRejectEmailDraft(creator.id, reason)
                : undefined
            }
            onGenerateFollowUp={
              onGenerateFollowUp ? () => onGenerateFollowUp(creator.id, 'email') : undefined
            }
            onRegenerate={(collabType) => onRegenerateDraft(creator.id, collabType)}
          />
        )}

        {activeChannel === 'instagram_dm' && (
          <InstagramDMCard
            dmText={creator.instagramDmDraft}
            dmStatus={creator.instagramDmStatus}
            workflowStatus={creator.instagramDmWorkflowStatus}
            profileUrl={instagramUrl}
            isLiveRecord={Boolean(creator.isLiveRecord)}
            busy={busy}
            onChangeDraft={
              onChangeChannelDraft
                ? (val) => onChangeChannelDraft(creator.id, 'instagram_dm', val)
                : undefined
            }
            onSaveDraft={
              onSaveChannelDraft ? () => onSaveChannelDraft(creator.id, 'instagram_dm') : undefined
            }
            onRegenerate={
              onGenerateChannelDraft
                ? () =>
                    onGenerateChannelDraft(
                      creator.id,
                      'instagram_dm',
                      creator.collaborationType
                    )
                : undefined
            }
            onGenerateFollowUp={
              onGenerateFollowUp
                ? () => onGenerateFollowUp(creator.id, 'instagram_dm')
                : undefined
            }
            onLogManualDm={
              onLogManualChannel
                ? (stage) => onLogManualChannel(creator.id, 'instagram_dm', stage)
                : onLogManualDm
                  ? (stage) => onLogManualDm(creator.id, stage)
                  : undefined
            }
          />
        )}

        {activeChannel === 'linkedin_message' &&
          renderManualChannelCard({
            channel: 'linkedin_message',
            title: 'LinkedIn Message (20–75w)',
            subtitleNote: linkedInUrl
              ? `Manual workflow via ${linkedInUrl} (LinkedIn API unavailable)`
              : 'Link a confirmed LinkedIn URL above. Never matched by name alone.',
            draft: creator.linkedinMessageDraft || '',
            status: creator.linkedinMessageStatus,
            workflowStatus: creator.linkedinWorkflowStatus,
            recipientUrl: linkedInUrl,
            minWords: 20,
            maxWords: 75,
          })}

        {activeChannel === 'youtube_contact' &&
          renderManualChannelCard({
            channel: 'youtube_contact',
            title: 'YouTube Contact (30–90w)',
            subtitleNote:
              creator.email && creator.email !== 'Not Found'
                ? `YouTube has no DM API. Send via public business email (${creator.email}) or linked contact page.`
                : 'YouTube has no DM API. Route via linked website/channel contact page.',
            draft: creator.youtubeContactDraft || '',
            subject: creator.youtubeContactSubject,
            status: creator.youtubeContactStatus,
            workflowStatus: creator.youtubeContactWorkflowStatus,
            recipientUrl: youtubeTargetUrl || null,
            minWords: 30,
            maxWords: 90,
          })}
      </div>

      {/* Sticky Footer (Email workflow approval / simulation / live Gmail) */}
      <OutreachApprovalFooter
        creatorName={creator.name}
        contactEmail={creator.email}
        isAlreadyApproved={creator.qualStatus === 'Approved / Queued'}
        isLiveSendingEnabled={isLiveSendingEnabled}
        gmailConnected={gmailConnected}
        busy={busy}
        onRequestApprove={onRequestApprove}
      />
    </div>
  );

  return (
    <>
      {/* Desktop Fixed 300px Right Drawer */}
      <aside
        aria-label="AI Pitch Studio drawer"
        className="hidden xl:block w-[300px] shrink-0 h-[calc(100vh-64px)] sticky top-16"
      >
        {drawerContent}
      </aside>

      {/* Tablet & Mobile Overlay Drawer */}
      <div className="xl:hidden fixed inset-0 z-50 flex justify-end">
        <div
          className="fixed inset-0 bg-[#111827]/45 backdrop-blur-xs"
          onClick={onClose}
          aria-hidden="true"
        />
        <aside
          aria-label="AI Pitch Studio drawer"
          className="relative z-10 w-full max-w-[340px] h-full shadow-2xl"
        >
          {drawerContent}
        </aside>
      </div>
    </>
  );
};
