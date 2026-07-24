alter table public.daily_analytics
  add column if not exists template text,
  add column if not exists cta text,
  add column if not exists send_hour smallint check (send_hour is null or send_hour between 0 and 23),
  add column if not exists follow_up_step smallint not null default 0 check (follow_up_step >= 0);

do $$
declare constraint_name text;
begin
  select c.conname into constraint_name
  from pg_constraint c
  where c.conrelid = 'public.daily_analytics'::regclass
    and c.contype = 'u'
  limit 1;
  if constraint_name is not null then
    execute format('alter table public.daily_analytics drop constraint %I', constraint_name);
  end if;
end $$;

drop index if exists public.daily_analytics_workspace_campaign_metric_dimensions_idx;
create unique index daily_analytics_workspace_campaign_metric_dimensions_idx
  on public.daily_analytics (
    workspace_id,
    coalesce(campaign_id, '00000000-0000-0000-0000-000000000000'::uuid),
    metric_date,
    coalesce(channel::text, ''),
    coalesce(industry, ''),
    coalesce(country, ''),
    coalesce(template, ''),
    coalesce(cta, ''),
    coalesce(send_hour, -1),
    follow_up_step
  );

create index daily_analytics_workspace_campaign_date_idx
  on public.daily_analytics (workspace_id, campaign_id, metric_date desc);

create unique index campaign_replenishment_once_daily_idx
  on public.campaign_replenishment_runs (campaign_id, run_date);

create or replace function private.aggregate_daily_analytics(
  target_workspace_id uuid,
  target_date date
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare affected integer := 0;
begin
  if target_date > (now() at time zone 'utc')::date then
    raise exception 'ANALYTICS_FUTURE_DATE';
  end if;

  delete from public.daily_analytics
  where workspace_id = target_workspace_id and metric_date = target_date;

  insert into public.daily_analytics (
    workspace_id, campaign_id, metric_date, channel, industry, country,
    template, cta, send_hour, follow_up_step, discovered, qualified, approved,
    contacted, sent, delivered, opened, read, replied, positive, meetings,
    conversions, cost, revenue
  )
  select
    target_workspace_id,
    null,
    target_date,
    null,
    coalesce(l.industry, 'Unattributed'),
    coalesce(l.country, 'Unattributed'),
    null, null, null, 0,
    count(*)::integer,
    count(*) filter (where coalesce(l.qualification_score, 0) >= 70)::integer,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
  from public.leads l
  where l.workspace_id = target_workspace_id
    and (l.created_at at time zone 'utc')::date = target_date
  group by coalesce(l.industry, 'Unattributed'), coalesce(l.country, 'Unattributed')
  having count(*) > 0;

  insert into public.daily_analytics (
    workspace_id, campaign_id, metric_date, channel, industry, country,
    template, cta, send_hour, follow_up_step, discovered, qualified, approved,
    contacted, sent, delivered, opened, read, replied, positive, meetings,
    conversions, cost, revenue
  )
  select
    target_workspace_id,
    m.campaign_id,
    target_date,
    m.channel,
    coalesce(l.industry, 'Unattributed'),
    coalesce(l.country, 'Unattributed'),
    coalesce(mt.name, nullif(m.subject, ''), 'Unattributed'),
    coalesce(c.main_cta, 'Unattributed'),
    extract(hour from coalesce(m.sent_at, m.scheduled_at) at time zone coalesce(c.timezone, 'UTC'))::smallint,
    m.sequence_step,
    0, 0,
    count(*) filter (where m.approval_status = 'approved')::integer,
    count(*) filter (where m.sent_at is not null)::integer,
    count(*) filter (where m.sent_at is not null)::integer,
    count(*) filter (where m.delivered_at is not null)::integer,
    count(*) filter (where m.provider_metadata ? 'opened_at')::integer,
    count(*) filter (where m.read_at is not null)::integer,
    count(*) filter (where m.replied_at is not null)::integer,
    count(*) filter (where cv.intent in ('interested','asking_price','wants_information'))::integer,
    0, 0, 0, 0
  from public.messages m
  join public.leads l on l.id = m.lead_id and l.workspace_id = m.workspace_id
  left join public.campaigns c on c.id = m.campaign_id
  left join public.conversations cv on cv.id = m.conversation_id
  left join public.message_templates mt
    on mt.id = case
      when (m.provider_metadata->>'template_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then (m.provider_metadata->>'template_id')::uuid
      else null
    end
  where m.workspace_id = target_workspace_id
    and (coalesce(m.sent_at, m.approved_at, m.created_at) at time zone 'utc')::date = target_date
  group by m.campaign_id, m.channel, coalesce(l.industry, 'Unattributed'),
    coalesce(l.country, 'Unattributed'), coalesce(mt.name, nullif(m.subject, ''), 'Unattributed'),
    coalesce(c.main_cta, 'Unattributed'),
    extract(hour from coalesce(m.sent_at, m.scheduled_at) at time zone coalesce(c.timezone, 'UTC')),
    m.sequence_step;

  insert into public.daily_analytics (
    workspace_id, campaign_id, metric_date, channel, industry, country,
    meetings, conversions, revenue
  )
  select target_workspace_id, x.campaign_id, target_date, null, 'Unattributed', 'Unattributed',
    count(distinct x.meeting_id)::integer,
    count(distinct x.opportunity_id) filter (where x.stage = 'won')::integer,
    coalesce(sum(x.estimated_value) filter (where x.stage = 'won'), 0)
  from (
    select m.id meeting_id, null::uuid opportunity_id, m.campaign_id,
      null::text stage, null::numeric estimated_value
    from public.meetings m
    where m.workspace_id = target_workspace_id
      and (m.created_at at time zone 'utc')::date = target_date
    union all
    select null, o.id, o.campaign_id, o.stage, o.estimated_value
    from public.opportunities o
    where o.workspace_id = target_workspace_id
      and (coalesce(o.won_at, o.created_at) at time zone 'utc')::date = target_date
  ) x
  group by x.campaign_id
  on conflict (
    workspace_id,
    coalesce(campaign_id, '00000000-0000-0000-0000-000000000000'::uuid),
    metric_date,
    coalesce(channel::text, ''),
    coalesce(industry, ''),
    coalesce(country, ''),
    coalesce(template, ''),
    coalesce(cta, ''),
    coalesce(send_hour, -1),
    follow_up_step
  ) do update set
    meetings = excluded.meetings,
    conversions = excluded.conversions,
    revenue = excluded.revenue,
    updated_at = now();

  get diagnostics affected = row_count;
  return affected;
end;
$$;

create or replace function private.replenish_campaign_bounded(
  target_workspace_id uuid,
  target_campaign_id uuid,
  target_date date default (now() at time zone 'utc')::date
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.campaigns;
  queue_count integer;
  requested integer;
  added integer := 0;
  run_id uuid;
begin
  select * into target from public.campaigns
  where id = target_campaign_id and workspace_id = target_workspace_id
  for update;
  if target.id is null then raise exception 'CAMPAIGN_NOT_FOUND'; end if;
  if not target.auto_replenish or target.status <> 'running' then
    return jsonb_build_object('status', 'not_eligible', 'added', 0);
  end if;

  select count(*) into queue_count from public.campaign_leads
  where workspace_id = target_workspace_id and campaign_id = target_campaign_id
    and status in ('pending','ready','queued','active');
  if queue_count >= target.replenish_threshold then
    return jsonb_build_object('status', 'above_threshold', 'added', 0, 'queue', queue_count);
  end if;

  requested := least(100, target.replenish_count, greatest(0, target.target_prospect_count - queue_count));
  if requested = 0 then
    return jsonb_build_object('status', 'bounded_zero', 'added', 0, 'queue', queue_count);
  end if;

  insert into public.campaign_replenishment_runs (
    workspace_id, campaign_id, status, requested_count, minimum_score,
    require_approval, run_date
  ) values (
    target_workspace_id, target_campaign_id, 'running', requested,
    target.replenish_minimum_score, target.replenish_require_approval, target_date
  )
  on conflict (campaign_id, run_date) do nothing returning id into run_id;
  if run_id is null then
    return jsonb_build_object('status', 'duplicate_ignored', 'added', 0);
  end if;

  with candidates as (
    select l.id
    from public.leads l
    where l.workspace_id = target_workspace_id
      and not l.do_not_contact
      and coalesce(l.qualification_score, 0) >= target.replenish_minimum_score
      and not exists (
        select 1 from public.campaign_leads cl
        where cl.campaign_id = target_campaign_id and cl.lead_id = l.id
      )
    order by l.qualification_score desc nulls last, l.created_at
    limit requested
  )
  insert into public.campaign_leads (
    workspace_id, campaign_id, lead_id, status, approval_status, added_by,
    approved_by, approved_at
  )
  select target_workspace_id, target_campaign_id, id,
    case when target.replenish_require_approval then 'pending' else 'ready' end,
    case when target.replenish_require_approval then 'needs_review'::public.approval_status else 'approved'::public.approval_status end,
    target.created_by,
    case when target.replenish_require_approval then null else target.created_by end,
    case when target.replenish_require_approval then null else now() end
  from candidates;
  get diagnostics added = row_count;

  update public.campaign_replenishment_runs
  set status = 'succeeded', added_count = added, updated_at = now()
  where id = run_id;
  return jsonb_build_object('status', 'succeeded', 'added', added, 'requested', requested);
end;
$$;

revoke all on function private.aggregate_daily_analytics(uuid, date) from public, anon, authenticated;
revoke all on function private.replenish_campaign_bounded(uuid, uuid, date) from public, anon, authenticated;
grant execute on function private.aggregate_daily_analytics(uuid, date) to service_role;
grant execute on function private.replenish_campaign_bounded(uuid, uuid, date) to service_role;
