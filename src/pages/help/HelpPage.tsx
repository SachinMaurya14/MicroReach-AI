import React from 'react';
import { HelpCircle } from 'lucide-react';
import { WorkspaceModuleShell } from '../../components/app-shell/WorkspaceModuleShell';

const HELP_SECTIONS = [
  {
    title: '1. Creating a Campaign & Discovery Criteria',
    body: 'Open Campaigns or click New Campaign on Dashboard to configure Brand Name, Niche, Geography, Follower Bounds (default 5,000–100,000 micro-influencers, or explicit campaign bounds like 5,000–10,000), Minimum Engagement %, Product Description, and Collaboration Type. Both discovery and qualification strictly respect the active campaign bounds without silently overriding them.',
  },
  {
    title: '2. Multi-Source Discovery (YouTube & Instagram)',
    body: 'On the Influencers page, choose All Platforms (runs bounded YouTube Data API v3 + Apify instagram-search-scraper batches), YouTube only, or Instagram only, then click Find Influencers. Duplicate channels/handles are deduplicated by canonical profile URL before persistence. Rejected and Needs Review creators are retained with explicit qualification reasons.',
  },
  {
    title: '3. Engagement & Geography Verification',
    body: 'YouTube engagement is estimated from sampled recent videos: Average((likes + comments) / subscribers) x 100, alongside video sample count and methodology. Instagram engagement uses available recent public post likes/comments or explicitly marks metrics unavailable when Apify omits post-level data. Geography separates Verified (explicit country match) from Likely (bio/text cue) and Unknown.',
  },
  {
    title: '4. Public Contact & Content Enrichment',
    body: 'Click Enrich / Details on any creator card or table row to run SSRF-protected bounded enrichment across public channel/profile descriptions, profile website links, and same-origin /contact pages. Missing emails are stored strictly as Not Found and never guessed.',
  },
  {
    title: '5. Gemini AI Personalization & Human Review',
    body: 'In Dashboard AI Pitch Studio or the Messages module, select a collaboration type and click Regenerate Draft to generate a 60–90 word collaboration email and a 15–30 word Instagram DM grounded strictly in real creator themes and campaign details. Inspect, edit, approve, reject, or generate a follow-up draft before outreach.',
  },
  {
    title: '6. Simulation vs Live Gmail & Manual Instagram DM',
    body: 'OUTREACH_MODE defaults to simulation, logging approved messages safely without sending real emails. Creators with Not Found emails are automatically blocked from the email send/simulation queue. For Instagram DMs, copying the message or opening the creator profile never marks a DM as sent; use Mark Ready and Confirm Manually Sent only after sending manually.',
  },
  {
    title: '7. Duplicate Prevention, Suppressions & CSV Exports',
    body: 'Atomic idempotency keys prevent duplicate sends for the same campaign, creator, and channel. Add opt-out addresses to Suppressions to block future outreach. Export formula-injection-safe CSVs for Creators (including rejected creators), Messages, and Outreach Logs from Influencers, Dashboard, Messages, or Reports.',
  },
];

export const HelpPage: React.FC = () => {
  return (
    <WorkspaceModuleShell
      moduleName="Help"
      currentPath="/dashboard/help"
      subtitle="Accurate operational guide for MicroReach AI discovery, qualification, enrichment, AI outreach, and troubleshooting"
    >
      <section className="rounded-xl border border-[#E5E7EB] bg-white p-6 space-y-5 shadow-xs">
        <div className="flex items-start gap-3 pb-4 border-b border-[#E5E7EB]">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EDE9FE] text-[#5B21B6]">
            <HelpCircle className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-lg font-bold text-[#111827]">
              MicroReach AI — Operational Documentation
            </h1>
            <p className="mt-1 text-xs text-[#6B7280]">
              Covers end-to-end production workflows implemented in this workspace.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {HELP_SECTIONS.map((sec) => (
            <article
              key={sec.title}
              className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 space-y-1.5"
            >
              <h2 className="text-sm font-bold text-[#111827]">{sec.title}</h2>
              <p className="text-xs leading-relaxed text-[#4B5563]">{sec.body}</p>
            </article>
          ))}
        </div>

        <div className="rounded-xl border border-[#DDD6FE] bg-[#F5F3FF] p-4 text-xs text-[#4B5563] space-y-1">
          <p className="font-bold text-[#5B21B6]">Troubleshooting Quick Reference</p>
          <p>
            Required server secrets: <code>SUPABASE_URL</code>, <code>SUPABASE_SECRET_KEY</code>,{' '}
            <code>YOUTUBE_API_KEY</code>, <code>APIFY_TOKEN</code>, <code>GEMINI_API_KEY</code>, and optional{' '}
            <code>GOOGLE_CLIENT_ID</code> / <code>GOOGLE_CLIENT_SECRET</code> for live Gmail mode.
          </p>
          <p>
            Check live status and any optional SQL migration notices in{' '}
            <strong>Administration</strong> or <code>GET /api/health</code>.
          </p>
        </div>
      </section>
    </WorkspaceModuleShell>
  );
};
