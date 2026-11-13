import React, { useState } from 'react';
import { CheckCircle2, Search } from 'lucide-react';
import { AIPitchStudio } from '../../components/ai-pitch-studio/AIPitchStudio';
import { AppHeader } from '../../components/app-shell/AppHeader';
import { AppSidebar } from '../../components/app-shell/AppSidebar';
import { CampaignPipeline } from '../../components/dashboard/CampaignPipeline';
import { CreatorEditModal } from '../../components/dashboard/CreatorEditModal';
import { CreatorPipelineTable } from '../../components/dashboard/CreatorPipelineTable';
import { DashboardKPIGrid } from '../../components/dashboard/DashboardKPIGrid';
import { NewCampaignModal } from '../../components/dashboard/NewCampaignModal';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useDashboardState } from '../../hooks/useDashboardState';
import { DashboardCreatorRow } from '../../types/dashboard';

export const DashboardPage: React.FC = () => {
  const {
    campaigns,
    creators,
    filteredCreators,
    outreachLogs,
    gmailStatus,
    kpiMetrics,
    isBackendConnected,
    isShowingDemoFallback,
    busyAction,
    selectedRowIds,
    activeCreator,
    drawerOpen,
    setDrawerOpen,
    globalSearch,
    setGlobalSearch,
    selectedCampaign,
    setSelectedCampaignId,
    demoNotice,
    setDemoNotice,
    toggleRowSelection,
    toggleAllVisibleSelection,
    openPitchPreview,
    updateEmailDraft,
    saveEmailDraftToBackend,
    regenerateLocalDraft,
    simulateApproveOutreach,
    logManualInstagramDm,
    updateCreatorProfile,
    deleteCreatorRow,
    createNewCampaign,
  } = useDashboardState();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [newCampaignOpen, setNewCampaignOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [editingCreator, setEditingCreator] = useState<DashboardCreatorRow | null>(null);
  const [deletingCreator, setDeletingCreator] = useState<DashboardCreatorRow | null>(null);
  const [approvalConfirmOpen, setApprovalConfirmOpen] = useState(false);

  const isLiveSendActive =
    gmailStatus.outreachMode === 'live' &&
    gmailStatus.connected &&
    Boolean(activeCreator?.isLiveRecord);

  return (
    <div className="mr-app-shell min-h-screen lg:h-screen lg:overflow-hidden flex bg-[#F8F9FC] text-[#111827]">
      {/* Left 240px Dark Violet Sidebar */}
      <AppSidebar
        variant="dark"
        activePath="/dashboard"
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Right Shell: Top Header + Center Workspace + Right AI Pitch Studio */}
      <div className="flex-1 flex flex-col min-w-0 lg:h-screen">
        <AppHeader
          campaigns={campaigns}
          selectedCampaign={selectedCampaign}
          onSelectCampaign={setSelectedCampaignId}
          globalSearch={globalSearch}
          onSearchChange={setGlobalSearch}
          onOpenNewCampaign={() => setNewCampaignOpen(true)}
          onOpenHelp={() => setHelpModalOpen(true)}
          onOpenMobileMenu={() => setMobileSidebarOpen(true)}
          drawerOpen={drawerOpen}
          onReopenDrawer={() => setDrawerOpen(true)}
        />

        <div className="flex-1 flex min-h-0">
          {/* Flexible Center Workspace with independent scroll */}
          <main className="flex-1 min-w-0 overflow-y-auto mr-scroll-thin p-4 sm:p-6 space-y-5">
            {/* Mobile Search Fallback */}
            <div className="md:hidden relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]"
                aria-hidden="true"
              />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Global Search"
                aria-label="Global Search"
                className="h-[38px] w-full rounded-lg border border-[#D1D5DB] bg-white pl-9 pr-3 text-sm text-[#111827]"
              />
            </div>

            {demoNotice && (
              <div
                role="status"
                className="flex items-center justify-between gap-3 rounded-xl border border-[#DDD6FE] bg-[#EDE9FE] px-4 py-3 text-xs font-semibold text-[#5B21B6]"
              >
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{demoNotice}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setDemoNotice(null)}
                  className="underline cursor-pointer shrink-0"
                >
                  Dismiss
                </button>
              </div>
            )}

            <DashboardKPIGrid
              discoveredCount={kpiMetrics.discoveredCount}
              qualifiedCount={kpiMetrics.qualifiedCount}
              enrichedCount={kpiMetrics.enrichedCount}
              outreachQueuedCount={kpiMetrics.outreachQueuedCount}
              isShowingDemoFallback={isShowingDemoFallback}
              gmailStatusLabel={gmailStatus.message}
            />

            <CampaignPipeline
              discoveredCount={kpiMetrics.discoveredCount}
              qualifiedCount={kpiMetrics.qualifiedCount}
              enrichedCount={kpiMetrics.enrichedCount}
              hasAiPitches={creators.some((c) => Boolean(c.emailMessageId))}
              outreachCount={outreachLogs.length}
              isShowingDemoFallback={isShowingDemoFallback}
            />

            <CreatorPipelineTable
              creators={filteredCreators}
              selectedRowIds={selectedRowIds}
              activeCreatorId={activeCreator?.id ?? null}
              isShowingDemoFallback={isShowingDemoFallback}
              onToggleSelectRow={toggleRowSelection}
              onToggleSelectAll={toggleAllVisibleSelection}
              onPreviewPitch={openPitchPreview}
              onEditCreator={setEditingCreator}
              onDeleteCreator={setDeletingCreator}
            />
          </main>

          {/* 300px Right AI Pitch Studio Drawer */}
          <AIPitchStudio
            isOpen={drawerOpen}
            creator={activeCreator}
            busy={busyAction}
            isLiveSendingEnabled={gmailStatus.outreachMode === 'live'}
            gmailConnected={gmailStatus.connected}
            onClose={() => setDrawerOpen(false)}
            onChangeEmailDraft={updateEmailDraft}
            onSaveEmailDraft={saveEmailDraftToBackend}
            onRegenerateDraft={regenerateLocalDraft}
            onLogManualDm={logManualInstagramDm}
            onRequestApprove={() => setApprovalConfirmOpen(true)}
          />
        </div>
      </div>

      {/* Edit Creator Row Modal */}
      <CreatorEditModal
        creator={editingCreator}
        onClose={() => setEditingCreator(null)}
        onSave={updateCreatorProfile}
      />

      {/* Delete Creator Row Confirmation */}
      <Modal
        isOpen={Boolean(deletingCreator)}
        onClose={() => setDeletingCreator(null)}
        title={
          deletingCreator?.isLiveRecord
            ? 'Remove Creator from Campaign'
            : 'Remove Illustrative Row'
        }
        subtitle={
          deletingCreator?.isLiveRecord
            ? 'Confirmation required for shared workspace deletion'
            : 'Local demo state only'
        }
        maxWidthClass="max-w-md"
      >
        {deletingCreator && (
          <div className="space-y-4">
            <p className="text-sm text-[#4B5563]">
              Remove <strong className="text-[#111827]">{deletingCreator.name}</strong> from this{' '}
              {deletingCreator.isLiveRecord ? 'shared campaign queue' : 'local demonstration table'}?
            </p>
            <div className="flex justify-end gap-2.5">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDeletingCreator(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  void deleteCreatorRow(deletingCreator.id);
                  setDeletingCreator(null);
                }}
              >
                Confirm Remove
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Approve & Queue / Send Outreach Confirmation Modal */}
      <Modal
        isOpen={approvalConfirmOpen && Boolean(activeCreator)}
        onClose={() => setApprovalConfirmOpen(false)}
        title={
          isLiveSendActive
            ? 'Confirm Live Gmail Outreach Send'
            : 'Approve & Log Simulated Outreach'
        }
        subtitle={gmailStatus.message}
        maxWidthClass="max-w-md"
      >
        {activeCreator && (
          <div className="space-y-4">
            <div className="rounded-xl border border-[#DDD6FE] bg-[#F5F3FF] p-4 text-sm text-[#111827]">
              <p className="font-semibold">
                Creator: {activeCreator.name} ({activeCreator.email})
              </p>
              <p className="mt-1.5 text-xs text-[#4B5563] leading-relaxed">
                {isLiveSendActive
                  ? 'Confirming will transmit this approved email via your connected Gmail sender account and record an audit log entry (daily limit: 5 live sends per campaign).'
                  : 'Simulation mode is active. Confirming saves your pitch approval and records a simulated outreach log in Supabase without transmitting any real email.'}
              </p>
            </div>
            <div className="flex justify-end gap-2.5">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setApprovalConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={busyAction}
                onClick={() => {
                  void simulateApproveOutreach(activeCreator.id);
                  setApprovalConfirmOpen(false);
                }}
              >
                {isLiveSendActive ? 'Confirm & Send Email' : 'Confirm Simulated Outreach'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* New Campaign Modal */}
      <NewCampaignModal
        isOpen={newCampaignOpen}
        isBackendConnected={isBackendConnected}
        onCreateCampaign={createNewCampaign}
        onClose={() => setNewCampaignOpen(false)}
      />

      {/* Help / FAQ Quick Reference Modal */}
      <Modal
        isOpen={helpModalOpen}
        onClose={() => setHelpModalOpen(false)}
        title="Shared Workspace Guide"
        subtitle="MicroReach AI Workflow"
        maxWidthClass="max-w-lg"
      >
        <div className="space-y-3 text-sm text-[#4B5563] leading-relaxed">
          <p>
            <strong className="text-[#111827]">Shared Workspace:</strong> All invited visitors
            share the same campaign pipeline, discovered YouTube creators, AI pitches, and
            outreach logs persisted in Supabase.
          </p>
          <p>
            <strong className="text-[#111827]">Discovery to Outreach:</strong> Open the{' '}
            <strong>Influencers</strong> workspace to run real YouTube Data API v3 discovery, then
            generate 60–90w Email and 15–30w Instagram DM pitches in the AI Pitch Studio.
          </p>
          <div className="flex justify-end pt-2">
            <Button variant="primary" size="sm" onClick={() => setHelpModalOpen(false)}>
              Got It
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
