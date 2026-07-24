-- Generated manually because the pinned local CLI native binary is not hydrated on this host.

create policy provider_sync_states_insert on public.provider_sync_states
  for insert to authenticated
  with check (private.has_workspace_permission(workspace_id, 'integrations:manage'));
create policy provider_sync_states_update on public.provider_sync_states
  for update to authenticated
  using (private.has_workspace_permission(workspace_id, 'integrations:manage'))
  with check (private.has_workspace_permission(workspace_id, 'integrations:manage'));
create policy provider_sync_states_delete on public.provider_sync_states
  for delete to authenticated
  using (private.has_workspace_permission(workspace_id, 'integrations:manage'));

create policy whatsapp_templates_insert on public.whatsapp_templates
  for insert to authenticated
  with check (private.has_workspace_permission(workspace_id, 'integrations:manage'));
create policy whatsapp_templates_update on public.whatsapp_templates
  for update to authenticated
  using (private.has_workspace_permission(workspace_id, 'integrations:manage'))
  with check (private.has_workspace_permission(workspace_id, 'integrations:manage'));
create policy whatsapp_templates_delete on public.whatsapp_templates
  for delete to authenticated
  using (private.has_workspace_permission(workspace_id, 'integrations:manage'));

create policy email_accounts_insert on public.email_accounts
  for insert to authenticated
  with check (private.has_workspace_permission(workspace_id, 'integrations:manage'));
create policy email_accounts_update on public.email_accounts
  for update to authenticated
  using (private.has_workspace_permission(workspace_id, 'integrations:manage'))
  with check (private.has_workspace_permission(workspace_id, 'integrations:manage'));
create policy email_accounts_delete on public.email_accounts
  for delete to authenticated
  using (private.has_workspace_permission(workspace_id, 'integrations:manage'));

revoke all on public.provider_webhook_events from anon, authenticated;

create or replace function private.protect_external_calendar_event()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.external_event_id is not null and not old.orliqo_owned then
    raise exception 'External calendar events are read-only';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function private.protect_external_calendar_event() from public, anon, authenticated;

create trigger scheduled_events_protect_external
  before update or delete on public.scheduled_events
  for each row execute function private.protect_external_calendar_event();

create index provider_webhook_events_provider_workspace_idx
  on public.provider_webhook_events (provider, workspace_id, received_at desc);

create or replace function private.apply_email_delivery_event(
  target_message_id uuid,
  target_integration_id uuid,
  provider_event_id text,
  delivery_event text,
  occurred_at timestamptz,
  redacted_metadata jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.messages%rowtype;
  inserted_event uuid;
  suppression_origin public.suppression_source;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role required';
  end if;
  if delivery_event not in ('delivered', 'read', 'hard_bounce', 'soft_bounce', 'complaint', 'rejected') then
    raise exception 'unsupported email delivery event';
  end if;

  select * into target from public.messages where id = target_message_id for update;
  if target.id is null then return false; end if;

  insert into public.message_events (
    workspace_id, integration_id, message_id, provider_event_id, event_type,
    occurred_at, signature_verified, payload_metadata
  ) values (
    target.workspace_id, target_integration_id, target.id, provider_event_id,
    delivery_event, occurred_at, true, redacted_metadata
  )
  on conflict (integration_id, provider_event_id, event_type) do nothing
  returning id into inserted_event;
  if inserted_event is null then return false; end if;

  if delivery_event = 'delivered' then
    update public.messages set send_status = 'delivered', delivered_at = coalesce(delivered_at, occurred_at)
    where id = target.id and send_status in ('sending', 'sent', 'delivered');
  elsif delivery_event = 'read' then
    update public.messages set send_status = 'read', read_at = coalesce(read_at, occurred_at), delivered_at = coalesce(delivered_at, occurred_at)
    where id = target.id and send_status in ('sending', 'sent', 'delivered', 'read');
  elsif delivery_event = 'soft_bounce' then
    update public.messages set send_status = 'failed', failure_code = 'SOFT_BOUNCE', failure_message = 'Provider reported a retryable delivery failure.'
    where id = target.id;
  else
    suppression_origin := case delivery_event when 'hard_bounce' then 'bounce'::public.suppression_source when 'complaint' then 'complaint'::public.suppression_source else 'invalid'::public.suppression_source end;
    update public.leads set do_not_contact = true, do_not_contact_reason = delivery_event, status = 'do_not_contact'
    where id = target.lead_id and workspace_id = target.workspace_id;
    insert into public.suppression_entries (workspace_id, type, normalized_value, reason, source, lead_id)
    select target.workspace_id, 'email'::public.suppression_type, normalized_email, delivery_event, suppression_origin, id
    from public.leads where id = target.lead_id and normalized_email is not null
    on conflict (workspace_id, type, normalized_value)
    do update set reason = excluded.reason, source = excluded.source, lead_id = excluded.lead_id, expires_at = null, updated_at = now();
    update public.messages set send_status = 'suppressed', failure_code = upper(delivery_event), failure_message = 'Provider event suppressed further outreach.'
    where workspace_id = target.workspace_id and lead_id = target.lead_id
      and send_status in ('draft', 'queued', 'scheduled', 'sending', 'sent', 'paused');
    insert into public.audit_logs (workspace_id, actor_type, action, entity_type, entity_id, after_state)
    values (target.workspace_id, 'system', 'email.provider_suppressed_lead', 'lead', target.lead_id, jsonb_build_object('event', delivery_event, 'message_id', target.id));
  end if;
  return true;
end;
$$;

revoke all on function private.apply_email_delivery_event(uuid, uuid, text, text, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function private.apply_email_delivery_event(uuid, uuid, text, text, timestamptz, jsonb) to service_role;

create or replace function private.apply_whatsapp_status_event(
  target_integration_id uuid,
  target_provider_message_id text,
  provider_event_id text,
  delivery_status text,
  occurred_at timestamptz,
  redacted_metadata jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.messages%rowtype;
  inserted_event uuid;
begin
  if auth.role() <> 'service_role' then raise exception 'service_role required'; end if;
  if delivery_status not in ('sent', 'delivered', 'read', 'failed') then raise exception 'unsupported WhatsApp status'; end if;
  select * into target from public.messages where provider_message_id = target_provider_message_id for update;
  if target.id is null or target.channel <> 'whatsapp' then return false; end if;
  insert into public.message_events (workspace_id, integration_id, message_id, provider_event_id, event_type, occurred_at, signature_verified, payload_metadata)
  values (target.workspace_id, target_integration_id, target.id, provider_event_id, delivery_status, occurred_at, true, redacted_metadata)
  on conflict (integration_id, provider_event_id, event_type) do nothing returning id into inserted_event;
  if inserted_event is null then return false; end if;
  update public.messages
  set send_status = case delivery_status when 'sent' then 'sent'::public.message_send_status when 'delivered' then 'delivered'::public.message_send_status when 'read' then 'read'::public.message_send_status else 'failed'::public.message_send_status end,
      sent_at = case when delivery_status in ('sent', 'delivered', 'read') then coalesce(sent_at, occurred_at) else sent_at end,
      delivered_at = case when delivery_status in ('delivered', 'read') then coalesce(delivered_at, occurred_at) else delivered_at end,
      read_at = case when delivery_status = 'read' then coalesce(read_at, occurred_at) else read_at end,
      failure_code = case when delivery_status = 'failed' then 'WHATSAPP_PROVIDER_FAILED' else failure_code end,
      failure_message = case when delivery_status = 'failed' then 'Official WhatsApp Cloud API reported a delivery failure.' else failure_message end
  where id = target.id;
  return true;
end;
$$;

revoke all on function private.apply_whatsapp_status_event(uuid, text, text, text, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function private.apply_whatsapp_status_event(uuid, text, text, text, timestamptz, jsonb) to service_role;
