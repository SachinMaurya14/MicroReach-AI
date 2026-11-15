import React, { useCallback, useEffect, useState } from 'react';
import { BarChart3, Download, Loader2 } from 'lucide-react';
import { WorkspaceModuleShell } from '../../components/app-shell/WorkspaceModuleShell';
import { Button } from '../../components/ui/Button';
import {
  buildCreatorsExportCsvUrl,
  buildMessagesExportCsvUrl,
  buildOutreachLogsExportCsvUrl,
  CampaignDbRow,
  fetchCampaignsApi,
  fetchWorkspaceReportsApi,
  WorkspaceReportApiResponse,
} from '../../services/api/workspaceApi';

export const ReportsPage: React.FC = () => {
  const [campaigns, setCampaigns] = useState<CampaignDbRow[]>([]);
  const [campaignId, setCampaignId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [report, setReport] = useState<WorkspaceReportApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const [camps, rep] = await Promise.all([
        fetchCampaignsApi(true),
        fetchWorkspaceReportsApi({
          campaignId: campaignId || undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
        }),
      ]);
      setCampaigns(camps);
      setReport(rep);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load workspace analytics.');
    } finally {
      setLoading(false);
    }
  }, [campaignId, fromDate, toDate]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  return (
    <WorkspaceModuleShell
      moduleName="Reports"
      currentPath="/dashboard/reports"
      subtitle="Live database-calculated analytics across Discovery, Enrichment, Personalization, and Outreach"
      headerActions={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              window.location.assign(
                buildCreatorsExportCsvUrl({ campaignId: campaignId || undefined })
              )
            }
          >
            <Download className="h-3.5 w-3.5" />
            <span>Creators CSV</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              window.location.assign(
                buildMessagesExportCsvUrl({ campaignId: campaignId || undefined })
              )
            }
          >
            <Download className="h-3.5 w-3.5" />
            <span>Messages CSV</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() =>
              window.location.assign(
                buildOutreachLogsExportCsvUrl(campaignId || undefined)
              )
            }
          >
            <Download className="h-3.5 w-3.5" />
            <span>Outreach Logs CSV</span>
          </Button>
        </div>
      }
    >
      {/* Filters */}
      <section className="rounded-xl border border-[#E5E7EB] bg-white p-4 flex flex-wrap items-center gap-3 text-xs">
        <select
          aria-label="Filter report by campaign"
          value={campaignId}
          onChange={(e) => setCampaignId(e.target.value)}
          className="h-9 rounded-lg border border-[#D1D5DB] bg-white px-2.5"
        >
          <option value="">All Workspace Campaigns</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1.5">
          <span className="text-[#6B7280] font-medium">From:</span>
          <input
            type="date"
            aria-label="From date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-9 rounded-lg border border-[#D1D5DB] px-2"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[#6B7280] font-medium">To:</span>
          <input
            type="date"
            aria-label="To date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-9 rounded-lg border border-[#D1D5DB] px-2"
          />
        </div>

        {report && (
          <span className="ml-auto text-[11px] text-[#6B7280]">
            Calculated from Supabase at {new Date(report.generatedAt).toLocaleTimeString()}
          </span>
        )}
      </section>

      {error && (
        <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-xs font-semibold text-[#991B1B]">
          {error}
        </div>
      )}

      {loading || !report ? (
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-10 text-center text-sm text-[#6B7280]">
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#5B21B6] mb-2" />
          Computing live database metrics...
        </div>
      ) : (
        <div className="space-y-5 mr-tabular">
          {/* Discovery */}
          <section className="rounded-xl border border-[#E5E7EB] bg-white p-5 space-y-4">
            <h2 className="text-sm font-bold text-[#111827] flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4 text-[#5B21B6]" />
              <span>Discovery &amp; Qualification Metrics</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {[
                { label: 'Total Discovered', val: report.discovery.totalCreatorsDiscovered },
                { label: 'YouTube Creators', val: report.discovery.youtubeCreatorsCount },
                { label: 'Instagram Creators', val: report.discovery.instagramCreatorsCount },
                { label: 'Qualified', val: report.discovery.qualifiedCount },
                { label: 'Needs Review', val: report.discovery.needsReviewCount },
                { label: 'Rejected', val: report.discovery.rejectedCount },
                { label: 'Discovery Runs', val: report.discovery.discoveryRunsCount },
              ].map((m) => (
                <div key={m.label} className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                  <p className="text-[11px] font-medium text-[#6B7280]">{m.label}</p>
                  <p className="mt-1 text-xl font-bold text-[#111827]">{m.val}</p>
                </div>
              ))}
            </div>

            {report.discovery.topRejectionReasons.length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-semibold text-[#111827] mb-2">
                  Top Recorded Qualification Reasons
                </p>
                <div className="space-y-1.5 text-xs">
                  {report.discovery.topRejectionReasons.map((r) => (
                    <div
                      key={r.reason}
                      className="flex items-center justify-between rounded-lg bg-[#F9FAFB] border border-[#E5E7EB] px-3 py-2"
                    >
                      <span className="text-[#374151]">{r.reason}</span>
                      <span className="font-bold text-[#111827]">{r.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Enrichment */}
          <section className="rounded-xl border border-[#E5E7EB] bg-white p-5 space-y-4">
            <h2 className="text-sm font-bold text-[#111827]">Enrichment Metrics</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Profiles Enriched', val: report.enrichment.enrichedProfilesCount },
                { label: 'Public Emails Found', val: report.enrichment.creatorsWithEmail },
                { label: 'Emails Not Found', val: report.enrichment.creatorsMissingEmail },
                { label: 'Verified Emails', val: report.enrichment.verifiedEmailsCount },
                { label: 'Websites Found', val: report.enrichment.creatorsWithWebsite },
                { label: 'Themes Extracted', val: report.enrichment.creatorsWithContentThemes },
              ].map((m) => (
                <div key={m.label} className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                  <p className="text-[11px] font-medium text-[#6B7280]">{m.label}</p>
                  <p className="mt-1 text-xl font-bold text-[#111827]">{m.val}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Personalization & Outreach */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <section className="rounded-xl border border-[#E5E7EB] bg-white p-5 space-y-4">
              <h2 className="text-sm font-bold text-[#111827]">AI Personalization Metrics</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Total Generated', val: report.personalization.totalMessagesGenerated },
                  { label: 'Email Drafts', val: report.personalization.emailDraftsCount },
                  { label: 'IG DM Drafts', val: report.personalization.instagramDmDraftsCount },
                  { label: 'Approved', val: report.personalization.approvedMessagesCount },
                  { label: 'Rejected', val: report.personalization.rejectedMessagesCount },
                  { label: 'Sent / Completed', val: report.personalization.sentMessagesCount },
                ].map((m) => (
                  <div
                    key={m.label}
                    className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3"
                  >
                    <p className="text-[11px] font-medium text-[#6B7280]">{m.label}</p>
                    <p className="mt-1 text-xl font-bold text-[#111827]">{m.val}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-[#E5E7EB] bg-white p-5 space-y-4">
              <h2 className="text-sm font-bold text-[#111827]">
                Outreach Metrics (Simulation vs Live Separated)
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Outreach Logs', val: report.outreach.totalOutreachLogs },
                  { label: 'Simulated Emails', val: report.outreach.simulatedEmailsCount },
                  { label: 'Live Gmail Sent', val: report.outreach.liveEmailsSentCount },
                  { label: 'IG DM Ready', val: report.outreach.manualInstagramDmsReadyCount },
                  { label: 'IG DM Manually Sent', val: report.outreach.manualInstagramDmsSentCount },
                  { label: 'Failed / Uncertain', val: report.outreach.failedOrUncertainCount },
                ].map((m) => (
                  <div
                    key={m.label}
                    className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3"
                  >
                    <p className="text-[11px] font-medium text-[#6B7280]">{m.label}</p>
                    <p className="mt-1 text-xl font-bold text-[#111827]">{m.val}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}
    </WorkspaceModuleShell>
  );
};
