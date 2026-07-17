begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  $$ select count(*) from public.leads where workspace_id = '10000000-0000-4000-8000-000000000001' $$,
  array[30::bigint],
  'administrator can read leads in their active workspace'
);

select results_eq(
  $$ select count(*) from public.leads where workspace_id = '10000000-0000-4000-8000-000000000002' $$,
  array[0::bigint],
  'administrator cannot read another tenant'
);

select throws_ok(
  $$
    insert into public.leads (workspace_id, business_name, status)
    values ('10000000-0000-4000-8000-000000000002', 'Cross tenant write', 'new')
  $$,
  '42501',
  null,
  'administrator cannot insert into another tenant'
);

select results_eq(
  $$ select count(*) from public.subscriptions where workspace_id = '10000000-0000-4000-8000-000000000001' $$,
  array[1::bigint],
  'administrator can view billing state'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000005', true);

select results_eq(
  $$ select count(*) from public.leads where workspace_id = '10000000-0000-4000-8000-000000000001' $$,
  array[30::bigint],
  'viewer can read workspace leads'
);

select throws_ok(
  $$
    insert into public.leads (workspace_id, business_name, status)
    values ('10000000-0000-4000-8000-000000000001', 'Viewer write', 'new')
  $$,
  '42501',
  null,
  'viewer cannot create leads'
);

select results_eq(
  $$ select count(*) from public.subscriptions where workspace_id = '10000000-0000-4000-8000-000000000001' $$,
  array[0::bigint],
  'viewer cannot read billing state'
);

select results_eq(
  $$ select count(*) from public.integrations where workspace_id = '10000000-0000-4000-8000-000000000001' $$,
  array[0::bigint],
  'viewer cannot read integration state'
);

select * from finish();
rollback;
