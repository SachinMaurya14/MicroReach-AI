# MicroReach AI — Supabase Integration (Phase 4A)

## Overview

Phase 4A establishes the typed Supabase client, environment validation, database schema types, connection diagnostics, and service layer foundation for the existing MicroReach AI React + TypeScript + Vite application.

- **Project Name**: `microreach.ai`
- **Region**: Oceania (Sydney)
- **Client SDK**: `@supabase/supabase-js`
- **Current UI Mode**: Public landing page (`/`), Main Dashboard (`/dashboard`), and Influencers Discovery (`/dashboard/influencers`) remain in illustrative local demonstration mode until authentication and Row Level Security policies are verified.

## Required Environment Variables

Vite client-side integration uses two environment variables defined in `.env.local` (excluded from Git via `.env*` in `.gitignore`) and documented with empty placeholders in `.env.example`:

- `VITE_SUPABASE_URL`: Your Supabase Project URL from Project Settings -> Data API / API Keys.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: Your Supabase Publishable client key (`sb_publishable_...`) intended for browser use with Row Level Security enabled.

Never place Supabase secret keys, `service_role` keys, or PostgreSQL connection strings in Vite `VITE_*` variables or frontend source files.

## Client Architecture

- `src/lib/supabase/env.ts`: Validates presence and format of `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, returning explicit states (`not_configured`, `configured`, `configuration_error`) and rejecting secret keys.
- `src/lib/supabase/client.ts`: Initializes and exports a single lazy-cached typed `SupabaseClient<Database>` instance (`getSupabaseClient`, `getSupabaseClientState`, `supabase`). Missing or invalid environment values are handled gracefully without crashing the application.

## Existing Database Schema (`public`)

Type definitions in `src/types/database.ts` map to the six existing PostgreSQL tables:

1. `campaigns`
2. `influencers` (unique constraint on `platform` + `profile_url`)
3. `campaign_influencers` (unique constraint on `campaign_id` + `influencer_id`)
4. `discovery_runs`
5. `outreach_messages`
6. `outreach_logs`

## Row Level Security (RLS) & Deferred Authentication

All six tables have Row Level Security enabled, and top-level entities (`campaigns`, `influencers`) scope ownership via `owner_id` referencing `auth.users(id)`.

- **Current Limitation**: Policy creation and verification are not yet confirmed, and authentication (login, signup, session guards) is intentionally deferred to a later phase.
- **No Bypass**: RLS must remain enabled. Anonymous unrestricted policies must not be created.
- **Service Layer Guardrails**: Read methods in `src/services/supabase/` return typed `SupabaseServiceResult<T>` values and surface Postgrest/RLS errors explicitly. Write helpers (`createCampaignGuarded`, `upsertInfluencerGuarded`, `createDiscoveryRunGuarded`, `queueOutreachMessageGuarded`) return `auth_required` until authenticated ownership and policies are verified.

## Connection Diagnostics

`src/lib/supabase/diagnostics.ts` exports `runSupabaseDiagnostics()`, which verifies:

1. Presence of `VITE_SUPABASE_URL`.
2. Presence of `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. Clean initialization of the Supabase client.
4. A strictly read-only query (`campaigns.select('id').limit(1)`).

The diagnostic report separates configuration status from data-access authorization status:

- `empty_or_no_applicable_policy`: Query reached Supabase and returned `0` rows, which is expected when no authenticated session or SELECT policy applies. It does not imply full authorized data access.
- `rls_restricted_or_unauthenticated`: Supabase responded and RLS/auth prevented row access as expected.
- Never inserts, updates, or deletes test records, and never logs credentials.
