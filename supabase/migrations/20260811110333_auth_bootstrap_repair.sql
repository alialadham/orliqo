-- Idempotent repair for auth users whose original workspace bootstrap was partial.
create or replace function private.ensure_auth_user_workspace(target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  auth_user auth.users;
  metadata jsonb;
  profile_name text;
  company_name text;
  target_workspace_id uuid;
  workspace_slug text;
  workspace_created boolean := false;
  seed_mode boolean := coalesce(current_setting('orliqo.seed_mode', true), 'off') = 'on';
begin
  select * into auth_user from auth.users where id = target_user_id;
  if auth_user.id is null then
    raise exception 'AUTH_USER_NOT_FOUND';
  end if;

  metadata := coalesce(auth_user.raw_user_meta_data, '{}'::jsonb);
  profile_name := coalesce(
    nullif(trim(metadata ->> 'full_name'), ''),
    nullif(split_part(coalesce(auth_user.email, ''), '@', 1), ''),
    'Orliqo user'
  );
  company_name := coalesce(
    nullif(trim(metadata ->> 'company_name'), ''),
    profile_name || ' Workspace'
  );

  insert into public.profiles (id, full_name, locale, timezone)
  values (
    auth_user.id,
    profile_name,
    coalesce(nullif(metadata ->> 'locale', ''), 'en'),
    coalesce(nullif(metadata ->> 'timezone', ''), 'UTC')
  )
  on conflict (id) do nothing;

  if seed_mode and coalesce((metadata ->> 'skip_workspace_provisioning')::boolean, false) then
    return null;
  end if;

  if seed_mode and metadata ? 'workspace_id' then
    target_workspace_id := (metadata ->> 'workspace_id')::uuid;
  else
    select membership.workspace_id into target_workspace_id
    from public.workspace_members membership
    join public.workspaces workspace on workspace.id = membership.workspace_id
    where membership.user_id = auth_user.id
      and membership.status = 'active'
      and workspace.status = 'active'
    order by membership.joined_at nulls last, membership.created_at
    limit 1;
  end if;

  if target_workspace_id is null then
    select workspace.id into target_workspace_id
    from public.workspaces workspace
    where workspace.created_by = auth_user.id and workspace.status = 'active'
    order by workspace.created_at
    limit 1;
  end if;

  if target_workspace_id is null or not exists (
    select 1 from public.workspaces where id = target_workspace_id
  ) then
    target_workspace_id := coalesce(target_workspace_id, gen_random_uuid());
    workspace_slug := trim(
      both '-' from regexp_replace(lower(company_name), '[^a-z0-9]+', '-', 'g')
    );
    workspace_slug := coalesce(nullif(workspace_slug, ''), 'workspace') || '-' ||
      left(replace(target_workspace_id::text, '-', ''), 8);

    insert into public.workspaces (id, name, slug, country, timezone, created_by)
    values (
      target_workspace_id,
      company_name,
      workspace_slug,
      nullif(metadata ->> 'country', ''),
      coalesce(nullif(metadata ->> 'timezone', ''), 'UTC'),
      auth_user.id
    );
    workspace_created := true;
  end if;

  insert into public.workspace_members (
    workspace_id, user_id, role, status, joined_at
  )
  values (target_workspace_id, auth_user.id, 'owner', 'active', now())
  on conflict (workspace_id, user_id) do update
    set status = 'active', joined_at = coalesce(public.workspace_members.joined_at, now());

  insert into public.workspace_settings (workspace_id)
  values (target_workspace_id)
  on conflict (workspace_id) do nothing;

  insert into public.business_profiles (
    workspace_id, company_name, country, onboarding_completed, onboarding_step
  )
  values (
    target_workspace_id,
    company_name,
    nullif(metadata ->> 'country', ''),
    false,
    1
  )
  on conflict (workspace_id) do nothing;

  insert into public.subscriptions (
    workspace_id, plan, status, billing_interval, trial_ends_at
  )
  values (
    target_workspace_id,
    'trial',
    'trialing',
    'month',
    now() + interval '14 days'
  )
  on conflict (workspace_id) do nothing;

  if workspace_created then
    insert into public.audit_logs (
      workspace_id, actor_id, actor_type, action, entity_type, entity_id,
      after_state
    )
    values (
      target_workspace_id,
      auth_user.id,
      'user',
      'workspace.repaired',
      'workspace',
      target_workspace_id,
      jsonb_build_object('source', 'auth_bootstrap_repair')
    );
  end if;

  return target_workspace_id;
end;
$$;

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.ensure_auth_user_workspace(new.id);
  return new;
end;
$$;

revoke all on function private.ensure_auth_user_workspace(uuid)
  from public, anon, authenticated;
grant execute on function private.ensure_auth_user_workspace(uuid)
  to service_role;
