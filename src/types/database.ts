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
  | 'completed'
  | 'failed'
  | 'cancelled';
export type OutreachChannel = 'email' | 'instagram_dm';
export type OutreachMessageStatus = 'draft' | 'approved' | 'queued' | 'sent' | 'failed';
export type OutreachLogStatus = 'simulated' | 'sent' | 'delivered' | 'failed' | 'manual';

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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
