grant usage on schema public to anon, authenticated;
grant usage on schema private to authenticated;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all tables in schema private from anon, authenticated;

create or replace function private.shares_active_workspace(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.workspace_members mine
    join public.workspace_members theirs on theirs.workspace_id = mine.workspace_id
    where mine.user_id = auth.uid()
      and mine.status = 'active'
      and theirs.user_id = target_user_id
      and theirs.status = 'active'
  );
$$;

create or replace function private.storage_workspace_id(object_name text)
returns uuid
language plpgsql
immutable
security definer
set search_path = ''
as $$
declare
  workspace_text text;
begin
  workspace_text := split_part(object_name, '/', 1);
  if workspace_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return null;
  end if;
  return workspace_text::uuid;
exception when others then
  return null;
end;
$$;

revoke all on function private.shares_active_workspace(uuid), private.storage_workspace_id(text) from public, anon;
grant execute on function private.shares_active_workspace(uuid), private.storage_workspace_id(text) to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'workspaces', 'workspace_members', 'workspace_invitations', 'role_permissions', 'workspace_settings',
    'business_profiles', 'ideal_customer_profiles', 'website_imports', 'website_import_suggestions', 'leads',
    'lead_sources', 'lead_field_evidence', 'lead_score_components', 'lead_notes', 'lead_activities', 'tags',
    'lead_tags', 'saved_views', 'suppression_entries', 'consent_records', 'import_jobs', 'import_rows',
    'campaigns', 'campaign_channels', 'campaign_leads', 'campaign_replenishment_runs', 'message_templates',
    'conversations', 'messages', 'message_versions', 'message_attempts', 'message_events', 'reply_suggestions',
    'scheduled_events', 'meetings', 'opportunities', 'integrations', 'provider_webhook_events',
    'provider_sync_states', 'whatsapp_templates', 'email_accounts', 'subscriptions', 'plan_entitlements',
    'usage_counters', 'usage_reservations', 'billing_events', 'audit_logs', 'notifications', 'daily_analytics',
    'job_runs', 'compliance_requests'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end;
$$;

create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or private.shares_active_workspace(id));
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy workspaces_select on public.workspaces
  for select to authenticated
  using (private.is_active_workspace_member(id));
create policy workspaces_update on public.workspaces
  for update to authenticated
  using (private.has_workspace_permission(id, 'workspace:manage'))
  with check (private.has_workspace_permission(id, 'workspace:manage'));
create policy workspaces_delete on public.workspaces
  for delete to authenticated
  using (private.has_workspace_permission(id, 'workspace:delete'));

create policy workspace_members_select on public.workspace_members
  for select to authenticated
  using (private.is_active_workspace_member(workspace_id));
create policy workspace_members_insert on public.workspace_members
  for insert to authenticated
  with check (private.has_workspace_permission(workspace_id, 'team:invite'));
create policy workspace_members_update on public.workspace_members
  for update to authenticated
  using (private.has_workspace_permission(workspace_id, 'team:manage_roles'))
  with check (private.has_workspace_permission(workspace_id, 'team:manage_roles'));
create policy workspace_members_delete on public.workspace_members
  for delete to authenticated
  using (private.has_workspace_permission(workspace_id, 'team:manage_roles') and role <> 'owner');

create policy workspace_invitations_select on public.workspace_invitations
  for select to authenticated
  using (private.has_workspace_permission(workspace_id, 'team:view'));
create policy workspace_invitations_insert on public.workspace_invitations
  for insert to authenticated
  with check (private.has_workspace_permission(workspace_id, 'team:invite'));
create policy workspace_invitations_update on public.workspace_invitations
  for update to authenticated
  using (private.has_workspace_permission(workspace_id, 'team:manage_roles'))
  with check (private.has_workspace_permission(workspace_id, 'team:manage_roles'));
create policy workspace_invitations_delete on public.workspace_invitations
  for delete to authenticated
  using (private.has_workspace_permission(workspace_id, 'team:manage_roles'));

create policy role_permissions_select on public.role_permissions
  for select to authenticated using (true);

create policy workspace_settings_select on public.workspace_settings
  for select to authenticated using (private.is_active_workspace_member(workspace_id));
create policy workspace_settings_insert on public.workspace_settings
  for insert to authenticated with check (private.has_workspace_permission(workspace_id, 'settings:manage'));
create policy workspace_settings_update on public.workspace_settings
  for update to authenticated
  using (private.has_workspace_permission(workspace_id, 'settings:manage'))
  with check (private.has_workspace_permission(workspace_id, 'settings:manage'));

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'business_profiles', 'ideal_customer_profiles', 'website_imports', 'website_import_suggestions', 'leads',
    'lead_sources', 'lead_field_evidence', 'lead_score_components', 'lead_notes', 'lead_activities', 'tags',
    'lead_tags', 'saved_views', 'suppression_entries', 'consent_records', 'import_jobs', 'import_rows',
    'campaigns', 'campaign_channels', 'campaign_leads', 'campaign_replenishment_runs', 'conversations', 'messages',
    'message_versions', 'message_attempts', 'message_events', 'reply_suggestions', 'scheduled_events', 'meetings',
    'opportunities', 'integrations', 'provider_sync_states', 'whatsapp_templates', 'email_accounts', 'subscriptions',
    'usage_counters', 'usage_reservations', 'audit_logs', 'notifications', 'daily_analytics', 'job_runs',
    'compliance_requests'
  ]
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (private.is_active_workspace_member(workspace_id))',
      table_name || '_workspace_select',
      table_name
    );
  end loop;
end;
$$;

create policy message_templates_select on public.message_templates
  for select to authenticated
  using (workspace_id is null or private.is_active_workspace_member(workspace_id));
create policy plan_entitlements_public_select on public.plan_entitlements
  for select to anon, authenticated using (true);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'business_profiles', 'ideal_customer_profiles', 'website_imports', 'website_import_suggestions'
  ] loop
    execute format('create policy %I on public.%I for insert to authenticated with check (private.has_workspace_permission(workspace_id, ''settings:manage''))', table_name || '_insert', table_name);
    execute format('create policy %I on public.%I for update to authenticated using (private.has_workspace_permission(workspace_id, ''settings:manage'')) with check (private.has_workspace_permission(workspace_id, ''settings:manage''))', table_name || '_update', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using (private.has_workspace_permission(workspace_id, ''settings:manage''))', table_name || '_delete', table_name);
  end loop;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'leads', 'lead_sources', 'lead_field_evidence', 'lead_score_components', 'lead_notes', 'lead_activities',
    'tags', 'lead_tags', 'saved_views', 'suppression_entries', 'consent_records', 'import_jobs', 'import_rows'
  ] loop
    execute format('create policy %I on public.%I for insert to authenticated with check (private.has_workspace_permission(workspace_id, ''lead:create''))', table_name || '_insert', table_name);
    execute format('create policy %I on public.%I for update to authenticated using (private.has_workspace_permission(workspace_id, ''lead:update'')) with check (private.has_workspace_permission(workspace_id, ''lead:update''))', table_name || '_update', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using (private.has_workspace_permission(workspace_id, ''lead:delete''))', table_name || '_delete', table_name);
  end loop;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['campaigns', 'campaign_channels', 'campaign_leads'] loop
    execute format('create policy %I on public.%I for insert to authenticated with check (private.has_workspace_permission(workspace_id, ''campaign:create''))', table_name || '_insert', table_name);
    execute format('create policy %I on public.%I for update to authenticated using (private.has_workspace_permission(workspace_id, ''campaign:update'')) with check (private.has_workspace_permission(workspace_id, ''campaign:update''))', table_name || '_update', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using (private.has_workspace_permission(workspace_id, ''campaign:kill''))', table_name || '_delete', table_name);
  end loop;
end;
$$;

create policy message_templates_insert on public.message_templates
  for insert to authenticated
  with check (workspace_id is not null and private.has_workspace_permission(workspace_id, 'message:generate'));
create policy message_templates_update on public.message_templates
  for update to authenticated
  using (workspace_id is not null and private.has_workspace_permission(workspace_id, 'message:edit'))
  with check (workspace_id is not null and private.has_workspace_permission(workspace_id, 'message:edit'));
create policy message_templates_delete on public.message_templates
  for delete to authenticated
  using (workspace_id is not null and private.has_workspace_permission(workspace_id, 'message:edit'));

do $$
declare
  table_name text;
begin
  foreach table_name in array array['messages', 'message_versions'] loop
    execute format('create policy %I on public.%I for insert to authenticated with check (private.has_workspace_permission(workspace_id, ''message:generate''))', table_name || '_insert', table_name);
    execute format('create policy %I on public.%I for update to authenticated using (private.has_workspace_permission(workspace_id, ''message:edit'')) with check (private.has_workspace_permission(workspace_id, ''message:edit''))', table_name || '_update', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using (private.has_workspace_permission(workspace_id, ''message:edit''))', table_name || '_delete', table_name);
  end loop;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['conversations', 'reply_suggestions', 'scheduled_events', 'meetings', 'opportunities'] loop
    execute format('create policy %I on public.%I for insert to authenticated with check (private.has_workspace_permission(workspace_id, ''inbox:reply''))', table_name || '_insert', table_name);
    execute format('create policy %I on public.%I for update to authenticated using (private.has_workspace_permission(workspace_id, ''inbox:reply'')) with check (private.has_workspace_permission(workspace_id, ''inbox:reply''))', table_name || '_update', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using (private.has_workspace_permission(workspace_id, ''inbox:reply''))', table_name || '_delete', table_name);
  end loop;
end;
$$;

create policy integrations_insert on public.integrations
  for insert to authenticated with check (private.has_workspace_permission(workspace_id, 'integrations:manage'));
create policy integrations_update on public.integrations
  for update to authenticated
  using (private.has_workspace_permission(workspace_id, 'integrations:manage'))
  with check (private.has_workspace_permission(workspace_id, 'integrations:manage'));
create policy integrations_delete on public.integrations
  for delete to authenticated using (private.has_workspace_permission(workspace_id, 'integrations:manage'));

create policy notifications_update on public.notifications
  for update to authenticated
  using (user_id = auth.uid() and private.is_active_workspace_member(workspace_id))
  with check (user_id = auth.uid() and private.is_active_workspace_member(workspace_id));

drop policy if exists notifications_workspace_select on public.notifications;
create policy notifications_select on public.notifications
  for select to authenticated
  using (user_id = auth.uid() and private.is_active_workspace_member(workspace_id));

drop policy if exists audit_logs_workspace_select on public.audit_logs;
create policy audit_logs_select on public.audit_logs
  for select to authenticated using (private.has_workspace_permission(workspace_id, 'audit:view'));
drop policy if exists subscriptions_workspace_select on public.subscriptions;
create policy subscriptions_select on public.subscriptions
  for select to authenticated using (private.has_workspace_permission(workspace_id, 'billing:view'));
drop policy if exists integrations_workspace_select on public.integrations;
create policy integrations_select on public.integrations
  for select to authenticated using (private.has_workspace_permission(workspace_id, 'integrations:view'));
drop policy if exists provider_sync_states_workspace_select on public.provider_sync_states;
create policy provider_sync_states_select on public.provider_sync_states
  for select to authenticated using (private.has_workspace_permission(workspace_id, 'integrations:view'));
drop policy if exists whatsapp_templates_workspace_select on public.whatsapp_templates;
create policy whatsapp_templates_select on public.whatsapp_templates
  for select to authenticated using (private.has_workspace_permission(workspace_id, 'integrations:view'));
drop policy if exists email_accounts_workspace_select on public.email_accounts;
create policy email_accounts_select on public.email_accounts
  for select to authenticated using (private.has_workspace_permission(workspace_id, 'integrations:view'));
drop policy if exists daily_analytics_workspace_select on public.daily_analytics;
create policy daily_analytics_select on public.daily_analytics
  for select to authenticated using (private.has_workspace_permission(workspace_id, 'analytics:view'));
drop policy if exists job_runs_workspace_select on public.job_runs;
create policy job_runs_select on public.job_runs
  for select to authenticated using (private.has_workspace_permission(workspace_id, 'audit:view'));
drop policy if exists compliance_requests_workspace_select on public.compliance_requests;
create policy compliance_requests_select on public.compliance_requests
  for select to authenticated using (private.has_workspace_permission(workspace_id, 'settings:manage'));

grant select, update on public.profiles to authenticated;
grant select, update, delete on public.workspaces to authenticated;
grant select, insert, update, delete on public.workspace_members, public.workspace_invitations to authenticated;
grant select on public.role_permissions to authenticated;
grant select, insert, update on public.workspace_settings to authenticated;

grant select, insert, update, delete on
  public.business_profiles, public.ideal_customer_profiles, public.website_imports, public.website_import_suggestions,
  public.leads, public.lead_sources, public.lead_field_evidence, public.lead_score_components, public.lead_notes,
  public.lead_activities, public.tags, public.lead_tags, public.saved_views, public.suppression_entries,
  public.consent_records, public.import_jobs, public.import_rows, public.campaigns, public.campaign_channels,
  public.campaign_leads, public.message_templates, public.conversations, public.messages, public.message_versions,
  public.reply_suggestions, public.scheduled_events, public.meetings, public.opportunities, public.integrations
to authenticated;

grant select on
  public.campaign_replenishment_runs, public.message_attempts, public.message_events, public.provider_sync_states,
  public.whatsapp_templates, public.email_accounts, public.subscriptions, public.usage_counters,
  public.usage_reservations, public.audit_logs, public.notifications, public.daily_analytics, public.job_runs,
  public.compliance_requests
to authenticated;
grant update on public.notifications to authenticated;
grant select on public.plan_entitlements to anon, authenticated;

create or replace view public.workspace_teammates
with (security_invoker = true)
as
select
  membership.workspace_id,
  profile.id as user_id,
  profile.full_name,
  profile.avatar_url,
  membership.role,
  membership.status,
  membership.joined_at
from public.workspace_members membership
join public.profiles profile on profile.id = membership.user_id;

grant select on public.workspace_teammates to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'workspace-assets',
  'workspace-assets',
  false,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy workspace_assets_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'workspace-assets'
    and private.is_active_workspace_member(private.storage_workspace_id(name))
  );

create policy workspace_assets_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'workspace-assets'
    and (
      (split_part(name, '/', 2) = 'logos' and private.has_workspace_permission(private.storage_workspace_id(name), 'settings:manage'))
      or (split_part(name, '/', 2) = 'imports' and private.has_workspace_permission(private.storage_workspace_id(name), 'lead:create'))
    )
    and case when coalesce(metadata ->> 'size', '') ~ '^[0-9]+$' then (metadata ->> 'size')::bigint else 0 end between 1 and 10485760
    and coalesce(metadata ->> 'mimetype', '') in (
      'image/png', 'image/jpeg', 'image/webp', 'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
  );

create policy workspace_assets_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'workspace-assets'
    and private.is_active_workspace_member(private.storage_workspace_id(name))
  )
  with check (
    bucket_id = 'workspace-assets'
    and (
      (split_part(name, '/', 2) = 'logos' and private.has_workspace_permission(private.storage_workspace_id(name), 'settings:manage'))
      or (split_part(name, '/', 2) = 'imports' and private.has_workspace_permission(private.storage_workspace_id(name), 'lead:update'))
    )
    and case when coalesce(metadata ->> 'size', '') ~ '^[0-9]+$' then (metadata ->> 'size')::bigint else 0 end between 1 and 10485760
  );

create policy workspace_assets_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'workspace-assets'
    and (
      (split_part(name, '/', 2) = 'logos' and private.has_workspace_permission(private.storage_workspace_id(name), 'settings:manage'))
      or (split_part(name, '/', 2) = 'imports' and private.has_workspace_permission(private.storage_workspace_id(name), 'lead:delete'))
    )
  );
