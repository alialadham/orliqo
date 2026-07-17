create table public.business_profiles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  company_name text not null check (char_length(company_name) between 1 and 120),
  website_url text,
  industry text,
  country text,
  city text,
  company_size text,
  employee_range text,
  description text,
  logo_url text,
  instagram_url text,
  linkedin_url text,
  whatsapp_number text,
  main_service text,
  additional_services jsonb not null default '[]'::jsonb check (jsonb_typeof(additional_services) = 'array'),
  average_project_value numeric(14,2) check (average_project_value is null or average_project_value >= 0),
  pricing_model text,
  sales_cycle text,
  main_customer_problem text,
  competitive_advantage text,
  default_cta text,
  brand_tone text,
  target_industry_summary text,
  selling_points jsonb not null default '[]'::jsonb check (jsonb_typeof(selling_points) = 'array'),
  onboarding_completed boolean not null default false,
  onboarding_step smallint not null default 1 check (onboarding_step between 1 and 6),
  imported_from_website_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index business_profiles_workspace_idx on public.business_profiles (workspace_id);

create table public.ideal_customer_profiles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  natural_language_description text,
  countries text[] not null default '{}',
  cities text[] not null default '{}',
  industries text[] not null default '{}',
  company_sizes text[] not null default '{}',
  employee_min integer check (employee_min is null or employee_min >= 0),
  employee_max integer check (employee_max is null or employee_max >= employee_min),
  revenue_min numeric(16,2) check (revenue_min is null or revenue_min >= 0),
  revenue_max numeric(16,2) check (revenue_max is null or revenue_max >= revenue_min),
  business_age_min integer check (business_age_min is null or business_age_min >= 0),
  business_age_max integer check (business_age_max is null or business_age_max >= business_age_min),
  website_statuses public.website_status[] not null default '{}',
  social_activity_min smallint check (social_activity_min is null or social_activity_min between 0 and 100),
  review_count_min integer check (review_count_min is null or review_count_min >= 0),
  keywords text[] not null default '{}',
  excluded_industries text[] not null default '{}',
  excluded_companies text[] not null default '{}',
  contact_requirements jsonb not null default '{}'::jsonb check (jsonb_typeof(contact_requirements) = 'object'),
  minimum_score smallint not null default 60 check (minimum_score between 0 and 100),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ideal_customer_profiles_workspace_active_idx on public.ideal_customer_profiles (workspace_id, active);

create table public.website_imports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  business_profile_id uuid not null references public.business_profiles(id) on delete cascade,
  requested_url text not null,
  normalized_url text not null,
  status text not null default 'pending' check (status in ('pending', 'running', 'succeeded', 'partial', 'failed', 'cancelled')),
  job_run_id uuid,
  requested_by uuid not null references public.profiles(id) on delete restrict,
  started_at timestamptz,
  completed_at timestamptz,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index website_imports_workspace_status_idx on public.website_imports (workspace_id, status);

create table public.website_import_suggestions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  website_import_id uuid not null references public.website_imports(id) on delete cascade,
  field_name text not null,
  suggested_value jsonb not null,
  source_url text not null,
  citation_text text,
  confidence public.evidence_confidence not null default 'unverified',
  decision text not null default 'pending' check (decision in ('pending', 'accepted', 'rejected')),
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (website_import_id, field_name, source_url)
);
create index website_import_suggestions_workspace_idx on public.website_import_suggestions (workspace_id, website_import_id);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  business_name text not null check (char_length(business_name) between 1 and 200),
  legal_name text,
  logo_url text,
  industry text,
  category text,
  description text,
  country text,
  city text,
  address text,
  website_url text,
  website_status public.website_status not null default 'unknown',
  website_status_confidence public.evidence_confidence not null default 'missing',
  email extensions.citext,
  email_verification_status public.email_verification_status not null default 'missing',
  phone text,
  phone_verification_status public.phone_verification_status not null default 'missing',
  whatsapp_available boolean,
  whatsapp_consent_status public.whatsapp_consent_status not null default 'unknown',
  instagram_url text,
  facebook_url text,
  linkedin_url text,
  review_count integer check (review_count is null or review_count >= 0),
  average_rating numeric(3,2) check (average_rating is null or average_rating between 0 and 5),
  social_activity_score smallint check (social_activity_score is null or social_activity_score between 0 and 100),
  employee_estimate integer check (employee_estimate is null or employee_estimate >= 0),
  revenue_estimate numeric(16,2) check (revenue_estimate is null or revenue_estimate >= 0),
  services jsonb not null default '[]'::jsonb check (jsonb_typeof(services) = 'array'),
  qualification_score smallint check (qualification_score is null or qualification_score between 0 and 100),
  qualification_reason text,
  suggested_opportunity text,
  recommended_channel public.outreach_channel,
  personalization_angle text,
  status public.lead_status not null default 'new',
  do_not_contact boolean not null default false,
  do_not_contact_reason text,
  assigned_to uuid references public.profiles(id) on delete set null,
  first_contacted_at timestamptz,
  last_contacted_at timestamptz,
  last_replied_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  normalized_domain text,
  normalized_email text,
  normalized_phone text,
  normalized_business_city text,
  normalized_instagram_url text,
  normalized_facebook_url text,
  normalized_linkedin_url text,
  domain_fingerprint text,
  email_fingerprint text,
  phone_fingerprint text,
  business_city_fingerprint text,
  instagram_fingerprint text,
  facebook_fingerprint text,
  linkedin_fingerprint text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((do_not_contact = false and do_not_contact_reason is null) or do_not_contact = true)
);

create index leads_workspace_status_idx on public.leads (workspace_id, status);
create index leads_workspace_score_idx on public.leads (workspace_id, qualification_score desc nulls last);
create index leads_workspace_assignee_idx on public.leads (workspace_id, assigned_to);
create index leads_workspace_activity_idx on public.leads (workspace_id, last_contacted_at desc nulls last);
create unique index leads_workspace_domain_unique_idx on public.leads (workspace_id, domain_fingerprint) where domain_fingerprint is not null;
create unique index leads_workspace_email_unique_idx on public.leads (workspace_id, email_fingerprint) where email_fingerprint is not null;
create unique index leads_workspace_phone_unique_idx on public.leads (workspace_id, phone_fingerprint) where phone_fingerprint is not null;
create unique index leads_workspace_business_city_unique_idx on public.leads (workspace_id, business_city_fingerprint) where business_city_fingerprint is not null;
create unique index leads_workspace_instagram_unique_idx on public.leads (workspace_id, instagram_fingerprint) where instagram_fingerprint is not null;
create unique index leads_workspace_facebook_unique_idx on public.leads (workspace_id, facebook_fingerprint) where facebook_fingerprint is not null;
create unique index leads_workspace_linkedin_unique_idx on public.leads (workspace_id, linkedin_fingerprint) where linkedin_fingerprint is not null;

create or replace function public.set_lead_normalized_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.normalized_domain := public.normalize_domain(new.website_url);
  new.normalized_email := public.normalize_email(new.email::text);
  new.normalized_phone := public.normalize_phone(new.phone);
  new.normalized_business_city := public.normalize_text_identity(concat_ws(' ', new.business_name, new.city));
  new.normalized_instagram_url := public.normalize_social_url(new.instagram_url);
  new.normalized_facebook_url := public.normalize_social_url(new.facebook_url);
  new.normalized_linkedin_url := public.normalize_social_url(new.linkedin_url);
  new.domain_fingerprint := public.identity_fingerprint(new.normalized_domain);
  new.email_fingerprint := public.identity_fingerprint(new.normalized_email);
  new.phone_fingerprint := public.identity_fingerprint(new.normalized_phone);
  new.business_city_fingerprint := public.identity_fingerprint(new.normalized_business_city);
  new.instagram_fingerprint := public.identity_fingerprint(new.normalized_instagram_url);
  new.facebook_fingerprint := public.identity_fingerprint(new.normalized_facebook_url);
  new.linkedin_fingerprint := public.identity_fingerprint(new.normalized_linkedin_url);
  return new;
end;
$$;

create trigger leads_set_normalized_fields before insert or update of business_name, city, website_url, email, phone, instagram_url, facebook_url, linkedin_url on public.leads
  for each row execute function public.set_lead_normalized_fields();

create table public.lead_sources (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  source_type text not null,
  source_url text not null,
  source_title text,
  source_domain text,
  extracted_data jsonb not null default '{}'::jsonb,
  retrieved_at timestamptz not null default now(),
  confidence public.evidence_confidence not null default 'unverified',
  allowed_for_automated_use boolean not null default false,
  citation_text text,
  content_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lead_id, content_hash)
);
create index lead_sources_workspace_lead_idx on public.lead_sources (workspace_id, lead_id);

create table public.lead_field_evidence (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  field_name text not null,
  value jsonb not null,
  confidence public.evidence_confidence not null,
  source_id uuid references public.lead_sources(id) on delete set null,
  verified_at timestamptz,
  verification_method text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index lead_field_evidence_lead_field_idx on public.lead_field_evidence (workspace_id, lead_id, field_name, confidence);

create table public.lead_score_components (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  campaign_id uuid,
  icp_fit smallint not null default 0,
  location_fit smallint not null default 0,
  industry_fit smallint not null default 0,
  website_opportunity smallint not null default 0,
  social_activity smallint not null default 0,
  reviews smallint not null default 0,
  contact_availability smallint not null default 0,
  verification smallint not null default 0,
  size_fit smallint not null default 0,
  buying_signals smallint not null default 0,
  exclusion_penalty smallint not null default 0,
  confidence smallint not null default 0,
  total_score smallint not null check (total_score between 0 and 100),
  explanation text not null,
  model_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index lead_score_components_latest_idx on public.lead_score_components (workspace_id, lead_id, created_at desc);

create table public.lead_notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  content text not null check (char_length(content) between 1 and 10000),
  pinned boolean not null default false,
  mentioned_user_ids uuid[] not null default '{}',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index lead_notes_workspace_lead_idx on public.lead_notes (workspace_id, lead_id, created_at desc);

create table public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  campaign_id uuid,
  actor_type public.actor_type not null,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index lead_activities_lead_created_idx on public.lead_activities (workspace_id, lead_id, created_at desc);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name extensions.citext not null,
  color_token text not null default 'neutral' check (color_token in ('neutral', 'blue', 'green', 'amber', 'red', 'violet')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, name)
);
create index tags_workspace_idx on public.tags (workspace_id);

create table public.lead_tags (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (lead_id, tag_id)
);
create index lead_tags_workspace_idx on public.lead_tags (workspace_id, tag_id);

create table public.saved_views (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  entity_type text not null check (entity_type in ('leads', 'campaigns', 'queue', 'inbox', 'analytics')),
  name text not null,
  filters jsonb not null default '{}'::jsonb,
  sorting jsonb not null default '[]'::jsonb,
  visible_columns jsonb not null default '[]'::jsonb,
  shared boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, owner_id, entity_type, name)
);
create index saved_views_workspace_entity_idx on public.saved_views (workspace_id, entity_type);

create table public.suppression_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  type public.suppression_type not null,
  normalized_value text not null,
  reason text not null,
  source public.suppression_source not null,
  created_by uuid references public.profiles(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, type, normalized_value)
);
create index suppression_entries_workspace_active_idx on public.suppression_entries (workspace_id, type, normalized_value, expires_at);

create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  channel public.outreach_channel not null,
  status text not null check (status in ('granted', 'revoked', 'unknown', 'not_required')),
  consent_source text not null,
  consent_text text,
  evidence_url text,
  evidence_metadata jsonb not null default '{}'::jsonb,
  captured_at timestamptz not null,
  revoked_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (revoked_at is null or revoked_at >= captured_at)
);
create index consent_records_workspace_lead_channel_idx on public.consent_records (workspace_id, lead_id, channel, captured_at desc);

create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_type text not null check (source_type in ('csv', 'xlsx')),
  storage_object_path text not null,
  mapping jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'parsing', 'needs_mapping', 'ready', 'importing', 'completed', 'partial', 'failed', 'cancelled')),
  total_rows integer not null default 0 check (total_rows >= 0),
  valid_rows integer not null default 0 check (valid_rows >= 0),
  duplicate_rows integer not null default 0 check (duplicate_rows >= 0),
  imported_rows integer not null default 0 check (imported_rows >= 0),
  requested_by uuid not null references public.profiles(id) on delete restrict,
  job_run_id uuid,
  errors jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index import_jobs_workspace_status_idx on public.import_jobs (workspace_id, status);

create table public.import_rows (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  import_job_id uuid not null references public.import_jobs(id) on delete cascade,
  row_number integer not null check (row_number > 0),
  raw_data jsonb not null,
  mapped_data jsonb not null default '{}'::jsonb,
  normalized_data jsonb not null default '{}'::jsonb,
  validation_errors jsonb not null default '[]'::jsonb,
  duplicate_lead_id uuid references public.leads(id) on delete set null,
  decision text not null default 'pending' check (decision in ('pending', 'import', 'skip', 'merge')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (import_job_id, row_number)
);
create index import_rows_workspace_job_idx on public.import_rows (workspace_id, import_job_id, row_number);

create trigger business_profiles_set_updated_at before update on public.business_profiles for each row execute function public.set_updated_at();
create trigger ideal_customer_profiles_set_updated_at before update on public.ideal_customer_profiles for each row execute function public.set_updated_at();
create trigger website_imports_set_updated_at before update on public.website_imports for each row execute function public.set_updated_at();
create trigger website_import_suggestions_set_updated_at before update on public.website_import_suggestions for each row execute function public.set_updated_at();
create trigger leads_set_updated_at before update on public.leads for each row execute function public.set_updated_at();
create trigger lead_sources_set_updated_at before update on public.lead_sources for each row execute function public.set_updated_at();
create trigger lead_field_evidence_set_updated_at before update on public.lead_field_evidence for each row execute function public.set_updated_at();
create trigger lead_score_components_set_updated_at before update on public.lead_score_components for each row execute function public.set_updated_at();
create trigger lead_notes_set_updated_at before update on public.lead_notes for each row execute function public.set_updated_at();
create trigger tags_set_updated_at before update on public.tags for each row execute function public.set_updated_at();
create trigger saved_views_set_updated_at before update on public.saved_views for each row execute function public.set_updated_at();
create trigger suppression_entries_set_updated_at before update on public.suppression_entries for each row execute function public.set_updated_at();
create trigger consent_records_set_updated_at before update on public.consent_records for each row execute function public.set_updated_at();
create trigger import_jobs_set_updated_at before update on public.import_jobs for each row execute function public.set_updated_at();
create trigger import_rows_set_updated_at before update on public.import_rows for each row execute function public.set_updated_at();

revoke execute on function public.set_lead_normalized_fields() from public, anon, authenticated;
