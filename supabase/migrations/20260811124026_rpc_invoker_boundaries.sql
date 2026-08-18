-- Exposed RPCs delegate as the caller; privileged implementations stay private.
grant usage on schema private to authenticated, service_role;

revoke all on function private.suppress_lead(uuid, text, public.suppression_source),
  private.restore_suppressed_lead(uuid) from public, anon;
grant execute on function private.suppress_lead(uuid, text, public.suppression_source),
  private.restore_suppressed_lead(uuid) to authenticated;

create or replace function public.suppress_lead(
  target_lead_id uuid,
  suppression_reason text,
  suppression_origin public.suppression_source default 'user'
)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  select private.suppress_lead(target_lead_id, suppression_reason, suppression_origin);
$$;

create or replace function public.restore_suppressed_lead(target_lead_id uuid)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  select private.restore_suppressed_lead(target_lead_id);
$$;

create or replace function public.consume_rate_limit_service(
  bucket_key text,
  bucket_limit integer,
  window_seconds integer
)
returns table (allowed boolean, retry_after_seconds integer)
language sql
volatile
security invoker
set search_path = ''
as $$
  select *
  from private.consume_rate_limit(bucket_key, bucket_limit, window_seconds);
$$;

create or replace function public.ensure_auth_user_workspace_service(
  target_user_id uuid
)
returns uuid
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.ensure_auth_user_workspace(target_user_id);
$$;

revoke all on function public.suppress_lead(uuid, text, public.suppression_source),
  public.restore_suppressed_lead(uuid) from public, anon;
grant execute on function public.suppress_lead(uuid, text, public.suppression_source),
  public.restore_suppressed_lead(uuid) to authenticated;

revoke all on function public.consume_rate_limit_service(text, integer, integer),
  public.ensure_auth_user_workspace_service(uuid)
  from public, anon, authenticated;
grant execute on function public.consume_rate_limit_service(text, integer, integer),
  public.ensure_auth_user_workspace_service(uuid)
  to service_role;
