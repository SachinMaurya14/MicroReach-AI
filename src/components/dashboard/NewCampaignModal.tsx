import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface NewCampaignModalProps {
  isOpen: boolean;
  isBackendConnected: boolean;
  onCreateCampaign: (input: {
    name: string;
    niche: string;
    targetCountry: string;
  }) => Promise<boolean>;
  onClose: () => void;
}

export const NewCampaignModal: React.FC<NewCampaignModalProps> = ({
  isOpen,
  isBackendConnected,
  onCreateCampaign,
  onClose,
}) => {
  const [campaignName, setCampaignName] = useState('GlowCare Barrier Repair Q4');
  const [niche, setNiche] = useState('Beauty & Skincare');
  const [geography, setGeography] = useState('India');
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
      niche: niche.trim(),
      targetCountry: geography.trim(),
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
      maxWidthClass="max-w-lg"
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
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
