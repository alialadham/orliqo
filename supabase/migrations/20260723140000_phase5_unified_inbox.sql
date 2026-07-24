-- Phase 5 persistent unified inbox and atomic inbound/outcome workflows.
alter table public.conversations
  alter column lead_id drop not null,
  add column if not exists read_at timestamptz,
  add column if not exists last_read_by uuid references public.profiles(id) on delete set null,
  add column if not exists intent_evidence jsonb not null default '[]'::jsonb check (jsonb_typeof(intent_evidence) = 'array'),
  add column if not exists classifier_version text,
  add column if not exists assigned_at timestamptz,
  add column if not exists assigned_by uuid references public.profiles(id) on delete set null,
  add column if not exists archived_at timestamptz;

create table public.conversation_participants (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  role text not null check (role in ('contact', 'workspace')),
  display_name text,
  email extensions.citext,
  phone text,
  normalized_email text generated always as (public.normalize_email(email::text)) stored,
  normalized_phone text generated always as (public.normalize_phone(phone)) stored,
  provider_address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (conversation_id, role, provider_address)
);
create index conversation_participants_workspace_conversation_idx
  on public.conversation_participants (workspace_id, conversation_id);

create table public.inbox_labels (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  color text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, name)
);

create table public.conversation_labels (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  label_id uuid not null references public.inbox_labels(id) on delete cascade,
  applied_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (conversation_id, label_id)
);
create index conversation_labels_workspace_idx on public.conversation_labels (workspace_id, conversation_id);

create table public.conversation_notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index conversation_notes_workspace_conversation_idx
  on public.conversation_notes (workspace_id, conversation_id, created_at desc);

alter table public.messages
  add column if not exists provider_event_id text,
  add column if not exists received_at timestamptz,
  add column if not exists sender_address text,
  add column if not exists recipient_address text;
create unique index if not exists messages_workspace_provider_message_unique_idx
  on public.messages (workspace_id, channel, provider_message_id)
  where provider_message_id is not null;

alter table public.reply_suggestions
  add column if not exists approved_by uuid references public.profiles(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists rejected_by uuid references public.profiles(id) on delete set null,
  add column if not exists rejected_at timestamptz,
  add column if not exists rejection_reason text,
  add column if not exists parent_suggestion_id uuid references public.reply_suggestions(id) on delete set null,
  add column if not exists scheduled_at timestamptz,
  add column if not exists edited_body text,
  add column if not exists transformation text;

alter table public.conversation_participants enable row level security;
alter table public.inbox_labels enable row level security;
alter table public.conversation_labels enable row level security;
alter table public.conversation_notes enable row level security;

create policy conversation_participants_member_select on public.conversation_participants
  for select using (private.is_active_workspace_member(workspace_id));
create policy conversation_participants_editor_write on public.conversation_participants
  for all using (private.has_workspace_permission(workspace_id, 'inbox:reply'))
  with check (private.has_workspace_permission(workspace_id, 'inbox:reply'));
create policy inbox_labels_member_select on public.inbox_labels
  for select using (private.is_active_workspace_member(workspace_id));
create policy inbox_labels_editor_write on public.inbox_labels
  for all using (private.has_workspace_permission(workspace_id, 'inbox:reply'))
  with check (private.has_workspace_permission(workspace_id, 'inbox:reply'));
create policy conversation_labels_member_select on public.conversation_labels
  for select using (private.is_active_workspace_member(workspace_id));
create policy conversation_labels_editor_write on public.conversation_labels
  for all using (private.has_workspace_permission(workspace_id, 'inbox:reply'))
  with check (private.has_workspace_permission(workspace_id, 'inbox:reply'));
create policy conversation_notes_member_select on public.conversation_notes
  for select using (private.is_active_workspace_member(workspace_id));
create policy conversation_notes_editor_write on public.conversation_notes
  for all using (private.has_workspace_permission(workspace_id, 'inbox:reply'))
  with check (private.has_workspace_permission(workspace_id, 'inbox:reply'));

grant select, insert, update, delete on public.conversation_participants, public.inbox_labels, public.conversation_labels, public.conversation_notes to authenticated;
grant all on public.conversation_participants, public.inbox_labels, public.conversation_labels, public.conversation_notes to service_role;

create trigger conversation_participants_set_updated_at before update on public.conversation_participants
  for each row execute function public.set_updated_at();
create trigger inbox_labels_set_updated_at before update on public.inbox_labels
  for each row execute function public.set_updated_at();
create trigger conversation_notes_set_updated_at before update on public.conversation_notes
  for each row execute function public.set_updated_at();

create or replace function private.process_inbound_message(
  target_workspace_id uuid,
  target_integration_id uuid,
  provider_name text,
  provider_event_id text,
  provider_message_id text,
  provider_thread_id text,
  message_channel public.outreach_channel,
  sender_address text,
  sender_name text,
  recipient_address text,
  message_subject text,
  message_body text,
  occurred_at timestamptz,
  classified_intent public.conversation_intent,
  intent_confidence numeric,
  intent_evidence jsonb,
  classifier_version text,
  redacted_metadata jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  target_lead public.leads;
  target_conversation public.conversations;
  inserted_message_id uuid;
  existing_message public.messages;
  normalized_sender text;
begin
  if message_body is null or char_length(message_body) = 0 then raise exception 'EMPTY_MESSAGE'; end if;
  if message_channel = 'email' then normalized_sender := public.normalize_email(sender_address);
  elsif message_channel = 'whatsapp' then normalized_sender := public.normalize_phone(sender_address);
  else raise exception 'UNSUPPORTED_INBOUND_CHANNEL'; end if;

  select * into existing_message from public.messages
   where workspace_id=target_workspace_id and channel=message_channel and provider_message_id=process_inbound_message.provider_message_id;
  if existing_message.id is not null then
    return jsonb_build_object('duplicate', true, 'conversation_id', existing_message.conversation_id);
  end if;

  if message_channel='email' then
    select * into target_lead from public.leads where workspace_id=target_workspace_id and normalized_email=normalized_sender limit 1;
  else
    select * into target_lead from public.leads where workspace_id=target_workspace_id and normalized_phone=normalized_sender limit 1;
  end if;

  select * into target_conversation from public.conversations
   where workspace_id=target_workspace_id and channel=message_channel and external_thread_id=provider_thread_id limit 1 for update;
  if target_conversation.id is null then
    insert into public.conversations(workspace_id,lead_id,channel,external_thread_id,status,intent,intent_confidence,intent_evidence,classifier_version,unread_count,last_message_at)
    values(target_workspace_id,target_lead.id,message_channel,provider_thread_id,'needs_response',classified_intent,intent_confidence,intent_evidence,classifier_version,1,occurred_at)
    returning * into target_conversation;
  else
    update public.conversations set
      lead_id=coalesce(lead_id,target_lead.id), status=case when classified_intent='stop_contact' then 'needs_response' else status end,
      intent=classified_intent,intent_confidence=process_inbound_message.intent_confidence,intent_evidence=process_inbound_message.intent_evidence,
      classifier_version=process_inbound_message.classifier_version,unread_count=unread_count+1,last_message_at=greatest(coalesce(last_message_at,occurred_at),occurred_at),updated_at=now()
    where id=target_conversation.id returning * into target_conversation;
  end if;

  insert into public.conversation_participants(workspace_id,conversation_id,lead_id,role,display_name,email,phone,provider_address)
  values(target_workspace_id,target_conversation.id,target_lead.id,'contact',sender_name,
    case when message_channel='email' then sender_address::extensions.citext end,
    case when message_channel='whatsapp' then sender_address end,sender_address)
  on conflict (conversation_id,role,provider_address) do update set lead_id=coalesce(excluded.lead_id,public.conversation_participants.lead_id),display_name=coalesce(excluded.display_name,public.conversation_participants.display_name),updated_at=now();

  insert into public.messages(workspace_id,campaign_id,lead_id,conversation_id,channel,direction,subject,body,approval_status,send_status,provider_message_id,provider_thread_id,provider_event_id,provider_metadata,idempotency_key,received_at,sender_address,recipient_address,created_at)
  values(target_workspace_id,target_conversation.campaign_id,target_lead.id,target_conversation.id,message_channel,'inbound',message_subject,message_body,'approved','replied',provider_message_id,provider_thread_id,provider_event_id,
    coalesce(redacted_metadata,'{}'::jsonb)||jsonb_build_object('provider',provider_name,'integration_id',target_integration_id),
    ('inbound:'||target_workspace_id||':'||message_channel||':'||provider_message_id)::extensions.citext,occurred_at,sender_address,recipient_address,occurred_at)
  returning id into inserted_message_id;

  if target_lead.id is not null then
    update public.leads set status=case when classified_intent='interested' then 'interested' else 'replied' end,last_replied_at=occurred_at,updated_at=now() where id=target_lead.id;
    update public.campaign_leads set status='stopped',sequence_stopped_at=coalesce(sequence_stopped_at,occurred_at),sequence_stop_reason=coalesce(sequence_stop_reason,'inbound_reply'),updated_at=now()
      where workspace_id=target_workspace_id and lead_id=target_lead.id and status not in ('completed','stopped');
    update public.messages set send_status='suppressed',failure_code='REPLY_RECEIVED',failure_message='Queued outreach cancelled after inbound reply.',updated_at=now()
      where workspace_id=target_workspace_id and lead_id=target_lead.id and direction='outbound' and send_status in ('queued','scheduled','paused');
  end if;

  insert into public.message_events(workspace_id,integration_id,message_id,provider_event_id,event_type,occurred_at,signature_verified,payload_metadata)
  values(target_workspace_id,target_integration_id,inserted_message_id,process_inbound_message.provider_event_id,'inbound_received',occurred_at,true,jsonb_build_object('provider',provider_name))
  on conflict (integration_id,provider_event_id,event_type) do nothing;
  insert into public.audit_logs(workspace_id,actor_type,action,entity_type,entity_id,after_state)
  values(target_workspace_id,'system','inbox.inbound.persisted','conversation',target_conversation.id,jsonb_build_object('message_id',inserted_message_id,'intent',classified_intent,'matched_lead',target_lead.id is not null));
  return jsonb_build_object('duplicate',false,'conversation_id',target_conversation.id,'message_id',inserted_message_id);
end;
$$;

create or replace function private.stop_contact_from_conversation(target_workspace_id uuid,target_conversation_id uuid,actor_id uuid,stop_reason text)
returns integer language plpgsql security definer set search_path='' as $$
declare target public.conversations; affected integer := 0;
begin
  select * into target from public.conversations where id=target_conversation_id and workspace_id=target_workspace_id for update;
  if target.id is null or target.lead_id is null then raise exception 'CONVERSATION_OR_LEAD_NOT_FOUND'; end if;
  update public.leads set do_not_contact=true,do_not_contact_reason=stop_reason,status='do_not_contact',updated_at=now() where id=target.lead_id;
  insert into public.suppression_entries(workspace_id,type,normalized_value,reason,source,created_by,lead_id)
    select target_workspace_id,kind,value,stop_reason,'opt_out',actor_id,target.lead_id from (
      select 'email'::public.suppression_type kind,normalized_email value from public.leads where id=target.lead_id
      union all select 'phone'::public.suppression_type,normalized_phone from public.leads where id=target.lead_id
    ) identities where value is not null on conflict(workspace_id,type,normalized_value) do update set reason=excluded.reason,source='opt_out',updated_at=now();
  update public.messages set send_status='suppressed',failure_code='STOP_CONTACT',failure_message=left(stop_reason,500),updated_at=now()
    where workspace_id=target_workspace_id and lead_id=target.lead_id and direction='outbound' and send_status in ('draft','queued','scheduled','paused');
  get diagnostics affected=row_count;
  update public.campaign_leads set status='stopped',sequence_stopped_at=coalesce(sequence_stopped_at,now()),sequence_stop_reason=coalesce(sequence_stop_reason,stop_reason),updated_at=now()
    where workspace_id=target_workspace_id and lead_id=target.lead_id and status not in ('completed','stopped');
  update public.conversations set status='closed',intent='stop_contact',updated_at=now() where id=target.id;
  insert into public.audit_logs(workspace_id,actor_id,actor_type,action,entity_type,entity_id,after_state)
    values(target_workspace_id,actor_id,case when actor_id is null then 'system' else 'user' end,'inbox.stop_contact','conversation',target.id,jsonb_build_object('lead_id',target.lead_id,'cancelled_messages',affected));
  insert into public.notifications(workspace_id,user_id,type,title,body,action_url,metadata)
    select target_workspace_id,wm.user_id,'stop_contact','Contact suppressed','Queued outreach was cancelled after a stop-contact request.','/app/inbox?conversation='||target.id,jsonb_build_object('lead_id',target.lead_id)
    from public.workspace_members wm where wm.workspace_id=target_workspace_id and wm.status='active' and wm.role in ('owner','administrator');
  return affected;
end;
$$;

create or replace function private.record_meeting_outcome(
  target_workspace_id uuid,
  target_conversation_id uuid,
  actor_id uuid,
  meeting_title text,
  meeting_starts_at timestamptz,
  meeting_ends_at timestamptz,
  external_calendar_id text,
  external_event_id text
) returns uuid language plpgsql security definer set search_path='' as $$
declare target public.conversations; event_id uuid; created_meeting_id uuid; existing_meeting_id uuid;
begin
  if meeting_ends_at <= meeting_starts_at then raise exception 'INVALID_MEETING_WINDOW'; end if;
  select * into target from public.conversations where id=target_conversation_id and workspace_id=target_workspace_id for update;
  if target.id is null or target.lead_id is null then raise exception 'CONVERSATION_OR_LEAD_NOT_FOUND'; end if;
  select id into existing_meeting_id from public.meetings
    where workspace_id=target_workspace_id and conversation_id=target_conversation_id and starts_at=meeting_starts_at limit 1;
  if existing_meeting_id is not null then return existing_meeting_id; end if;
  insert into public.scheduled_events(workspace_id,campaign_id,lead_id,type,title,starts_at,ends_at,status,external_calendar_id,external_event_id,metadata,orliqo_owned)
  values(target_workspace_id,target.campaign_id,target.lead_id,'meeting',meeting_title,meeting_starts_at,meeting_ends_at,'scheduled',external_calendar_id,external_event_id,jsonb_build_object('conversation_id',target.id),true)
  returning id into event_id;
  insert into public.meetings(workspace_id,lead_id,campaign_id,conversation_id,scheduled_event_id,title,starts_at,ends_at,status,created_by)
  values(target_workspace_id,target.lead_id,target.campaign_id,target.id,event_id,meeting_title,meeting_starts_at,meeting_ends_at,'scheduled',actor_id)
  returning id into created_meeting_id;
  update public.conversations set status='meeting',updated_at=now() where id=target.id;
  update public.leads set status='interested',updated_at=now() where id=target.lead_id;
  update public.campaign_leads set status='completed',sequence_stopped_at=coalesce(sequence_stopped_at,now()),sequence_stop_reason=coalesce(sequence_stop_reason,'meeting_booked'),updated_at=now()
    where workspace_id=target_workspace_id and campaign_id=target.campaign_id and lead_id=target.lead_id;
  update public.opportunities set stage='discovery',meeting_id=created_meeting_id,updated_at=now()
    where workspace_id=target_workspace_id and conversation_id=target.id;
  if not found then
    insert into public.opportunities(workspace_id,lead_id,campaign_id,conversation_id,meeting_id,stage,owner_id,attribution_metadata)
    values(target_workspace_id,target.lead_id,target.campaign_id,target.id,created_meeting_id,'discovery',actor_id,jsonb_build_object('source','inbox_meeting'));
  end if;
  insert into public.daily_analytics(workspace_id,campaign_id,metric_date,channel,meetings)
    values(target_workspace_id,target.campaign_id,(now() at time zone 'utc')::date,target.channel,1)
    on conflict (workspace_id,campaign_id,metric_date,channel,industry,country) do update set meetings=public.daily_analytics.meetings+1,updated_at=now();
  insert into public.audit_logs(workspace_id,actor_id,actor_type,action,entity_type,entity_id,after_state)
    values(target_workspace_id,actor_id,'user','inbox.meeting.booked','meeting',created_meeting_id,jsonb_build_object('conversation_id',target.id,'scheduled_event_id',event_id));
  return created_meeting_id;
end;
$$;

revoke all on function private.process_inbound_message(uuid,uuid,text,text,text,text,public.outreach_channel,text,text,text,text,text,timestamptz,public.conversation_intent,numeric,jsonb,text,jsonb) from public,anon,authenticated;
revoke all on function private.stop_contact_from_conversation(uuid,uuid,uuid,text) from public,anon,authenticated;
revoke all on function private.record_meeting_outcome(uuid,uuid,uuid,text,timestamptz,timestamptz,text,text) from public,anon,authenticated;
grant execute on function private.process_inbound_message(uuid,uuid,text,text,text,text,public.outreach_channel,text,text,text,text,text,timestamptz,public.conversation_intent,numeric,jsonb,text,jsonb) to service_role;
grant execute on function private.stop_contact_from_conversation(uuid,uuid,uuid,text) to service_role;
grant execute on function private.record_meeting_outcome(uuid,uuid,uuid,text,timestamptz,timestamptz,text,text) to service_role;

create or replace function private.claim_due_message(target_message_id uuid, worker_key text)
returns public.messages
language plpgsql
security definer
set search_path = ''
as $$
declare claimed public.messages;
begin
  update public.messages m
  set send_status='sending',updated_at=now(),provider_metadata=m.provider_metadata||jsonb_build_object('claim_key',worker_key,'claimed_at',now())
  from public.workspaces w,public.subscriptions s,public.leads l
  where m.id=target_message_id and m.workspace_id=w.id and s.workspace_id=w.id and l.id=m.lead_id
    and m.send_status in ('queued','scheduled') and m.approval_status='approved' and m.scheduled_at<=now()
    and w.status='active' and s.status in ('trialing','active')
    and (
      m.provider_metadata->>'origin'='inbox_reply'
      or exists(select 1 from public.campaigns c where c.id=m.campaign_id and c.workspace_id=m.workspace_id and c.status='running')
    )
    and not l.do_not_contact and l.status<>'do_not_contact'
    and not exists (
      select 1 from public.suppression_entries se
      where se.workspace_id=m.workspace_id
        and ((se.type='email' and se.normalized_value=l.normalized_email) or (se.type='phone' and se.normalized_value=l.normalized_phone) or (se.type='domain' and se.normalized_value=l.normalized_domain))
        and (se.expires_at is null or se.expires_at>now())
    )
    and (
      m.provider_metadata->>'origin'='inbox_reply'
      or not exists (
        select 1 from public.campaigns c
        where c.id=m.campaign_id and c.stop_on_reply
          and exists(select 1 from public.messages reply where reply.campaign_id=m.campaign_id and reply.lead_id=m.lead_id and reply.direction='inbound')
      )
    )
    and not exists(select 1 from public.message_attempts a where a.message_id=m.id and a.result='succeeded')
  returning m.* into claimed;
  return claimed;
end;
$$;
