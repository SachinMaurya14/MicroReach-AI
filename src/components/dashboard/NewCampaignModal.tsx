import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface NewCampaignModalProps {
  isOpen: boolean;
  isBackendConnected: boolean;
  onCreateCampaign: (input: {
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
  }) => Promise<boolean>;
  onClose: () => void;
}

const COLLAB_TYPES = [
  'Sponsorship',
  'Affiliate campaign',
  'UGC creation',
  'Brand ambassador program',
  'Paid product placement',
  'Barter collaboration',
];

export const NewCampaignModal: React.FC<NewCampaignModalProps> = ({
  isOpen,
  isBackendConnected,
  onCreateCampaign,
  onClose,
}) => {
  const [campaignName, setCampaignName] = useState('GlowCare Barrier Repair Q4');
  const [brandName, setBrandName] = useState('GlowCare');
  const [niche, setNiche] = useState('Beauty & Skincare');
  const [geography, setGeography] = useState('India');
  const [minFollowers, setMinFollowers] = useState('5000');
  const [maxFollowers, setMaxFollowers] = useState('100000');
  const [minEngagementRate, setMinEngagementRate] = useState('2.0');
  const [collaborationType, setCollaborationType] = useState('Sponsorship');
  const [productDescription, setProductDescription] = useState('');
  const [campaignBrief, setCampaignBrief] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedNotice, setSubmittedNotice] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isBackendConnected) {
      setSubmittedNotice(true);
      return;
    }

    setSubmitting(true);
    const ok = await onCreateCampaign({
      name: campaignName.trim(),
      brandName: brandName.trim() || 'GlowCare',
      niche: niche.trim(),
      targetCountry: geography.trim(),
      minFollowers: Number(minFollowers) || 5000,
      maxFollowers: Number(maxFollowers) || 100000,
      minEngagementRate: Number(minEngagementRate) || 2.0,
      collaborationType,
      productDescription: productDescription.trim() || undefined,
      campaignBrief: campaignBrief.trim() || undefined,
    });
    setSubmitting(false);
    if (ok) {
      onClose();
    }
  };

  const handleClose = () => {
    setSubmittedNotice(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isBackendConnected ? 'Create Shared Campaign' : 'New Campaign (Demo Preview)'}
      subtitle={
        isBackendConnected
          ? 'Saved to the shared Supabase campaign workspace.'
          : 'Campaign persistence requires SUPABASE_SECRET_KEY configuration.'
      }
      maxWidthClass="max-w-xl"
    >
      {submittedNotice ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-[#DDD6FE] bg-[#EDE9FE]/55 p-4 text-sm text-[#111827]">
            Preview validated for <strong>{campaignName}</strong> ({niche} · {geography}). Demo
            mode only — configure Supabase server secrets to persist new campaigns.
          </div>
          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={handleClose}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#111827] mb-1">
                Campaign Name
              </label>
              <input
                type="text"
                required
                minLength={3}
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                className="h-[38px] w-full rounded-lg border border-[#D1D5DB] px-3 text-sm text-[#111827]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#111827] mb-1">
                Brand Name
              </label>
              <input
                type="text"
                required
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="h-[38px] w-full rounded-lg border border-[#D1D5DB] px-3 text-sm text-[#111827]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#111827] mb-1">
                Primary Niche
              </label>
              <input
                type="text"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                className="h-[38px] w-full rounded-lg border border-[#D1D5DB] px-3 text-sm text-[#111827]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#111827] mb-1">
                Target Geography
              </label>
              <input
                type="text"
                value={geography}
                onChange={(e) => setGeography(e.target.value)}
                className="h-[38px] w-full rounded-lg border border-[#D1D5DB] px-3 text-sm text-[#111827]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#111827] mb-1">
                Collaboration Type
              </label>
              <select
                value={collaborationType}
                onChange={(e) => setCollaborationType(e.target.value)}
                className="h-[38px] w-full rounded-lg border border-[#D1D5DB] bg-white px-2.5 text-sm text-[#111827]"
              >
                {COLLAB_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#111827] mb-1">
                Min Followers
              </label>
              <input
                type="number"
                min={500}
                value={minFollowers}
                onChange={(e) => setMinFollowers(e.target.value)}
                className="h-[38px] w-full rounded-lg border border-[#D1D5DB] px-3 text-sm text-[#111827]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#111827] mb-1">
                Max Followers
              </label>
              <input
                type="number"
                min={1000}
                value={maxFollowers}
                onChange={(e) => setMaxFollowers(e.target.value)}
                className="h-[38px] w-full rounded-lg border border-[#D1D5DB] px-3 text-sm text-[#111827]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#111827] mb-1">
                Min Engagement (%)
              </label>
              <input
                type="number"
                step="0.1"
                min={0}
                max={50}
                value={minEngagementRate}
                onChange={(e) => setMinEngagementRate(e.target.value)}
                className="h-[38px] w-full rounded-lg border border-[#D1D5DB] px-3 text-sm text-[#111827]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111827] mb-1">
              Product Description (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g., Ceramide barrier repair sunscreen SPF 50"
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              className="h-[38px] w-full rounded-lg border border-[#D1D5DB] px-3 text-sm text-[#111827]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111827] mb-1">
              Campaign Brief / Positioning (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Key deliverables, review preferences, or campaign goals"
              value={campaignBrief}
              onChange={(e) => setCampaignBrief(e.target.value)}
              className="w-full rounded-lg border border-[#D1D5DB] p-2.5 text-sm text-[#111827]"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <Button variant="secondary" size="sm" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={submitting}>
              {submitting
                ? 'Saving...'
                : isBackendConnected
                  ? 'Create Campaign'
                  : 'Preview Campaign Setup'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
