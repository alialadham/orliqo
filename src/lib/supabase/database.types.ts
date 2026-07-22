export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type WorkspaceRole =
  | "owner"
  | "administrator"
  | "campaign_manager"
  | "sales_representative"
  | "viewer";

type TableDefinition<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

type BusinessProfileRow = {
  id: string; workspace_id: string; company_name: string; website_url: string | null;
  industry: string | null; country: string | null; city: string | null; company_size: string | null;
  employee_range: string | null; description: string | null; logo_url: string | null;
  instagram_url: string | null; linkedin_url: string | null; whatsapp_number: string | null;
  main_service: string | null; additional_services: Json; average_project_value: number | null;
  currency: string; pricing_model: string | null; sales_cycle: string | null;
  main_customer_problem: string | null; competitive_advantage: string | null;
  default_cta: string | null; custom_cta: string | null; brand_tone: string | null;
  target_industry_summary: string | null; selling_points: Json; channel_preferences: Json;
  campaign_defaults: Json; onboarding_completed: boolean; onboarding_step: number;
  imported_from_website_at: string | null; created_at: string; updated_at: string;
};

type IcpRow = {
  id: string; workspace_id: string; name: string; natural_language_description: string | null;
  summary: string | null; countries: string[]; cities: string[]; industries: string[];
  company_sizes: string[]; employee_min: number | null; employee_max: number | null;
  revenue_min: number | null; revenue_max: number | null; business_age_min: number | null;
  business_age_max: number | null; website_statuses: string[]; social_activity_min: number | null;
  review_count_min: number | null; keywords: string[]; excluded_industries: string[];
  excluded_companies: string[]; contact_requirements: Json; minimum_score: number; active: boolean;
  is_default: boolean; audience_breadth: "narrow" | "balanced" | "broad";
  archived_at: string | null; duplicated_from_id: string | null; created_at: string; updated_at: string;
};

type LeadRow = {
  id: string; workspace_id: string; business_name: string; legal_name: string | null; logo_url: string | null;
  industry: string | null; category: string | null; description: string | null; country: string | null;
  city: string | null; address: string | null; website_url: string | null; website_status: string;
  website_status_confidence: string; email: string | null; email_verification_status: string;
  phone: string | null; phone_verification_status: string; whatsapp_available: boolean | null;
  whatsapp_consent_status: string; instagram_url: string | null; facebook_url: string | null;
  linkedin_url: string | null; review_count: number | null; average_rating: number | null;
  social_activity_score: number | null; employee_estimate: number | null; revenue_estimate: number | null;
  services: Json; qualification_score: number | null; qualification_reason: string | null;
  suggested_opportunity: string | null; recommended_channel: string | null; personalization_angle: string | null;
  status: string; do_not_contact: boolean; do_not_contact_reason: string | null; assigned_to: string | null;
  first_contacted_at: string | null; last_contacted_at: string | null; last_replied_at: string | null;
  created_by: string | null; normalized_domain: string | null; normalized_email: string | null;
  normalized_phone: string | null; normalized_business_city: string | null; normalized_instagram_url: string | null;
  normalized_facebook_url: string | null; normalized_linkedin_url: string | null; domain_fingerprint: string | null;
  email_fingerprint: string | null; phone_fingerprint: string | null; business_city_fingerprint: string | null;
  instagram_fingerprint: string | null; facebook_fingerprint: string | null; linkedin_fingerprint: string | null;
  created_at: string; updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          avatar_url: string | null;
          locale: string;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          avatar_url?: string | null;
          locale?: string;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      workspaces: {
        Row: {
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          country: string | null;
          city: string | null;
          timezone: string;
          default_language: string;
          currency: string;
          status: "active" | "suspended" | "deleted";
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          logo_url?: string | null;
          country?: string | null;
          city?: string | null;
          timezone?: string;
          default_language?: string;
          currency?: string;
          status?: "active" | "suspended" | "deleted";
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["workspaces"]["Insert"]>;
        Relationships: [];
      };
      workspace_members: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          role: WorkspaceRole;
          status: "invited" | "active" | "suspended";
          invited_by: string | null;
          joined_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          role: WorkspaceRole;
          status?: "invited" | "active" | "suspended";
          invited_by?: string | null;
          joined_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["workspace_members"]["Insert"]>;
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          workspace_id: string;
          plan: "starter" | "growth" | "agency" | "trial" | "none";
          status: string;
          current_period_end: string | null;
          trial_ends_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          plan?: "starter" | "growth" | "agency" | "trial" | "none";
          status?: string;
          current_period_end?: string | null;
          trial_ends_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["subscriptions"]["Insert"]>;
        Relationships: [];
      };
      business_profiles: TableDefinition<BusinessProfileRow>;
      workspace_settings: TableDefinition<{
        workspace_id: string; branding: Json; ai: Json; sending: Json; compliance: Json; security: Json;
        feature_flags: Json; pause_all: boolean; emergency_kill_switch: boolean; created_at: string; updated_at: string;
      }>;
      ideal_customer_profiles: TableDefinition<IcpRow>;
      website_imports: TableDefinition<{
        id: string; workspace_id: string; business_profile_id: string; requested_url: string; normalized_url: string;
        status: string; job_run_id: string | null; requested_by: string; started_at: string | null;
        completed_at: string | null; error_code: string | null; error_message: string | null;
        provider: string; model: string; prompt_version: string; usage_metadata: Json;
        source_retrieved_at: string | null; created_at: string; updated_at: string;
      }>;
      website_import_suggestions: TableDefinition<{
        id: string; workspace_id: string; website_import_id: string; field_name: string;
        suggested_value: Json; source_url: string; citation_text: string | null; confidence: string;
        decision: string; decided_by: string | null; decided_at: string | null; retrieved_at: string;
        provider: string; model: string; prompt_version: string; created_at: string; updated_at: string;
      }>;
      leads: TableDefinition<LeadRow>;
      lead_sources: TableDefinition<{
        id: string; workspace_id: string; lead_id: string; source_type: string; source_url: string;
        source_title: string | null; source_domain: string | null; extracted_data: Json; retrieved_at: string;
        confidence: string; allowed_for_automated_use: boolean; citation_text: string | null;
        content_hash: string; created_at: string; updated_at: string;
      }>;
      lead_field_evidence: TableDefinition<{
        id: string; workspace_id: string; lead_id: string; field_name: string; value: Json;
        confidence: string; source_id: string | null; verified_at: string | null; verification_method: string | null;
        created_at: string; updated_at: string;
      }>;
      lead_score_components: TableDefinition<{
        id: string; workspace_id: string; lead_id: string; campaign_id: string | null;
        icp_fit: number; location_fit: number; industry_fit: number; website_opportunity: number;
        social_activity: number; reviews: number; contact_availability: number; verification: number;
        size_fit: number; buying_signals: number; exclusion_penalty: number; confidence: number;
        total_score: number; explanation: string; model_version: string; rule_version: string;
        created_at: string; updated_at: string;
      }>;
      lead_notes: TableDefinition<{
        id: string; workspace_id: string; lead_id: string; author_id: string; content: string;
        pinned: boolean; mentioned_user_ids: string[]; deleted_at: string | null; created_at: string; updated_at: string;
      }>;
      lead_activities: TableDefinition<{
        id: string; workspace_id: string; lead_id: string; campaign_id: string | null; actor_type: string;
        actor_id: string | null; event_type: string; summary: string; metadata: Json; created_at: string;
      }>;
      tags: TableDefinition<{ id: string; workspace_id: string; name: string; color_token: string; created_at: string; updated_at: string }>;
      lead_tags: TableDefinition<{ workspace_id: string; lead_id: string; tag_id: string; created_by: string | null; created_at: string }>;
      saved_views: TableDefinition<{
        id: string; workspace_id: string; owner_id: string; entity_type: string; name: string;
        filters: Json; sorting: Json; visible_columns: Json; shared: boolean; created_at: string; updated_at: string;
      }>;
      suppression_entries: TableDefinition<{
        id: string; workspace_id: string; type: string; normalized_value: string; reason: string; source: string;
        created_by: string | null; lead_id: string | null; expires_at: string | null; created_at: string; updated_at: string;
      }>;
      import_jobs: TableDefinition<{
        id: string; workspace_id: string; source_type: string; storage_object_path: string; mapping: Json; status: string;
        total_rows: number; valid_rows: number; duplicate_rows: number; imported_rows: number; updated_rows: number;
        skipped_rows: number; invalid_rows: number; suppressed_rows: number; import_options: Json;
        requested_by: string; job_run_id: string | null; errors: Json; created_at: string; updated_at: string;
      }>;
      import_rows: TableDefinition<{
        id: string; workspace_id: string; import_job_id: string; row_number: number; raw_data: Json;
        mapped_data: Json; normalized_data: Json; validation_errors: Json; duplicate_lead_id: string | null;
        decision: string; created_at: string; updated_at: string;
      }>;
      job_runs: TableDefinition<{
        id: string; workspace_id: string; inngest_run_id: string | null; inngest_function_id: string | null;
        inngest_event_id: string | null; job_type: string; entity_type: string | null; entity_id: string | null;
        status: string; attempt: number; idempotency_key: string | null; progress: Json; correlation_id: string;
        scheduled_at: string | null; started_at: string | null; completed_at: string | null; retryable: boolean;
        error_code: string | null; error_message: string | null; dead_lettered_at: string | null;
        created_at: string; updated_at: string;
      }>;
      audit_logs: TableDefinition<{
        id: string; workspace_id: string; actor_id: string | null; actor_type: string; action: string;
        entity_type: string; entity_id: string | null; before_state: Json; after_state: Json;
        ip_hash: string | null; user_agent: string | null; correlation_id: string | null; created_at: string;
      }>;
    };
    Views: {
      workspace_teammates: { Row: { workspace_id: string; user_id: string; full_name: string; avatar_url: string | null; role: WorkspaceRole; status: string; joined_at: string | null }; Relationships: [] };
    };
    Functions: {
      suppress_lead: { Args: { target_lead_id: string; suppression_reason: string; suppression_origin?: string }; Returns: boolean };
      restore_suppressed_lead: { Args: { target_lead_id: string }; Returns: boolean };
    };
    Enums: {
      workspace_role: WorkspaceRole;
    };
    CompositeTypes: Record<string, never>;
  };
};
