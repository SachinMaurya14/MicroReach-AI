# MicroReach AI — Shared Workspace & Backend Architecture

## 1. Link-Based Shared Access Model

MicroReach AI exposes the public marketing landing page at `/` and restricts `/dashboard`, `/dashboard/influencers`, and all workspace API routes behind a signed session cookie (`mr_demo_session`).

- No application login, sign-up, or password system is used.
- All invited evaluators share a single workspace backed by `microreach.ai` (Supabase PostgreSQL, Oceania Sydney) with `owner_id = NULL` on shared workspace records.
- **Important Notice:** The invitation URL itself is the access credential. Anyone who receives or forwards the invitation link can view and modify the shared workspace data.

### Invitation URL Format

```text
https://YOUR_DOMAIN/demo-access#token=YOUR_DEMO_ACCESS_TOKEN
```

1. Opening `/demo-access#token=...` extracts the fragment token in the browser, clears the URL fragment via `window.history.replaceState`, and posts the token to `POST /api/demo/access`.
2. The server verifies the token against `DEMO_ACCESS_TOKEN` using SHA-256 constant-time comparison (`crypto.timingSafeEqual`).
3. On success, the server sets an `HttpOnly`, `SameSite=Strict`, `Secure` (in production) HMAC-SHA256 cookie with a 12-hour lifetime and redirects to `/dashboard`.
4. Neither `DEMO_ACCESS_TOKEN` nor `DEMO_SESSION_SECRET` is stored in `localStorage`, `sessionStorage`, or `VITE_*` variables.

### Rotating Access After Evaluation

The signed session key is derived from both `DEMO_SESSION_SECRET` and a SHA-256 digest of `DEMO_ACCESS_TOKEN`.

To revoke all existing invitation links and active evaluator sessions immediately:
1. Generate a new cryptographically random `DEMO_ACCESS_TOKEN` (32+ bytes).
2. Optionally rotate `DEMO_SESSION_SECRET` as well.
3. Update those values in your server environment / AI Studio Secrets and restart the server.

## 2. Database Migration (`supabase/migrations/001_shared_demo_backend.sql`)

All six existing tables (`campaigns`, `influencers`, `campaign_influencers`, `discovery_runs`, `outreach_messages`, `outreach_logs`) keep Row Level Security enabled with zero permissive `anon` policies. Privileged operations run strictly on the server via `server/lib/supabaseAdmin.ts` after `requireDemoSession` and `validateSameOrigin` checks pass.

Before running full live discovery, execute `supabase/migrations/001_shared_demo_backend.sql` in the **Supabase SQL Editor** for `microreach.ai`. It additively adds:
- Creator provenance & top-5 ranking columns (`profile_description`, `profile_image_url`, `source_retrieved_at`, `engagement_sample_size`, `engagement_calculated_at`, `source_metadata`, `fit_score`, `is_top_pick`)
- `discovery_runs` progress, quota, and cancellation columns (`params`, `quota_used`, `progress_percent`, `cancelled_at`)
- `campaign_influencers` `'needs_review'` qualification support
- Outreach safety tables & idempotency indexes (`outreach_suppressions`, `integration_credentials` with AES-256-GCM encrypted refresh tokens, `demo_audit_logs`)

## 3. Required Server-Side Secrets

Configure these in Google AI Studio Secrets (or `.env.local` for local dev; never prefix with `VITE_`):

- `SUPABASE_URL`: `https://zpqhwddhzewkpumemcff.supabase.co`
- `SUPABASE_SECRET_KEY`: `sb_secret_...` from Supabase Project Settings -> API Keys
- `DEMO_ACCESS_TOKEN`: 32+ character random secret used in `#token=...`
- `DEMO_SESSION_SECRET`: 32+ character random HMAC signing secret
- `YOUTUBE_API_KEY`: Google Cloud Console YouTube Data API v3 key
- `GEMINI_API_KEY`: Gemini API key for `@google/genai` (`gemini-4-hydrogen` default)
- `OUTREACH_MODE`: keep `simulation` until Gmail OAuth is explicitly verified
- Optional Live Gmail OAuth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `INTEGRATION_ENCRYPTION_KEY`
