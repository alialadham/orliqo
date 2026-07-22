-- Phase 3 atomic queue, usage, and stop controls.
create or replace function private.claim_due_message(target_message_id uuid, worker_key text)
returns public.messages
language plpgsql
security definer
set search_path = ''
as $$
declare claimed public.messages;
begin
  update public.messages m
  set send_status = 'sending', updated_at = now(), provider_metadata = m.provider_metadata || jsonb_build_object('claim_key', worker_key, 'claimed_at', now())
  from public.campaigns c, public.workspaces w, public.subscriptions s, public.leads l
  where m.id = target_message_id and m.campaign_id = c.id and m.workspace_id = w.id and s.workspace_id = w.id and l.id = m.lead_id
    and m.send_status in ('queued','scheduled') and m.approval_status = 'approved' and m.scheduled_at <= now()
    and c.status = 'running' and w.status = 'active' and s.status in ('trialing','active')
    and not l.do_not_contact and l.status <> 'do_not_contact'
    and not exists (select 1 from public.suppression_entries se where se.workspace_id=m.workspace_id and ((se.type='email' and se.normalized_value=l.normalized_email) or (se.type='phone' and se.normalized_value=l.normalized_phone) or (se.type='domain' and se.normalized_value=l.normalized_domain)) and (se.expires_at is null or se.expires_at > now()))
    and not (c.stop_on_reply and exists (select 1 from public.messages reply where reply.campaign_id=m.campaign_id and reply.lead_id=m.lead_id and reply.direction='inbound'))
    and not exists (select 1 from public.message_attempts a where a.message_id=m.id and a.result='succeeded')
  returning m.* into claimed;
  return claimed;
end;
$$;

create or replace function private.stop_lead_outreach(target_workspace_id uuid, target_lead_id uuid, stop_reason text)
returns integer language plpgsql security definer set search_path = '' as $$
declare affected integer;
begin
  update public.campaign_leads set status='stopped',sequence_stopped_at=now(),sequence_stop_reason=stop_reason,updated_at=now()
    where workspace_id=target_workspace_id and lead_id=target_lead_id and status not in ('completed','stopped');
  update public.messages set send_status='suppressed',failure_code='OUTREACH_STOPPED',failure_message=left(stop_reason,500),updated_at=now()
    where workspace_id=target_workspace_id and lead_id=target_lead_id and direction='outbound' and send_status in ('draft','queued','scheduled','paused');
  get diagnostics affected = row_count;
  return affected;
end;
$$;

create or replace function private.reserve_usage(target_workspace_id uuid, target_metric text, target_amount bigint, reservation_key text, target_entity_type text, target_entity_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare counter public.usage_counters; reservation_id uuid;
begin
  select * into counter from public.usage_counters where workspace_id=target_workspace_id and metric=target_metric and now() >= period_start and now() < period_end for update;
  if counter.id is null or (counter.limit_value is not null and counter.used + counter.reserved + target_amount > counter.limit_value) then raise exception 'USAGE_LIMIT_EXCEEDED'; end if;
  insert into public.usage_reservations(workspace_id,metric,amount,idempotency_key,source_entity_type,source_entity_id,expires_at)
  values(target_workspace_id,target_metric,target_amount,reservation_key,target_entity_type,target_entity_id,now()+interval '24 hours')
  on conflict(idempotency_key) do update set idempotency_key=excluded.idempotency_key returning id into reservation_id;
  update public.usage_counters set reserved=reserved+target_amount where id=counter.id and not exists(select 1 from public.usage_reservations where id=reservation_id and created_at < now()-interval '1 second');
  return reservation_id;
end;
$$;

revoke all on function private.claim_due_message(uuid,text) from public, anon, authenticated;
revoke all on function private.stop_lead_outreach(uuid,uuid,text) from public, anon, authenticated;
revoke all on function private.reserve_usage(uuid,text,bigint,text,text,uuid) from public, anon, authenticated;
grant execute on function private.claim_due_message(uuid,text) to service_role;
grant execute on function private.stop_lead_outreach(uuid,uuid,text) to service_role;
grant execute on function private.reserve_usage(uuid,text,bigint,text,text,uuid) to service_role;
