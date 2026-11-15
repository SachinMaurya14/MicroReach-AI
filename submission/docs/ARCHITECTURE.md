# MicroReach AI — System Architecture & Technical Specifications

This document outlines the software architecture, modular boundaries, security controls, and data flow of MicroReach AI.

---

## 1. High-Level Architectural Diagram

```text
[ Browser Client: React 19 + TypeScript + Tailwind CSS ]
                       │
             HTTPS REST / JSON
                       │
                       ▼
[ Express API Server: Node.js 22 Runtime (`server/app.ts`) ]
  ├── Middleware: Rate Limiting, Origin Validation, Session Guard
  ├── Services:
  │   ├── YouTube Discovery (`youtubeDiscovery.service.ts`)
  │   ├── Instagram Discovery (`instagramDiscovery.service.ts`)
  │   ├── Qualification Engine (`qualification.service.ts`)
  │   ├── Email Enrichment & SSRF Guard (`emailEnrichment.service.ts`)
  │   ├── Gemini AI Personalization (`pitchGenerator.service.ts`)
  │   ├── Multi-Channel Outreach Router (`multiChannel.service.ts`)
  │   └── Shared Workspace Repository (`sharedWorkspace.service.ts`)
  │
  ├── External Integrations:
  │   ├── Google Gemini Developer API (`gemini-3.6-flash`)
  │   ├── YouTube Data API v3
  │   ├── Apify Actor (Instagram Scraper)
  │   └── Gmail OAuth 2.0 (`gmail.send`)
  │
  └── Persistence Layer:
      └── Supabase PostgreSQL (Oceania Sydney / Cloud)
          ├── `campaigns` & `influencers`
          ├── `campaign_influencers` & `outreach_messages`
          └── `demo_audit_logs` & `outreach_logs`
```

---

## 2. Directory & Component Organization

- `/src`: Frontend application source
  - `components/`: UI components categorized by feature (Dashboard, Influencer Explorer, AI Pitch Studio, Navigation, Modals).
  - `hooks/`: Custom React hooks (`useDashboardState`, `useInfluencerFilters`, `useApiIntegration`).
  - `types/`: Complete TypeScript interface definitions (`database.ts`, `influencer.ts`, `dashboard.ts`).
  - `services/api/`: Typed API client wrapper with standardized error parsing.
- `/server`: Backend Express application source
  - `config/`: Centralized environment loading and validation (`env.ts`).
  - `middleware/`: Security middleware including rate limiting (`rateLimit.ts`), error mapping (`errorHandler.ts`), and origin validation.
  - `routes/`: Modular REST route handlers (`discovery.routes.ts`, `influencer.routes.ts`, `campaign.routes.ts`, `message.routes.ts`, `workspace.routes.ts`, `health.routes.ts`).
  - `services/`: Encapsulated domain business logic.
  - `utils/`: Data validation, SSRF guard helpers, and CSV sanitization functions.
- `/supabase`: Database migrations (`001` through `004`).
- `/tests`: Automated unit and HTTP route integration tests.
- `/submission`: Official evaluation deliverables, datasets, and summary reports.

---

## 3. Security Architecture & Threat Mitigation

1. **SSRF Mitigation**:
   - The email enrichment module incorporates pre-flight DNS lookups and checks IP addresses against `isPrivateOrBlockedIp()`.
   - Disables implicit HTTP redirects and enforces a 3-hop ceiling with re-validated destination IPs.
2. **Credential Confidentiality**:
   - Private API keys (`GEMINI_API_KEY`, `YOUTUBE_API_KEY`, `APIFY_TOKEN`, `SUPABASE_SECRET_KEY`) reside exclusively server-side.
   - Client bundle never receives secret keys.
3. **Cross-Origin State Protection**:
   - All state-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`) enforce same-origin verification via `validateSameOrigin`.
4. **Token Encryption**:
   - Sensitive OAuth tokens are stored encrypted using AES-256-GCM authenticated encryption with unique initialization vectors (`IV`).
5. **CSV Formula Injection Prevention**:
   - All dynamic strings exported to CSV are checked for dangerous initial characters (`=`, `+`, `-`, `@`) and prefixed with a single quote (`'`) to neutralize spreadsheet command execution.
