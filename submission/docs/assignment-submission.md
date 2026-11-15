# MicroReach AI — Assignment Submission & Production Readiness Guide

## 1. Architecture Summary

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS (`src/pages/*`, `src/hooks/*`, `src/components/*`).
- **Backend**: Express.js factory (`server/app.ts`) running via `server.ts` (local dev & Node/Render production) and `api/index.ts` (Vercel serverless).
- **Database**: Supabase PostgreSQL (`supabase/migrations/001_shared_demo_backend.sql` and `002_production_workflow_hardening.sql`), with Row Level Security enabled and zero permissive anonymous policies. All database writes flow through authenticated Express endpoints using the server-side `SUPABASE_SECRET_KEY`.
- **Integrations**:
  - YouTube Data API v3 (`server/services/youtube/youtubeDiscovery.service.ts`)
  - Gemini API via `@google/genai` (`server/services/gemini/pitchGenerator.service.ts`)
  - Gmail API OAuth 2.0 `gmail.send` (`server/services/gmail/gmailOAuth.service.ts`)

## 2. Database Migrations Checklist

Execute both files sequentially in the Supabase SQL Editor for project `microreach.ai`:

1. `supabase/migrations/001_shared_demo_backend.sql` — Additive columns for provenance, `fit_score`, `is_top_pick`, `discovery_runs` progress, `outreach_suppressions`, `integration_credentials`, and `demo_audit_logs`.
2. `supabase/migrations/002_production_workflow_hardening.sql` — Adds `discovery_runs` telemetry counters (`candidate_count`, `qualified_count`, `rejected_count`, `needs_review_count`, `failure_count`, `last_heartbeat_at`) and `'partial'` status; adds `outreach_messages.generation_duration_ms`; adds partial unique claim index on `outreach_logs` and the atomic `public.claim_live_email_outreach(...)` RPC.

## 3. Data Integrity & Security Controls

- **Truthful Creator Data**: No fabricated creators, emails, or engagement values. Missing metrics or unavailable demographics display as `Unavailable` / `Not Available` / `Not Found`.
- **Geography Verification**: Only explicit YouTube `snippet.country` metadata is treated as verified country. Channels lacking structured country metadata default to `needs_review`.
- **Email Verification State**: Publicly extracted emails are stored as `unverified` (`Publicly listed (unverified)`) until manually confirmed as `verified` during review.
- **SSRF Protection**: Website email enrichment resolves DNS records, rejects private/loopback/CGNAT/link-local IPs, disables implicit redirects (`redirect: 'manual'`, max 3 revalidated hops), and caps response reads at 200KB.
- **Invitation Access & CSRF**: Shared workspace endpoints require an `HttpOnly`, `SameSite=Strict` HMAC-SHA256 cookie (`mr_demo_session`) issued after constant-time verification of `DEMO_ACCESS_TOKEN`, combined with `validateSameOrigin` enforcement and rate limiting.
- **Outreach Safety**: Default `OUTREACH_MODE=simulation`. Live Gmail sends require `OUTREACH_MODE=live`, connected OAuth credentials, `qualified` status, `verified` email status, approved message state, suppression clearance, explicit user confirmation, and atomic DB pre-claim enforcing the 5-email/campaign/day cap.

## 4. Verification Commands

- `npm run lint`: TypeScript type check (`tsc --noEmit`).
- `npm test`: Automated unit and HTTP route contract tests (`tests/core-workflows.test.ts`, `tests/api-routes.test.ts`).
- `npm run test:smoke`: Non-destructive read-only smoke test against `http://127.0.0.1:3000` or `--url https://microreach-ai.vercel.app`.
- `npm run build`: Production Vite bundle verification (`dist/`).
