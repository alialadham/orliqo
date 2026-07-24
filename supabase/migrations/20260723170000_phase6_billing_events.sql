-- Phase 6 provider-neutral billing event intake and reconciliation.
alter table public.subscriptions rename column stripe_customer_id to provider_customer_id;
alter table public.subscriptions rename column stripe_subscription_id to provider_subscription_id;
alter table public.subscriptions rename column stripe_price_id to provider_product_id;
alter table public.subscriptions
  add column billing_provider text
  check (billing_provider is null or billing_provider in ('dodo'));

alter table public.billing_events rename column stripe_event_id to provider_event_id;
alter table public.billing_events rename column livemode to live_mode;
alter table public.billing_events
  add column billing_provider text not null default 'dodo'
  check (billing_provider in ('dodo'));
alter table public.billing_events
  add column provider_mode text not null default 'test'
  check (provider_mode in ('test', 'live'));
alter table public.billing_events drop constraint billing_events_pkey;
alter table public.billing_events
  add primary key (billing_provider, provider_event_id);

create or replace function private.accept_billing_event(
  target_provider text,
  target_event_id text,
  target_type text,
  target_mode text,
  target_payload_hash text,
  target_metadata jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_provider <> 'dodo' or target_mode <> 'test' then
    raise exception 'UNSUPPORTED_BILLING_PROVIDER_OR_MODE';
  end if;
  insert into public.billing_events (
    provider_event_id, billing_provider, type, provider_mode, live_mode,
    payload_hash, metadata
  ) values (
    target_event_id, target_provider, target_type, target_mode, false,
    target_payload_hash, coalesce(target_metadata, '{}'::jsonb)
  )
  on conflict (billing_provider, provider_event_id) do nothing;
  return found;
end;
$$;

create or replace function private.reconcile_billing_subscription(
  target_event_id text,
  target_provider text,
  target_workspace_id uuid,
  target_customer_id text,
  target_subscription_id text,
  target_product_id text,
  target_plan public.subscription_plan,
  target_status public.subscription_status,
  target_interval text,
  target_period_start timestamptz,
  target_period_end timestamptz,
  target_cancel_at_period_end boolean,
  target_trial_end timestamptz,
  target_grace_end timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_workspace_id uuid;
  resolved_subscription_id uuid;
begin
  if target_provider <> 'dodo' then
    raise exception 'UNSUPPORTED_BILLING_PROVIDER';
  end if;
  select workspace_id into resolved_workspace_id
  from public.subscriptions
  where billing_provider = target_provider
    and (
      provider_customer_id = target_customer_id
      or provider_subscription_id = target_subscription_id
    )
  limit 1;

  resolved_workspace_id := coalesce(resolved_workspace_id, target_workspace_id);
  if resolved_workspace_id is null then
    update public.billing_events
    set processing_status = 'failed',
        attempts = attempts + 1,
        error_code = 'WORKSPACE_NOT_RESOLVED'
    where provider_event_id = target_event_id
      and billing_provider = target_provider
      and processing_status <> 'succeeded';
    return false;
  end if;

  insert into public.subscriptions (
    workspace_id, billing_provider, provider_customer_id,
    provider_subscription_id, provider_product_id, plan, status,
    billing_interval, current_period_start, current_period_end,
    cancel_at_period_end, trial_ends_at, grace_ends_at
  ) values (
    resolved_workspace_id, target_provider, target_customer_id,
    target_subscription_id, target_product_id, target_plan, target_status,
    target_interval, target_period_start, target_period_end,
    coalesce(target_cancel_at_period_end, false), target_trial_end,
    target_grace_end
  )
  on conflict (workspace_id) do update set
    billing_provider = excluded.billing_provider,
    provider_customer_id = coalesce(excluded.provider_customer_id, public.subscriptions.provider_customer_id),
    provider_subscription_id = coalesce(excluded.provider_subscription_id, public.subscriptions.provider_subscription_id),
    provider_product_id = coalesce(excluded.provider_product_id, public.subscriptions.provider_product_id),
    plan = excluded.plan,
    status = excluded.status,
    billing_interval = excluded.billing_interval,
    current_period_start = excluded.current_period_start,
    current_period_end = excluded.current_period_end,
    cancel_at_period_end = excluded.cancel_at_period_end,
    trial_ends_at = excluded.trial_ends_at,
    grace_ends_at = excluded.grace_ends_at,
    updated_at = now()
  returning id into resolved_subscription_id;

  update public.billing_events
  set processing_status = 'succeeded',
      workspace_id = resolved_workspace_id,
      subscription_id = resolved_subscription_id,
      attempts = attempts + 1,
      processed_at = now(),
      error_code = null
  where provider_event_id = target_event_id
    and billing_provider = target_provider
    and processing_status <> 'succeeded';
  return found;
end;
$$;

create or replace function private.reconcile_billing_payment(
  target_event_id text,
  target_provider text,
  target_subscription_id text,
  target_status public.subscription_status,
  target_grace_end timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_subscription_id uuid;
  resolved_workspace_id uuid;
begin
  if target_provider <> 'dodo' then
    raise exception 'UNSUPPORTED_BILLING_PROVIDER';
  end if;
  update public.subscriptions
  set status = target_status,
      grace_ends_at = target_grace_end,
      updated_at = now()
  where billing_provider = target_provider
    and provider_subscription_id = target_subscription_id
  returning id, workspace_id
  into resolved_subscription_id, resolved_workspace_id;

  if resolved_subscription_id is null then
    update public.billing_events
    set processing_status = 'failed',
        attempts = attempts + 1,
        error_code = 'SUBSCRIPTION_NOT_RESOLVED'
    where billing_provider = target_provider
      and provider_event_id = target_event_id;
    return false;
  end if;

  update public.billing_events
  set processing_status = 'succeeded',
      workspace_id = resolved_workspace_id,
      subscription_id = resolved_subscription_id,
      attempts = attempts + 1,
      processed_at = now(),
      error_code = null
  where billing_provider = target_provider
    and provider_event_id = target_event_id
    and processing_status <> 'succeeded';
  return found;
end;
$$;

revoke all on function private.accept_billing_event(text,text,text,text,text,jsonb) from public, anon, authenticated;
revoke all on function private.reconcile_billing_subscription(text,text,uuid,text,text,text,public.subscription_plan,public.subscription_status,text,timestamptz,timestamptz,boolean,timestamptz,timestamptz) from public, anon, authenticated;
revoke all on function private.reconcile_billing_payment(text,text,text,public.subscription_status,timestamptz) from public, anon, authenticated;
grant execute on function private.accept_billing_event(text,text,text,text,text,jsonb) to service_role;
grant execute on function private.reconcile_billing_subscription(text,text,uuid,text,text,text,public.subscription_plan,public.subscription_status,text,timestamptz,timestamptz,boolean,timestamptz,timestamptz) to service_role;
grant execute on function private.reconcile_billing_payment(text,text,text,public.subscription_status,timestamptz) to service_role;

create or replace function private.reserve_usage(
  target_workspace_id uuid,
  target_metric text,
  target_amount bigint,
  reservation_key text,
  target_entity_type text,
  target_entity_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  counter public.usage_counters;
  existing public.usage_reservations;
  reservation_id uuid;
begin
  if target_amount <= 0 then
    raise exception 'INVALID_USAGE_AMOUNT';
  end if;
  if not exists (
    select 1 from public.subscriptions
    where workspace_id = target_workspace_id
      and status in ('trialing', 'active')
  ) then
    raise exception 'SUBSCRIPTION_NOT_ENTITLED';
  end if;
  select * into existing
  from public.usage_reservations
  where idempotency_key = reservation_key;
  if existing.id is not null then
    if existing.workspace_id <> target_workspace_id
       or existing.metric <> target_metric
       or existing.amount <> target_amount then
      raise exception 'IDEMPOTENCY_KEY_REUSED';
    end if;
    return existing.id;
  end if;

  select * into counter
  from public.usage_counters
  where workspace_id = target_workspace_id
    and metric = target_metric
    and now() >= period_start
    and now() < period_end
  for update;
  if counter.id is null then
    raise exception 'USAGE_COUNTER_NOT_FOUND';
  end if;
  if counter.limit_value is not null
     and counter.used + counter.reserved + target_amount > counter.limit_value then
    raise exception 'USAGE_LIMIT_EXCEEDED';
  end if;

  insert into public.usage_reservations (
    workspace_id, metric, amount, idempotency_key, status,
    source_entity_type, source_entity_id, expires_at
  ) values (
    target_workspace_id, target_metric, target_amount, reservation_key,
    'reserved', target_entity_type, target_entity_id, now() + interval '24 hours'
  )
  returning id into reservation_id;
  update public.usage_counters
  set reserved = reserved + target_amount,
      updated_at = now()
  where id = counter.id;
  return reservation_id;
end;
$$;

create or replace function private.commit_usage(target_reservation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  reservation public.usage_reservations;
begin
  select * into reservation
  from public.usage_reservations
  where id = target_reservation_id
  for update;
  if reservation.id is null then raise exception 'RESERVATION_NOT_FOUND'; end if;
  if reservation.status = 'committed' then return true; end if;
  if reservation.status <> 'reserved' then return false; end if;

  update public.usage_counters
  set reserved = reserved - reservation.amount,
      used = used + reservation.amount,
      updated_at = now()
  where workspace_id = reservation.workspace_id
    and metric = reservation.metric
    and now() >= period_start
    and now() < period_end
    and reserved >= reservation.amount;
  if not found then raise exception 'USAGE_COUNTER_DRIFT'; end if;
  update public.usage_reservations
  set status = 'committed', committed_at = now(), updated_at = now()
  where id = reservation.id;
  return true;
end;
$$;

create or replace function private.release_usage(target_reservation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  reservation public.usage_reservations;
begin
  select * into reservation
  from public.usage_reservations
  where id = target_reservation_id
  for update;
  if reservation.id is null then raise exception 'RESERVATION_NOT_FOUND'; end if;
  if reservation.status in ('released', 'expired') then return true; end if;
  if reservation.status <> 'reserved' then return false; end if;

  update public.usage_counters
  set reserved = reserved - reservation.amount,
      updated_at = now()
  where workspace_id = reservation.workspace_id
    and metric = reservation.metric
    and now() >= period_start
    and now() < period_end
    and reserved >= reservation.amount;
  if not found then raise exception 'USAGE_COUNTER_DRIFT'; end if;
  update public.usage_reservations
  set status = 'released', released_at = now(), updated_at = now()
  where id = reservation.id;
  return true;
end;
$$;

revoke all on function private.reserve_usage(uuid,text,bigint,text,text,uuid) from public, anon, authenticated;
revoke all on function private.commit_usage(uuid) from public, anon, authenticated;
revoke all on function private.release_usage(uuid) from public, anon, authenticated;
grant execute on function private.reserve_usage(uuid,text,bigint,text,text,uuid) to service_role;
grant execute on function private.commit_usage(uuid) to service_role;
grant execute on function private.release_usage(uuid) to service_role;
