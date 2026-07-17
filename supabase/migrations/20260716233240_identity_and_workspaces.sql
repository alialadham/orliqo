create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 1 and 100),
  avatar_url text,
  locale text not null default 'en',
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  slug extensions.citext not null unique check (slug::text ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  logo_url text,
  country text,
  city text,
  timezone text not null default 'UTC',
  default_language text not null default 'en',
  currency char(3) not null default 'USD' check (currency = upper(currency)),
  status public.workspace_status not null default 'active',
  sending_locked_at timestamptz,
  sending_locked_reason text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((sending_locked_at is null) = (sending_locked_reason is null))
);

create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.workspace_role not null,
  status public.membership_status not null default 'invited',
  invited_by uuid references public.profiles(id) on delete set null,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id),
  check ((status = 'active' and joined_at is not null) or status <> 'active')
);

create unique index workspace_members_one_owner_idx
  on public.workspace_members (workspace_id)
  where role = 'owner' and status = 'active';
create index workspace_members_user_status_idx on public.workspace_members (user_id, status);
create index workspace_members_workspace_role_status_idx on public.workspace_members (workspace_id, role, status);
create index workspaces_created_by_idx on public.workspaces (created_by);
create index workspaces_status_idx on public.workspaces (status);

create table public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email extensions.citext not null,
  role public.workspace_role not null,
  hashed_token text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  cancelled_at timestamptz,
  invited_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at > created_at),
  check (accepted_at is null or cancelled_at is null)
);

create unique index workspace_invitations_active_email_idx
  on public.workspace_invitations (workspace_id, email)
  where accepted_at is null and cancelled_at is null;
create index workspace_invitations_workspace_idx on public.workspace_invitations (workspace_id, expires_at);

create table public.role_permissions (
  role public.workspace_role not null,
  permission text not null check (permission ~ '^[a-z_]+:[a-z_]+$'),
  allowed boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (role, permission)
);

create table public.workspace_settings (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  branding jsonb not null default '{}'::jsonb check (jsonb_typeof(branding) = 'object'),
  ai jsonb not null default '{}'::jsonb check (jsonb_typeof(ai) = 'object'),
  sending jsonb not null default '{}'::jsonb check (jsonb_typeof(sending) = 'object'),
  compliance jsonb not null default '{}'::jsonb check (jsonb_typeof(compliance) = 'object'),
  security jsonb not null default '{}'::jsonb check (jsonb_typeof(security) = 'object'),
  feature_flags jsonb not null default '{}'::jsonb check (jsonb_typeof(feature_flags) = 'object'),
  pause_all boolean not null default false,
  emergency_kill_switch boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger workspaces_set_updated_at before update on public.workspaces
  for each row execute function public.set_updated_at();
create trigger workspace_members_set_updated_at before update on public.workspace_members
  for each row execute function public.set_updated_at();
create trigger workspace_invitations_set_updated_at before update on public.workspace_invitations
  for each row execute function public.set_updated_at();
create trigger role_permissions_set_updated_at before update on public.role_permissions
  for each row execute function public.set_updated_at();
create trigger workspace_settings_set_updated_at before update on public.workspace_settings
  for each row execute function public.set_updated_at();

create or replace function private.is_active_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.workspace_members membership
    where membership.workspace_id = target_workspace_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
  );
$$;

create or replace function private.current_workspace_role(target_workspace_id uuid)
returns public.workspace_role
language sql
stable
security definer
set search_path = ''
as $$
  select membership.role
  from public.workspace_members membership
  where membership.workspace_id = target_workspace_id
    and membership.user_id = auth.uid()
    and membership.status = 'active'
  limit 1;
$$;

create or replace function private.has_workspace_permission(target_workspace_id uuid, required_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.workspace_members membership
    join public.role_permissions permission
      on permission.role = membership.role
     and permission.permission = required_permission
     and permission.allowed = true
    where membership.workspace_id = target_workspace_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
  );
$$;

revoke all on function private.is_active_workspace_member(uuid), private.current_workspace_role(uuid), private.has_workspace_permission(uuid, text) from public, anon;
grant execute on function private.is_active_workspace_member(uuid), private.current_workspace_role(uuid), private.has_workspace_permission(uuid, text) to authenticated;
