# MicroReach AI — APIs and Tools Used

This document records the external APIs, cloud services, libraries, and architectural tools implemented in MicroReach AI.

---

## 1. External APIs & Cloud Services

### 1.1 YouTube Data API v3
- **Purpose**: Automated discovery and profile ingestion of YouTube micro-influencers.
- **Where Used**: `server/services/youtube/youtubeDiscovery.service.ts`
- **Endpoints & Operations**:
  - `GET https://www.googleapis.com/youtube/v3/search` (query-based channel discovery by niche keywords).
  - `GET https://www.googleapis.com/youtube/v3/channels` (channel statistics, subscriber count, country, and bio extraction).
  - `GET https://www.googleapis.com/youtube/v3/playlistItems` & `videos` (recent video engagement sampling for likes/comments).
- **Environment Variable**: `YOUTUBE_API_KEY`
- **Data Retrieved**: Channel title, handle (`customUrl`), subscriber count, video count, country (`snippet.country`), description, video titles, like counts, and comment counts.
- **Limitations & Quotas**: 10,000 units/day standard quota. Video sampling is skipped for channels outside follower range to conserve quota.

### 1.2 Apify Instagram Discovery Actor
- **Purpose**: Headless automated Instagram profile indexing and metrics collection.
- **Where Used**: `server/services/apify/instagramDiscovery.service.ts`
- **Endpoints & Operations**:
  - `POST https://api.apify.com/v2/acts/apify~instagram-scraper/runs` (actor execution).
  - `GET https://api.apify.com/v2/actor-runs/{runId}` (bounded polling with 60s timeout).
  - `GET https://api.apify.com/v2/datasets/{datasetId}/items` (dataset retrieval).
- **Environment Variable**: `APIFY_TOKEN` (or `APIFY_API_TOKEN`)
- **Data Retrieved**: Instagram handle, full name, follower count, bio text, external website URL, verified status, and recent post engagement metrics.
- **Limitations**: Rate-limited by Apify compute units; bounded timeout prevents UI blocking.

### 1.3 Google Gemini Developer API
- **Purpose**: Context-aware multi-channel outreach pitch generation with strict word-count limits.
- **Where Used**: `server/services/gemini/geminiClient.service.ts`, `server/services/gemini/pitchGenerator.service.ts`
- **SDK**: `@google/genai` (v3.3.0)
- **Models Utilized**:
  - Primary: `gemini-3.6-flash`
  - Fallbacks: `gemini-3.5-flash`, `gemini-3.1-flash-lite`
- **Environment Variables**: `GEMINI_API_KEY`, `GEMINI_MODEL`
- **Operations Performed**:
  - Dynamic capability discovery via `ai.models.list()`.
  - Structured content generation with `responseSchema` or natural text completion.
- **Limitations & Guardrails**: 16,000 ms per-request timeout; regex word-count validation enforcing 60–90 words for emails, 15–30 words for Instagram DMs, and 20–75 words for LinkedIn messages.

### 1.4 Google Workspace Gmail OAuth 2.0
- **Purpose**: Authenticated email delivery infrastructure and token exchange.
- **Where Used**: `server/services/gmail/gmailOAuth.service.ts`
- **Scope**: `https://www.googleapis.com/auth/gmail.send`
- **Environment Variables**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `INTEGRATION_ENCRYPTION_KEY`
- **Operations Performed**: HMAC-SHA256 state generation, OAuth token exchange, AES-256-GCM token encryption, RFC 2822 MIME message formatting.
- **Safety Mechanism**: Disabled during testing via `OUTREACH_MODE=simulation`.

### 1.5 Supabase PostgreSQL Database & Auth
- **Purpose**: Persistent storage for campaigns, creator profiles, channel availability, messages, and audit logs.
- **Where Used**: `server/services/supabase/sharedWorkspace.service.ts`, `server/lib/supabaseAdmin.ts`
- **SDK**: `@supabase/supabase-js` (v2.119.0)
- **Environment Variables**: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
- **Tables Used**: `influencers`, `campaigns`, `campaign_influencers`, `outreach_messages`, `outreach_logs`, `outreach_suppressions`, `demo_audit_logs`.
- **Row Level Security**: Fully enabled with authenticated server-side service role access.

---

## 2. Core Libraries & Application Frameworks

| Tool / Library | Version | Role in Architecture |
|---|---|---|
| **React** | 19.0.1 | Modern UI layer utilizing functional components and hooks |
| **TypeScript** | 7.0.2 / 5.8 | End-to-end static type enforcement across client and server |
| **Vite** | 8.3.0 | Fast frontend build tool and module bundler |
| **Tailwind CSS** | 4.3.3 | Utility-first responsive design framework |
| **Express** | 4.21.2 | Node.js REST API server with routing and security middleware |
| **Lucide React** | 0.546.0 | Professional icon system (zero emojis used throughout UI) |
| **dotenv** | 17.2.3 | Environment configuration loader |
