import React, { useCallback, useEffect, useState } from 'react';
import { Archive, CheckCircle2, Edit3, Loader2, Plus, Sparkles, Target } from 'lucide-react';
import { useAppRouter } from '../../app/routes';
import { WorkspaceModuleShell } from '../../components/app-shell/WorkspaceModuleShell';
import { NewCampaignModal } from '../../components/dashboard/NewCampaignModal';
import { Button } from '../../components/ui/Button';
import {
  CampaignDbRow,
  createCampaignApi,
  fetchCampaignsApi,
  generateCampaignSuggestionsAiApi,
  updateCampaignApi,
} from '../../services/api/workspaceApi';

const COLLAB_TYPES = [
  'Sponsorship',
  'Affiliate campaign',
  'UGC creation',
  'Brand ambassador program',
  'Paid product placement',
  'Barter collaboration',
];

export const CampaignsPage: React.FC = () => {
  const { navigate } = useAppRouter();
  const [campaigns, setCampaigns] = useState<CampaignDbRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    name: string;
    brand_name: string;
    niche: string;
    target_country: string;
    min_followers: string;
    max_followers: string;
    min_engagement_rate: string;
    collaboration_type: string;
    product_description: string;
    campaign_brief: string;
    status: CampaignDbRow['status'];
  } | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [aiLoadingId, setAiLoadingId] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<{
    campaignName: string;
    discoveryQueries: string[];
    messagingAngles: string[];
    proposalSummary: string;
    modelUsed: string;
  } | null>(null);

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchCampaignsApi(true);
      setCampaigns(list);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load campaigns from Supabase.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  const handleCreate = async (input: {
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
  }) => {
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
      setNotice(`Campaign "${created.name}" created in Supabase.`);
      await loadCampaigns();
      return true;
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Unable to create campaign.');
      return false;
    }
  };

  const startEditing = (camp: CampaignDbRow) => {
    setEditingId(camp.id);
    setEditDraft({
      name: camp.name,
      brand_name: camp.brand_name,
      niche: camp.niche,
      target_country: camp.target_country || 'India',
      min_followers: String(camp.min_followers ?? 5000),
      max_followers: String(camp.max_followers ?? 100000),
      min_engagement_rate: String(camp.min_engagement_rate ?? 2),
      collaboration_type: camp.collaboration_type || 'Sponsorship',
      product_description: camp.product_description || '',
      campaign_brief: camp.campaign_brief || '',
      status: camp.status,
    });
  };

  const handleSaveEdit = async (id: string) => {
    if (!editDraft) return;
    setSavingId(id);
    try {
      await updateCampaignApi(id, {
        name: editDraft.name.trim(),
        brand_name: editDraft.brand_name.trim(),
        niche: editDraft.niche.trim(),
        target_country: editDraft.target_country.trim(),
        min_followers: Number(editDraft.min_followers) || 5000,
        max_followers: Number(editDraft.max_followers) || 100000,
        min_engagement_rate: Number(editDraft.min_engagement_rate) || 2,
        collaboration_type: editDraft.collaboration_type,
        product_description: editDraft.product_description.trim() || null,
        campaign_brief: editDraft.campaign_brief.trim() || null,
        status: editDraft.status,
      });
      setEditingId(null);
      setEditDraft(null);
      setNotice('Campaign settings updated cleanly.');
      await loadCampaigns();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Failed to update campaign.');
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleArchive = async (camp: CampaignDbRow) => {
    setSavingId(camp.id);
    try {
      const nextArchived = camp.archived_at ? null : new Date().toISOString();
      await updateCampaignApi(camp.id, {
        archived_at: nextArchived,
        status: nextArchived ? 'paused' : 'active',
      });
      setNotice(nextArchived ? `Archived "${camp.name}".` : `Restored "${camp.name}" to active.`);
      await loadCampaigns();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Unable to update archive status.');
    } finally {
      setSavingId(null);
    }
  };

  const handleAiSuggestions = async (camp: CampaignDbRow) => {
    setAiLoadingId(camp.id);
    try {
      const res = await generateCampaignSuggestionsAiApi({
        campaignName: camp.name,
        brandName: camp.brand_name,
        niche: camp.niche,
        targetCountry: camp.target_country,
        productDescription: camp.product_description,
        collaborationType: camp.collaboration_type,
      });
      setAiSuggestions({ campaignName: camp.name, ...res });
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Gemini campaign suggestion failed.');
    } finally {
      setAiLoadingId(null);
    }
  };

  const visibleCampaigns = campaigns.filter((c) =>
    showArchived ? Boolean(c.archived_at) : !c.archived_at
  );

  return (
    <WorkspaceModuleShell
      moduleName="Campaigns"
      currentPath="/dashboard/campaigns"
      subtitle="Manage campaign criteria, product briefs, collaboration defaults, and discovery bounds"
      headerActions={
        <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          <span>New Campaign</span>
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

      {error && (
        <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-xs font-semibold text-[#991B1B]">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-[#E5E7EB] bg-white p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setShowArchived(false)}
            className={`rounded-full px-3.5 py-1 cursor-pointer ${
              !showArchived ? 'bg-[#5B21B6] text-white' : 'text-[#4B5563]'
            }`}
          >
            Active &amp; Draft ({campaigns.filter((c) => !c.archived_at).length})
          </button>
          <button
            type="button"
            onClick={() => setShowArchived(true)}
            className={`rounded-full px-3.5 py-1 cursor-pointer ${
              showArchived ? 'bg-[#5B21B6] text-white' : 'text-[#4B5563]'
            }`}
          >
            Archived ({campaigns.filter((c) => Boolean(c.archived_at)).length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate('/dashboard/influencers')}>
            Open Influencer Discovery
          </Button>
        </div>
      </div>

      {aiSuggestions && (
        <section className="rounded-xl border border-[#DDD6FE] bg-white p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-[#111827]">
                Gemini Strategy Suggestions — {aiSuggestions.campaignName}
              </h2>
              <p className="text-[11px] text-[#6B7280]">Model: {aiSuggestions.modelUsed}</p>
            </div>
            <button
              type="button"
              onClick={() => setAiSuggestions(null)}
              className="text-xs font-semibold text-[#5B21B6] hover:underline cursor-pointer"
            >
              Close
            </button>
          </div>
          <p className="text-xs text-[#374151] leading-relaxed">{aiSuggestions.proposalSummary}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="rounded-lg bg-[#F9FAFB] border border-[#E5E7EB] p-3">
              <p className="font-semibold text-[#111827] mb-1.5">Recommended Discovery Queries</p>
              <ul className="list-disc pl-4 space-y-1 text-[#4B5563]">
                {aiSuggestions.discoveryQueries.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg bg-[#F9FAFB] border border-[#E5E7EB] p-3">
              <p className="font-semibold text-[#111827] mb-1.5">Recommended Messaging Angles</p>
              <ul className="list-disc pl-4 space-y-1 text-[#4B5563]">
                {aiSuggestions.messagingAngles.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {loading ? (
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-10 text-center text-sm text-[#6B7280]">
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#5B21B6] mb-2" />
          Loading campaigns...
        </div>
      ) : visibleCampaigns.length === 0 ? (
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-10 text-center text-sm text-[#6B7280]">
          No {showArchived ? 'archived' : 'active'} campaigns found.
        </div>
      ) : (
        <div className="space-y-4">
          {visibleCampaigns.map((camp) => {
            const isEditing = editingId === camp.id && editDraft !== null;
            return (
              <section
                key={camp.id}
                className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-xs space-y-4"
              >
                {isEditing && editDraft ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="block font-semibold text-[#111827] mb-1">
                          Campaign Name
                        </label>
                        <input
                          type="text"
                          value={editDraft.name}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, name: e.target.value })
                          }
                          className="h-9 w-full rounded-lg border border-[#D1D5DB] px-2.5"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-[#111827] mb-1">
                          Brand Name
                        </label>
                        <input
                          type="text"
                          value={editDraft.brand_name}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, brand_name: e.target.value })
                          }
                          className="h-9 w-full rounded-lg border border-[#D1D5DB] px-2.5"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-[#111827] mb-1">Status</label>
                        <select
                          value={editDraft.status}
                          onChange={(e) =>
                            setEditDraft({
                              ...editDraft,
                              status: e.target.value as CampaignDbRow['status'],
                            })
                          }
                          className="h-9 w-full rounded-lg border border-[#D1D5DB] bg-white px-2"
                        >
                          <option value="active">Active</option>
                          <option value="draft">Draft</option>
                          <option value="paused">Paused</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="block font-semibold text-[#111827] mb-1">Niche</label>
                        <input
                          type="text"
                          value={editDraft.niche}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, niche: e.target.value })
                          }
                          className="h-9 w-full rounded-lg border border-[#D1D5DB] px-2.5"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-[#111827] mb-1">
                          Target Geography
                        </label>
                        <input
                          type="text"
                          value={editDraft.target_country}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, target_country: e.target.value })
                          }
                          className="h-9 w-full rounded-lg border border-[#D1D5DB] px-2.5"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-[#111827] mb-1">
                          Collaboration Type
                        </label>
                        <select
                          value={editDraft.collaboration_type}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, collaboration_type: e.target.value })
                          }
                          className="h-9 w-full rounded-lg border border-[#D1D5DB] bg-white px-2"
                        >
                          {COLLAB_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="block font-semibold text-[#111827] mb-1">
                          Min Followers
                        </label>
                        <input
                          type="number"
                          value={editDraft.min_followers}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, min_followers: e.target.value })
                          }
                          className="h-9 w-full rounded-lg border border-[#D1D5DB] px-2.5"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-[#111827] mb-1">
                          Max Followers
                        </label>
                        <input
                          type="number"
                          value={editDraft.max_followers}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, max_followers: e.target.value })
                          }
                          className="h-9 w-full rounded-lg border border-[#D1D5DB] px-2.5"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-[#111827] mb-1">
                          Min Engagement (%)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={editDraft.min_engagement_rate}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, min_engagement_rate: e.target.value })
                          }
                          className="h-9 w-full rounded-lg border border-[#D1D5DB] px-2.5"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block font-semibold text-[#111827] mb-1">
                          Product Description
                        </label>
                        <input
                          type="text"
                          value={editDraft.product_description}
                          onChange={(e) =>
                            setEditDraft({
                              ...editDraft,
                              product_description: e.target.value,
                            })
                          }
                          className="h-9 w-full rounded-lg border border-[#D1D5DB] px-2.5"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-[#111827] mb-1">
                          Campaign Brief
                        </label>
                        <input
                          type="text"
                          value={editDraft.campaign_brief}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, campaign_brief: e.target.value })
                          }
                          className="h-9 w-full rounded-lg border border-[#D1D5DB] px-2.5"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setEditingId(null);
                          setEditDraft(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={savingId === camp.id}
                        onClick={() => void handleSaveEdit(camp.id)}
                      >
                        {savingId === camp.id ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Target className="h-4 w-4 text-[#5B21B6]" aria-hidden="true" />
                        <h3 className="text-base font-bold text-[#111827]">{camp.name}</h3>
                        <span className="rounded-full bg-[#EDE9FE] px-2.5 py-0.5 text-[11px] font-semibold text-[#5B21B6] capitalize">
                          {camp.status}
                        </span>
                        <span className="rounded-full bg-[#F3F4F6] px-2.5 py-0.5 text-[11px] font-medium text-[#374151]">
                          {camp.collaboration_type || 'Sponsorship'}
                        </span>
                      </div>
                      <p className="text-xs text-[#4B5563]">
                        Brand: <strong>{camp.brand_name}</strong> · Niche: <strong>{camp.niche}</strong> ·
                        Geography: <strong>{camp.target_country || 'India'}</strong>
                      </p>
                      <p className="text-xs text-[#6B7280] mr-tabular">
                        Reach Criteria: {(camp.min_followers ?? 5000).toLocaleString()}–
                        {(camp.max_followers ?? 100000).toLocaleString()} followers · Min Engagement:{' '}
                        {camp.min_engagement_rate ?? 2}%
                      </p>
                      {(camp.product_description || camp.campaign_brief) && (
                        <p className="text-xs text-[#374151] pt-1">
                          {camp.product_description || camp.campaign_brief}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={aiLoadingId === camp.id}
                        onClick={() => void handleAiSuggestions(camp)}
                      >
                        {aiLoadingId === camp.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5 text-[#5B21B6]" />
                        )}
                        <span>AI Suggestions</span>
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => startEditing(camp)}>
                        <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Edit</span>
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={savingId === camp.id}
                        onClick={() => void handleToggleArchive(camp)}
                      >
                        {camp.archived_at ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#059669]" />
                        ) : (
                          <Archive className="h-3.5 w-3.5" />
                        )}
                        <span>{camp.archived_at ? 'Restore' : 'Archive'}</span>
                      </Button>
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      <NewCampaignModal
        isOpen={createOpen}
        isBackendConnected={!error}
        onCreateCampaign={handleCreate}
        onClose={() => setCreateOpen(false)}
      />
    </WorkspaceModuleShell>
  );
};
