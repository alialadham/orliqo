-- Use the named primary-key constraint so the conflict target cannot be
-- confused with the bucket_key function parameter.
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
  on conflict on constraint rate_limit_buckets_pkey
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

revoke all on function private.consume_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function private.consume_rate_limit(text, integer, integer)
  to service_role;
