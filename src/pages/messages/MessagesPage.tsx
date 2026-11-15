import React, { useCallback, useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  Mail,
  MessageSquare,
  RefreshCw,
  Send,
  XCircle,
} from 'lucide-react';
import { WorkspaceModuleShell } from '../../components/app-shell/WorkspaceModuleShell';
import { Button } from '../../components/ui/Button';
import {
  buildMessagesExportCsvUrl,
  CampaignDbRow,
  fetchCampaignsApi,
  fetchMessagesApi,
  generateEmailPitchApi,
  generateFollowUpDraftApi,
  generateInstagramDmApi,
  generateLinkedInMessageApi,
  generateYouTubeContactApi,
  logManualMultiChannelApi,
  simulateOutreachApi,
  updateMessageDraftApi,
  WorkspaceMessageApiItem,
} from '../../services/api/workspaceApi';
import type { OutreachChannel } from '../../types/database';

const CHANNEL_LABELS: Record<OutreachChannel, string> = {
  email: 'Email',
  instagram_dm: 'Instagram DM',
  linkedin_message: 'LinkedIn Message',
  youtube_contact: 'YouTube Contact',
};

const METHOD_LABELS: Record<'api' | 'manual' | 'simulation', string> = {
  api: 'API',
  manual: 'Manual',
  simulation: 'Simulation',
};

export const MessagesPage: React.FC = () => {
  const [campaigns, setCampaigns] = useState<CampaignDbRow[]>([]);
  const [campaignId, setCampaignId] = useState('');
  const [channelFilter, setChannelFilter] = useState<'all' | OutreachChannel>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [messages, setMessages] = useState<WorkspaceMessageApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const [camps, msgs] = await Promise.all([
        fetchCampaignsApi(true),
        fetchMessagesApi({
          campaignId: campaignId || undefined,
          channel: channelFilter,
          status: statusFilter,
          limit: 150,
        }),
      ]);
      setCampaigns(camps);
      setMessages(msgs);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Unable to load generated outreach messages.');
    } finally {
      setLoading(false);
    }
  }, [campaignId, channelFilter, statusFilter]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  const startEdit = (item: WorkspaceMessageApiItem) => {
    setEditingId(item.message.id);
    setEditSubject(item.message.subject || '');
    setEditBody(item.message.message_body);
  };

  const handleSaveEdit = async (item: WorkspaceMessageApiItem) => {
    setBusyId(item.message.id);
    try {
      const hasSubject =
        item.message.channel === 'email' || item.message.channel === 'youtube_contact';
      await updateMessageDraftApi(item.message.id, {
        subject: hasSubject ? editSubject : null,
        messageBody: editBody,
      });
      setEditingId(null);
      setNotice('Updated draft saved to Supabase.');
      await loadMessages();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Unable to save draft edits.');
    } finally {
      setBusyId(null);
    }
  };

  const handleApprove = async (item: WorkspaceMessageApiItem) => {
    setBusyId(item.message.id);
    try {
      await updateMessageDraftApi(item.message.id, { approve: true });
      setNotice(
        `Approved ${CHANNEL_LABELS[item.message.channel]} draft for ${item.influencer.name}.`
      );
      await loadMessages();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Unable to approve message.');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (item: WorkspaceMessageApiItem) => {
    setBusyId(item.message.id);
    try {
      await updateMessageDraftApi(item.message.id, {
        reject: true,
        rejectedReason: 'Rejected during human review in Messages workspace',
      });
      setNotice(`Marked draft for ${item.influencer.name} as Skipped / Rejected.`);
      await loadMessages();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Unable to reject message.');
    } finally {
      setBusyId(null);
    }
  };

  const handleRegenerate = async (item: WorkspaceMessageApiItem) => {
    setBusyId(item.message.id);
    try {
      const collab = item.message.collaboration_type || undefined;
      if (item.message.channel === 'email') {
        await generateEmailPitchApi(item.campaignInfluencer.id, collab);
      } else if (item.message.channel === 'instagram_dm') {
        await generateInstagramDmApi(item.campaignInfluencer.id, collab);
      } else if (item.message.channel === 'linkedin_message') {
        await generateLinkedInMessageApi(item.campaignInfluencer.id, collab);
      } else {
        await generateYouTubeContactApi(item.campaignInfluencer.id, collab);
      }
      setNotice(
        `Regenerated ${CHANNEL_LABELS[item.message.channel]} via Gemini AI for ${item.influencer.name}.`
      );
      await loadMessages();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Gemini regeneration failed.');
    } finally {
      setBusyId(null);
    }
  };

  const handleFollowUp = async (item: WorkspaceMessageApiItem) => {
    setBusyId(item.message.id);
    try {
      const draft = await generateFollowUpDraftApi({
        campaignInfluencerId: item.campaignInfluencer.id,
        channel: item.message.channel,
        previousMessage: item.message.message_body,
      });
      setEditingId(item.message.id);
      setEditSubject(draft.subject || item.message.subject || '');
      setEditBody(draft.body);
      setNotice(
        `Generated ${draft.wordCount}-word follow-up draft (${draft.modelUsed}). Click Save Draft to persist.`
      );
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Unable to generate follow-up.');
    } finally {
      setBusyId(null);
    }
  };

  const handleSimulateEmail = async (item: WorkspaceMessageApiItem) => {
    setBusyId(item.message.id);
    try {
      const res = await simulateOutreachApi({
        campaignInfluencerId: item.campaignInfluencer.id,
        outreachMessageId: item.message.id,
        subject: item.message.subject || undefined,
        messageBody: item.message.message_body,
      });
      setNotice(res.message);
      await loadMessages();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Unable to simulate email outreach.');
    } finally {
      setBusyId(null);
    }
  };

  const handleManualChannelStage = async (
    item: WorkspaceMessageApiItem,
    stage: 'ready_for_manual_sending' | 'manually_sent' | 'skipped'
  ) => {
    if (item.message.channel === 'email') return;
    setBusyId(item.message.id);
    try {
      const res = await logManualMultiChannelApi({
        campaignInfluencerId: item.campaignInfluencer.id,
        channel: item.message.channel,
        outreachMessageId: item.message.id,
        messageText: item.message.message_body,
        subject: item.message.subject,
        stage,
      });
      setNotice(res.message);
      await loadMessages();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Unable to update manual outreach status.');
    } finally {
      setBusyId(null);
    }
  };

  // Copying NEVER marks outreach as sent
  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setNotice('Copied message text to clipboard (status unchanged).');
    } catch {
      setNotice('Clipboard unavailable in this browser context.');
    }
  };

  return (
    <WorkspaceModuleShell
      moduleName="Messages"
      currentPath="/dashboard/messages"
      subtitle="Review, edit, regenerate, approve, reject, and export personalized Email, Instagram DM, LinkedIn, and YouTube Contact drafts"
      headerActions={
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            window.location.assign(
              buildMessagesExportCsvUrl({
                campaignId: campaignId || undefined,
                channel: channelFilter,
                status: statusFilter,
              })
            )
          }
        >
          <Download className="h-3.5 w-3.5" />
          <span>Export Messages CSV</span>
        </Button>
      }
    >
      {notice && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[#DDD6FE] bg-[#EDE9FE]/70 px-4 py-2.5 text-xs font-medium text-[#5B21B6]">
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="font-semibold underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <section className="rounded-xl border border-[#E5E7EB] bg-white p-4 flex flex-wrap items-center gap-3 text-xs">
        <select
          aria-label="Filter by campaign"
          value={campaignId}
          onChange={(e) => setCampaignId(e.target.value)}
          className="h-9 rounded-lg border border-[#D1D5DB] bg-white px-2.5"
        >
          <option value="">All Campaigns</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by channel"
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value as 'all' | OutreachChannel)}
          className="h-9 rounded-lg border border-[#D1D5DB] bg-white px-2.5"
        >
          <option value="all">All Channels</option>
          <option value="email">Email (60–90w)</option>
          <option value="instagram_dm">Instagram DM (15–30w)</option>
          <option value="linkedin_message">LinkedIn Message (20–75w)</option>
          <option value="youtube_contact">YouTube Contact (30–90w)</option>
        </select>

        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-lg border border-[#D1D5DB] bg-white px-2.5"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="ready_for_review">Ready for Review</option>
          <option value="approved">Approved</option>
          <option value="ready_for_manual_sending">Ready for Manual Sending</option>
          <option value="simulated">Simulated</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
          <option value="skipped">Skipped / Rejected</option>
        </select>

        <span className="ml-auto font-medium text-[#6B7280] mr-tabular">
          {messages.length} outreach message(s)
        </span>
      </section>

      {loading ? (
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-10 text-center text-sm text-[#6B7280]">
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#5B21B6] mb-2" />
          Loading messages...
        </div>
      ) : messages.length === 0 ? (
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-10 text-center text-sm text-[#6B7280]">
          No outreach messages match the current filters. Generate or save drafts from Dashboard AI Pitch Studio first.
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((item) => {
            const msg = item.message;
            const isEmail = msg.channel === 'email';
            const hasSubject =
              msg.channel === 'email' || msg.channel === 'youtube_contact';
            const hasRealEmail = Boolean(
              item.influencer.contact_email &&
                item.influencer.contact_email.toLowerCase() !== 'not found'
            );
            const isEditing = editingId === msg.id;
            const sendingMethod = item.sendingMethod ?? msg.sending_method ?? (isEmail ? 'simulation' : 'manual');
            const unifiedLabel = (item.unifiedStatus || msg.workflow_status || msg.status).replace(/_/g, ' ');
            const openHref = item.recipientUrl || msg.recipient_url || item.influencer.profile_url;

            return (
              <article
                key={msg.id}
                className="rounded-xl border border-[#E5E7EB] bg-white p-5 space-y-3 shadow-xs"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      {isEmail ? (
                        <Mail className="h-4 w-4 text-[#5B21B6]" />
                      ) : (
                        <MessageSquare className="h-4 w-4 text-[#5B21B6]" />
                      )}
                      <h3 className="text-sm font-bold text-[#111827]">{item.influencer.name}</h3>
                      <span className="rounded-full bg-[#EDE9FE] px-2 py-0.5 text-[10px] font-semibold text-[#5B21B6]">
                        {CHANNEL_LABELS[msg.channel]}
                      </span>
                      <span className="rounded-full bg-[#F5F3FF] border border-[#DDD6FE] px-2 py-0.5 text-[10px] font-semibold text-[#5B21B6]">
                        {METHOD_LABELS[sendingMethod]}
                      </span>
                      <span className="rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[10px] font-semibold text-[#374151] capitalize">
                        {unifiedLabel}
                      </span>
                      <span className="text-[11px] text-[#6B7280] mr-tabular">
                        {msg.word_count ?? 0} words
                      </span>
                    </div>
                    <p className="text-[11px] text-[#6B7280] mt-0.5">
                      Campaign: {item.campaign.name} ·{' '}
                      {isEmail
                        ? `Recipient: ${hasRealEmail ? item.influencer.contact_email : 'Not Found (ineligible for email send)'}`
                        : `Target: ${item.recipientContact || openHref}`}{' '}
                      · Model: {msg.ai_model || 'gemini'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busyId === msg.id}
                      onClick={() => void handleRegenerate(item)}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Regenerate</span>
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busyId === msg.id}
                      onClick={() => void handleFollowUp(item)}
                    >
                      <span>Follow-up Draft</span>
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        void handleCopy(
                          hasSubject && msg.subject
                            ? `Subject: ${msg.subject}\n\n${msg.message_body}`
                            : msg.message_body
                        )
                      }
                    >
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy</span>
                    </Button>
                  </div>
                </div>

                {isEditing ? (
                  <div className="space-y-2.5">
                    {hasSubject && (
                      <input
                        type="text"
                        value={editSubject}
                        onChange={(e) => setEditSubject(e.target.value)}
                        placeholder="Message subject"
                        className="h-9 w-full rounded-lg border border-[#D1D5DB] px-3 text-xs font-medium"
                      />
                    )}
                    <textarea
                      rows={4}
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      className="w-full rounded-lg border border-[#D1D5DB] p-3 text-xs leading-relaxed"
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" size="sm" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={busyId === msg.id}
                        onClick={() => void handleSaveEdit(item)}
                      >
                        Save Draft
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3.5 space-y-1.5">
                    {hasSubject && msg.subject && (
                      <p className="text-xs font-semibold text-[#111827]">
                        Subject: {msg.subject}
                      </p>
                    )}
                    <p className="text-xs text-[#374151] whitespace-pre-wrap leading-relaxed">
                      {msg.message_body}
                    </p>
                  </div>
                )}

                {Array.isArray(msg.personalization_signals) &&
                  msg.personalization_signals.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {msg.personalization_signals.map((sig) => (
                        <span
                          key={sig}
                          className="rounded-full bg-[#F5F3FF] border border-[#DDD6FE] px-2 py-0.5 text-[10px] text-[#5B21B6]"
                        >
                          {sig}
                        </span>
                      ))}
                    </div>
                  )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#F3F4F6]">
                  <div className="flex flex-wrap items-center gap-2">
                    {!isEditing && (
                      <Button variant="secondary" size="sm" onClick={() => startEdit(item)}>
                        Edit Message
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busyId === msg.id}
                      onClick={() => void handleApprove(item)}
                    >
                      <Check className="h-3.5 w-3.5 text-[#059669]" />
                      <span>Approve</span>
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busyId === msg.id}
                      onClick={() => void handleReject(item)}
                    >
                      <XCircle className="h-3.5 w-3.5 text-[#DC2626]" />
                      <span>Skip / Reject</span>
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {isEmail ? (
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={busyId === msg.id || !hasRealEmail}
                        title={
                          hasRealEmail
                            ? 'Simulate email send cleanly'
                            : 'Blocked: Creator contact email is Not Found'
                        }
                        onClick={() => void handleSimulateEmail(item)}
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>{hasRealEmail ? 'Simulate Send' : 'Email Not Found'}</span>
                      </Button>
                    ) : (
                      <>
                        {openHref && (
                          <a
                            href={openHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-full border border-[#E5E7EB] px-3 py-1.5 text-xs font-semibold text-[#111827] hover:bg-[#F9FAFB]"
                          >
                            <span>Open Profile</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={busyId === msg.id}
                          onClick={() =>
                            void handleManualChannelStage(item, 'ready_for_manual_sending')
                          }
                        >
                          Mark Ready
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={busyId === msg.id}
                          onClick={() => void handleManualChannelStage(item, 'manually_sent')}
                        >
                          Confirm Manually Sent
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </WorkspaceModuleShell>
  );
};
