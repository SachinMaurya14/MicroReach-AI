import React from 'react';

interface OutreachApprovalFooterProps {
  creatorName: string;
  isAlreadyApproved: boolean;
  isLiveSendingEnabled?: boolean;
  gmailConnected?: boolean;
  busy?: boolean;
  onRequestApprove: () => void;
}

export const OutreachApprovalFooter: React.FC<OutreachApprovalFooterProps> = ({
  creatorName,
  isAlreadyApproved,
  isLiveSendingEnabled = false,
  gmailConnected = false,
  busy = false,
  onRequestApprove,
}) => {
  const canSendLive = isLiveSendingEnabled && gmailConnected;

  return (
    <div className="shrink-0 border-t border-[#E5E7EB] bg-white p-4">
      <button
        type="button"
        onClick={onRequestApprove}
        disabled={busy}
        className="flex h-10 w-full items-center justify-center rounded-lg bg-[#5B21B6] px-4 text-[13.5px] font-semibold text-white hover:bg-[#6D28D9] disabled:opacity-60 transition-colors cursor-pointer"
      >
        {isAlreadyApproved
          ? `Outreach Logged (${creatorName})`
          : canSendLive
            ? 'Approve & Send via Gmail'
            : 'Approve & Queue Outreach'}
      </button>
      <p className="mt-1.5 text-center text-[11px] text-[#6B7280]">
        {canSendLive
          ? 'Live Gmail sending active (confirmation required)'
          : 'Simulation mode — Gmail not connected, no real email sent'}
      </p>
    </div>
  );
};
