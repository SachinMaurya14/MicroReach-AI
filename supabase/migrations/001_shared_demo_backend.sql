-- ==============================================================================
-- MicroReach AI — Additive Migration 001: Shared Demo Workspace & Backend Safety
-- Run this SQL in Supabase SQL Editor (Project: microreach.ai, Oceania Sydney).
-- Preserves all 6 existing tables, columns, foreign keys, and RLS policies.
-- ==============================================================================

-- 1. Enrich influencers table with source provenance & engagement calculation metadata
ALTER TABLE public.influencers
  ADD COLUMN IF NOT EXISTS profile_description TEXT,
  ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
  ADD COLUMN IF NOT EXISTS source_retrieved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS engagement_sample_size INTEGER,
  ADD COLUMN IF NOT EXISTS engagement_calculated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS fit_score NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS is_top_pick BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Extend discovery_runs for persisted job progress, quota tracking, and cancellation
ALTER TABLE public.discovery_runs
  ADD COLUMN IF NOT EXISTS params JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS quota_used INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS progress_percent INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT c.conname INTO constraint_name
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON t.relnamespace = n.oid
  WHERE n.nspname = 'public'
    AND t.relname = 'discovery_runs'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%status%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.discovery_runs DROP CONSTRAINT %I', constraint_name);
  END IF;

  ALTER TABLE public.discovery_runs
    ADD CONSTRAINT discovery_runs_status_check
    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3. Extend campaign_influencers to support Needs Review status and source run link
ALTER TABLE public.campaign_influencers
  ADD COLUMN IF NOT EXISTS source_run_id UUID REFERENCES public.discovery_runs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS review_state TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT c.conname INTO constraint_name
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON t.relnamespace = n.oid
  WHERE n.nspname = 'public'
    AND t.relname = 'campaign_influencers'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%qualification_status%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.campaign_influencers DROP CONSTRAINT %I', constraint_name);
  END IF;

  ALTER TABLE public.campaign_influencers
    ADD CONSTRAINT campaign_influencers_qualification_status_check
    CHECK (qualification_status IN ('discovered', 'qualified', 'rejected', 'needs_review'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 4. Add outreach safety, idempotency, and audit columns to outreach_messages & outreach_logs
ALTER TABLE public.outreach_messages
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recipient_email TEXT;

ALTER TABLE public.outreach_logs
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS recipient TEXT,
  ADD COLUMN IF NOT EXISTS message_snapshot TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_outreach_logs_idempotency
  ON public.outreach_logs (campaign_influencer_id, channel, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_outreach_logs_campaign_daily_live
  ON public.outreach_logs (campaign_id, channel, status, created_at)
  WHERE status IN ('sent', 'delivered');

-- 5. Suppression / opt-out table to protect outreach recipients
CREATE TABLE IF NOT EXISTS public.outreach_suppressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.outreach_suppressions ENABLE ROW LEVEL SECURITY;

-- 6. Private encrypted integration credentials table (AES-256-GCM encrypted refresh tokens)
CREATE TABLE IF NOT EXISTS public.integration_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL UNIQUE,
  account_email TEXT,
  encrypted_refresh_token TEXT NOT NULL,
  token_iv TEXT NOT NULL,
  token_auth_tag TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.integration_credentials ENABLE ROW LEVEL SECURITY;

-- 7. Shared workspace audit trail (server-written via secret key)
CREATE TABLE IF NOT EXISTS public.demo_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.demo_audit_logs ENABLE ROW LEVEL SECURITY;

-- Note: Intentionally NO anon INSERT/UPDATE/DELETE policies on any table.
-- All shared-workspace writes are gated by server-side demoSession middleware.
