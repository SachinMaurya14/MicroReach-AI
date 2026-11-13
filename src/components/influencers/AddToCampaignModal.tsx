import React, { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { CampaignDbRow } from '../../services/api/workspaceApi';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface AddToCampaignModalProps {
  mode: 'list' | 'campaign' | null;
  selectedCount: number;
  campaigns: CampaignDbRow[];
  isBackendConnected: boolean;
  onAddToCampaign: (campaignId: string) => Promise<{ ok: boolean; message: string }>;
  onClose: () => void;
}

export const AddToCampaignModal: React.FC<AddToCampaignModalProps> = ({
  mode,
  selectedCount,
  campaigns,
  isBackendConnected,
  onAddToCampaign,
  onClose,
}) => {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [listName, setListName] = useState('Skincare Demo Shortlist');
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (campaigns.length > 0 && !selectedCampaignId) {
      setSelectedCampaignId(campaigns[0].id);
    }
  }, [campaigns, selectedCampaignId]);

  const handleClose = () => {
    setResultMessage(null);
    onClose();
  };

  if (!mode) return null;

  const isList = mode === 'list';

  const handleConfirm = async () => {
    if (isList) {
      setResultMessage(
        `${selectedCount} creator(s) staged locally for "${listName}".`
      );
      return;
    }

    if (!isBackendConnected || !selectedCampaignId) {
      setResultMessage(
        'Demo only — configure Supabase server secret and run YouTube discovery to persist campaign links.'
      );
      return;
    }

    setSaving(true);
    const res = await onAddToCampaign(selectedCampaignId);
    setSaving(false);
    setResultMessage(res.message);
  };

  return (
    <Modal
      isOpen={Boolean(mode)}
      onClose={handleClose}
      title={isList ? 'Add Selected to List' : 'Add Selected to Campaign'}
      subtitle={
        !isList && isBackendConnected
          ? 'Persists selected creators to Supabase campaign_influencers'
          : 'Local staging preview'
      }
      maxWidthClass="max-w-md"
    >
      {resultMessage ? (
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 rounded-xl border border-[#DDD6FE] bg-[#F5F3FF] p-4 text-sm text-[#111827]">
            <CheckCircle2 className="h-5 w-5 text-[#5B21B6] mt-0.5 shrink-0" aria-hidden="true" />
            <p className="font-medium leading-relaxed">{resultMessage}</p>
          </div>
          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={handleClose}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {selectedCount === 0 ? (
            <p className="text-sm text-[#4B5563]">
              Select one or more creator cards using their checkboxes before adding to a{' '}
              {isList ? 'list' : 'campaign'}.
            </p>
          ) : (
            <>
              <p className="text-sm text-[#4B5563]">
                Selected creators: <strong className="text-[#111827]">{selectedCount}</strong>
              </p>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  {isList ? 'Choose Shortlist' : 'Choose Shared Campaign'}
                </label>
                {isList ? (
                  <select
                    value={listName}
                    onChange={(e) => setListName(e.target.value)}
                    className="h-[38px] w-full rounded-lg border border-[#D1D5DB] bg-white px-3 text-sm text-[#111827]"
                  >
                    <option value="Skincare Demo Shortlist">Skincare Demo Shortlist</option>
                    <option value="India YouTube Creators">India YouTube Creators</option>
                  </select>
                ) : campaigns.length > 0 ? (
                  <select
                    value={selectedCampaignId}
                    onChange={(e) => setSelectedCampaignId(e.target.value)}
                    className="h-[38px] w-full rounded-lg border border-[#D1D5DB] bg-white px-3 text-sm text-[#111827]"
                  >
                    {campaigns.map((camp) => (
                      <option key={camp.id} value={camp.id}>
                        {camp.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-[#6B7280]">
                    No Supabase campaigns loaded yet.
                  </p>
                )}
              </div>
            </>
          )}

          <div className="flex justify-end gap-2.5 pt-2">
            <Button variant="secondary" size="sm" onClick={handleClose}>
              Cancel
            </Button>
            {selectedCount > 0 && (
              <Button
                variant="primary"
                size="sm"
                disabled={saving}
                onClick={() => void handleConfirm()}
              >
                {saving
                  ? 'Saving...'
                  : isList
                    ? 'Stage to List'
                    : 'Save to Campaign'}
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};
