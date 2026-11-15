-- MicroReach AI Additive Migration 004: Multi-Platform Personalized Outreach
-- Safe additive migration: never drops or truncates existing production records.

ALTER TABLE public.influencers
  ADD COLUMN IF NOT EXISTS contact_channels JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS preferred_channel TEXT DEFAULT NULL;

ALTER TABLE public.outreach_messages
  DROP CONSTRAINT IF EXISTS outreach_messages_channel_check;

ALTER TABLE public.outreach_messages
  ADD CONSTRAINT outreach_messages_channel_check
  CHECK (channel IN ('email', 'instagram_dm', 'linkedin_message', 'youtube_contact'));

ALTER TABLE public.outreach_messages
  ADD COLUMN IF NOT EXISTS sending_method TEXT DEFAULT 'simulation',
  ADD COLUMN IF NOT EXISTS recipient_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS workflow_status TEXT DEFAULT NULL;

ALTER TABLE public.outreach_logs
  DROP CONSTRAINT IF EXISTS outreach_logs_channel_check;

ALTER TABLE public.outreach_logs
  ADD CONSTRAINT outreach_logs_channel_check
  CHECK (channel IN ('email', 'instagram_dm', 'linkedin_message', 'youtube_contact'));

ALTER TABLE public.outreach_logs
  ADD COLUMN IF NOT EXISTS sending_method TEXT DEFAULT 'simulation',
  ADD COLUMN IF NOT EXISTS recipient_url TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_outreach_messages_link_channel
  ON public.outreach_messages (campaign_influencer_id, channel, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_outreach_logs_link_channel
  ON public.outreach_logs (campaign_influencer_id, channel, created_at DESC);
