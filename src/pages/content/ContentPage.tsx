import React, { useCallback, useEffect, useState } from 'react';
import { Check, FileText, Loader2, Plus, Sparkles, Trash2 } from 'lucide-react';
import { WorkspaceModuleShell } from '../../components/app-shell/WorkspaceModuleShell';
import { Button } from '../../components/ui/Button';
import {
  CampaignDbRow,
  createContentIdeaApi,
  deleteContentIdeaApi,
  fetchCampaignsApi,
  fetchContentIdeasApi,
  generateContentIdeasAiApi,
  updateContentIdeaApi,
} from '../../services/api/workspaceApi';
import { CampaignContentIdeaRow } from '../../types/database';

export const ContentPage: React.FC = () => {
  const [campaigns, setCampaigns] = useState<CampaignDbRow[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [ideas, setIdeas] = useState<CampaignContentIdeaRow[]>([]);
  const [storageMode, setStorageMode] = useState<'native_table' | 'audit_fallback'>('native_table');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [format, setFormat] = useState('YouTube Dedicated Review');
  const [angle, setAngle] = useState('');
  const [themesText, setThemesText] = useState('Skincare routine, Sunscreen test');
  const [saving, setSaving] = useState(false);

  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiIdeas, setAiIdeas] = useState<
    Array<{ title: string; format: string; angle: string; contentThemes: string[] }>
  >([]);
  const [aiModel, setAiModel] = useState<string | null>(null);

  const loadData = useCallback(async (campId?: string) => {
    setLoading(true);
    try {
      const camps = await fetchCampaignsApi(true);
      setCampaigns(camps);
      const effectiveCampId = campId || camps[0]?.id || '';
      setSelectedCampaignId(effectiveCampId);
      const res = await fetchContentIdeasApi(effectiveCampId || undefined);
      setIdeas(res.items);
      setStorageMode(res.storageMode);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Unable to load content workspace.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const activeCampaign = campaigns.find((c) => c.id === selectedCampaignId) ?? campaigns[0] ?? null;

  const handleCampaignChange = async (nextId: string) => {
    setSelectedCampaignId(nextId);
    try {
      const res = await fetchContentIdeasApi(nextId || undefined);
      setIdeas(res.items);
      setStorageMode(res.storageMode);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Unable to filter content ideas.');
    }
  };

  const handleAddIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !angle.trim()) return;
    setSaving(true);
    try {
      await createContentIdeaApi({
        campaignId: selectedCampaignId || null,
        title: title.trim(),
        format: format.trim() || 'UGC',
        angle: angle.trim(),
        contentThemes: themesText
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        source: 'manual',
        status: 'draft',
      });
      setTitle('');
      setAngle('');
      setNotice('Saved content brief idea.');
      const res = await fetchContentIdeasApi(selectedCampaignId || undefined);
      setIdeas(res.items);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Failed to save content idea.');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateAiIdeas = async () => {
    if (!activeCampaign) return;
    setGeneratingAi(true);
    try {
      const res = await generateContentIdeasAiApi({
        campaignName: activeCampaign.name,
        brandName: activeCampaign.brand_name,
        niche: activeCampaign.niche,
        productDescription: activeCampaign.product_description,
        campaignBrief: activeCampaign.campaign_brief,
        collaborationType: activeCampaign.collaboration_type,
      });
      setAiIdeas(res.ideas);
      setAiModel(res.modelUsed);
      setNotice(`Generated ${res.ideas.length} creative content concepts via ${res.modelUsed}.`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Gemini content idea generation failed.');
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleSaveAiIdea = async (idea: {
    title: string;
    format: string;
    angle: string;
    contentThemes: string[];
  }) => {
    try {
      await createContentIdeaApi({
        campaignId: selectedCampaignId || null,
        title: idea.title,
        format: idea.format,
        angle: idea.angle,
        contentThemes: idea.contentThemes,
        aiModel,
        source: 'gemini_ai',
        status: 'draft',
      });
      const res = await fetchContentIdeasApi(selectedCampaignId || undefined);
      setIdeas(res.items);
      setNotice(`Saved AI concept "${idea.title}".`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Unable to save AI concept.');
    }
  };

  const handleApprove = async (idea: CampaignContentIdeaRow) => {
    try {
      await updateContentIdeaApi(idea.id, {
        status: idea.status === 'approved' ? 'draft' : 'approved',
      });
      const res = await fetchContentIdeasApi(selectedCampaignId || undefined);
      setIdeas(res.items);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Unable to update content idea status.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteContentIdeaApi(id);
      setIdeas((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Unable to delete content idea.');
    }
  };

  return (
    <WorkspaceModuleShell
      moduleName="Content"
      currentPath="/dashboard/content"
      subtitle="Campaign positioning, collaboration creative angles, and Gemini-assisted content ideas"
      headerActions={
        <Button
          variant="primary"
          size="sm"
          disabled={generatingAi || !activeCampaign}
          onClick={() => void handleGenerateAiIdeas()}
        >
          {generatingAi ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          <span>{generatingAi ? 'Generating...' : 'Generate Ideas with Gemini'}</span>
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

      {/* Campaign Context Selector */}
      <section className="rounded-xl border border-[#E5E7EB] bg-white p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#6B7280]">
            <span>Active Campaign Context</span>
            <span className="rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[10px]">
              Storage: {storageMode === 'native_table' ? 'campaign_content_ideas' : 'shared audit persistence'}
            </span>
          </div>
          {activeCampaign && (
            <p className="text-sm font-bold text-[#111827]">
              {activeCampaign.name} ({activeCampaign.brand_name} · {activeCampaign.niche})
            </p>
          )}
          {activeCampaign?.product_description && (
            <p className="text-xs text-[#4B5563]">{activeCampaign.product_description}</p>
          )}
        </div>

        <select
          aria-label="Filter content by campaign"
          value={selectedCampaignId}
          onChange={(e) => void handleCampaignChange(e.target.value)}
          className="h-9 rounded-lg border border-[#D1D5DB] bg-white px-3 text-xs font-medium text-[#111827]"
        >
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </section>

      {/* AI Generated Suggestions Shelf */}
      {aiIdeas.length > 0 && (
        <section className="rounded-xl border border-[#DDD6FE] bg-white p-5 space-y-3">
          <h2 className="text-sm font-bold text-[#111827]">
            Gemini Generated Content Concepts ({aiModel})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {aiIdeas.map((idea, idx) => (
              <div
                key={`${idea.title}-${idx}`}
                className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-[#111827]">{idea.title}</h3>
                    <span className="text-[11px] font-semibold text-[#5B21B6]">{idea.format}</span>
                  </div>
                  <Button variant="primary" size="sm" onClick={() => void handleSaveAiIdea(idea)}>
                    Save Idea
                  </Button>
                </div>
                <p className="text-xs text-[#374151]">{idea.angle}</p>
                <div className="flex flex-wrap gap-1">
                  {idea.contentThemes.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-[#EDE9FE] px-2 py-0.5 text-[10px] font-medium text-[#5B21B6]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Add Manual Content Brief / Idea */}
        <form
          onSubmit={handleAddIdea}
          className="rounded-xl border border-[#E5E7EB] bg-white p-5 space-y-3.5 h-fit"
        >
          <h2 className="text-sm font-bold text-[#111827] flex items-center gap-1.5">
            <Plus className="h-4 w-4 text-[#5B21B6]" />
            <span>Add Content Collaboration Angle</span>
          </h2>

          <div>
            <label className="block text-xs font-semibold text-[#111827] mb-1">Title</label>
            <input
              type="text"
              required
              minLength={3}
              placeholder="e.g., 7-Day Barrier Repair Diary"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-9 w-full rounded-lg border border-[#D1D5DB] px-2.5 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111827] mb-1">Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="h-9 w-full rounded-lg border border-[#D1D5DB] bg-white px-2.5 text-xs"
            >
              <option value="YouTube Dedicated Review">YouTube Dedicated Review</option>
              <option value="YouTube Shorts / Integration">YouTube Shorts / Integration</option>
              <option value="Instagram Reel">Instagram Reel</option>
              <option value="UGC Asset Pack">UGC Asset Pack</option>
              <option value="Ingredient Comparison">Ingredient Comparison</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111827] mb-1">
              Creative Angle &amp; Guidelines
            </label>
            <textarea
              rows={3}
              required
              placeholder="Outline honest creator talking points grounded in real campaign positioning"
              value={angle}
              onChange={(e) => setAngle(e.target.value)}
              className="w-full rounded-lg border border-[#D1D5DB] p-2.5 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111827] mb-1">
              Themes (comma-separated)
            </label>
            <input
              type="text"
              value={themesText}
              onChange={(e) => setThemesText(e.target.value)}
              className="h-9 w-full rounded-lg border border-[#D1D5DB] px-2.5 text-xs"
            />
          </div>

          <Button type="submit" variant="primary" size="sm" disabled={saving} className="w-full">
            {saving ? 'Saving...' : 'Save Content Concept'}
          </Button>
        </form>

        {/* Saved Ideas List */}
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-10 text-center text-sm text-[#6B7280]">
              Loading saved content concepts...
            </div>
          ) : ideas.length === 0 ? (
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-10 text-center text-sm text-[#6B7280]">
              <FileText className="mx-auto h-6 w-6 text-[#9CA3AF] mb-2" />
              No saved content ideas yet. Add one on the left or click Generate Ideas with Gemini.
            </div>
          ) : (
            ideas.map((idea) => (
              <div
                key={idea.id}
                className="rounded-xl border border-[#E5E7EB] bg-white p-4 space-y-2.5 shadow-xs"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-[#111827]">{idea.title}</h3>
                      <span className="rounded-full bg-[#EDE9FE] px-2 py-0.5 text-[10px] font-semibold text-[#5B21B6]">
                        {idea.format}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${
                          idea.status === 'approved'
                            ? 'bg-[#D1FAE5] text-[#059669]'
                            : 'bg-[#F3F4F6] text-[#4B5563]'
                        }`}
                      >
                        {idea.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#6B7280] mt-0.5">
                      Source: {idea.source} {idea.ai_model ? `(${idea.ai_model})` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button variant="secondary" size="sm" onClick={() => void handleApprove(idea)}>
                      <Check className="h-3.5 w-3.5" />
                      <span>{idea.status === 'approved' ? 'Approved' : 'Approve'}</span>
                    </Button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(idea.id)}
                      aria-label={`Delete ${idea.title}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E7EB] text-[#DC2626] hover:bg-[#FEF2F2] cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-[#374151] leading-relaxed">{idea.angle}</p>
                {idea.content_themes && idea.content_themes.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {idea.content_themes.map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[10px] text-[#4B5563]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </WorkspaceModuleShell>
  );
};
