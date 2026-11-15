# MicroReach AI — Vercel Deployment Guide

## 1. Dual-Runtime Architecture (Vercel + Node/Render)

MicroReach AI supports both serverless deployment on **Vercel** and traditional persistent Node.js hosting (such as Render or local development):

- **Shared Express API factory (`server/app.ts`)**: Mounts security headers, JSON parsing, `/api/health`, `/api/demo/*`, `/api/integrations/gmail/callback`, `validateSameOrigin`, `requireDemoSession`, rate limiters, and all workspace API routes.
- **Vercel serverless entry point (`api/index.ts`)**: Exports the Express application (`export default app`) cleanly without `app.listen()`, Vite dev middleware, or `express.static`.
- **Traditional Node / Render / Local entry point (`server.ts`)**: Reuses `createApp()`, attaches Vite dev middleware in development (`npm run dev` -> `tsx server.ts`), serves static `dist/` assets in production (`npm start` -> `node server.ts`), and only calls `app.listen()` when `VERCEL` is not set.
- **Routing & static frontend (`vercel.json`)**:
  - Builds the React + Vite frontend into `dist/` (`npm run build`).
  - Serves static assets from `dist/` via Vercel's CDN.
  - Rewrites `/api/(.*)` to `/api/index.ts`.
  - Rewrites non-API routes `/((?!api(?:/|$)).*)` to `/index.html` for React SPA deep-linking (`/`, `/demo-access`, `/dashboard`, `/dashboard/influencers`).

---

## 2. Vercel Project Settings (`SachinMaurya14/MicroReach-AI`)

When importing `SachinMaurya14/MicroReach-AI` in Vercel:

- **Framework Preset**: `Vite` (or `Other` — `vercel.json` specifies exact build & output settings)
- **Root Directory**: `.` (repository root)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`
- **Node.js Version**: `22.x` (`package.json` specifies `>=22.18.0`)

---

## 3. Environment Variables Required in Vercel

Configure all variables in **Vercel Project -> Settings -> Environment Variables** (for **Production** and **Preview** as needed):

### Public Build-Time Variables (Exposed to Browser Bundle)
- `VITE_SUPABASE_URL` — `https://zpqhwddhzewkpumemcff.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Your Supabase publishable key (`sb_publishable_...`)

### Server-Only Runtime Secrets (NEVER prefix with `VITE_`)
- `SUPABASE_URL` — `https://zpqhwddhzewkpumemcff.supabase.co`
- `SUPABASE_SECRET_KEY` — Your Supabase secret key (`sb_secret_...`)
- `DEMO_ACCESS_TOKEN` — 32+ character random invitation secret
- `DEMO_SESSION_SECRET` — 32+ character random HMAC session signing key
- `YOUTUBE_API_KEY` — Google Cloud YouTube Data API v3 key
- `GEMINI_API_KEY` — Gemini API key for `@google/genai`
- `GEMINI_MODEL` — `gemini-4-hydrogen`
- `OUTREACH_MODE` — `simulation` (keep `simulation` unless live Gmail outreach is explicitly verified and enabled)
- `GOOGLE_CLIENT_ID` — Google Cloud Console OAuth 2.0 Web Client ID
- `GOOGLE_CLIENT_SECRET` — Google Cloud Console OAuth 2.0 Web Client Secret
- `GOOGLE_REDIRECT_URI` — Exact production callback URL:
  ```text
  https://<YOUR_VERCEL_DOMAIN>/api/integrations/gmail/callback
  ```
- `INTEGRATION_ENCRYPTION_KEY` — 32+ char passphrase or 64-char hex key used for AES-256-GCM encryption of stored Gmail OAuth tokens

---

## 4. Google Cloud Console Setup After Vercel Deployment

1. Open **Google Cloud Console -> APIs & Services -> Credentials**.
2. Configure your OAuth 2.0 **Web application** client:
   - **Authorized JavaScript origins**:
     `https://<YOUR_VERCEL_DOMAIN>`
   - **Authorized redirect URIs**:
     `https://<YOUR_VERCEL_DOMAIN>/api/integrations/gmail/callback`
3. Ensure `GOOGLE_REDIRECT_URI` in Vercel matches that redirect URI verbatim, then redeploy so environment updates take effect.

---

## 5. Serverless Limitations & Architectural Safeguards on Vercel

Because Vercel functions are stateless and ephemeral across invocations:

1. **YouTube Discovery Execution (`server/services/youtube/youtubeDiscovery.service.ts`)**:
   - Persistent Node/Render runs discovery asynchronously (`HTTP 202`) while the UI polls `GET /api/discovery/runs/:id`.
   - Vercel terminates background promises after an HTTP response completes. When `VERCEL=1` is detected, `POST /api/discovery/youtube` awaits `executeDiscoveryPipeline` synchronously (with higher concurrency `6` and a `42s` time-budget guard inside `maxDuration: 60`) before returning the finalized `discovery_runs` row.
   - **Plan constraint**: `vercel.json` sets `"maxDuration": 60` on `api/index.ts`. Ensure Fluid Compute / 60s function duration is enabled in your Vercel project settings; if restricted to a strict 10s legacy timeout, large 50-channel discovery batches will hit a serverless timeout before completion.
   - Concurrent run protection uses Supabase (`discovery_runs` active in the last 5 minutes) rather than relying solely on module memory.
2. **Gmail OAuth Token Caching & Storage (`server/services/gmail/gmailOAuth.service.ts`)**:
   - Encrypted refresh tokens are persisted in Supabase (`public.integration_credentials`).
   - Short-lived access tokens are cached AES-256-GCM encrypted in warm serverless memory only as an optimization; cold starts automatically refresh a new access token from Google using the Supabase-persisted encrypted refresh token.
   - OAuth `state` replay protection checks both in-memory nonces and Supabase (`demo_audit_logs` `oauth_state_consumed`) so replay attacks are blocked across separate Vercel instances once migration `001_shared_demo_backend.sql` is applied.
3. **Rate Limiting & Search Caching (`server/middleware/rateLimit.ts`)**:
   - Sliding-window rate limiters and the 10-minute YouTube response cache use in-memory `Map` stores. On Vercel, they apply per warm serverless instance rather than globally across concurrent instances. Adding Redis/Upstash is recommended if strict global rate limiting under heavy load is needed later.
4. **Supabase Migration Required Before Live Use**:
   - Apply `supabase/migrations/001_shared_demo_backend.sql` in the `microreach.ai` Supabase SQL Editor before testing persistence, discovery runs, or Gmail OAuth storage.
