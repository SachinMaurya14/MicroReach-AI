-- ==============================================================================
-- MicroReach AI — Additive Migration 002: Production Workflow & Atomicity Hardening
-- Run in Supabase SQL Editor after 001_shared_demo_backend.sql.
-- Preserves all existing tables, rows, foreign keys, and RLS protections.
-- ==============================================================================

-- 1. Extend discovery_runs with partial status, accurate telemetry counters, and heartbeat
ALTER TABLE public.discovery_runs
  ADD COLUMN IF NOT EXISTS candidate_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qualified_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rejected_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS needs_review_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failure_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ;

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
    CHECK (status IN ('pending', 'running', 'partial', 'completed', 'failed', 'cancelled'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Extend outreach_messages with generation duration telemetry and complete workflow states
ALTER TABLE public.outreach_messages
  ADD COLUMN IF NOT EXISTS generation_duration_ms INTEGER;

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT c.conname INTO constraint_name
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON t.relnamespace = n.oid
  WHERE n.nspname = 'public'
    AND t.relname = 'outreach_messages'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%status%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.outreach_messages DROP CONSTRAINT %I', constraint_name);
  END IF;

  ALTER TABLE public.outreach_messages
    ADD CONSTRAINT outreach_messages_status_check
    CHECK (status IN ('draft', 'pending_review', 'approved', 'queued', 'sent', 'delivered', 'failed', 'rejected'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3. Extend outreach_logs states and enforce database-level atomic duplicate-send protection
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT c.conname INTO constraint_name
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON t.relnamespace = n.oid
  WHERE n.nspname = 'public'
    AND t.relname = 'outreach_logs'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%status%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.outreach_logs DROP CONSTRAINT %I', constraint_name);
  END IF;

  ALTER TABLE public.outreach_logs
    ADD CONSTRAINT outreach_logs_status_check
    CHECK (status IN ('queued', 'simulated', 'sent', 'delivered', 'failed', 'manual', 'uncertain'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Guarantee at most one active/completed live email outreach record per campaign_influencer
CREATE UNIQUE INDEX IF NOT EXISTS idx_outreach_logs_unique_live_email_claim
  ON public.outreach_logs (campaign_influencer_id, channel)
  WHERE channel = 'email' AND status IN ('queued', 'sent', 'delivered', 'uncertain');

-- 4. Atomic live-email claim RPC (checks suppression, duplicates, and daily UTC cap under lock)
CREATE OR REPLACE FUNCTION public.claim_live_email_outreach(
  p_campaign_influencer_id UUID,
  p_campaign_id UUID,
  p_outreach_message_id UUID,
  p_idempotency_key TEXT,
  p_recipient TEXT,
  p_message_snapshot TEXT,
  p_daily_cap INTEGER DEFAULT 5
)
RETURNS TABLE (
  claimed BOOLEAN,
  conflict_code TEXT,
  log_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_utc_day_start TIMESTAMPTZ := date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  v_daily_count INTEGER;
  v_new_log_id UUID;
BEGIN
  -- Serialize live send claims per campaign inside this transaction
  PERFORM pg_advisory_xact_lock(hashtext('live_outreach:' || p_campaign_id::text));

  IF EXISTS (
    SELECT 1 FROM public.outreach_suppressions s
    WHERE lower(s.email) = lower(p_recipient)
  ) THEN
    RETURN QUERY SELECT FALSE, 'recipient_suppressed'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.outreach_logs l
    WHERE l.campaign_influencer_id = p_campaign_influencer_id
      AND l.channel = 'email'
      AND l.status IN ('queued', 'sent', 'delivered', 'uncertain')
  ) THEN
    RETURN QUERY SELECT FALSE, 'duplicate_send_prevented'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_daily_count
  FROM public.outreach_logs l
  JOIN public.campaign_influencers ci ON ci.id = l.campaign_influencer_id
  WHERE ci.campaign_id = p_campaign_id
    AND l.channel = 'email'
    AND l.status IN ('queued', 'sent', 'delivered', 'uncertain')
    AND l.created_at >= v_utc_day_start;

  IF v_daily_count >= p_daily_cap THEN
    RETURN QUERY SELECT FALSE, 'daily_campaign_send_cap_reached'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  INSERT INTO public.outreach_logs (
    outreach_message_id,
    campaign_influencer_id,
    campaign_id,
    channel,
    action,
    status,
    idempotency_key,
    recipient,
    message_snapshot
  )
  VALUES (
    p_outreach_message_id,
    p_campaign_influencer_id,
    p_campaign_id,
    'email',
    'send_gmail_live_claim',
    'queued',
    p_idempotency_key,
    p_recipient,
    p_message_snapshot
  )
  RETURNING id INTO v_new_log_id;

  RETURN QUERY SELECT TRUE, NULL::TEXT, v_new_log_id;
EXCEPTION
  WHEN unique_violation THEN
    RETURN QUERY SELECT FALSE, 'duplicate_send_prevented'::TEXT, NULL::UUID;
END;
$$;
