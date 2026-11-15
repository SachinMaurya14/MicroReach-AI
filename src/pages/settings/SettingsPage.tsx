import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Save, ShieldCheck } from 'lucide-react';
import { WorkspaceModuleShell } from '../../components/app-shell/WorkspaceModuleShell';
import { Button } from '../../components/ui/Button';
import {
  fetchWorkspaceSettingsApi,
  updateWorkspaceSettingsApi,
} from '../../services/api/workspaceApi';
import { WorkspaceSettingsRow } from '../../types/database';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<WorkspaceSettingsRow | null>(null);
  const [integrations, setIntegrations] = useState<{
    outreachMode: 'simulation' | 'live';
    supabaseConfigured: boolean;
    youtubeConfigured: boolean;
    apifyConfigured: boolean;
    geminiConfigured: boolean;
    geminiModel: string;
    gmailOAuthConfigured: boolean;
    gmailConnected: boolean;
    gmailAccountEmail: string | null;
  } | null>(null);
  const [storageMode, setStorageMode] = useState<'native_table' | 'audit_fallback'>('native_table');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWorkspaceSettingsApi();
      setSettings(res.settings);
      setIntegrations(res.integrations);
      setStorageMode(res.storageMode);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Unable to load workspace settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await updateWorkspaceSettingsApi({
        default_niche: settings.default_niche,
        default_country: settings.default_country,
        default_min_followers: settings.default_min_followers,
        default_max_followers: settings.default_max_followers,
        default_min_engagement: settings.default_min_engagement,
        default_collaboration_type: settings.default_collaboration_type,
        require_manual_review_before_send: settings.require_manual_review_before_send,
      });
      setSettings(updated);
      setNotice('Non-secret workspace default settings saved.');
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Unable to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <WorkspaceModuleShell
      moduleName="Settings"
      currentPath="/dashboard/settings"
      subtitle="Default discovery criteria, outreach safety preferences, and non-secret integration status"
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

      {loading || !settings || !integrations ? (
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-10 text-center text-sm text-[#6B7280]">
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#5B21B6] mb-2" />
          Loading workspace settings...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Editable Non-Secret Preferences */}
          <form
            onSubmit={handleSave}
            className="lg:col-span-2 rounded-xl border border-[#E5E7EB] bg-white p-5 space-y-4 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#111827]">
                Discovery &amp; Qualification Defaults
              </h2>
              <span className="rounded-full bg-[#F3F4F6] px-2.5 py-0.5 text-[10.5px] font-medium text-[#4B5563]">
                Storage: {storageMode}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-[#111827] mb-1">Default Niche</label>
                <input
                  type="text"
                  value={settings.default_niche}
                  onChange={(e) =>
                    setSettings({ ...settings, default_niche: e.target.value })
                  }
                  className="h-9 w-full rounded-lg border border-[#D1D5DB] px-2.5"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#111827] mb-1">
                  Default Target Geography
                </label>
                <input
                  type="text"
                  value={settings.default_country}
                  onChange={(e) =>
                    setSettings({ ...settings, default_country: e.target.value })
                  }
                  className="h-9 w-full rounded-lg border border-[#D1D5DB] px-2.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-[#111827] mb-1">
                  Default Min Followers
                </label>
                <input
                  type="number"
                  min={500}
                  value={settings.default_min_followers}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      default_min_followers: Number(e.target.value) || 5000,
                    })
                  }
                  className="h-9 w-full rounded-lg border border-[#D1D5DB] px-2.5"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#111827] mb-1">
                  Default Max Followers
                </label>
                <input
                  type="number"
                  min={1000}
                  value={settings.default_max_followers}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      default_max_followers: Number(e.target.value) || 100000,
                    })
                  }
                  className="h-9 w-full rounded-lg border border-[#D1D5DB] px-2.5"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#111827] mb-1">
                  Default Min Engagement (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.default_min_engagement}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      default_min_engagement: Number(e.target.value) || 2.0,
                    })
                  }
                  className="h-9 w-full rounded-lg border border-[#D1D5DB] px-2.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-[#111827] mb-1">
                  Default Collaboration Type
                </label>
                <select
                  value={settings.default_collaboration_type}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      default_collaboration_type: e.target.value,
                    })
                  }
                  className="h-9 w-full rounded-lg border border-[#D1D5DB] bg-white px-2.5"
                >
                  <option value="Sponsorship">Sponsorship</option>
                  <option value="Affiliate campaign">Affiliate campaign</option>
                  <option value="UGC creation">UGC creation</option>
                  <option value="Brand ambassador program">Brand ambassador program</option>
                  <option value="Paid product placement">Paid product placement</option>
                  <option value="Barter collaboration">Barter collaboration</option>
                </select>
              </div>
              <div className="flex items-end pb-1">
                <label className="inline-flex items-center gap-2 text-xs font-medium text-[#111827] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.require_manual_review_before_send}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        require_manual_review_before_send: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded border-[#D1D5DB] text-[#5B21B6]"
                  />
                  <span>Require manual human review before sending email</span>
                </label>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button type="submit" variant="primary" size="sm" disabled={saving}>
                <Save className="h-3.5 w-3.5" />
                <span>{saving ? 'Saving...' : 'Save Preferences'}</span>
              </Button>
            </div>
          </form>

          {/* Non-secret Integration Status Summary */}
          <section className="rounded-xl border border-[#E5E7EB] bg-white p-5 space-y-3 shadow-xs h-fit">
            <h2 className="text-sm font-bold text-[#111827] flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-[#5B21B6]" />
              <span>Integration Status (Safe Labels Only)</span>
            </h2>
            <p className="text-[11px] text-[#6B7280]">
              Server secrets remain strictly server-side and are never readable from the browser.
            </p>

            <div className="space-y-2 text-xs">
              {[
                {
                  name: 'Outreach Mode',
                  status:
                    integrations.outreachMode === 'simulation'
                      ? 'Simulation (Safe Default)'
                      : 'Live Mode',
                  ok: true,
                },
                {
                  name: 'Supabase PostgreSQL',
                  status: integrations.supabaseConfigured ? 'Connected' : 'Configuration Missing',
                  ok: integrations.supabaseConfigured,
                },
                {
                  name: 'YouTube Data API v3',
                  status: integrations.youtubeConfigured ? 'Connected' : 'Configuration Missing',
                  ok: integrations.youtubeConfigured,
                },
                {
                  name: 'Apify Instagram Search',
                  status: integrations.apifyConfigured ? 'Connected' : 'Configuration Missing',
                  ok: integrations.apifyConfigured,
                },
                {
                  name: `Gemini AI (${integrations.geminiModel})`,
                  status: integrations.geminiConfigured ? 'Connected' : 'Configuration Missing',
                  ok: integrations.geminiConfigured,
                },
                {
                  name: 'Gmail OAuth 2.0',
                  status: integrations.gmailConnected
                    ? `Connected (${integrations.gmailAccountEmail || 'Authorized'})`
                    : integrations.gmailOAuthConfigured
                      ? 'Not Connected (Optional in Simulation)'
                      : 'Configuration Missing',
                  ok: integrations.gmailConnected || integrations.gmailOAuthConfigured,
                },
              ].map((row) => (
                <div
                  key={row.name}
                  className="flex items-center justify-between rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2"
                >
                  <span className="font-medium text-[#111827]">{row.name}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                      row.ok
                        ? 'bg-[#D1FAE5] text-[#059669]'
                        : 'bg-[#FEE2E2] text-[#DC2626]'
                    }`}
                  >
                    {row.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </WorkspaceModuleShell>
  );
};
