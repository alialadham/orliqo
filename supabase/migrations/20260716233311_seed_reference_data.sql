with permissions(permission) as (
  values
    ('workspace:view'), ('workspace:manage'), ('workspace:delete'), ('workspace:transfer_ownership'),
    ('team:view'), ('team:invite'), ('team:manage_roles'), ('billing:view'), ('billing:manage'),
    ('integrations:view'), ('integrations:manage'), ('campaign:view'), ('campaign:create'),
    ('campaign:update'), ('campaign:approve'), ('campaign:launch'), ('campaign:pause'), ('campaign:kill'),
    ('lead:view'), ('lead:create'), ('lead:update'), ('lead:delete'), ('lead:export'),
    ('message:generate'), ('message:edit'), ('message:approve'), ('message:send'),
    ('inbox:view'), ('inbox:reply'), ('analytics:view'), ('settings:manage'), ('audit:view')
), allowed(role, permission) as (
  select 'owner'::public.workspace_role, permission from permissions
  union all
  select 'administrator'::public.workspace_role, permission from permissions
    where permission not in ('workspace:delete', 'workspace:transfer_ownership')
  union all
  select 'campaign_manager'::public.workspace_role, permission from permissions
    where permission in (
      'workspace:view', 'team:view', 'integrations:view', 'campaign:view', 'campaign:create',
      'campaign:update', 'campaign:approve', 'campaign:launch', 'campaign:pause', 'campaign:kill',
      'lead:view', 'lead:create', 'lead:update', 'lead:delete', 'lead:export', 'message:generate',
      'message:edit', 'message:approve', 'message:send', 'inbox:view', 'inbox:reply', 'analytics:view'
    )
  union all
  select 'sales_representative'::public.workspace_role, permission from permissions
    where permission in (
      'workspace:view', 'campaign:view', 'lead:view', 'lead:create', 'lead:update',
      'message:generate', 'message:edit', 'inbox:view', 'inbox:reply', 'analytics:view'
    )
  union all
  select 'viewer'::public.workspace_role, permission from permissions
    where permission in ('workspace:view', 'campaign:view', 'lead:view', 'inbox:view', 'analytics:view')
)
insert into public.role_permissions (role, permission, allowed)
select role, permission, true from allowed;

insert into public.plan_entitlements (plan, metric, limit_value, feature_value, billing_interval, effective_from)
values
  ('starter', 'monthly_price_usd', 39, null, 'month', '2026-01-01T00:00:00Z'),
  ('starter', 'monthly_leads', 100, null, 'month', '2026-01-01T00:00:00Z'),
  ('starter', 'ai_messages', 200, null, 'month', '2026-01-01T00:00:00Z'),
  ('starter', 'campaigns', 3, null, 'all', '2026-01-01T00:00:00Z'),
  ('starter', 'inboxes', 1, null, 'all', '2026-01-01T00:00:00Z'),
  ('starter', 'members', 1, null, 'all', '2026-01-01T00:00:00Z'),
  ('starter', 'research_level', null, '"basic"'::jsonb, 'all', '2026-01-01T00:00:00Z'),
  ('starter', 'analytics_level', null, '"basic"'::jsonb, 'all', '2026-01-01T00:00:00Z'),
  ('starter', 'support_level', null, '"email"'::jsonb, 'all', '2026-01-01T00:00:00Z'),
  ('growth', 'monthly_price_usd', 119, null, 'month', '2026-01-01T00:00:00Z'),
  ('growth', 'monthly_leads', 500, null, 'month', '2026-01-01T00:00:00Z'),
  ('growth', 'ai_messages', 1000, null, 'month', '2026-01-01T00:00:00Z'),
  ('growth', 'campaigns', null, '"unlimited"'::jsonb, 'all', '2026-01-01T00:00:00Z'),
  ('growth', 'inboxes', 3, null, 'all', '2026-01-01T00:00:00Z'),
  ('growth', 'members', 5, null, 'all', '2026-01-01T00:00:00Z'),
  ('growth', 'research_level', null, '"advanced"'::jsonb, 'all', '2026-01-01T00:00:00Z'),
  ('growth', 'analytics_level', null, '"full"'::jsonb, 'all', '2026-01-01T00:00:00Z'),
  ('growth', 'support_level', null, '"priority"'::jsonb, 'all', '2026-01-01T00:00:00Z'),
  ('agency', 'monthly_price_usd', 349, null, 'month', '2026-01-01T00:00:00Z'),
  ('agency', 'monthly_leads', 2000, null, 'month', '2026-01-01T00:00:00Z'),
  ('agency', 'ai_messages', 5000, null, 'month', '2026-01-01T00:00:00Z'),
  ('agency', 'campaigns', null, '"unlimited"'::jsonb, 'all', '2026-01-01T00:00:00Z'),
  ('agency', 'inboxes', 10, null, 'all', '2026-01-01T00:00:00Z'),
  ('agency', 'members', 20, null, 'all', '2026-01-01T00:00:00Z'),
  ('agency', 'research_level', null, '"advanced"'::jsonb, 'all', '2026-01-01T00:00:00Z'),
  ('agency', 'analytics_level', null, '"full"'::jsonb, 'all', '2026-01-01T00:00:00Z'),
  ('agency', 'support_level', null, '"dedicated"'::jsonb, 'all', '2026-01-01T00:00:00Z');

with categories(category) as (
  values ('website_development'), ('ecommerce'), ('medical_clinics'), ('restaurants'),
    ('photography_studios'), ('real_estate'), ('partnerships'), ('follow_ups'), ('price_responses')
), channels(channel) as (
  values ('email'::public.outreach_channel), ('whatsapp'), ('instagram'), ('linkedin')
)
insert into public.message_templates (
  workspace_id, name, category, channel, language, subject_template, body_template, variables, is_default
)
select
  null,
  initcap(replace(category, '_', ' ')) || ' - ' || initcap(channel::text),
  category,
  channel,
  'en',
  case when channel = 'email' then '{{company_name}} - a relevant idea' else null end,
  'Hi {{contact_name}}, I noticed {{evidence_fact}}. Would it be useful to discuss {{offer}}?',
  '["contact_name", "company_name", "evidence_fact", "offer"]'::jsonb,
  true
from categories cross join channels;

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  profile_name text;
  company_name text;
  workspace_id uuid;
  workspace_slug text;
  seed_mode boolean := coalesce(current_setting('orliqo.seed_mode', true), 'off') = 'on';
begin
  profile_name := coalesce(nullif(trim(metadata ->> 'full_name'), ''), split_part(new.email, '@', 1), 'Orliqo user');
  company_name := coalesce(nullif(trim(metadata ->> 'company_name'), ''), profile_name || ' Workspace');

  insert into public.profiles (id, full_name, locale, timezone)
  values (
    new.id,
    profile_name,
    coalesce(nullif(metadata ->> 'locale', ''), 'en'),
    coalesce(nullif(metadata ->> 'timezone', ''), 'UTC')
  );

  if seed_mode and coalesce((metadata ->> 'skip_workspace_provisioning')::boolean, false) then
    return new;
  end if;

  if seed_mode and metadata ? 'workspace_id' then
    workspace_id := (metadata ->> 'workspace_id')::uuid;
  else
    workspace_id := gen_random_uuid();
  end if;

  workspace_slug := trim(both '-' from regexp_replace(lower(company_name), '[^a-z0-9]+', '-', 'g'));
  workspace_slug := coalesce(nullif(workspace_slug, ''), 'workspace') || '-' || left(replace(workspace_id::text, '-', ''), 8);

  insert into public.workspaces (id, name, slug, country, timezone, created_by)
  values (
    workspace_id,
    company_name,
    workspace_slug,
    nullif(metadata ->> 'country', ''),
    coalesce(nullif(metadata ->> 'timezone', ''), 'UTC'),
    new.id
  );

  insert into public.workspace_members (workspace_id, user_id, role, status, joined_at)
  values (workspace_id, new.id, 'owner', 'active', now());

  insert into public.workspace_settings (workspace_id)
  values (workspace_id);

  insert into public.business_profiles (workspace_id, company_name, country, onboarding_completed, onboarding_step)
  values (workspace_id, company_name, nullif(metadata ->> 'country', ''), false, 1);

  insert into public.subscriptions (workspace_id, plan, status, billing_interval, trial_ends_at)
  values (workspace_id, 'trial', 'trialing', 'month', now() + interval '14 days');

  insert into public.audit_logs (workspace_id, actor_id, actor_type, action, entity_type, entity_id, after_state)
  values (
    workspace_id,
    new.id,
    'user',
    'workspace.created',
    'workspace',
    workspace_id,
    jsonb_build_object('source', case when seed_mode then 'seed' else 'registration' end)
  );

  return new;
end;
$$;

revoke all on function private.handle_new_auth_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_auth_user();
