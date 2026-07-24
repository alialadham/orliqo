-- Phase 8 production rate limiting and private API hardening.
create table private.rate_limit_buckets (
  bucket_key text not null,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  expires_at timestamptz not null,
  primary key (bucket_key, window_started_at)
);

create index rate_limit_buckets_expiry_idx
  on private.rate_limit_buckets (expires_at);

create or replace function private.consume_rate_limit(
  bucket_key text,
  bucket_limit integer,
  window_seconds integer
)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_window timestamptz;
  current_count integer;
begin
  if char_length(bucket_key) not between 1 and 240
    or bucket_limit not between 1 and 100000
    or window_seconds not between 1 and 86400 then
    raise exception 'INVALID_RATE_LIMIT_ARGUMENT';
  end if;

  current_window := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / window_seconds) * window_seconds
  );

  insert into private.rate_limit_buckets (
    bucket_key,
    window_started_at,
    request_count,
    expires_at
  )
  values (
    bucket_key,
    current_window,
    1,
    current_window + make_interval(secs => window_seconds)
  )
  on conflict (bucket_key, window_started_at)
  do update set request_count = private.rate_limit_buckets.request_count + 1
  returning request_count into current_count;

  delete from private.rate_limit_buckets
  where expires_at < clock_timestamp() - interval '5 minutes';

  allowed := current_count <= bucket_limit;
  retry_after_seconds := case
    when allowed then 0
    else greatest(
      1,
      ceil(extract(epoch from (
        current_window + make_interval(secs => window_seconds) - clock_timestamp()
      )))::integer
    )
  end;
  return next;
end;
$$;

revoke all on private.rate_limit_buckets from public, anon, authenticated;
revoke all on function private.consume_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant usage on schema private to service_role;
grant select, insert, update, delete on private.rate_limit_buckets to service_role;
grant execute on function private.consume_rate_limit(text, integer, integer)
  to service_role;

create index if not exists messages_campaign_release_gate_idx
  on public.messages (
    workspace_id,
    campaign_id,
    approval_status,
    send_status
  )
  where direction = 'outbound';

create index if not exists lead_sources_automated_grounding_idx
  on public.lead_sources (workspace_id, lead_id, retrieved_at desc)
  where allowed_for_automated_use;

create or replace function private.create_campaign(
  target_workspace_id uuid,
  target_actor_id uuid,
  campaign_input jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  campaign_id uuid;
  channel_name text;
  selected_integration_id uuid;
begin
  insert into public.campaigns (
    workspace_id, name, description, goal, custom_goal, audience_source,
    target_prospect_count, main_offer, main_cta, tone, custom_tone,
    follow_up_count, language, personalization_depth, start_at, sending_days,
    send_window_start, send_window_end, timezone, daily_limit, monthly_limit,
    min_interval_minutes, max_interval_minutes, stop_on_reply, auto_replenish,
    replenish_threshold, replenish_count, replenish_minimum_score,
    replenish_require_approval, created_by
  )
  values (
    target_workspace_id,
    campaign_input ->> 'name',
    nullif(campaign_input ->> 'description', ''),
    campaign_input ->> 'goal',
    nullif(campaign_input ->> 'customGoal', ''),
    (campaign_input ->> 'audienceSource')::public.audience_source,
    (campaign_input ->> 'targetProspectCount')::integer,
    campaign_input ->> 'mainOffer',
    campaign_input ->> 'mainCta',
    campaign_input ->> 'tone',
    nullif(campaign_input ->> 'customTone', ''),
    (campaign_input ->> 'followUpCount')::smallint,
    campaign_input ->> 'language',
    campaign_input ->> 'personalizationDepth',
    (campaign_input ->> 'startAt')::timestamptz,
    array(
      select value::smallint
      from jsonb_array_elements_text(campaign_input -> 'sendingDays')
    ),
    (campaign_input ->> 'sendWindowStart')::time,
    (campaign_input ->> 'sendWindowEnd')::time,
    campaign_input ->> 'timezone',
    (campaign_input ->> 'dailyLimit')::integer,
    (campaign_input ->> 'monthlyLimit')::integer,
    (campaign_input ->> 'minIntervalMinutes')::integer,
    (campaign_input ->> 'maxIntervalMinutes')::integer,
    (campaign_input ->> 'stopOnReply')::boolean,
    (campaign_input ->> 'autoReplenish')::boolean,
    (campaign_input ->> 'replenishThreshold')::integer,
    (campaign_input ->> 'replenishCount')::integer,
    (campaign_input ->> 'replenishMinimumScore')::smallint,
    (campaign_input ->> 'replenishRequireApproval')::boolean,
    target_actor_id
  )
  returning id into campaign_id;

  insert into public.campaign_leads (
    workspace_id, campaign_id, lead_id, status, added_by
  )
  select target_workspace_id, campaign_id, candidate.id, 'pending', target_actor_id
  from (
    select lead.id
    from public.leads lead
    where lead.workspace_id = target_workspace_id
      and not lead.do_not_contact
      and lead.status not in ('do_not_contact', 'archived', 'disqualified')
      and (
        jsonb_array_length(campaign_input -> 'leadIds') = 0
        or lead.id = any(array(
          select value::uuid
          from jsonb_array_elements_text(campaign_input -> 'leadIds')
        ))
      )
      and (
        ('email' = any(array(
          select jsonb_array_elements_text(campaign_input -> 'channels')
        )) and lead.email is not null)
        or ('whatsapp' = any(array(
          select jsonb_array_elements_text(campaign_input -> 'channels')
        )) and lead.phone is not null and lead.whatsapp_consent_status = 'opted_in')
        or ('instagram' = any(array(
          select jsonb_array_elements_text(campaign_input -> 'channels')
        )) and lead.instagram_url is not null)
        or ('linkedin' = any(array(
          select jsonb_array_elements_text(campaign_input -> 'channels')
        )) and lead.linkedin_url is not null)
      )
    order by lead.qualification_score desc nulls last, lead.created_at desc
    limit (campaign_input ->> 'targetProspectCount')::integer
  ) candidate;

  for channel_name in
    select jsonb_array_elements_text(campaign_input -> 'channels')
  loop
    selected_integration_id := null;
    if channel_name = 'email' then
      select integration.id into selected_integration_id
      from public.integrations integration
      where integration.workspace_id = target_workspace_id
        and integration.provider in ('gmail', 'outlook', 'resend', 'ses', 'smtp')
        and integration.status = 'connected'
      order by
        case integration.provider
          when 'gmail' then 1 when 'outlook' then 2 when 'resend' then 3
          when 'ses' then 4 else 5
        end,
        integration.updated_at desc
      limit 1;
    elsif channel_name = 'whatsapp' then
      select integration.id into selected_integration_id
      from public.integrations integration
      where integration.workspace_id = target_workspace_id
        and integration.provider = 'whatsapp'
        and integration.status = 'connected'
      order by integration.updated_at desc
      limit 1;
    end if;

    insert into public.campaign_channels (
      workspace_id, campaign_id, channel, integration_id
    )
    values (
      target_workspace_id,
      campaign_id,
      channel_name::public.outreach_channel,
      selected_integration_id
    );
  end loop;

  insert into public.audit_logs (
    workspace_id, actor_id, actor_type, action, entity_type, entity_id,
    after_state
  )
  values (
    target_workspace_id, target_actor_id, 'user', 'campaign.created',
    'campaign', campaign_id,
    jsonb_build_object(
      'targetProspectCount', campaign_input -> 'targetProspectCount',
      'channels', campaign_input -> 'channels'
    )
  );
  return campaign_id;
end;
$$;

create or replace function private.approve_message(
  target_workspace_id uuid,
  target_message_id uuid,
  target_actor_id uuid,
  expected_updated_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_message public.messages;
  latest_version public.message_versions;
begin
  select * into target_message
  from public.messages
  where id = target_message_id and workspace_id = target_workspace_id
  for update;
  if target_message.id is null then return false; end if;
  if target_message.updated_at <> expected_updated_at then
    raise exception 'OPTIMISTIC_LOCK_CONFLICT';
  end if;
  if target_message.approval_status = 'approved' then
    return true;
  end if;
  select * into latest_version
  from public.message_versions
  where message_id = target_message_id and workspace_id = target_workspace_id
  order by version_number desc
  limit 1;
  if cardinality(target_message.grounding_source_ids) = 0
    or latest_version.id is null
    or jsonb_array_length(latest_version.unsupported_claims) > 0 then
    raise exception 'GROUNDING_REVIEW_REQUIRED';
  end if;
  if exists (
    select 1
    from unnest(target_message.grounding_source_ids) source_id
    where not exists (
      select 1 from public.lead_sources source
      where source.id = source_id
        and source.workspace_id = target_workspace_id
        and source.lead_id = target_message.lead_id
        and source.allowed_for_automated_use
    )
  ) then
    raise exception 'GROUNDING_SOURCE_INVALID';
  end if;

  update public.messages
  set approval_status = 'approved',
      approved_by = target_actor_id,
      approved_at = now(),
      updated_at = now()
  where id = target_message_id;
  insert into public.audit_logs (
    workspace_id, actor_id, actor_type, action, entity_type, entity_id
  ) values (
    target_workspace_id, target_actor_id, 'user', 'message.approved',
    'message', target_message_id
  );
  return true;
end;
$$;

create or replace function private.revise_message(
  target_workspace_id uuid,
  target_message_id uuid,
  target_actor_id uuid,
  expected_updated_at timestamptz,
  next_subject text,
  next_body text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_message public.messages;
  latest_version public.message_versions;
begin
  select * into target_message
  from public.messages
  where id = target_message_id and workspace_id = target_workspace_id
  for update;
  if target_message.id is null then return false; end if;
  if target_message.updated_at <> expected_updated_at then
    raise exception 'OPTIMISTIC_LOCK_CONFLICT';
  end if;
  select * into latest_version
  from public.message_versions
  where message_id = target_message_id and workspace_id = target_workspace_id
  order by version_number desc
  limit 1;
  if latest_version.id is null then raise exception 'MESSAGE_VERSION_NOT_FOUND'; end if;

  insert into public.message_versions (
    workspace_id, message_id, version_number, subject, body, generation_model,
    generation_prompt_version, personalization_facts, grounding_source_ids,
    risk_flags, unsupported_claims, created_by, created_by_type
  )
  values (
    target_workspace_id, target_message_id, latest_version.version_number + 1,
    nullif(next_subject, ''), next_body, latest_version.generation_model,
    latest_version.generation_prompt_version, latest_version.personalization_facts,
    latest_version.grounding_source_ids, latest_version.risk_flags,
    latest_version.unsupported_claims, target_actor_id, 'user'
  );
  update public.messages
  set subject = nullif(next_subject, ''),
      body = next_body,
      approval_status = 'needs_review',
      approved_by = null,
      approved_at = null,
      updated_at = now()
  where id = target_message_id;
  insert into public.audit_logs (
    workspace_id, actor_id, actor_type, action, entity_type, entity_id
  ) values (
    target_workspace_id, target_actor_id, 'user', 'message.revised',
    'message', target_message_id
  );
  return true;
end;
$$;

create or replace function private.transition_campaign(
  target_workspace_id uuid,
  target_campaign_id uuid,
  target_actor_id uuid,
  expected_updated_at timestamptz,
  target_action text,
  message_schedule jsonb default '[]'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_campaign public.campaigns;
  message_total integer;
  scheduled_total integer;
begin
  if target_action not in ('launch', 'pause', 'resume', 'kill') then
    raise exception 'INVALID_CAMPAIGN_ACTION';
  end if;
  select * into target_campaign
  from public.campaigns
  where id = target_campaign_id and workspace_id = target_workspace_id
  for update;
  if target_campaign.id is null then return false; end if;
  if target_campaign.updated_at <> expected_updated_at then
    raise exception 'OPTIMISTIC_LOCK_CONFLICT';
  end if;

  if target_action = 'launch' then
    if target_campaign.status not in ('draft', 'awaiting_approval', 'scheduled') then
      raise exception 'CAMPAIGN_STATE_INVALID';
    end if;
    select count(*) into message_total
    from public.messages
    where workspace_id = target_workspace_id
      and campaign_id = target_campaign_id
      and send_status in ('draft', 'queued', 'scheduled');
    if message_total = 0 then raise exception 'CAMPAIGN_MESSAGES_REQUIRED'; end if;
    if exists (
      select 1
      from public.messages message
      join public.leads lead on lead.id = message.lead_id
      where message.workspace_id = target_workspace_id
        and message.campaign_id = target_campaign_id
        and (
          message.approval_status <> 'approved'
          or cardinality(message.grounding_source_ids) = 0
          or lead.do_not_contact
          or lead.status = 'do_not_contact'
          or (message.channel = 'whatsapp'
            and lead.whatsapp_consent_status <> 'opted_in')
        )
    ) then
      raise exception 'CAMPAIGN_SAFETY_GATE_FAILED';
    end if;
    if exists (
      select 1
      from public.messages message
      where message.workspace_id = target_workspace_id
        and message.campaign_id = target_campaign_id
        and message.channel in ('email', 'whatsapp')
        and not exists (
          select 1
          from public.campaign_channels channel
          join public.integrations integration on integration.id = channel.integration_id
          where channel.workspace_id = target_workspace_id
            and channel.campaign_id = target_campaign_id
            and channel.channel = message.channel
            and channel.enabled
            and integration.status = 'connected'
        )
    ) then
      raise exception 'CAMPAIGN_PROVIDER_UNAVAILABLE';
    end if;
    if jsonb_typeof(message_schedule) <> 'array' then
      raise exception 'INVALID_MESSAGE_SCHEDULE';
    end if;

    with schedule as (
      select
        (entry ->> 'id')::uuid as id,
        (entry ->> 'scheduledAt')::timestamptz as scheduled_at
      from jsonb_array_elements(message_schedule) entry
    )
    update public.messages message
    set send_status = 'scheduled',
        scheduled_at = schedule.scheduled_at,
        failure_code = null,
        failure_message = null,
        updated_at = now()
    from schedule
    where message.id = schedule.id
      and message.workspace_id = target_workspace_id
      and message.campaign_id = target_campaign_id
      and message.send_status in ('draft', 'queued', 'scheduled');
    get diagnostics scheduled_total = row_count;
    if scheduled_total <> message_total then
      raise exception 'MESSAGE_SCHEDULE_INCOMPLETE';
    end if;
    update public.campaigns
    set status = 'running', launched_at = coalesce(launched_at, now()),
        paused_at = null, updated_at = now()
    where id = target_campaign_id;
  elsif target_action = 'pause' then
    if target_campaign.status <> 'running' then raise exception 'CAMPAIGN_STATE_INVALID'; end if;
    update public.messages
    set send_status = 'paused', updated_at = now()
    where workspace_id = target_workspace_id
      and campaign_id = target_campaign_id
      and send_status in ('queued', 'scheduled');
    update public.campaigns
    set status = 'paused', paused_at = now(), updated_at = now()
    where id = target_campaign_id;
  elsif target_action = 'resume' then
    if target_campaign.status <> 'paused' then raise exception 'CAMPAIGN_STATE_INVALID'; end if;
    update public.messages
    set send_status = 'scheduled', updated_at = now()
    where workspace_id = target_workspace_id
      and campaign_id = target_campaign_id
      and send_status = 'paused' and scheduled_at is not null;
    update public.campaigns
    set status = 'running', paused_at = null, updated_at = now()
    where id = target_campaign_id;
  else
    if target_campaign.status in ('completed', 'killed') then
      raise exception 'CAMPAIGN_STATE_INVALID';
    end if;
    update public.messages
    set send_status = 'cancelled', updated_at = now()
    where workspace_id = target_workspace_id
      and campaign_id = target_campaign_id
      and send_status not in ('sent', 'delivered', 'read', 'replied', 'cancelled');
    update public.campaigns
    set status = 'killed', killed_at = now(), updated_at = now()
    where id = target_campaign_id;
  end if;

  insert into public.audit_logs (
    workspace_id, actor_id, actor_type, action, entity_type, entity_id
  ) values (
    target_workspace_id, target_actor_id, 'user', 'campaign.' || target_action,
    'campaign', target_campaign_id
  );
  return true;
end;
$$;

revoke all on function private.create_campaign(uuid, uuid, jsonb)
  from public, anon, authenticated;
revoke all on function private.approve_message(uuid, uuid, uuid, timestamptz)
  from public, anon, authenticated;
revoke all on function private.revise_message(uuid, uuid, uuid, timestamptz, text, text)
  from public, anon, authenticated;
revoke all on function private.transition_campaign(uuid, uuid, uuid, timestamptz, text, jsonb)
  from public, anon, authenticated;
grant execute on function private.create_campaign(uuid, uuid, jsonb) to service_role;
grant execute on function private.approve_message(uuid, uuid, uuid, timestamptz) to service_role;
grant execute on function private.revise_message(uuid, uuid, uuid, timestamptz, text, text) to service_role;
grant execute on function private.transition_campaign(uuid, uuid, uuid, timestamptz, text, jsonb)
  to service_role;
