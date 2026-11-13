import React, { useEffect, useState } from 'react';
import { DashboardCreatorRow, DashboardQualStatus } from '../../types/dashboard';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface CreatorEditModalProps {
  creator: DashboardCreatorRow | null;
  onClose: () => void;
  onSave: (updated: DashboardCreatorRow) => void;
}

export const CreatorEditModal: React.FC<CreatorEditModalProps> = ({
  creator,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [qualStatus, setQualStatus] = useState<DashboardQualStatus>('Passed');
  const [qualReason, setQualReason] = useState('');

  useEffect(() => {
    if (!creator) return;
    setName(creator.name);
    setEmail(creator.email);
    setQualStatus(creator.qualStatus);
    setQualReason(creator.qualReason);
  }, [creator]);

  if (!creator) return null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const cleanedEmail = email.trim() || 'Not Found';
    onSave({
      ...creator,
      name: name.trim() || creator.name,
      email: cleanedEmail,
      emailVerifiedDemo: cleanedEmail !== 'Not Found',
      qualStatus,
      qualReason: qualReason.trim() || creator.qualReason,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={Boolean(creator)}
      onClose={onClose}
      title={
        creator.isLiveRecord
          ? `Manual Review: ${creator.name}`
          : `Edit Demo Row: ${creator.name}`
      }
      subtitle={
        creator.isLiveRecord
          ? 'Updates manual review status and verified contact email in Supabase.'
          : 'Local UI demo edit only — changes do not persist across page refreshes.'
      }
      maxWidthClass="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[#111827] mb-1">
            Creator Label
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-[38px] w-full rounded-lg border border-[#D1D5DB] px-3 text-sm text-[#111827]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#111827] mb-1">
            Contact Email (use Not Found if unavailable)
          </label>
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-[38px] w-full rounded-lg border border-[#D1D5DB] px-3 text-sm text-[#111827]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#111827] mb-1">
            Qualification Status
          </label>
          <select
            value={qualStatus}
            onChange={(e) => setQualStatus(e.target.value as DashboardQualStatus)}
            className="h-[38px] w-full rounded-lg border border-[#D1D5DB] bg-white px-3 text-sm text-[#111827]"
          >
            <option value="Passed">Qualified</option>
            <option value="Needs Review">Needs Review</option>
            <option value="Failed">Rejected</option>
            <option value="Approved / Queued">Approved / Queued</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#111827] mb-1">
            Qualification Note
          </label>
          <input
            type="text"
            value={qualReason}
            onChange={(e) => setQualReason(e.target.value)}
            className="h-[38px] w-full rounded-lg border border-[#D1D5DB] px-3 text-sm text-[#111827]"
          />
        </div>

        <div className="flex justify-end gap-2.5 pt-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm">
            {creator.isLiveRecord ? 'Save Review' : 'Apply Local Edit'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
