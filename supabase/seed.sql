set orliqo.seed_mode = 'on';

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token,
  email_change_token_new, email_change, created_at, updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'ali.haddad@example.invalid',
    extensions.crypt('OrliqoDemo!2026', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Ali Haddad","company_name":"Orliqo Demo","country":"Jordan","timezone":"Asia/Amman","workspace_id":"10000000-0000-4000-8000-000000000001"}'::jsonb,
    '', '', '', '', now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'admin@example.invalid',
    extensions.crypt('OrliqoDemo!2026', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Demo Administrator","skip_workspace_provisioning":true}'::jsonb,
    '', '', '', '', now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-4000-8000-000000000003',
    'authenticated', 'authenticated', 'manager@example.invalid',
    extensions.crypt('OrliqoDemo!2026', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Demo Campaign Manager","skip_workspace_provisioning":true}'::jsonb,
    '', '', '', '', now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-4000-8000-000000000004',
    'authenticated', 'authenticated', 'sales@example.invalid',
    extensions.crypt('OrliqoDemo!2026', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Demo Sales Representative","skip_workspace_provisioning":true}'::jsonb,
    '', '', '', '', now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-4000-8000-000000000005',
    'authenticated', 'authenticated', 'viewer@example.invalid',
    extensions.crypt('OrliqoDemo!2026', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Demo Viewer","skip_workspace_provisioning":true}'::jsonb,
    '', '', '', '', now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-4000-8000-000000000006',
    'authenticated', 'authenticated', 'northstar.owner@example.invalid',
    extensions.crypt('OrliqoDemo!2026', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Northstar Demo Owner","skip_workspace_provisioning":true}'::jsonb,
    '', '', '', '', now(), now()
  )
on conflict (id) do nothing;

update public.business_profiles
set
  industry = 'Digital services',
  city = 'Amman',
  description = 'Synthetic Orliqo demonstration workspace.',
  main_service = 'Evidence-backed website audits',
  competitive_advantage = 'Approval-first outreach with source evidence.',
  onboarding_completed = true,
  onboarding_step = 6,
  updated_at = now()
where workspace_id = '10000000-0000-4000-8000-000000000001';

update public.subscriptions
set plan = 'growth', status = 'active', billing_interval = 'month', trial_ends_at = null,
  current_period_start = date_trunc('month', now()),
  current_period_end = date_trunc('month', now()) + interval '1 month'
where workspace_id = '10000000-0000-4000-8000-000000000001';

insert into public.workspace_members (workspace_id, user_id, role, status, invited_by, joined_at)
values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 'administrator', 'active', '00000000-0000-4000-8000-000000000001', now()),
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003', 'campaign_manager', 'active', '00000000-0000-4000-8000-000000000001', now()),
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000004', 'sales_representative', 'active', '00000000-0000-4000-8000-000000000001', now()),
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000005', 'viewer', 'active', '00000000-0000-4000-8000-000000000001', now())
on conflict (workspace_id, user_id) do nothing;

insert into public.workspaces (id, name, slug, country, city, timezone, currency, created_by)
values (
  '10000000-0000-4000-8000-000000000002', 'Northstar Demo', 'northstar-demo',
  'Jordan', 'Aqaba', 'Asia/Amman', 'USD', '00000000-0000-4000-8000-000000000006'
)
on conflict (id) do nothing;

insert into public.workspace_members (workspace_id, user_id, role, status, joined_at)
values
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000006', 'owner', 'active', now()),
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 'viewer', 'active', now())
on conflict (workspace_id, user_id) do nothing;

insert into public.workspace_settings (workspace_id, sending, compliance, feature_flags)
values (
  '10000000-0000-4000-8000-000000000002',
  '{"delivery_mode":"no-send"}'::jsonb,
  '{"demo":true}'::jsonb,
  '{"demo_mode":true}'::jsonb
)
on conflict (workspace_id) do nothing;

insert into public.business_profiles (workspace_id, company_name, country, city, description, onboarding_completed, onboarding_step)
values (
  '10000000-0000-4000-8000-000000000002', 'Northstar Demo', 'Jordan', 'Aqaba',
  'Synthetic read-only workspace used to verify role restrictions.', true, 6
)
on conflict (workspace_id) do nothing;

insert into public.subscriptions (workspace_id, plan, status, billing_interval, current_period_start, current_period_end)
values (
  '10000000-0000-4000-8000-000000000002', 'starter', 'active', 'month',
  date_trunc('month', now()), date_trunc('month', now()) + interval '1 month'
)
on conflict (workspace_id) do nothing;

insert into public.ideal_customer_profiles (
  id, workspace_id, name, natural_language_description, countries, cities, industries,
  company_sizes, website_statuses, minimum_score, active
)
values (
  '21000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'Jordanian creative studios',
  'Independent photography and creative studios in Jordan with an outdated or slow website.',
  array['Jordan'], array['Amman', 'Aqaba', 'Zarqa'], array['Photography', 'Creative services'],
  array['1-10', '11-50'], array['outdated', 'slow', 'poor_mobile']::public.website_status[], 68, true
)
on conflict (id) do nothing;

insert into public.leads (
  id, workspace_id, business_name, industry, category, country, city, website_url,
  website_status, website_status_confidence, email, email_verification_status, phone_verification_status,
  whatsapp_available, whatsapp_consent_status, review_count, average_rating, social_activity_score,
  qualification_score, qualification_reason, suggested_opportunity, recommended_channel,
  personalization_angle, status, created_by
)
select
  ('20000000-0000-4000-8000-' || lpad(series::text, 12, '0'))::uuid,
  '10000000-0000-4000-8000-000000000001'::uuid,
  'Synthetic Studio ' || lpad(series::text, 2, '0'),
  case when series % 3 = 0 then 'Creative services' else 'Photography' end,
  'Studio',
  'Jordan',
  case when series % 3 = 0 then 'Zarqa' when series % 2 = 0 then 'Aqaba' else 'Amman' end,
  'https://business-' || series || '.example.test',
  case when series % 4 = 0 then 'slow'::public.website_status when series % 3 = 0 then 'poor_mobile' else 'outdated' end,
  case when series % 5 = 0 then 'unverified'::public.evidence_confidence when series % 3 = 0 then 'likely' else 'verified' end,
  case when series % 6 = 0 then null else ('contact-' || series || '@example.invalid')::extensions.citext end,
  case when series % 6 = 0 then 'missing'::public.email_verification_status when series % 5 = 0 then 'unverified' when series % 4 = 0 then 'risky' else 'verified' end,
  'missing'::public.phone_verification_status,
  false,
  'unknown'::public.whatsapp_consent_status,
  12 + series * 3,
  3.5 + ((series % 14)::numeric / 10),
  45 + (series % 50),
  68 + ((series * 7) % 29),
  'Synthetic score based on location, industry, website opportunity, and public evidence fixture.',
  'Offer a mobile performance and conversion audit.',
  'email'::public.outreach_channel,
  'Reference the public demo website status fixture.',
  case when series <= 20 then 'qualified'::public.lead_status else 'new' end,
  '00000000-0000-4000-8000-000000000001'::uuid
from generate_series(1, 30) as series
on conflict (id) do nothing;

insert into public.leads (
  id, workspace_id, business_name, industry, country, city, website_url,
  website_status, website_status_confidence, email_verification_status,
  phone_verification_status, whatsapp_consent_status, qualification_score,
  qualification_reason, status, created_by
)
values (
  '20000000-0000-4000-8000-000000000031',
  '10000000-0000-4000-8000-000000000002',
  'Northstar Synthetic Lead', 'Hospitality', 'Jordan', 'Aqaba',
  'https://northstar-lead.example.test', 'outdated', 'verified', 'missing',
  'missing', 'unknown', 77, 'Synthetic tenant-isolation fixture.', 'qualified',
  '00000000-0000-4000-8000-000000000006'
)
on conflict (id) do nothing;

insert into public.lead_sources (
  workspace_id, lead_id, source_type, source_url, source_title, source_domain,
  extracted_data, confidence, allowed_for_automated_use, citation_text, content_hash
)
select
  '10000000-0000-4000-8000-000000000001',
  lead.id,
  'deterministic_fixture',
  'https://sources.example.test/' || lead.id,
  'Synthetic public-source fixture',
  'sources.example.test',
  jsonb_build_object('website_status', lead.website_status, 'synthetic', true),
  lead.website_status_confidence,
  true,
  'Synthetic evidence for local testing only.',
  encode(extensions.digest(lead.id::text, 'sha256'), 'hex')
from public.leads lead
where lead.workspace_id = '10000000-0000-4000-8000-000000000001'
on conflict (lead_id, content_hash) do nothing;

insert into public.lead_field_evidence (workspace_id, lead_id, field_name, value, confidence, source_id, verified_at, verification_method)
select
  source.workspace_id,
  source.lead_id,
  'website_status',
  jsonb_build_object('status', lead.website_status),
  source.confidence,
  source.id,
  case when source.confidence = 'verified' then now() else null end,
  'deterministic_fixture'
from public.lead_sources source
join public.leads lead on lead.id = source.lead_id
on conflict do nothing;

insert into public.lead_score_components (
  workspace_id, lead_id, icp_fit, location_fit, industry_fit, website_opportunity,
  social_activity, reviews, contact_availability, verification, size_fit, buying_signals,
  exclusion_penalty, confidence, total_score, explanation, model_version
)
select
  workspace_id, id, 18, 10, 10, 15, 6, 5,
  case when email is null then 0 else 8 end,
  case when email_verification_status = 'verified' then 8 else 3 end,
  5, 3, 0, 5, qualification_score,
  'Deterministic demo scoring fixture.', 'demo-v1'
from public.leads
where workspace_id = '10000000-0000-4000-8000-000000000001'
on conflict do nothing;

insert into public.tags (id, workspace_id, name, color_token)
values
  ('22000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'High fit', 'green'),
  ('22000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Needs review', 'amber')
on conflict (id) do nothing;

insert into public.integrations (
  id, workspace_id, provider, status, display_name, external_account_id,
  external_account_email, configuration, scopes, token_expires_at, last_synced_at, last_error_code, last_error, created_by
)
values
  (
    '30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
    'gmail', 'connected', 'Gmail preview fixture', 'demo-gmail', 'sender@example.invalid',
    '{"mode":"test","delivery":"preview","validated":true}'::jsonb,
    array['gmail.readonly'], now() + interval '30 days', now(), null, null,
    '00000000-0000-4000-8000-000000000001'
  ),
  (
    '30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001',
    'outlook', 'expired', 'Outlook expired fixture', 'demo-outlook', 'outlook@example.invalid',
    '{"mode":"test","delivery":"preview","validated":false}'::jsonb,
    array['Mail.Read'], now() - interval '1 day', now() - interval '2 days', 'token_expired', 'Synthetic token expiry.',
    '00000000-0000-4000-8000-000000000001'
  ),
  (
    '30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001',
    'whatsapp', 'connected', 'WhatsApp no-send fixture', 'demo-whatsapp', null,
    '{"mode":"test","delivery":"no-send","validated":true}'::jsonb,
    array['whatsapp_business_messaging'], now() + interval '30 days', now(), null, null,
    '00000000-0000-4000-8000-000000000001'
  )
on conflict (id) do nothing;

insert into public.email_accounts (
  workspace_id, integration_id, email_address, sender_name, daily_limit, sent_today,
  bounce_rate, reply_rate, health_status, paused, warmup_status
)
values (
  '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001',
  'sender@example.invalid', 'Ali Haddad', 40, 18, 0.0125, 0.1480, 'healthy', false, 'ready'
)
on conflict (integration_id) do nothing;

insert into public.whatsapp_templates (
  workspace_id, integration_id, provider_template_id, name, language, category, status,
  components, quality_score, last_synced_at
)
values (
  '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000003',
  'demo-template-1', 'demo_intro', 'en', 'MARKETING', 'TEST_ONLY',
  '[{"type":"BODY","text":"Synthetic no-send template"}]'::jsonb, 'demo', now()
)
on conflict (integration_id, provider_template_id) do nothing;

insert into public.campaigns (
  id, workspace_id, name, description, goal, icp_id, status, audience_source,
  target_prospect_count, main_offer, main_cta, tone, message_length, follow_up_count,
  language, personalization_depth, start_at, sending_days, send_window_start, send_window_end,
  timezone, daily_limit, monthly_limit, min_interval_minutes, max_interval_minutes,
  stop_on_reply, auto_replenish, replenish_threshold, replenish_count,
  replenish_minimum_score, replenish_require_approval, auto_generate_messages,
  launched_at, created_by
)
values (
  '40000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'Amman Studios - Website Audit',
  'Synthetic campaign used for visual and queue testing.',
  'book_meeting', '21000000-0000-4000-8000-000000000001', 'running', 'saved',
  30, 'Website conversion audit', 'Book a 20-minute review', 'consultative', 'short', 2,
  'en', 'deep', now() - interval '3 days', array[0,1,2,3,4], '09:00', '17:00',
  'Asia/Amman', 40, 500, 2, 6, true, true, 20, 10, 70, true, true,
  now() - interval '3 days', '00000000-0000-4000-8000-000000000001'
)
on conflict (id) do nothing;

insert into public.campaigns (
  id, workspace_id, name, description, goal, status, audience_source,
  target_prospect_count, timezone, daily_limit, min_interval_minutes,
  max_interval_minutes, created_by
)
values
  (
    '40000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    'Aqaba Clinics - Discovery', 'Synthetic draft campaign.', 'generate_leads',
    'draft', 'custom', 20, 'Asia/Amman', 25, 2, 6,
    '00000000-0000-4000-8000-000000000003'
  ),
  (
    '40000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000001',
    'Jordan Partners - Follow-up', 'Synthetic paused campaign.', 'book_meeting',
    'paused', 'saved', 15, 'Asia/Amman', 20, 3, 8,
    '00000000-0000-4000-8000-000000000003'
  )
on conflict (id) do nothing;

insert into public.campaign_channels (workspace_id, campaign_id, channel, integration_id, enabled, priority, configuration)
values (
  '10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001',
  'email', '30000000-0000-4000-8000-000000000001', true, 1,
  '{"delivery":"preview","demo":true}'::jsonb
)
on conflict do nothing;

insert into public.campaign_leads (
  workspace_id, campaign_id, lead_id, status, approval_status, added_by, approved_by,
  approved_at, sequence_position
)
select
  '10000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  id,
  case when row_number() over (order by id) <= 10 then 'queued' else 'ready' end,
  'approved',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  now() - interval '2 days',
  (row_number() over (order by id))::smallint
from public.leads
where workspace_id = '10000000-0000-4000-8000-000000000001'
order by id
limit 20
on conflict (campaign_id, lead_id) do nothing;

insert into public.conversations (
  id, workspace_id, lead_id, campaign_id, channel, external_thread_id, status,
  intent, intent_confidence, unread_count, last_message_at, assigned_to
)
select
  ('50000000-0000-4000-8000-' || lpad(series::text, 12, '0'))::uuid,
  '10000000-0000-4000-8000-000000000001',
  ('20000000-0000-4000-8000-' || lpad(series::text, 12, '0'))::uuid,
  '40000000-0000-4000-8000-000000000001',
  case when series = 2 then 'linkedin'::public.outreach_channel else 'email' end,
  'demo-thread-' || series,
  case when series <= 2 then 'interested'::public.conversation_status else 'needs_response' end,
  case when series <= 2 then 'interested'::public.conversation_intent when series = 3 then 'follow_up_later' else 'not_interested' end,
  0.91,
  case when series <= 3 then 1 else 0 end,
  now() - make_interval(mins => series * 32),
  '00000000-0000-4000-8000-000000000004'
from generate_series(1, 4) as series
on conflict (id) do nothing;

insert into public.messages (
  id, workspace_id, campaign_id, lead_id, conversation_id, channel, direction,
  sequence_step, subject, body, personalization_facts, grounding_source_ids,
  generation_model, generation_prompt_version, approval_status, approved_by, approved_at,
  send_status, scheduled_at, sent_at, delivered_at, replied_at, provider_metadata,
  idempotency_key, created_by
)
select
  ('60000000-0000-4000-8000-' || lpad(series::text, 12, '0'))::uuid,
  '10000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  ('20000000-0000-4000-8000-' || lpad(series::text, 12, '0'))::uuid,
  case when series <= 4 then ('50000000-0000-4000-8000-' || lpad(series::text, 12, '0'))::uuid else null end,
  'email', 'outbound', 0,
  'A website audit idea for Synthetic Studio ' || lpad(series::text, 2, '0'),
  'Synthetic preview only. No message is delivered from demo mode.',
  jsonb_build_array(jsonb_build_object('fact', 'synthetic website status', 'verified', false)),
  '{}', 'demo-fixture', 'demo-v1', 'approved',
  '00000000-0000-4000-8000-000000000001', now() - interval '2 days',
  case when series <= 4 then 'replied'::public.message_send_status when series <= 7 then 'delivered' when series <= 9 then 'sent' else 'scheduled' end,
  case when series = 10 then now() + interval '2 hours' else null end,
  case when series <= 9 then now() - make_interval(hours => 24 - series) else null end,
  case when series <= 7 then now() - make_interval(hours => 23 - series) else null end,
  case when series <= 4 then now() - make_interval(mins => series * 32) else null end,
  '{"mode":"preview","synthetic":true}'::jsonb,
  'demo-outbound-' || series,
  '00000000-0000-4000-8000-000000000001'
from generate_series(1, 10) as series
on conflict (id) do nothing;

insert into public.messages (
  id, workspace_id, campaign_id, lead_id, conversation_id, channel, direction,
  sequence_step, body, approval_status, send_status, replied_at, provider_metadata,
  idempotency_key, created_by
)
select
  ('61000000-0000-4000-8000-' || lpad(series::text, 12, '0'))::uuid,
  '10000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  ('20000000-0000-4000-8000-' || lpad(series::text, 12, '0'))::uuid,
  ('50000000-0000-4000-8000-' || lpad(series::text, 12, '0'))::uuid,
  case when series = 2 then 'linkedin'::public.outreach_channel else 'email' end,
  'inbound', 0,
  case
    when series = 1 then 'Thanks, we are interested in the audit. Can you share more details?'
    when series = 2 then 'This looks relevant. We would like to learn more about your process.'
    when series = 3 then 'Not a priority now, but follow up next quarter.'
    else 'We already have someone handling this. Please close the conversation.'
  end,
  'needs_review', 'replied', now() - make_interval(mins => series * 32),
  '{"simulator":"inbound_reply","synthetic":true}'::jsonb,
  'demo-inbound-' || series,
  null
from generate_series(1, 4) as series
on conflict (id) do nothing;

insert into public.message_attempts (
  workspace_id, message_id, attempt_number, completed_at, result, provider_status_code,
  response_metadata
)
select workspace_id, id, 1, sent_at, 'succeeded', 'PREVIEW', '{"delivery":"no-send","synthetic":true}'::jsonb
from public.messages
where workspace_id = '10000000-0000-4000-8000-000000000001'
  and direction = 'outbound' and sent_at is not null
on conflict (message_id, attempt_number) do nothing;

insert into public.reply_suggestions (
  workspace_id, conversation_id, source_message_id, body, language, tone,
  generation_model, generation_prompt_version, risk_flags, confidence, status, created_by
)
select
  conversation.workspace_id,
  conversation.id,
  inbound.id,
  'Thanks for the reply. This is a deterministic suggestion for review only.',
  'en', 'consultative', 'demo-fixture', 'demo-v1', '[]'::jsonb, 0.88, 'pending', 'ai'
from public.conversations conversation
join public.messages inbound on inbound.conversation_id = conversation.id and inbound.direction = 'inbound'
on conflict do nothing;

insert into public.scheduled_events (
  id, workspace_id, campaign_id, lead_id, type, title, starts_at, ends_at, status,
  metadata, orliqo_owned
)
values (
  '70000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  'meeting', 'Synthetic website audit review', now() + interval '2 days', now() + interval '2 days 30 minutes',
  'scheduled', '{"calendar_mode":"test"}'::jsonb, true
)
on conflict (id) do nothing;

insert into public.meetings (
  id, workspace_id, lead_id, campaign_id, conversation_id, scheduled_event_id,
  title, starts_at, ends_at, status, meeting_url, created_by
)
values (
  '71000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  '50000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000001',
  'Synthetic website audit review', now() + interval '2 days', now() + interval '2 days 30 minutes',
  'scheduled', 'https://meet.example.test/demo', '00000000-0000-4000-8000-000000000001'
)
on conflict (id) do nothing;

insert into public.opportunities (
  id, workspace_id, lead_id, campaign_id, conversation_id, meeting_id, stage,
  estimated_value, currency, probability, owner_id, attribution_metadata
)
values (
  '72000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  '50000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-000000000001',
  'discovery', 28400, 'USD', 35, '00000000-0000-4000-8000-000000000004',
  '{"mode":"synthetic","campaign":"Amman Studios - Website Audit"}'::jsonb
)
on conflict (id) do nothing;

insert into public.message_templates (
  id, workspace_id, name, category, channel, language, subject_template, body_template,
  variables, is_default, created_by
)
values (
  '73000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'Website audit introduction - demo', 'website_development', 'email', 'en',
  '{{company_name}} website audit',
  'Hi {{contact_name}}, this synthetic preview references {{evidence_fact}}.',
  '["company_name","contact_name","evidence_fact"]'::jsonb,
  true, '00000000-0000-4000-8000-000000000001'
)
on conflict (id) do nothing;

insert into public.usage_counters (
  workspace_id, metric, period_start, period_end, used, reserved, limit_value
)
values
  (
    '10000000-0000-4000-8000-000000000001', 'monthly_leads',
    date_trunc('month', now()), date_trunc('month', now()) + interval '1 month', 184, 0, 500
  ),
  (
    '10000000-0000-4000-8000-000000000001', 'ai_messages',
    date_trunc('month', now()), date_trunc('month', now()) + interval '1 month', 258, 0, 1000
  ),
  (
    '10000000-0000-4000-8000-000000000002', 'monthly_leads',
    date_trunc('month', now()), date_trunc('month', now()) + interval '1 month', 20, 0, 100
  )
on conflict (workspace_id, metric, period_start, period_end) do nothing;

insert into public.billing_events (
  stripe_event_id, type, livemode, processing_status, workspace_id,
  payload_hash, metadata, attempts, processed_at
)
values (
  'evt_demo_test_mode', 'customer.subscription.updated', false, 'succeeded',
  '10000000-0000-4000-8000-000000000001',
  encode(extensions.digest('evt_demo_test_mode', 'sha256'), 'hex'),
  '{"mode":"test","synthetic":true}'::jsonb, 1, now()
)
on conflict (stripe_event_id) do nothing;

insert into public.daily_analytics (
  workspace_id, campaign_id, metric_date, channel, industry, country, discovered,
  qualified, approved, contacted, sent, delivered, opened, read, replied, positive,
  meetings, conversions, cost, revenue
)
select
  '10000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  current_date - (7 - series),
  'email', 'Photography', 'Jordan',
  20 + series * 2, 14 + series, 12 + series, 10 + series, 22 + series * 3,
  18 + series * 3, 14 + series * 2, 12 + series * 2, 3 + series,
  1 + (series / 2), case when series > 4 then 1 else 0 end,
  case when series = 7 then 1 else 0 end, series * 1.25,
  case when series = 7 then 28400 else 0 end
from generate_series(1, 7) as series
on conflict do nothing;

insert into public.notifications (workspace_id, user_id, type, title, body, action_url, metadata)
values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'reply', '3 replies need review', 'Synthetic inbox replies are waiting for review.', '/app/inbox', '{"demo":true}'::jsonb),
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'integration', 'Outlook test connection expired', 'Reconnect a sandbox account before validation.', '/app/integrations', '{"demo":true}'::jsonb);

insert into public.job_runs (
  id, workspace_id, inngest_run_id, inngest_function_id, inngest_event_id, job_type,
  entity_type, entity_id, status, attempt, idempotency_key, progress, started_at,
  completed_at, retryable
)
values (
  '80000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'demo-run-1', 'research-prospects', 'demo-event-1', 'research_prospects',
  'campaign', '40000000-0000-4000-8000-000000000001', 'succeeded', 1,
  'demo-research-campaign-1', '{"found":30,"synthetic":true}'::jsonb,
  now() - interval '4 days', now() - interval '4 days' + interval '2 minutes', false
)
on conflict (id) do nothing;

insert into public.audit_logs (
  workspace_id, actor_id, actor_type, action, entity_type, entity_id, after_state
)
values
  (
    '10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001',
    'user', 'campaign.demo_launched', 'campaign', '40000000-0000-4000-8000-000000000001',
    '{"delivery":"no-send","synthetic":true}'::jsonb
  ),
  (
    '10000000-0000-4000-8000-000000000001', null,
    'system', 'demo.seed_completed', 'workspace', '10000000-0000-4000-8000-000000000001',
    '{"leads":30,"providers":"sandbox","delivery":"blocked"}'::jsonb
  );
