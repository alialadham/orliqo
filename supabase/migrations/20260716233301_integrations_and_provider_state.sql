create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider public.integration_provider not null,
  status public.integration_status not null default 'disconnected',
  display_name text not null,
  external_account_id text,
  external_account_email extensions.citext,
  configuration jsonb not null default '{}'::jsonb check (jsonb_typeof(configuration) = 'object'),
  credential_reference uuid,
  scopes text[] not null default '{}',
  token_expires_at timestamptz,
  last_synced_at timestamptz,
  last_error_code text,
  last_error text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (credential_reference is not null or status in ('disconnected', 'connecting', 'error', 'expired') or configuration ->> 'mode' = 'test')
);
create index integrations_workspace_provider_status_idx on public.integrations (workspace_id, provider, status);
create unique index integrations_workspace_external_account_idx on public.integrations (workspace_id, provider, external_account_id) where external_account_id is not null and status <> 'disconnected';

create table private.integration_credentials (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  integration_id uuid not null unique references public.integrations(id) on delete cascade,
  encrypted_payload bytea not null,
  nonce bytea not null,
  key_version integer not null check (key_version > 0),
  rotated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
revoke all on private.integration_credentials from public, anon, authenticated;

alter table public.integrations
  add constraint integrations_credential_reference_fk foreign key (credential_reference) references private.integration_credentials(id) on delete set null;

create table private.oauth_states (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider public.integration_provider not null,
  hashed_state text not null unique,
  pkce_verifier_ciphertext bytea not null,
  redirect_path text not null check (redirect_path ~ '^/(app|onboarding)(/|$)' and redirect_path !~ '^//'),
  expires_at timestamptz not null,
  used_at timestamptz,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at > created_at)
);
create index oauth_states_expiry_idx on private.oauth_states (expires_at) where used_at is null;
revoke all on private.oauth_states from public, anon, authenticated;

create table public.provider_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider public.integration_provider not null,
  external_event_id text not null,
  workspace_id uuid references public.workspaces(id) on delete set null,
  integration_id uuid references public.integrations(id) on delete set null,
  received_at timestamptz not null default now(),
  signature_verified boolean not null default false,
  processing_status text not null default 'pending' check (processing_status in ('pending', 'processing', 'succeeded', 'failed', 'ignored')),
  attempts integer not null default 0 check (attempts >= 0),
  payload_hash text not null,
  metadata jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, external_event_id)
);
create index provider_webhook_events_processing_idx on public.provider_webhook_events (processing_status, received_at);
create index provider_webhook_events_workspace_idx on public.provider_webhook_events (workspace_id, received_at desc);

create table public.provider_sync_states (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  integration_id uuid not null references public.integrations(id) on delete cascade,
  sync_type text not null,
  cursor_metadata jsonb not null default '{}'::jsonb,
  subscription_metadata jsonb not null default '{}'::jsonb,
  last_success_at timestamptz,
  last_attempt_at timestamptz,
  expires_at timestamptz,
  lag_seconds integer check (lag_seconds is null or lag_seconds >= 0),
  last_error_code text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (integration_id, sync_type)
);
create index provider_sync_states_workspace_lag_idx on public.provider_sync_states (workspace_id, lag_seconds desc nulls last);

create table public.whatsapp_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  integration_id uuid not null references public.integrations(id) on delete cascade,
  provider_template_id text not null,
  name text not null,
  language text not null,
  category text not null,
  status text not null,
  components jsonb not null default '[]'::jsonb check (jsonb_typeof(components) = 'array'),
  quality_score text,
  rejection_reason text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (integration_id, provider_template_id)
);
create index whatsapp_templates_workspace_status_idx on public.whatsapp_templates (workspace_id, status);

create table public.email_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  integration_id uuid not null unique references public.integrations(id) on delete cascade,
  email_address extensions.citext not null,
  sender_name text not null,
  signature_html text,
  daily_limit integer not null default 40 check (daily_limit > 0),
  sent_today integer not null default 0 check (sent_today between 0 and daily_limit),
  bounce_rate numeric(5,4) not null default 0 check (bounce_rate between 0 and 1),
  reply_rate numeric(5,4) not null default 0 check (reply_rate between 0 and 1),
  health_status text not null default 'unknown' check (health_status in ('healthy', 'warning', 'unhealthy', 'unknown')),
  paused boolean not null default false,
  warmup_status text not null default 'not_configured' check (warmup_status in ('not_configured', 'warming', 'ready', 'paused')),
  daily_counter_date date not null default (now() at time zone 'utc')::date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index email_accounts_workspace_health_idx on public.email_accounts (workspace_id, health_status, paused);

alter table public.campaign_channels
  add constraint campaign_channels_integration_fk foreign key (integration_id) references public.integrations(id) on delete set null;
alter table public.message_events
  add constraint message_events_integration_fk foreign key (integration_id) references public.integrations(id) on delete set null;

create trigger integrations_set_updated_at before update on public.integrations for each row execute function public.set_updated_at();
create trigger integration_credentials_set_updated_at before update on private.integration_credentials for each row execute function public.set_updated_at();
create trigger oauth_states_set_updated_at before update on private.oauth_states for each row execute function public.set_updated_at();
create trigger provider_webhook_events_set_updated_at before update on public.provider_webhook_events for each row execute function public.set_updated_at();
create trigger provider_sync_states_set_updated_at before update on public.provider_sync_states for each row execute function public.set_updated_at();
create trigger whatsapp_templates_set_updated_at before update on public.whatsapp_templates for each row execute function public.set_updated_at();
create trigger email_accounts_set_updated_at before update on public.email_accounts for each row execute function public.set_updated_at();
