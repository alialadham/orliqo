-- Keep auth-critical RPCs reachable without exposing the private schema.
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

revoke all on function public.consume_rate_limit_service(text, integer, integer)
  from public, anon, authenticated;
revoke all on function public.ensure_auth_user_workspace_service(uuid)
  from public, anon, authenticated;

grant execute on function public.consume_rate_limit_service(text, integer, integer)
  to service_role;
grant execute on function public.ensure_auth_user_workspace_service(uuid)
  to service_role;
