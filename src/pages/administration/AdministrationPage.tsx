import React, { useCallback, useEffect, useState } from 'react';
import { Activity, Database, Loader2, RefreshCw } from 'lucide-react';
import { WorkspaceModuleShell } from '../../components/app-shell/WorkspaceModuleShell';
import { Button } from '../../components/ui/Button';
import {
  DiscoveryRunDbRow,
  fetchAdminOverviewApi,
  fetchHealthApi,
  HealthApiResponse,
  OutreachLogDbRow,
} from '../../services/api/workspaceApi';

export const AdministrationPage: React.FC = () => {
  const [health, setHealth] = useState<HealthApiResponse | null>(null);
  const [overview, setOverview] = useState<{
    discoveryRuns: DiscoveryRunDbRow[];
    outreachLogs: OutreachLogDbRow[];
    auditLogs: Array<{
      id: string;
      action: string;
      entity_type: string;
      entity_id: string | null;
      details: Record<string, unknown>;
      created_at: string;
    }>;
    counts: {
      campaigns: number;
      influencers: number;
      messages: number;
      suppressions: number;
    };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDiagnostics = useCallback(async () => {
    setLoading(true);
    try {
      const [h, ov] = await Promise.all([
        fetchHealthApi(),
        fetchAdminOverviewApi().catch(() => null),
      ]);
      setHealth(h);
      setOverview(ov);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to fetch diagnostics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDiagnostics();
  }, [loadDiagnostics]);

  return (
    <WorkspaceModuleShell
      moduleName="Administration"
      currentPath="/dashboard/administration"
      subtitle="Live system health, Supabase schema compatibility, discovery runs, outreach logs, and audit events"
      headerActions={
        <Button variant="secondary" size="sm" onClick={() => void loadDiagnostics()}>
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh Diagnostics</span>
        </Button>
      }
    >
      {error && (
        <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-xs font-semibold text-[#991B1B]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-10 text-center text-sm text-[#6B7280]">
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#5B21B6] mb-2" />
          Running live backend health &amp; schema checks...
        </div>
      ) : (
        <div className="space-y-5 mr-tabular">
          {/* Health Summary */}
          {health && (
            <section className="rounded-xl border border-[#E5E7EB] bg-white p-5 space-y-4">
              <h2 className="text-sm font-bold text-[#111827] flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-[#5B21B6]" />
                <span>Live System Health &amp; Schema Verification</span>
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                  <p className="text-[#6B7280]">Supabase Status</p>
                  <p className="mt-1 font-bold text-[#111827]">{health.supabaseStatus}</p>
                </div>
                <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                  <p className="text-[#6B7280]">Reachable / Core Schema</p>
                  <p className="mt-1 font-bold text-[#111827]">
                    {health.supabaseReachable ? 'Reachable' : 'Unreachable'} /{' '}
                    {health.databaseSchemaCompatible ? 'Compatible' : 'Missing Tables'}
                  </p>
                </div>
                <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                  <p className="text-[#6B7280]">Outreach Mode</p>
                  <p className="mt-1 font-bold text-[#111827] uppercase">{health.outreachMode}</p>
                </div>
                <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                  <p className="text-[#6B7280]">Provider Quota Live API</p>
                  <p className="mt-1 font-bold text-[#111827]">Not Available (Tracked Per Run)</p>
                </div>
              </div>

              {health.missingExtendedTables.length > 0 && (
                <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-3.5 text-xs text-[#92400E]">
                  <p className="font-semibold">
                    Optional Extended Schema Notice: {health.missingExtendedTables.join(', ')} not yet created in Supabase.
                  </p>
                  <p className="mt-1">
                    Workspace modules are operating safely via shared fallback persistence. Run{' '}
                    <code>supabase/migrations/003_complete_workspace_modules.sql</code> in Supabase SQL Editor when ready to enable native tables.
                  </p>
                </div>
              )}
            </section>
          )}

          {/* Counts */}
          {overview && (
            <>
              <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {[
                  { label: 'Stored Campaigns', val: overview.counts.campaigns },
                  { label: 'Stored Creators', val: overview.counts.influencers },
                  { label: 'Generated Messages', val: overview.counts.messages },
                  { label: 'Suppressed Contacts', val: overview.counts.suppressions },
                ].map((c) => (
                  <div key={c.label} className="rounded-xl border border-[#E5E7EB] bg-white p-4">
                    <p className="text-[#6B7280] font-medium flex items-center gap-1.5">
                      <Database className="h-3.5 w-3.5 text-[#5B21B6]" />
                      <span>{c.label}</span>
                    </p>
                    <p className="mt-1 text-2xl font-bold text-[#111827]">{c.val}</p>
                  </div>
                ))}
              </section>

              {/* Discovery Runs */}
              <section className="rounded-xl border border-[#E5E7EB] bg-white overflow-x-auto">
                <div className="px-5 py-3.5 border-b border-[#E5E7EB]">
                  <h2 className="text-sm font-bold text-[#111827]">Recent Discovery Runs</h2>
                </div>
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB] text-[11px] font-semibold uppercase text-[#6B7280]">
                      <th className="py-2.5 px-4">Platform</th>
                      <th className="py-2.5 px-3">Query</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Evaluated</th>
                      <th className="py-2.5 px-3">Quota / Units</th>
                      <th className="py-2.5 px-4">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {overview.discoveryRuns.map((r) => (
                      <tr key={r.id}>
                        <td className="py-2.5 px-4 font-semibold capitalize">{r.platform}</td>
                        <td className="py-2.5 px-3 max-w-[260px] truncate">{r.search_query}</td>
                        <td className="py-2.5 px-3 capitalize">{r.status}</td>
                        <td className="py-2.5 px-3">{r.profiles_found ?? 0}</td>
                        <td className="py-2.5 px-3">{r.quota_used ?? 'Not Available'}</td>
                        <td className="py-2.5 px-4 text-[#6B7280]">
                          {new Date(r.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              {/* Sanitized Audit Logs */}
              <section className="rounded-xl border border-[#E5E7EB] bg-white overflow-x-auto">
                <div className="px-5 py-3.5 border-b border-[#E5E7EB]">
                  <h2 className="text-sm font-bold text-[#111827]">Recent Audit Events</h2>
                </div>
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB] text-[11px] font-semibold uppercase text-[#6B7280]">
                      <th className="py-2.5 px-4">Action</th>
                      <th className="py-2.5 px-3">Entity Type</th>
                      <th className="py-2.5 px-3">Summary</th>
                      <th className="py-2.5 px-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {overview.auditLogs.slice(0, 20).map((a) => (
                      <tr key={a.id}>
                        <td className="py-2.5 px-4 font-semibold">{a.action}</td>
                        <td className="py-2.5 px-3">{a.entity_type}</td>
                        <td className="py-2.5 px-3 max-w-[340px] truncate text-[#4B5563]">
                          {JSON.stringify(a.details)}
                        </td>
                        <td className="py-2.5 px-4 text-[#6B7280]">
                          {new Date(a.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </>
          )}
        </div>
      )}
    </WorkspaceModuleShell>
  );
};
