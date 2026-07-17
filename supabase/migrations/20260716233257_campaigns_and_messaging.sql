create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  description text,
  goal text not null,
  custom_goal text,
  icp_id uuid references public.ideal_customer_profiles(id) on delete set null,
  status public.campaign_status not null default 'draft',
  audience_source public.audience_source not null default 'custom',
  target_prospect_count integer not null default 0 check (target_prospect_count >= 0),
  main_offer text,
  main_cta text,
  tone text,
  custom_tone text,
  message_length text check (message_length is null or message_length in ('short', 'medium', 'long')),
  follow_up_count smallint not null default 0 check (follow_up_count between 0 and 10),
  language text not null default 'en',
  arabic_dialect text,
  personalization_depth text check (personalization_depth is null or personalization_depth in ('light', 'standard', 'deep')),
  start_at timestamptz,
  sending_days smallint[] not null default array[0,1,2,3,4]::smallint[],
  send_window_start time not null default '09:00',
  send_window_end time not null default '17:00',
  timezone text not null default 'UTC',
  daily_limit integer not null default 40 check (daily_limit between 1 and 100000),
  monthly_limit integer check (monthly_limit is null or monthly_limit > 0),
  min_interval_minutes integer not null default 2 check (min_interval_minutes > 0),
  max_interval_minutes integer not null default 6 check (max_interval_minutes >= min_interval_minutes),
  stop_on_reply boolean not null default true,
  auto_replenish boolean not null default false,
  replenish_threshold integer not null default 0 check (replenish_threshold >= 0),
  replenish_count integer not null default 0 check (replenish_count >= 0),
  replenish_minimum_score smallint not null default 60 check (replenish_minimum_score between 0 and 100),
  replenish_require_approval boolean not null default true,
  auto_generate_messages boolean not null default false,
  paused_at timestamptz,
  launched_at timestamptz,
  completed_at timestamptz,
  killed_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (send_window_end > send_window_start),
  check (cardinality(sending_days) between 1 and 7),
  check (sending_days <@ array[0,1,2,3,4,5,6]::smallint[]),
  check ((goal = 'custom' and custom_goal is not null) or goal <> 'custom'),
  check ((tone = 'custom' and custom_tone is not null) or tone is distinct from 'custom')
);
create index campaigns_workspace_status_idx on public.campaigns (workspace_id, status);
create index campaigns_workspace_start_idx on public.campaigns (workspace_id, start_at);
create index campaigns_workspace_created_idx on public.campaigns (workspace_id, created_at desc);

alter table public.lead_score_components
  add constraint lead_score_components_campaign_fk foreign key (campaign_id) references public.campaigns(id) on delete set null;
alter table public.lead_activities
  add constraint lead_activities_campaign_fk foreign key (campaign_id) references public.campaigns(id) on delete set null;

create table public.campaign_channels (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  channel public.outreach_channel not null,
  integration_id uuid,
  enabled boolean not null default true,
  daily_limit_override integer check (daily_limit_override is null or daily_limit_override > 0),
  priority smallint not null default 1 check (priority between 1 and 100),
  configuration jsonb not null default '{}'::jsonb check (jsonb_typeof(configuration) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (campaign_id, channel, integration_id)
);
create index campaign_channels_workspace_campaign_idx on public.campaign_channels (workspace_id, campaign_id);

create table public.campaign_leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'ready', 'queued', 'active', 'paused', 'completed', 'stopped', 'failed')),
  approval_status public.approval_status not null default 'needs_review',
  added_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  rejected_reason text,
  sequence_position smallint not null default 0 check (sequence_position >= 0),
  sequence_stopped_at timestamptz,
  sequence_stop_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, lead_id),
  check ((approval_status = 'approved' and approved_at is not null and approved_by is not null) or approval_status <> 'approved'),
  check ((sequence_stopped_at is null and sequence_stop_reason is null) or (sequence_stopped_at is not null and sequence_stop_reason is not null))
);
create index campaign_leads_workspace_campaign_status_idx on public.campaign_leads (workspace_id, campaign_id, approval_status, status);
create index campaign_leads_workspace_lead_idx on public.campaign_leads (workspace_id, lead_id);

create table public.campaign_replenishment_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  status public.job_status not null default 'pending',
  requested_count integer not null check (requested_count > 0),
  added_count integer not null default 0 check (added_count >= 0),
  minimum_score smallint not null check (minimum_score between 0 and 100),
  require_approval boolean not null default true,
  usage_reserved bigint not null default 0 check (usage_reserved >= 0),
  cooldown_until timestamptz,
  job_run_id uuid,
  failure_code text,
  run_date date not null default (now() at time zone 'utc')::date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index campaign_replenishment_daily_idx on public.campaign_replenishment_runs (workspace_id, campaign_id, run_date, created_at);

create table public.message_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  category text not null,
  channel public.outreach_channel not null,
  language text not null default 'en',
  subject_template text,
  body_template text not null,
  variables jsonb not null default '[]'::jsonb check (jsonb_typeof(variables) = 'array'),
  is_default boolean not null default false,
  provider_template_name text,
  provider_template_status text,
  provider_template_language text,
  archived_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index message_templates_workspace_channel_idx on public.message_templates (workspace_id, channel, category);
create unique index message_templates_default_idx on public.message_templates (coalesce(workspace_id, '00000000-0000-0000-0000-000000000000'::uuid), category, channel, language) where is_default and archived_at is null;

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  channel public.outreach_channel not null,
  external_thread_id text,
  status public.conversation_status not null default 'open',
  intent public.conversation_intent not null default 'unknown',
  intent_confidence numeric(4,3) check (intent_confidence is null or intent_confidence between 0 and 1),
  unread_count integer not null default 0 check (unread_count >= 0),
  last_message_at timestamptz,
  assigned_to uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index conversations_workspace_status_idx on public.conversations (workspace_id, status, last_message_at desc nulls last);
create index conversations_workspace_lead_idx on public.conversations (workspace_id, lead_id);
create unique index conversations_external_thread_idx on public.conversations (workspace_id, channel, external_thread_id) where external_thread_id is not null;

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  lead_id uuid not null references public.leads(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  channel public.outreach_channel not null,
  direction public.message_direction not null,
  sequence_step smallint not null default 0 check (sequence_step >= 0),
  subject text,
  body text not null,
  personalization_facts jsonb not null default '[]'::jsonb check (jsonb_typeof(personalization_facts) = 'array'),
  grounding_source_ids uuid[] not null default '{}',
  generation_model text,
  generation_prompt_version text,
  approval_status public.approval_status not null default 'needs_review',
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  send_status public.message_send_status not null default 'draft',
  scheduled_at timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  replied_at timestamptz,
  provider_message_id text,
  provider_thread_id text,
  provider_metadata jsonb not null default '{}'::jsonb,
  failure_code text,
  failure_message text,
  idempotency_key extensions.citext not null unique,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((approval_status = 'approved' and approved_at is not null and approved_by is not null) or approval_status <> 'approved'),
  check ((send_status = 'scheduled' and scheduled_at is not null) or send_status <> 'scheduled')
);
create index messages_due_queue_idx on public.messages (send_status, scheduled_at) where send_status in ('queued', 'scheduled');
create index messages_workspace_campaign_idx on public.messages (workspace_id, campaign_id, created_at desc);
create index messages_workspace_lead_idx on public.messages (workspace_id, lead_id, created_at desc);
create index messages_workspace_conversation_idx on public.messages (workspace_id, conversation_id, created_at);
create index messages_provider_message_idx on public.messages (provider_message_id) where provider_message_id is not null;

create table public.message_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  message_id uuid not null references public.messages(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  subject text,
  body text not null,
  generation_model text,
  generation_prompt_version text,
  personalization_facts jsonb not null default '[]'::jsonb,
  grounding_source_ids uuid[] not null default '{}',
  risk_flags jsonb not null default '[]'::jsonb,
  unsupported_claims jsonb not null default '[]'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_by_type public.actor_type not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (message_id, version_number)
);
create index message_versions_workspace_message_idx on public.message_versions (workspace_id, message_id, version_number desc);

create table public.message_attempts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  message_id uuid not null references public.messages(id) on delete cascade,
  attempt_number integer not null check (attempt_number > 0),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  result text check (result is null or result in ('succeeded', 'retryable_failure', 'terminal_failure', 'cancelled')),
  provider_status_code text,
  response_metadata jsonb not null default '{}'::jsonb,
  error_code text,
  error_message text,
  correlation_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  unique (message_id, attempt_number)
);
create index message_attempts_workspace_message_idx on public.message_attempts (workspace_id, message_id, attempt_number);

create table public.message_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  integration_id uuid,
  message_id uuid not null references public.messages(id) on delete cascade,
  provider_event_id text not null,
  event_type text not null,
  occurred_at timestamptz not null,
  signature_verified boolean not null default false,
  payload_metadata jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  unique nulls not distinct (integration_id, provider_event_id, event_type)
);
create index message_events_workspace_message_idx on public.message_events (workspace_id, message_id, occurred_at);

create table public.reply_suggestions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  source_message_id uuid references public.messages(id) on delete set null,
  body text not null,
  language text not null default 'en',
  tone text,
  generation_model text,
  generation_prompt_version text,
  grounding_source_ids uuid[] not null default '{}',
  risk_flags jsonb not null default '[]'::jsonb,
  confidence numeric(4,3) check (confidence is null or confidence between 0 and 1),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'edited', 'dismissed')),
  created_by public.actor_type not null default 'ai',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reply_suggestions_workspace_conversation_idx on public.reply_suggestions (workspace_id, conversation_id, created_at desc);

create table public.scheduled_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  message_id uuid references public.messages(id) on delete set null,
  type public.scheduled_event_type not null,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled', 'failed')),
  external_calendar_id text,
  external_event_id text,
  metadata jsonb not null default '{}'::jsonb,
  orliqo_owned boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);
create index scheduled_events_workspace_time_idx on public.scheduled_events (workspace_id, starts_at, status);
create unique index scheduled_events_external_idx on public.scheduled_events (workspace_id, external_calendar_id, external_event_id) where external_event_id is not null;

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  scheduled_event_id uuid references public.scheduled_events(id) on delete set null,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled', 'no_show')),
  meeting_url text,
  outcome text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index meetings_workspace_time_idx on public.meetings (workspace_id, starts_at, status);

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  meeting_id uuid references public.meetings(id) on delete set null,
  stage text not null default 'qualified' check (stage in ('qualified', 'discovery', 'proposal', 'negotiation', 'won', 'lost')),
  estimated_value numeric(14,2) check (estimated_value is null or estimated_value >= 0),
  currency char(3) not null default 'USD',
  probability smallint check (probability is null or probability between 0 and 100),
  won_at timestamptz,
  lost_at timestamptz,
  owner_id uuid references public.profiles(id) on delete set null,
  attribution_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not (won_at is not null and lost_at is not null))
);
create index opportunities_workspace_stage_idx on public.opportunities (workspace_id, stage, updated_at desc);

create trigger campaigns_set_updated_at before update on public.campaigns for each row execute function public.set_updated_at();
create trigger campaign_channels_set_updated_at before update on public.campaign_channels for each row execute function public.set_updated_at();
create trigger campaign_leads_set_updated_at before update on public.campaign_leads for each row execute function public.set_updated_at();
create trigger campaign_replenishment_runs_set_updated_at before update on public.campaign_replenishment_runs for each row execute function public.set_updated_at();
create trigger message_templates_set_updated_at before update on public.message_templates for each row execute function public.set_updated_at();
create trigger conversations_set_updated_at before update on public.conversations for each row execute function public.set_updated_at();
create trigger messages_set_updated_at before update on public.messages for each row execute function public.set_updated_at();
create trigger message_versions_set_updated_at before update on public.message_versions for each row execute function public.set_updated_at();
create trigger reply_suggestions_set_updated_at before update on public.reply_suggestions for each row execute function public.set_updated_at();
create trigger scheduled_events_set_updated_at before update on public.scheduled_events for each row execute function public.set_updated_at();
create trigger meetings_set_updated_at before update on public.meetings for each row execute function public.set_updated_at();
create trigger opportunities_set_updated_at before update on public.opportunities for each row execute function public.set_updated_at();
