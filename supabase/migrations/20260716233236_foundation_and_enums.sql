create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.workspace_status as enum ('active', 'suspended', 'deleted');
create type public.workspace_role as enum ('owner', 'administrator', 'campaign_manager', 'sales_representative', 'viewer');
create type public.membership_status as enum ('invited', 'active', 'suspended');
create type public.campaign_status as enum ('draft', 'researching', 'awaiting_approval', 'scheduled', 'running', 'paused', 'completed', 'killed', 'failed');
create type public.audience_source as enum ('saved', 'custom', 'csv', 'ai_recommended');
create type public.outreach_channel as enum ('email', 'whatsapp', 'instagram', 'linkedin', 'manual_call');
create type public.website_status as enum ('no_website', 'outdated', 'poor_mobile', 'directory_only', 'slow', 'no_booking', 'no_ecommerce', 'no_bilingual', 'modern', 'unknown');
create type public.evidence_confidence as enum ('verified', 'likely', 'unverified', 'missing');
create type public.email_verification_status as enum ('verified', 'risky', 'invalid', 'unverified', 'missing');
create type public.phone_verification_status as enum ('verified', 'risky', 'invalid', 'unverified', 'missing');
create type public.whatsapp_consent_status as enum ('opted_in', 'opted_out', 'unknown', 'not_required');
create type public.lead_status as enum ('new', 'qualified', 'disqualified', 'contacted', 'replied', 'interested', 'won', 'lost', 'do_not_contact', 'archived');
create type public.actor_type as enum ('user', 'system', 'ai', 'provider');
create type public.approval_status as enum ('needs_review', 'approved', 'rejected', 'revision_requested');
create type public.message_direction as enum ('outbound', 'inbound');
create type public.message_send_status as enum ('draft', 'queued', 'scheduled', 'sending', 'sent', 'delivered', 'read', 'replied', 'failed', 'paused', 'cancelled', 'suppressed');
create type public.conversation_status as enum ('open', 'interested', 'needs_response', 'follow_up_later', 'not_interested', 'meeting', 'archived', 'spam', 'closed');
create type public.conversation_intent as enum ('interested', 'asking_price', 'wants_information', 'follow_up_later', 'not_interested', 'wrong_contact', 'stop_contact', 'automatic_response', 'unknown');
create type public.integration_provider as enum ('gmail', 'outlook', 'smtp', 'resend', 'ses', 'whatsapp', 'google_calendar', 'posthog');
create type public.integration_status as enum ('disconnected', 'connecting', 'connected', 'error', 'paused', 'expired');
create type public.subscription_plan as enum ('starter', 'growth', 'agency', 'trial', 'none');
create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused', 'none', 'restricted');
create type public.suppression_type as enum ('email', 'phone', 'domain', 'business', 'social_profile');
create type public.suppression_source as enum ('user', 'unsubscribe', 'opt_out', 'bounce', 'complaint', 'invalid', 'system');
create type public.scheduled_event_type as enum ('message', 'follow_up', 'meeting', 'campaign_start', 'campaign_end', 'call');
create type public.job_status as enum ('pending', 'running', 'succeeded', 'failed', 'dead_lettered', 'cancelled');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.normalize_email(value text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select nullif(lower(trim(value)), '');
$$;

create or replace function public.normalize_domain(value text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select nullif(
    regexp_replace(
      regexp_replace(lower(trim(value)), '^https?://', ''),
      '^(www\.)|[/#?].*$',
      '',
      'g'
    ),
    ''
  );
$$;

create or replace function public.normalize_phone(value text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case
    when nullif(regexp_replace(coalesce(value, ''), '[^0-9+]', '', 'g'), '') is null then null
    when left(regexp_replace(value, '[^0-9+]', '', 'g'), 1) = '+'
      then '+' || regexp_replace(regexp_replace(value, '[^0-9+]', '', 'g'), '[^0-9]', '', 'g')
    else regexp_replace(value, '[^0-9]', '', 'g')
  end;
$$;

create or replace function public.normalize_text_identity(value text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select nullif(regexp_replace(lower(trim(value)), '[^[:alnum:]]+', ' ', 'g'), '');
$$;

create or replace function public.normalize_social_url(value text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select nullif(
    regexp_replace(
      regexp_replace(lower(trim(value)), '^https?://(www\.)?', ''),
      '/+$',
      ''
    ),
    ''
  );
$$;

create or replace function public.identity_fingerprint(value text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case when value is null or value = '' then null else encode(extensions.digest(value, 'sha256'), 'hex') end;
$$;

revoke execute on function public.set_updated_at() from public, anon, authenticated;
grant execute on function public.normalize_email(text), public.normalize_domain(text), public.normalize_phone(text), public.normalize_text_identity(text), public.normalize_social_url(text), public.identity_fingerprint(text) to authenticated;
