import React, { useCallback, useEffect, useState } from 'react';
import { Award, Plus, Trash2 } from 'lucide-react';
import { WorkspaceModuleShell } from '../../components/app-shell/WorkspaceModuleShell';
import { Button } from '../../components/ui/Button';
import {
  CampaignDbRow,
  createIncentiveApi,
  deleteIncentiveApi,
  fetchCampaignsApi,
  fetchIncentivesApi,
  fetchInfluencersApi,
  fetchOutreachLogsApi,
  OutreachLogDbRow,
  updateIncentiveApi,
  WorkspaceCreatorApiItem,
} from '../../services/api/workspaceApi';
import { CreatorIncentiveRow } from '../../types/database';

const COMP_TYPES = [
  'Paid sponsorship',
  'Fixed compensation',
  'Barter collaboration',
  'Affiliate commission',
  'Product gifting',
  'UGC fee',
  'Custom collaboration terms',
];

export const IncentivesPage: React.FC = () => {
  const [campaigns, setCampaigns] = useState<CampaignDbRow[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [creators, setCreators] = useState<WorkspaceCreatorApiItem[]>([]);
  const [logs, setLogs] = useState<OutreachLogDbRow[]>([]);
  const [incentives, setIncentives] = useState<CreatorIncentiveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const [influencerId, setInfluencerId] = useState('');
  const [outreachLogId, setOutreachLogId] = useState('');
  const [compensationType, setCompensationType] = useState(COMP_TYPES[0]);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [commissionPercent, setCommissionPercent] = useState('');
  const [deliverables, setDeliverables] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const loadAll = useCallback(async (campId?: string) => {
    setLoading(true);
    try {
      const camps = await fetchCampaignsApi(true);
      setCampaigns(camps);
      const effectiveId = campId || camps[0]?.id || '';
      setSelectedCampaignId(effectiveId);

      const [incRes, infRes, logRows] = await Promise.all([
        fetchIncentivesApi(effectiveId || undefined),
        fetchInfluencersApi({ campaignId: effectiveId || undefined, limit: 150 }),
        fetchOutreachLogsApi(effectiveId || undefined),
      ]);
      setIncentives(incRes.items);
      setCreators(infRes.items);
      setLogs(logRows);
      if (infRes.items[0] && !influencerId) {
        setInfluencerId(infRes.items[0].influencer.id);
      }
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Unable to load creator incentives.');
    } finally {
      setLoading(false);
    }
  }, [influencerId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createIncentiveApi({
        campaignId: selectedCampaignId || null,
        influencerId: influencerId || null,
        outreachLogId: outreachLogId || null,
        compensationType,
        amount: amount.trim() !== '' ? Number(amount) : null,
        currency: currency.trim() || 'INR',
        commissionPercent: commissionPercent.trim() !== '' ? Number(commissionPercent) : null,
        deliverables: deliverables.trim() || null,
        notes: notes.trim() || null,
        status: 'planned',
      });
      setAmount('');
      setCommissionPercent('');
      setDeliverables('');
      setNotes('');
      setNotice('Saved creator incentive terms to workspace.');
      await loadAll(selectedCampaignId);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Failed to save creator incentive.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (
    row: CreatorIncentiveRow,
    nextStatus: CreatorIncentiveRow['status']
  ) => {
    try {
      await updateIncentiveApi(row.id, { status: nextStatus });
      setIncentives((prev) =>
        prev.map((item) => (item.id === row.id ? { ...item, status: nextStatus } : item))
      );
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Unable to update offer status.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteIncentiveApi(id);
      setIncentives((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Unable to delete incentive.');
    }
  };

  const creatorNameById = new Map(creators.map((c) => [c.influencer.id, c.influencer.name]));

  return (
    <WorkspaceModuleShell
      moduleName="Incentives"
      currentPath="/dashboard/incentives"
      subtitle="Track user-approved creator compensation, barter, affiliate commission, and deliverables"
      headerActions={
        <select
          aria-label="Filter incentives by campaign"
          value={selectedCampaignId}
          onChange={(e) => void loadAll(e.target.value)}
          className="h-9 rounded-lg border border-[#D1D5DB] bg-white px-3 text-xs font-medium text-[#111827]"
        >
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <form
          onSubmit={handleCreate}
          className="rounded-xl border border-[#E5E7EB] bg-white p-5 space-y-3 h-fit"
        >
          <h2 className="text-sm font-bold text-[#111827] flex items-center gap-1.5">
            <Plus className="h-4 w-4 text-[#5B21B6]" />
            <span>Create Creator Offer / Incentive</span>
          </h2>
          <p className="text-[11px] text-[#6B7280]">
            Compensation values are stored only when explicitly entered. Leave Amount blank for barter or unpriced drafts.
          </p>

          <div>
            <label className="block text-xs font-semibold text-[#111827] mb-1">Creator</label>
            <select
              value={influencerId}
              onChange={(e) => setInfluencerId(e.target.value)}
              className="h-9 w-full rounded-lg border border-[#D1D5DB] bg-white px-2.5 text-xs"
            >
              <option value="">General Campaign Offer</option>
              {creators.map((c) => (
                <option key={c.influencer.id} value={c.influencer.id}>
                  {c.influencer.name} ({c.influencer.platform})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111827] mb-1">
              Compensation Type
            </label>
            <select
              value={compensationType}
              onChange={(e) => setCompensationType(e.target.value)}
              className="h-9 w-full rounded-lg border border-[#D1D5DB] bg-white px-2.5 text-xs"
            >
              {COMP_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-[#111827] mb-1">
                Amount (Optional)
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="Unassigned"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-9 w-full rounded-lg border border-[#D1D5DB] px-2.5 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#111827] mb-1">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="h-9 w-full rounded-lg border border-[#D1D5DB] bg-white px-2.5 text-xs"
              >
                <option value="INR">INR</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111827] mb-1">
              Affiliate Commission % (Optional)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              step="0.5"
              placeholder="e.g. 15"
              value={commissionPercent}
              onChange={(e) => setCommissionPercent(e.target.value)}
              className="h-9 w-full rounded-lg border border-[#D1D5DB] px-2.5 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111827] mb-1">
              Deliverables / Terms
            </label>
            <input
              type="text"
              placeholder="e.g., 1 YouTube integration + 2 Shorts"
              value={deliverables}
              onChange={(e) => setDeliverables(e.target.value)}
              className="h-9 w-full rounded-lg border border-[#D1D5DB] px-2.5 text-xs"
            />
          </div>

          {logs.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-[#111827] mb-1">
                Link Outreach Record (Optional)
              </label>
              <select
                value={outreachLogId}
                onChange={(e) => setOutreachLogId(e.target.value)}
                className="h-9 w-full rounded-lg border border-[#D1D5DB] bg-white px-2.5 text-xs"
              >
                <option value="">None</option>
                {logs.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.channel} · {l.status} · {new Date(l.created_at).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#111827] mb-1">Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-[#D1D5DB] p-2 text-xs"
            />
          </div>

          <Button type="submit" variant="primary" size="sm" disabled={saving} className="w-full">
            {saving ? 'Saving...' : 'Save Incentive Offer'}
          </Button>
        </form>

        <div className="lg:col-span-2">
          <div className="rounded-xl border border-[#E5E7EB] bg-white overflow-x-auto">
            {loading ? (
              <div className="p-10 text-center text-sm text-[#6B7280]">Loading incentives...</div>
            ) : incentives.length === 0 ? (
              <div className="p-10 text-center text-sm text-[#6B7280]">
                <Award className="mx-auto h-6 w-6 text-[#9CA3AF] mb-2" />
                No creator incentives recorded for this campaign yet.
              </div>
            ) : (
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB] text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
                    <th className="py-3 px-4">Creator</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Amount / Terms</th>
                    <th className="py-3 px-3">Offer Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] mr-tabular">
                  {incentives.map((row) => (
                    <tr key={row.id} className="hover:bg-[#F9FAFB]">
                      <td className="py-3 px-4 font-semibold text-[#111827]">
                        {row.influencer_id
                          ? creatorNameById.get(row.influencer_id) || 'Linked Creator'
                          : 'Campaign Default'}
                      </td>
                      <td className="py-3 px-3 text-[#374151]">{row.compensation_type}</td>
                      <td className="py-3 px-3 text-[#374151]">
                        {row.amount !== null && row.amount !== undefined
                          ? `${row.currency} ${Number(row.amount).toLocaleString()}`
                          : row.commission_percent !== null && row.commission_percent !== undefined
                            ? `${row.commission_percent}% affiliate`
                            : 'Not Assigned (Barter / Custom)'}
                        {row.deliverables && (
                          <div className="text-[11px] text-[#6B7280]">{row.deliverables}</div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <select
                          aria-label={`Offer status for ${row.compensation_type}`}
                          value={row.status}
                          onChange={(e) =>
                            void handleStatusChange(
                              row,
                              e.target.value as CreatorIncentiveRow['status']
                            )
                          }
                          className="h-7 rounded border border-[#D1D5DB] bg-white px-2 text-[11px] font-medium"
                        >
                          <option value="planned">Planned</option>
                          <option value="offered">Offered</option>
                          <option value="accepted">Accepted</option>
                          <option value="fulfilled">Fulfilled</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => void handleDelete(row.id)}
                          aria-label="Delete incentive"
                          className="text-[#DC2626] hover:underline cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </WorkspaceModuleShell>
  );
};
