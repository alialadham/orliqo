alter table public.business_profiles
  add column if not exists currency char(3) not null default 'USD' check (currency = upper(currency)),
  add column if not exists custom_cta text,
  add column if not exists channel_preferences jsonb not null default '{}'::jsonb check (jsonb_typeof(channel_preferences) = 'object'),
  add column if not exists campaign_defaults jsonb not null default '{}'::jsonb check (jsonb_typeof(campaign_defaults) = 'object');

alter table public.ideal_customer_profiles
  add column if not exists summary text,
  add column if not exists is_default boolean not null default false,
  add column if not exists audience_breadth text not null default 'balanced'
    check (audience_breadth in ('narrow', 'balanced', 'broad')),
  add column if not exists archived_at timestamptz,
  add column if not exists duplicated_from_id uuid references public.ideal_customer_profiles(id) on delete set null;

create unique index if not exists ideal_customer_profiles_one_default_idx
  on public.ideal_customer_profiles (workspace_id)
  where is_default and archived_at is null;
create index if not exists ideal_customer_profiles_workspace_archive_idx
  on public.ideal_customer_profiles (workspace_id, archived_at, updated_at desc);

alter table public.website_imports
  add column if not exists provider text not null default 'mock',
  add column if not exists model text not null default 'deterministic-v1',
  add column if not exists prompt_version text not null default 'website-import-v1',
  add column if not exists usage_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(usage_metadata) = 'object'),
  add column if not exists source_retrieved_at timestamptz;

alter table public.website_import_suggestions
  add column if not exists retrieved_at timestamptz not null default now(),
  add column if not exists provider text not null default 'mock',
  add column if not exists model text not null default 'deterministic-v1',
  add column if not exists prompt_version text not null default 'website-import-v1';

alter table public.lead_score_components
  add column if not exists rule_version text not null default 'phase2-v1';

alter table public.import_jobs
  add column if not exists updated_rows integer not null default 0 check (updated_rows >= 0),
  add column if not exists skipped_rows integer not null default 0 check (skipped_rows >= 0),
  add column if not exists invalid_rows integer not null default 0 check (invalid_rows >= 0),
  add column if not exists suppressed_rows integer not null default 0 check (suppressed_rows >= 0),
  add column if not exists import_options jsonb not null default '{}'::jsonb check (jsonb_typeof(import_options) = 'object');

create index if not exists leads_workspace_filter_idx
  on public.leads (workspace_id, industry, country, city, website_status, status);
create index if not exists leads_workspace_contact_filter_idx
  on public.leads (workspace_id, email_verification_status, phone_verification_status, do_not_contact);
create index if not exists website_imports_workspace_created_idx
  on public.website_imports (workspace_id, created_at desc);

create or replace function public.validate_lead_evidence_scope()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  source_workspace_id uuid;
  source_lead_id uuid;
begin
  if new.source_id is null then
    if new.confidence = 'verified' then
      raise exception 'Verified evidence requires a stored source';
    end if;
    return new;
  end if;

  select workspace_id, lead_id into source_workspace_id, source_lead_id
  from public.lead_sources
  where id = new.source_id;

  if source_workspace_id is null
    or source_workspace_id <> new.workspace_id
    or source_lead_id <> new.lead_id then
    raise exception 'Evidence source must belong to the same workspace and lead';
  end if;

  return new;
end;
$$;

revoke execute on function public.validate_lead_evidence_scope() from public, anon, authenticated;

drop trigger if exists lead_field_evidence_validate_scope on public.lead_field_evidence;
create trigger lead_field_evidence_validate_scope
  before insert or update of workspace_id, lead_id, source_id, confidence
  on public.lead_field_evidence
  for each row execute function public.validate_lead_evidence_scope();

drop policy if exists leads_update on public.leads;
create policy leads_update on public.leads
  for update to authenticated
  using (
    private.has_workspace_permission(workspace_id, 'lead:update')
    and (
      private.current_workspace_role(workspace_id) <> 'sales_representative'
      or assigned_to is null
      or assigned_to = auth.uid()
    )
  )
  with check (
    private.has_workspace_permission(workspace_id, 'lead:update')
    and (
      private.current_workspace_role(workspace_id) <> 'sales_representative'
      or assigned_to = auth.uid()
    )
  );

drop policy if exists lead_notes_update on public.lead_notes;
create policy lead_notes_update on public.lead_notes
  for update to authenticated
  using (
    private.has_workspace_permission(workspace_id, 'lead:update')
    and (author_id = auth.uid() or private.has_workspace_permission(workspace_id, 'lead:delete'))
  )
  with check (
    private.has_workspace_permission(workspace_id, 'lead:update')
    and (author_id = auth.uid() or private.has_workspace_permission(workspace_id, 'lead:delete'))
  );

drop policy if exists lead_notes_delete on public.lead_notes;
create policy lead_notes_delete on public.lead_notes
  for delete to authenticated
  using (
    private.has_workspace_permission(workspace_id, 'lead:update')
    and (author_id = auth.uid() or private.has_workspace_permission(workspace_id, 'lead:delete'))
  );

create or replace function private.suppress_lead(
  target_lead_id uuid,
  suppression_reason text,
  suppression_origin public.suppression_source default 'user'
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.leads%rowtype;
begin
  select * into target from public.leads where id = target_lead_id for update;
  if target.id is null or not private.has_workspace_permission(target.workspace_id, 'lead:update') then
    return false;
  end if;

  update public.leads
  set do_not_contact = true,
      do_not_contact_reason = suppression_reason,
      status = 'do_not_contact'
  where id = target.id;

  insert into public.suppression_entries (workspace_id, type, normalized_value, reason, source, created_by, lead_id)
  select target.workspace_id, value_type, normalized_value, suppression_reason,
         suppression_origin, auth.uid(), target.id
  from (values
    ('email'::public.suppression_type, target.normalized_email),
    ('phone'::public.suppression_type, target.normalized_phone),
    ('domain'::public.suppression_type, target.normalized_domain),
    ('business'::public.suppression_type, target.normalized_business_city),
    ('social_profile'::public.suppression_type, coalesce(target.normalized_instagram_url, target.normalized_linkedin_url))
  ) as identities(value_type, normalized_value)
  where normalized_value is not null
  on conflict (workspace_id, type, normalized_value)
  do update set reason = excluded.reason, source = excluded.source, lead_id = excluded.lead_id,
                expires_at = null, updated_at = now();

  update public.messages
  set send_status = 'suppressed', failure_code = 'LEAD_SUPPRESSED',
      failure_message = 'Cancelled because the lead is suppressed.'
  where workspace_id = target.workspace_id and lead_id = target.id
    and send_status in ('draft', 'queued', 'scheduled', 'paused');

  insert into public.lead_activities (workspace_id, lead_id, actor_type, actor_id, event_type, summary, metadata)
  values (target.workspace_id, target.id, 'user', auth.uid(), 'lead.suppressed',
          'Lead marked do not contact', jsonb_build_object('reason', suppression_reason));

  insert into public.audit_logs (workspace_id, actor_id, actor_type, action, entity_type, entity_id, after_state)
  values (target.workspace_id, auth.uid(), 'user', 'lead.suppressed', 'lead', target.id,
          jsonb_build_object('reason', suppression_reason, 'source', suppression_origin));

  return true;
end;
$$;

create or replace function private.restore_suppressed_lead(target_lead_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.leads%rowtype;
begin
  select * into target from public.leads where id = target_lead_id for update;
  if target.id is null or not private.has_workspace_permission(target.workspace_id, 'lead:delete') then
    return false;
  end if;

  delete from public.suppression_entries
  where workspace_id = target.workspace_id and lead_id = target.id and source = 'user';

  update public.leads
  set do_not_contact = false, do_not_contact_reason = null,
      status = case when status = 'do_not_contact' then 'new' else status end
  where id = target.id;

  insert into public.lead_activities (workspace_id, lead_id, actor_type, actor_id, event_type, summary)
  values (target.workspace_id, target.id, 'user', auth.uid(), 'lead.restored', 'Lead restored from do not contact');

  insert into public.audit_logs (workspace_id, actor_id, actor_type, action, entity_type, entity_id, after_state)
  values (target.workspace_id, auth.uid(), 'user', 'lead.restored', 'lead', target.id, '{"do_not_contact":false}'::jsonb);

  return true;
end;
$$;

revoke all on function private.suppress_lead(uuid, text, public.suppression_source),
  private.restore_suppressed_lead(uuid) from public, anon, authenticated;

create or replace function public.suppress_lead(
  target_lead_id uuid,
  suppression_reason text,
  suppression_origin public.suppression_source default 'user'
)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select private.suppress_lead(target_lead_id, suppression_reason, suppression_origin);
$$;

create or replace function public.restore_suppressed_lead(target_lead_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select private.restore_suppressed_lead(target_lead_id);
$$;

revoke all on function public.suppress_lead(uuid, text, public.suppression_source),
  public.restore_suppressed_lead(uuid) from public, anon;
grant execute on function public.suppress_lead(uuid, text, public.suppression_source),
  public.restore_suppressed_lead(uuid) to authenticated;
