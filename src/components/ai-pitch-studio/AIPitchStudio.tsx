import React from 'react';
import { X } from 'lucide-react';
import { DashboardCreatorRow } from '../../types/dashboard';
import { EmailPitchCard } from './EmailPitchCard';
import { InstagramDMCard } from './InstagramDMCard';
import { OutreachApprovalFooter } from './OutreachApprovalFooter';

interface AIPitchStudioProps {
  isOpen: boolean;
  creator: DashboardCreatorRow | null;
  busy?: boolean;
  isLiveSendingEnabled?: boolean;
  gmailConnected?: boolean;
  onClose: () => void;
  onChangeEmailDraft: (creatorId: string, nextDraft: string) => void;
  onSaveEmailDraft?: (creatorId: string) => void;
  onRegenerateDraft: (creatorId: string) => void;
  onLogManualDm?: (creatorId: string) => void;
  onRequestApprove: () => void;
}

export const AIPitchStudio: React.FC<AIPitchStudioProps> = ({
  isOpen,
  creator,
  busy = false,
  isLiveSendingEnabled = false,
  gmailConnected = false,
  onClose,
  onChangeEmailDraft,
  onSaveEmailDraft,
  onRegenerateDraft,
  onLogManualDm,
  onRequestApprove,
}) => {
  if (!isOpen || !creator) return null;

  const drawerContent = (
    <div className="flex h-full flex-col bg-white border-l border-[#E5E7EB] mr-pitch-drawer">
      {/* Header */}
      <div className="shrink-0 border-b border-[#E5E7EB] px-4 py-4">
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
        <p className="mt-1 text-[13px] font-medium text-[#4B5563]">
          AI Pitch Preview: <span className="text-[#111827] font-semibold">{creator.name}</span>
        </p>
      </div>

      {/* Scrollable Pitch Cards */}
      <div className="flex-1 overflow-y-auto mr-scroll-thin p-4 space-y-4">
        <EmailPitchCard
          draft={creator.emailPitchDraft}
          isLiveRecord={Boolean(creator.isLiveRecord)}
          busy={busy}
          onChangeDraft={(value) => onChangeEmailDraft(creator.id, value)}
          onSaveDraft={
            onSaveEmailDraft ? () => onSaveEmailDraft(creator.id) : undefined
          }
          onRegenerate={() => onRegenerateDraft(creator.id)}
        />

        <InstagramDMCard
          dmText={creator.instagramDmDraft}
          isLiveRecord={Boolean(creator.isLiveRecord)}
          onLogManualDm={
            onLogManualDm ? () => onLogManualDm(creator.id) : undefined
          }
        />
      </div>

      {/* Sticky Footer */}
      <OutreachApprovalFooter
        creatorName={creator.name}
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
