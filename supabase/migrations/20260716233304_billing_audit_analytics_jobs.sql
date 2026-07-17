create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  plan public.subscription_plan not null default 'none',
  status public.subscription_status not null default 'none',
  billing_interval text check (billing_interval is null or billing_interval in ('month', 'year')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  trial_ends_at timestamptz,
  grace_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (current_period_end is null or current_period_start is null or current_period_end > current_period_start)
);
create index subscriptions_status_period_idx on public.subscriptions (status, current_period_end);

create table public.plan_entitlements (
  id uuid primary key default gen_random_uuid(),
  plan public.subscription_plan not null,
  metric text not null,
  limit_value numeric,
  feature_value jsonb,
  billing_interval text not null default 'month' check (billing_interval in ('month', 'year', 'all')),
  effective_from timestamptz not null default now(),
  effective_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan, metric, effective_from),
  check (limit_value is not null or feature_value is not null),
  check (effective_until is null or effective_until > effective_from)
);
create index plan_entitlements_active_idx on public.plan_entitlements (plan, metric, effective_from desc);

create table public.usage_counters (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  metric text not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  used bigint not null default 0 check (used >= 0),
  reserved bigint not null default 0 check (reserved >= 0),
  limit_value bigint check (limit_value is null or limit_value >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, metric, period_start, period_end),
  check (period_end > period_start),
  check (limit_value is null or used + reserved <= limit_value)
);
create index usage_counters_workspace_period_idx on public.usage_counters (workspace_id, period_end, metric);

create table public.usage_reservations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  metric text not null,
  amount bigint not null check (amount > 0),
  idempotency_key extensions.citext not null unique,
  status text not null default 'reserved' check (status in ('reserved', 'committed', 'released', 'expired')),
  source_entity_type text not null,
  source_entity_id uuid,
  expires_at timestamptz not null,
  committed_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at > created_at),
  check (not (committed_at is not null and released_at is not null))
);
create index usage_reservations_workspace_status_idx on public.usage_reservations (workspace_id, metric, status, expires_at);

create table public.billing_events (
  stripe_event_id text primary key,
  type text not null,
  livemode boolean not null,
  processing_status text not null default 'pending' check (processing_status in ('pending', 'processing', 'succeeded', 'failed', 'ignored')),
  workspace_id uuid references public.workspaces(id) on delete set null,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  payload_hash text not null,
  metadata jsonb not null default '{}'::jsonb,
  attempts integer not null default 0 check (attempts >= 0),
  processed_at timestamptz,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index billing_events_processing_idx on public.billing_events (processing_status, created_at);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_type public.actor_type not null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_state jsonb,
  after_state jsonb,
  ip_address_hash text,
  user_agent text,
  correlation_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);
create index audit_logs_workspace_created_idx on public.audit_logs (workspace_id, created_at desc);
create index audit_logs_workspace_entity_idx on public.audit_logs (workspace_id, entity_type, entity_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  read_at timestamptz,
  action_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index notifications_unread_idx on public.notifications (workspace_id, user_id, created_at desc) where read_at is null;

create table public.daily_analytics (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  metric_date date not null,
  channel public.outreach_channel,
  industry text,
  country text,
  discovered integer not null default 0 check (discovered >= 0),
  qualified integer not null default 0 check (qualified >= 0),
  approved integer not null default 0 check (approved >= 0),
  contacted integer not null default 0 check (contacted >= 0),
  sent integer not null default 0 check (sent >= 0),
  delivered integer not null default 0 check (delivered >= 0),
  opened integer not null default 0 check (opened >= 0),
  read integer not null default 0 check (read >= 0),
  replied integer not null default 0 check (replied >= 0),
  positive integer not null default 0 check (positive >= 0),
  meetings integer not null default 0 check (meetings >= 0),
  conversions integer not null default 0 check (conversions >= 0),
  cost numeric(14,2) not null default 0 check (cost >= 0),
  revenue numeric(14,2) not null default 0 check (revenue >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (workspace_id, campaign_id, metric_date, channel, industry, country)
);
create index daily_analytics_workspace_date_idx on public.daily_analytics (workspace_id, metric_date desc);

create table public.job_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  inngest_run_id text,
  inngest_function_id text,
  inngest_event_id text,
  job_type text not null,
  entity_type text,
  entity_id uuid,
  status public.job_status not null default 'pending',
  attempt integer not null default 0 check (attempt >= 0),
  idempotency_key extensions.citext,
  progress jsonb not null default '{}'::jsonb,
  correlation_id uuid not null default gen_random_uuid(),
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  retryable boolean not null default true,
  error_code text,
  error_message text,
  dead_lettered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index job_runs_idempotency_idx on public.job_runs (idempotency_key) where idempotency_key is not null;
create index job_runs_workspace_status_idx on public.job_runs (workspace_id, status, scheduled_at);
create index job_runs_inngest_idx on public.job_runs (inngest_run_id) where inngest_run_id is not null;

create table public.compliance_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  type text not null check (type in ('export', 'deletion', 'abuse_report', 'suspension')),
  requester_id uuid references public.profiles(id) on delete set null,
  target_type text not null,
  target_id uuid,
  status text not null default 'pending' check (status in ('pending', 'in_review', 'approved', 'rejected', 'completed', 'cancelled')),
  reason text,
  evidence_metadata jsonb not null default '{}'::jsonb,
  due_at timestamptz,
  completed_at timestamptz,
  handled_by uuid references public.profiles(id) on delete set null,
  audit_log_id uuid references public.audit_logs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index compliance_requests_workspace_status_idx on public.compliance_requests (workspace_id, status, due_at);

alter table public.website_imports add constraint website_imports_job_run_fk foreign key (job_run_id) references public.job_runs(id) on delete set null;
alter table public.import_jobs add constraint import_jobs_job_run_fk foreign key (job_run_id) references public.job_runs(id) on delete set null;
alter table public.campaign_replenishment_runs add constraint campaign_replenishment_job_run_fk foreign key (job_run_id) references public.job_runs(id) on delete set null;

create trigger subscriptions_set_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();
create trigger plan_entitlements_set_updated_at before update on public.plan_entitlements for each row execute function public.set_updated_at();
create trigger usage_counters_set_updated_at before update on public.usage_counters for each row execute function public.set_updated_at();
create trigger usage_reservations_set_updated_at before update on public.usage_reservations for each row execute function public.set_updated_at();
create trigger billing_events_set_updated_at before update on public.billing_events for each row execute function public.set_updated_at();
create trigger daily_analytics_set_updated_at before update on public.daily_analytics for each row execute function public.set_updated_at();
create trigger job_runs_set_updated_at before update on public.job_runs for each row execute function public.set_updated_at();
create trigger compliance_requests_set_updated_at before update on public.compliance_requests for each row execute function public.set_updated_at();
