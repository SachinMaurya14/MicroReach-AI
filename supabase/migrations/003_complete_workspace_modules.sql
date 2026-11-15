-- ==============================================================================
-- MicroReach AI — Additive Migration 003: Complete Workspace Modules & Provenance
-- Run in Supabase SQL Editor after 001_shared_demo_backend.sql and
-- 002_production_workflow_hardening.sql.
-- Safe additive changes only: preserves all existing tables, rows, and RLS.
-- ==============================================================================

-- 1. Extend campaigns with full campaign brief, collaboration defaults, and dates
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS product_description TEXT,
  ADD COLUMN IF NOT EXISTS target_platforms TEXT[] NOT NULL DEFAULT ARRAY['youtube', 'instagram']::TEXT[],
  ADD COLUMN IF NOT EXISTS collaboration_type TEXT NOT NULL DEFAULT 'Sponsorship',
  ADD COLUMN IF NOT EXISTS campaign_brief TEXT,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS target_creator_count INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- 2. Extend influencers with explicit enrichment, provenance, and geography state
ALTER TABLE public.influencers
  ADD COLUMN IF NOT EXISTS email_source TEXT,
  ADD COLUMN IF NOT EXISTS enrichment_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS content_evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS geography_status TEXT NOT NULL DEFAULT 'unknown';

-- 3. Extend outreach_messages with personalization signals, collaboration type, and edit history
ALTER TABLE public.outreach_messages
  ADD COLUMN IF NOT EXISTS personalization_signals JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS collaboration_type TEXT,
  ADD COLUMN IF NOT EXISTS rejected_reason TEXT,
  ADD COLUMN IF NOT EXISTS edit_history JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 4. Campaign content ideas & creative angles table
CREATE TABLE IF NOT EXISTS public.campaign_content_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  influencer_id UUID REFERENCES public.influencers(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'UGC',
  angle TEXT NOT NULL,
  content_themes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ai_model TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_content_ideas_campaign
  ON public.campaign_content_ideas (campaign_id, updated_at DESC);

ALTER TABLE public.campaign_content_ideas ENABLE ROW LEVEL SECURITY;

-- 5. Creator incentives & compensation agreements table
CREATE TABLE IF NOT EXISTS public.creator_incentives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  influencer_id UUID REFERENCES public.influencers(id) ON DELETE CASCADE,
  outreach_log_id UUID REFERENCES public.outreach_logs(id) ON DELETE SET NULL,
  compensation_type TEXT NOT NULL,
  amount NUMERIC(12,2),
  currency TEXT NOT NULL DEFAULT 'INR',
  commission_percent NUMERIC(5,2),
  deliverables TEXT,
  status TEXT NOT NULL DEFAULT 'planned',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creator_incentives_campaign
  ON public.creator_incentives (campaign_id, updated_at DESC);

ALTER TABLE public.creator_incentives ENABLE ROW LEVEL SECURITY;

-- 6. Workspace follow-up & review tasks table
CREATE TABLE IF NOT EXISTS public.workspace_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  influencer_id UUID REFERENCES public.influencers(id) ON DELETE SET NULL,
  outreach_message_id UUID REFERENCES public.outreach_messages(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'todo',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspace_tasks_status_due
  ON public.workspace_tasks (status, due_date ASC NULLS LAST, created_at DESC);

ALTER TABLE public.workspace_tasks ENABLE ROW LEVEL SECURITY;

-- 7. Non-secret workspace preferences table
CREATE TABLE IF NOT EXISTS public.workspace_settings (
  id TEXT PRIMARY KEY DEFAULT 'default_workspace_settings',
  default_outreach_mode TEXT NOT NULL DEFAULT 'simulation',
  default_niche TEXT NOT NULL DEFAULT 'Beauty & Skincare',
  default_country TEXT NOT NULL DEFAULT 'India',
  default_min_followers INTEGER NOT NULL DEFAULT 5000,
  default_max_followers INTEGER NOT NULL DEFAULT 100000,
  default_min_engagement NUMERIC(5,2) NOT NULL DEFAULT 2.0,
  default_collaboration_type TEXT NOT NULL DEFAULT 'Sponsorship',
  require_manual_review_before_send BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;
