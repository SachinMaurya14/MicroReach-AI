# MicroReach AI

Production-oriented Automated Micro-Influencer Outreach System built with React, TypeScript, Vite, Express.js, Supabase PostgreSQL, YouTube Data API v3, Apify Instagram Search Scraper, Google Gemini (`@google/genai`), and Gmail OAuth 2.0.

## 1. Technology Stack & Architecture

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide icons, Vite SPA (`src/app/App.tsx`, `src/pages/*`, `src/hooks/*`, `src/services/api/*`).
- **Backend**: Node.js + Express (`server.ts`, `server/app.ts`, `server/routes/*`, `server/services/*`) with route-specific rate limiting, SSRF protection, and sanitized error handling.
- **Database**: Supabase PostgreSQL (`@supabase/supabase-js` server-side admin client in `server/lib/supabaseAdmin.ts` using `SUPABASE_URL` and `SUPABASE_SECRET_KEY`).
- **Deployment Targets**: Local Node (`tsx server.ts` on port `3000`), Node production (`npm run build && npm start`), and Vercel serverless (`api/index.ts` + `vercel.json`).

## 2. Workspace Modules (Direct Access Enabled)

Public landing page remains at `/`. All workspace CTAs navigate directly to `/dashboard` without invitation-token walls:

- **Dashboard (`/dashboard`)**: Campaign selector, creator table, DB-calculated KPIs, Manual Review modal, Outreach Activity log, and AI Pitch Studio drawer.
- **Influencers (`/dashboard/influencers`)**: Multi-source YouTube + Instagram discovery, qualification filtering (`Qualified`, `Needs Review`, `Rejected`), grid/list views, Profile Enrichment modal (`Enrich / Details`), campaign assignment, and CSV export.
- **Campaigns (`/dashboard/campaigns`)**: Create, edit, archive/restore campaigns, configure follower/engagement bounds and collaboration defaults, and generate Gemini campaign suggestions.
- **Content (`/dashboard/content`)**: Manage campaign creative briefs, collaboration angles, and Gemini-generated content ideas.
- **Incentives (`/dashboard/incentives`)**: Track creator compensation plans (paid sponsorship, fixed fee, barter, affiliate commission, product gifting, UGC fee) without inventing unapproved amounts.
- **Messages (`/dashboard/messages`)**: Filter, inspect, edit, approve, reject, regenerate, copy, follow up, and export personalized emails and Instagram DMs.
- **Reports (`/dashboard/reports`)**: Live Supabase-calculated discovery, enrichment, personalization, and simulation vs. live outreach analytics plus CSV downloads.
- **Tasks (`/dashboard/tasks`)**: Create, prioritize, track, and complete campaign/creator follow-up tasks with completion timestamps.
- **Settings (`/dashboard/settings`)**: Save non-secret discovery/outreach defaults and inspect safe integration statuses.
- **Administration (`/dashboard/administration`)**: Live `/api/health` diagnostics, Supabase table compatibility, discovery runs, outreach logs, and audit history.
- **Help (`/dashboard/help`)**: Operational documentation grounded in actual implemented workflows.

## 3. Discovery, Qualification & Honest Metrics

- **YouTube Data API v3 (`server/services/youtube/youtubeDiscovery.service.ts`)**: Bounded multi-query resumable discovery (`search.list`, `channels.list`, `playlistItems.list`, `videos.list`) up to 60 channels per run.
- **Instagram via Apify (`server/services/apify/instagramDiscovery.service.ts`)**: Bounded `apify~instagram-search-scraper` user discovery up to 30 creators per run.
- **Canonical Deduplication**: Normalizes platform handles and URLs (`profile_url`) before persistence; reports raw counts, unique counts, duplicates, qualified, rejected, and persistence results separately. Persistence failures never discard live API results.
- **Follower & Engagement Rules (`server/services/filtering/qualification.service.ts`)**: Respects the active campaign's configured `min_followers <= followers <= max_followers` (default `5,000–100,000` micro-influencers when unspecified) and `min_engagement_rate`.
  - **YouTube Engagement Formula**: `Average((likes + comments) / subscribers) * 100` across sampled recent public videos, recording sample size, collection date, and availability status. Unavailable/hidden counts are never fabricated as `0%`.
  - **Instagram Engagement**: Uses available recent public post engagement when returned by the provider, or explicitly marks unavailable.
- **Geography Verification**: Separates `Verified` (explicit country metadata matching target), `Likely` (regional/bio signal only — routed to `needs_review` with score cap), and `Unknown`.
- **Classification Codes**: Preserves `PASS` (`qualified`), `FAIL` (`rejected` with explicit reasons), and `REVIEW_REQUIRED` (`needs_review`) across DB and CSV exports.

## 4. Multi-Platform Profile Enrichment (`server/services/enrichment/emailEnrichment.service.ts` & `multiChannel.service.ts`)

- Inspects public YouTube channel descriptions, Instagram bio/business metadata, profile websites, and bounded same-origin `/contact` or `/about` pages.
- **Multi-Platform Contact Discovery**: Extracts and stores public contact channels separately with source and verification status (`email`, `instagram` URL + handle, `linkedin` URL when publicly linked, `youtube` channel URL, `other_contact` URL). Multiple accounts are linked ONLY via explicit profile/website links or explicit user confirmation (`PATCH /api/influencers/:id/channels`) — never matched by similar names alone.
- **Channel Eligibility & Selection**: Evaluates channel availability (`email`, `instagram_dm`, `linkedin_message`, `youtube_contact`) with explicit unavailable reasons and recommended alternatives, plus manual preferred-channel selection.
- **SSRF Defense**: Validates `http`/`https` schemes, blocks localhost/loopback/RFC1918/CGNAT/link-local IPs, checks resolved DNS addresses, validates redirects manually, enforces timeouts and 200KB response caps.
- **Provenance**: Missing emails are strictly saved as `Not Found` (`email_status = 'not_found'`). Found emails retain `email_source` and provenance labels (`Found Publicly`, `Ready for Review`, etc.) without fabricating deliverability verification.
- Missing audience demographics (`audience_age`, `audience_gender`, `audience_geography`) display honestly as `Not Available`.

## 5. Gemini AI Personalization (`server/services/gemini/`)

- Server-side `@google/genai` client (`geminiClient.service.ts`) supporting AI Studio / Vertex Express (`AQ.` keys) and standard Gemini keys via `GEMINI_API_KEY` and `GEMINI_MODEL`.
- Generates structured, fact-grounded drafts per channel:
  - **Collaboration Emails**: `60–90 words` + subject + personalization signals.
  - **Instagram DMs**: `15–30 words`.
  - **LinkedIn Messages**: `20–75 words` (concise professional outreach without fabricating roles or mutual connections).
  - **YouTube Contact Pitches**: `30–90 words` routed via public business email or linked contact pages (never claims automated YouTube DMs).
  - **Follow-up Drafts**, **AI Content Ideas**, **AI Campaign Suggestions**, and **Content Theme Extraction with Evidence**.
- Creator bio/profile inputs are sanitized as untrusted text so scraped content cannot override prompt instructions.

## 6. Outreach Safety, Manual Multi-Platform Workflows & Duplicate Prevention

- **Gmail OAuth Isolation**: `oauthCallbackRateLimiter` applies strictly to Gmail OAuth callback GET endpoints (`server/routes/integration.routes.ts`) so Gmail connection issues never interfere with discovery or workspace routes.
- **Simulation Default**: `OUTREACH_MODE=simulation` logs deterministic simulated outreach without sending real emails.
- **Eligibility Guard**: Creators with `Not Found` or invalid email addresses are blocked from both simulated and live email queues (`checkEmailEligibility`).
- **Live Email Sending**: Requires `OUTREACH_MODE=live`, authorized Gmail OAuth (`gmail.send` scope, AES-256-GCM encrypted refresh tokens in `integration_credentials`), verified email status, approved draft, and atomic PostgreSQL claim (`claim_live_email_outreach` RPC) with daily campaign caps.
- **Manual Multi-Platform Workflows (Instagram DM, LinkedIn Message, YouTube Contact)**: Official Meta IG Messaging API, LinkedIn Messaging API, and YouTube DM APIs are not configured/available. Copying message text or opening a profile link never marks outreach as sent; operators explicitly transition status (`ready_for_manual_sending` -> `manually_sent` / `skipped` / `failed`) via `POST /api/outreach/manual-channel`, with strict duplicate-send prevention per `(campaign_influencer_id, channel)`.
- **CSV Injection Protection**: All exports (`GET /api/influencers/export.csv`, `GET /api/messages/export.csv`, `GET /api/outreach/logs/export.csv`) neutralize formula prefixes (`=`, `+`, `-`, `@`, tab, CR).

## 7. Environment Variables & Setup

Never commit real secret values. Required server environment variables:

- `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`)
- `YOUTUBE_API_KEY`
- `APIFY_TOKEN` (or `APIFY_API_TOKEN`)
- `GEMINI_API_KEY`, `GEMINI_MODEL` (optional override; defaults safely)
- `OUTREACH_MODE` (`simulation` default)
- `INTEGRATION_ENCRYPTION_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` (for optional live Gmail OAuth)
- `APP_URL`

Apply SQL migrations in order in Supabase SQL Editor (additive only; never drops production records):

1. `supabase/migrations/001_shared_demo_backend.sql`
2. `supabase/migrations/002_production_workflow_hardening.sql`
3. `supabase/migrations/003_complete_workspace_modules.sql`
4. `supabase/migrations/004_multi_platform_outreach.sql`

If `003` or `004` have not yet been applied to a Supabase project, extended workspace modules (Content, Incentives, Tasks, Settings) and multi-channel LinkedIn/YouTube messages operate cleanly via additive fallback storage on `demo_audit_logs` and Administration surfaces a clear notice.

## 8. Commands & Verification

```bash
npm install
npm run lint
npm test
npm run build
npm run dev
```

## 9. Limitations & Security Notes

- Audience age, gender, and audience country breakdowns are marked `Not Available` because public creator search APIs do not expose private creator analytics without authenticated creator OAuth.
- Live email sending stays disabled while `OUTREACH_MODE=simulation`.
- Server secrets are never exposed to `VITE_*` client bundles or API diagnostic responses.
