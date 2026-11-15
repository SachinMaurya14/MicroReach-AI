export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed';
export type EmailStatus = 'verified' | 'unverified' | 'not_found';
export type QualificationStatusDb =
  | 'discovered'
  | 'qualified'
  | 'rejected'
  | 'needs_review';
export type DiscoveryRunStatus =
  | 'pending'
  | 'running'
  | 'partial'
  | 'completed'
  | 'failed'
  | 'cancelled';
export type OutreachChannel =
  | 'email'
  | 'instagram_dm'
  | 'linkedin_message'
  | 'youtube_contact';
export type SendingMethod = 'api' | 'manual' | 'simulation';
export type ContactChannelType =
  | 'email'
  | 'instagram'
  | 'linkedin'
  | 'youtube'
  | 'other_contact';
export type ContactVerificationStatus =
  | 'found_publicly'
  | 'user_confirmed'
  | 'unverified'
  | 'not_found';

export interface ContactChannelRecord {
  type: ContactChannelType;
  value: string;
  url: string | null;
  username?: string | null;
  source: string;
  sourceUrl?: string | null;
  verificationStatus: ContactVerificationStatus;
  linkingConfidence: 'primary_profile' | 'explicit_link' | 'user_confirmed';
  evidence?: string | null;
  discoveredAt: string;
}

export interface ChannelAvailabilityItem {
  channel: OutreachChannel;
  label: string;
  available: boolean;
  eligible: boolean;
  sendingMethod: SendingMethod;
  recipientDisplay: string | null;
  recipientUrl: string | null;
  verificationStatus: ContactVerificationStatus;
  unavailableReason: string | null;
  recommendedAlternative: OutreachChannel | null;
  recommendedReason: string | null;
}

export type OutreachMessageStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'rejected';
export type UnifiedOutreachStatus =
  | 'draft'
  | 'ready_for_review'
  | 'approved'
  | 'ready_for_manual_sending'
  | 'simulated'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'skipped';
export type OutreachLogStatus =
  | 'queued'
  | 'simulated'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'manual'
  | 'uncertain';

export interface Database {
  public: {
    Tables: {
      campaigns: {
        Row: {
          id: string;
          owner_id: string | null;
          name: string;
          brand_name: string;
          niche: string;
          target_country: string | null;
          min_followers: number | null;
          max_followers: number | null;
          min_engagement_rate: number | null;
          status: CampaignStatus;
          product_description?: string | null;
          target_platforms?: string[] | null;
          collaboration_type?: string | null;
          campaign_brief?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          target_creator_count?: number | null;
          archived_at?: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string | null;
          name: string;
          brand_name: string;
          niche: string;
          target_country?: string | null;
          min_followers?: number | null;
          max_followers?: number | null;
          min_engagement_rate?: number | null;
          status?: CampaignStatus;
          product_description?: string | null;
          target_platforms?: string[] | null;
          collaboration_type?: string | null;
          campaign_brief?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          target_creator_count?: number | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string | null;
          name?: string;
          brand_name?: string;
          niche?: string;
          target_country?: string | null;
          min_followers?: number | null;
          max_followers?: number | null;
          min_engagement_rate?: number | null;
          status?: CampaignStatus;
          product_description?: string | null;
          target_platforms?: string[] | null;
          collaboration_type?: string | null;
          campaign_brief?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          target_creator_count?: number | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      influencers: {
        Row: {
          id: string;
          owner_id: string | null;
          name: string;
          platform: string;
          profile_url: string;
          username: string | null;
          follower_count: number | null;
          engagement_rate: number | null;
          engagement_source: string | null;
          niche: string | null;
          content_themes: string[] | null;
          contact_email: string | null;
          email_status: EmailStatus;
          website: string | null;
          audience_age: string | null;
          audience_gender: string | null;
          audience_geography: string | null;
          country: string | null;
          data_source: string | null;
          last_verified_at: string | null;
          profile_description?: string | null;
          profile_image_url?: string | null;
          source_retrieved_at?: string | null;
          engagement_sample_size?: number | null;
          engagement_calculated_at?: string | null;
          source_metadata?: Record<string, unknown> | null;
          fit_score?: number | null;
          is_top_pick?: boolean;
          email_source?: string | null;
          enrichment_status?: string | null;
          enriched_at?: string | null;
          content_evidence?: unknown[] | null;
          geography_status?: string | null;
          contact_channels?: ContactChannelRecord[] | null;
          preferred_channel?: OutreachChannel | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string | null;
          name: string;
          platform: string;
          profile_url: string;
          username?: string | null;
          follower_count?: number | null;
          engagement_rate?: number | null;
          engagement_source?: string | null;
          niche?: string | null;
          content_themes?: string[] | null;
          contact_email?: string | null;
          email_status?: EmailStatus;
          website?: string | null;
          audience_age?: string | null;
          audience_gender?: string | null;
          audience_geography?: string | null;
          country?: string | null;
          data_source?: string | null;
          last_verified_at?: string | null;
          profile_description?: string | null;
          profile_image_url?: string | null;
          source_retrieved_at?: string | null;
          engagement_sample_size?: number | null;
          engagement_calculated_at?: string | null;
          source_metadata?: Record<string, unknown> | null;
          fit_score?: number | null;
          is_top_pick?: boolean;
          email_source?: string | null;
          enrichment_status?: string | null;
          enriched_at?: string | null;
          content_evidence?: unknown[] | null;
          geography_status?: string | null;
          contact_channels?: ContactChannelRecord[] | null;
          preferred_channel?: OutreachChannel | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string | null;
          name?: string;
          platform?: string;
          profile_url?: string;
          username?: string | null;
          follower_count?: number | null;
          engagement_rate?: number | null;
          engagement_source?: string | null;
          niche?: string | null;
          content_themes?: string[] | null;
          contact_email?: string | null;
          email_status?: EmailStatus;
          website?: string | null;
          audience_age?: string | null;
          audience_gender?: string | null;
          audience_geography?: string | null;
          country?: string | null;
          data_source?: string | null;
          last_verified_at?: string | null;
          profile_description?: string | null;
          profile_image_url?: string | null;
          source_retrieved_at?: string | null;
          engagement_sample_size?: number | null;
          engagement_calculated_at?: string | null;
          source_metadata?: Record<string, unknown> | null;
          fit_score?: number | null;
          is_top_pick?: boolean;
          email_source?: string | null;
          enrichment_status?: string | null;
          enriched_at?: string | null;
          content_evidence?: unknown[] | null;
          geography_status?: string | null;
          contact_channels?: ContactChannelRecord[] | null;
          preferred_channel?: OutreachChannel | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      campaign_influencers: {
        Row: {
          id: string;
          campaign_id: string;
          influencer_id: string;
          qualification_status: QualificationStatusDb;
          qualification_reason: string | null;
          source_run_id?: string | null;
          review_state?: string | null;
          reviewed_at?: string | null;
          added_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          influencer_id: string;
          qualification_status?: QualificationStatusDb;
          qualification_reason?: string | null;
          source_run_id?: string | null;
          review_state?: string | null;
          reviewed_at?: string | null;
          added_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          influencer_id?: string;
          qualification_status?: QualificationStatusDb;
          qualification_reason?: string | null;
          source_run_id?: string | null;
          review_state?: string | null;
          reviewed_at?: string | null;
          added_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'campaign_influencers_campaign_id_fkey';
            columns: ['campaign_id'];
            isOneToOne: false;
            referencedRelation: 'campaigns';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'campaign_influencers_influencer_id_fkey';
            columns: ['influencer_id'];
            isOneToOne: false;
            referencedRelation: 'influencers';
            referencedColumns: ['id'];
          },
        ];
      };
      discovery_runs: {
        Row: {
          id: string;
          campaign_id: string | null;
          platform: string;
          search_query: string;
          status: DiscoveryRunStatus;
          profiles_found: number | null;
          error_message: string | null;
          started_at: string | null;
          completed_at: string | null;
          params?: Record<string, unknown> | null;
          quota_used?: number;
          progress_percent?: number;
          candidate_count?: number;
          qualified_count?: number;
          rejected_count?: number;
          needs_review_count?: number;
          failure_count?: number;
          last_heartbeat_at?: string | null;
          cancelled_at?: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_id?: string | null;
          platform: string;
          search_query: string;
          status?: DiscoveryRunStatus;
          profiles_found?: number | null;
          error_message?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          params?: Record<string, unknown> | null;
          quota_used?: number;
          progress_percent?: number;
          candidate_count?: number;
          qualified_count?: number;
          rejected_count?: number;
          needs_review_count?: number;
          failure_count?: number;
          last_heartbeat_at?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string | null;
          platform?: string;
          search_query?: string;
          status?: DiscoveryRunStatus;
          profiles_found?: number | null;
          error_message?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          params?: Record<string, unknown> | null;
          quota_used?: number;
          progress_percent?: number;
          candidate_count?: number;
          qualified_count?: number;
          rejected_count?: number;
          needs_review_count?: number;
          failure_count?: number;
          last_heartbeat_at?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'discovery_runs_campaign_id_fkey';
            columns: ['campaign_id'];
            isOneToOne: false;
            referencedRelation: 'campaigns';
            referencedColumns: ['id'];
          },
        ];
      };
      outreach_messages: {
        Row: {
          id: string;
          campaign_influencer_id: string;
          channel: OutreachChannel;
          subject: string | null;
          message_body: string;
          ai_model: string | null;
          word_count: number | null;
          status: OutreachMessageStatus;
          approved_at: string | null;
          idempotency_key?: string | null;
          confirmed_at?: string | null;
          sent_at?: string | null;
          recipient_email?: string | null;
          generation_duration_ms?: number | null;
          personalization_signals?: string[] | null;
          collaboration_type?: string | null;
          rejected_reason?: string | null;
          edit_history?: unknown[] | null;
          sending_method?: SendingMethod | null;
          recipient_url?: string | null;
          workflow_status?: UnifiedOutreachStatus | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_influencer_id: string;
          channel: OutreachChannel;
          subject?: string | null;
          message_body: string;
          ai_model?: string | null;
          word_count?: number | null;
          status?: OutreachMessageStatus;
          approved_at?: string | null;
          idempotency_key?: string | null;
          confirmed_at?: string | null;
          sent_at?: string | null;
          recipient_email?: string | null;
          generation_duration_ms?: number | null;
          personalization_signals?: string[] | null;
          collaboration_type?: string | null;
          rejected_reason?: string | null;
          edit_history?: unknown[] | null;
          sending_method?: SendingMethod | null;
          recipient_url?: string | null;
          workflow_status?: UnifiedOutreachStatus | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campaign_influencer_id?: string;
          channel?: OutreachChannel;
          subject?: string | null;
          message_body?: string;
          ai_model?: string | null;
          word_count?: number | null;
          status?: OutreachMessageStatus;
          approved_at?: string | null;
          idempotency_key?: string | null;
          confirmed_at?: string | null;
          sent_at?: string | null;
          recipient_email?: string | null;
          generation_duration_ms?: number | null;
          personalization_signals?: string[] | null;
          collaboration_type?: string | null;
          rejected_reason?: string | null;
          edit_history?: unknown[] | null;
          sending_method?: SendingMethod | null;
          recipient_url?: string | null;
          workflow_status?: UnifiedOutreachStatus | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'outreach_messages_campaign_influencer_id_fkey';
            columns: ['campaign_influencer_id'];
            isOneToOne: false;
            referencedRelation: 'campaign_influencers';
            referencedColumns: ['id'];
          },
        ];
      };
      outreach_logs: {
        Row: {
          id: string;
          outreach_message_id: string | null;
          campaign_influencer_id: string;
          campaign_id?: string | null;
          channel: OutreachChannel;
          action: string;
          status: OutreachLogStatus;
          provider_message_id: string | null;
          error_message: string | null;
          idempotency_key?: string | null;
          recipient?: string | null;
          message_snapshot?: string | null;
          sending_method?: SendingMethod | null;
          recipient_url?: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          outreach_message_id?: string | null;
          campaign_influencer_id: string;
          campaign_id?: string | null;
          channel: OutreachChannel;
          action: string;
          status: OutreachLogStatus;
          provider_message_id?: string | null;
          error_message?: string | null;
          idempotency_key?: string | null;
          recipient?: string | null;
          message_snapshot?: string | null;
          sending_method?: SendingMethod | null;
          recipient_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          outreach_message_id?: string | null;
          campaign_influencer_id?: string;
          campaign_id?: string | null;
          channel?: OutreachChannel;
          action?: string;
          status?: OutreachLogStatus;
          provider_message_id?: string | null;
          error_message?: string | null;
          idempotency_key?: string | null;
          recipient?: string | null;
          message_snapshot?: string | null;
          sending_method?: SendingMethod | null;
          recipient_url?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'outreach_logs_outreach_message_id_fkey';
            columns: ['outreach_message_id'];
            isOneToOne: false;
            referencedRelation: 'outreach_messages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'outreach_logs_campaign_influencer_id_fkey';
            columns: ['campaign_influencer_id'];
            isOneToOne: false;
            referencedRelation: 'campaign_influencers';
            referencedColumns: ['id'];
          },
        ];
      };
      outreach_suppressions: {
        Row: {
          id: string;
          email: string;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          reason?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      integration_credentials: {
        Row: {
          id: string;
          provider: string;
          account_email: string | null;
          encrypted_refresh_token: string;
          token_iv: string;
          token_auth_tag: string;
          scopes: string[];
          connected_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          provider: string;
          account_email?: string | null;
          encrypted_refresh_token: string;
          token_iv: string;
          token_auth_tag: string;
          scopes?: string[];
          connected_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          provider?: string;
          account_email?: string | null;
          encrypted_refresh_token?: string;
          token_iv?: string;
          token_auth_tag?: string;
          scopes?: string[];
          connected_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      demo_audit_logs: {
        Row: {
          id: string;
          action: string;
          entity_type: string;
          entity_id: string | null;
          details: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          details?: Record<string, unknown>;
          created_at?: string;
        };
        Update: {
          id?: string;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          details?: Record<string, unknown>;
          created_at?: string;
        };
        Relationships: [];
      };
      campaign_content_ideas: {
        Row: {
          id: string;
          campaign_id: string | null;
          influencer_id: string | null;
          title: string;
          format: string;
          angle: string;
          content_themes: string[];
          ai_model: string | null;
          source: string;
          status: 'draft' | 'approved' | 'archived';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id?: string | null;
          influencer_id?: string | null;
          title: string;
          format?: string;
          angle?: string;
          content_themes?: string[];
          ai_model?: string | null;
          source?: string;
          status?: 'draft' | 'approved' | 'archived';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string | null;
          influencer_id?: string | null;
          title?: string;
          format?: string;
          angle?: string;
          content_themes?: string[];
          ai_model?: string | null;
          source?: string;
          status?: 'draft' | 'approved' | 'archived';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      creator_incentives: {
        Row: {
          id: string;
          campaign_id: string | null;
          influencer_id: string | null;
          outreach_log_id: string | null;
          compensation_type: string;
          amount: number | null;
          currency: string;
          commission_percent: number | null;
          deliverables: string | null;
          status: 'planned' | 'offered' | 'accepted' | 'fulfilled' | 'cancelled';
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id?: string | null;
          influencer_id?: string | null;
          outreach_log_id?: string | null;
          compensation_type: string;
          amount?: number | null;
          currency?: string;
          commission_percent?: number | null;
          deliverables?: string | null;
          status?: 'planned' | 'offered' | 'accepted' | 'fulfilled' | 'cancelled';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string | null;
          influencer_id?: string | null;
          outreach_log_id?: string | null;
          compensation_type?: string;
          amount?: number | null;
          currency?: string;
          commission_percent?: number | null;
          deliverables?: string | null;
          status?: 'planned' | 'offered' | 'accepted' | 'fulfilled' | 'cancelled';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      workspace_tasks: {
        Row: {
          id: string;
          campaign_id: string | null;
          influencer_id: string | null;
          outreach_message_id: string | null;
          title: string;
          description: string | null;
          priority: 'low' | 'medium' | 'high';
          status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
          due_date: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id?: string | null;
          influencer_id?: string | null;
          outreach_message_id?: string | null;
          title: string;
          description?: string | null;
          priority?: 'low' | 'medium' | 'high';
          status?: 'todo' | 'in_progress' | 'completed' | 'cancelled';
          due_date?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string | null;
          influencer_id?: string | null;
          outreach_message_id?: string | null;
          title?: string;
          description?: string | null;
          priority?: 'low' | 'medium' | 'high';
          status?: 'todo' | 'in_progress' | 'completed' | 'cancelled';
          due_date?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      workspace_settings: {
        Row: {
          id: string;
          default_outreach_mode: 'simulation' | 'live';
          default_niche: string;
          default_country: string;
          default_min_followers: number;
          default_max_followers: number;
          default_min_engagement: number;
          default_collaboration_type: string;
          require_manual_review_before_send: boolean;
          updated_at: string;
        };
        Insert: {
          id?: string;
          default_outreach_mode?: 'simulation' | 'live';
          default_niche?: string;
          default_country?: string;
          default_min_followers?: number;
          default_max_followers?: number;
          default_min_engagement?: number;
          default_collaboration_type?: string;
          require_manual_review_before_send?: boolean;
          updated_at?: string;
        };
        Update: {
          id?: string;
          default_outreach_mode?: 'simulation' | 'live';
          default_niche?: string;
          default_country?: string;
          default_min_followers?: number;
          default_max_followers?: number;
          default_min_engagement?: number;
          default_collaboration_type?: string;
          require_manual_review_before_send?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      claim_live_email_outreach: {
        Args: {
          p_campaign_influencer_id: string;
          p_campaign_id: string;
          p_outreach_message_id: string;
          p_idempotency_key: string;
          p_recipient: string;
          p_message_snapshot: string;
          p_daily_cap?: number;
        };
        Returns: {
          claimed: boolean;
          conflict_code: string | null;
          log_id: string | null;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type CampaignContentIdeaRow = Database['public']['Tables']['campaign_content_ideas']['Row'];
export type CreatorIncentiveRow = Database['public']['Tables']['creator_incentives']['Row'];
export type WorkspaceTaskRow = Database['public']['Tables']['workspace_tasks']['Row'];
export type WorkspaceSettingsRow = Database['public']['Tables']['workspace_settings']['Row'];

