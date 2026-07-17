# Proposed Database Schema

This schema covers the complete Orliqo product specification. Phase migrations may
land incrementally, but table names, ownership boundaries, and security assumptions
should remain stable unless a migration documents the change.

## Conventions

- PostgreSQL via Supabase; `auth.users` remains Supabase-owned.
- Primary keys are `uuid default gen_random_uuid()` unless a provider event ID is
  the natural immutable key.
- All mutable records use `created_at timestamptz not null default now()` and
  `updated_at timestamptz not null default now()` maintained by a trigger.
- All timestamps are UTC. Workspace time zones are IANA names used only when
  calculating or presenting local schedules.
- Human emails use `citext`; normalized emails/domains/phones/social URLs use
  explicit canonical columns and deterministic fingerprints.
- Money uses `numeric(14,2)` plus an ISO currency code. Counters use `bigint`.
- JSON columns are `jsonb not null default '{}'::jsonb` or `[]` as appropriate and
  receive shape validation at the Zod boundary.
- Workspace-owned foreign keys use `on delete cascade` only where workspace
  deletion should remove the entire aggregate. Audit/billing records use restrict
  or a retained tombstone strategy.
- Secrets are not stored in `public`. Public integration rows contain only a UUID
  reference to encrypted data in the private schema.
- Exposed tables receive explicit grants and RLS. No table depends on Supabase's
  former implicit Data API grants.

## Extensions and Schemas

- `pgcrypto` for UUIDs and cryptographic primitives.
- `citext` for case-insensitive email/domain identity.
- `public` for application records exposed through tightly scoped RLS.
- `private` for credential ciphertext, OAuth state, and narrowly granted database
  helpers. It is not exposed through the Data API.

## Enums

- `workspace_status`: `active`, `suspended`, `deleted`.
- `workspace_role`: `owner`, `administrator`, `campaign_manager`,
  `sales_representative`, `viewer`.
- `membership_status`: `invited`, `active`, `suspended`.
- `campaign_status`: `draft`, `researching`, `awaiting_approval`, `scheduled`,
  `running`, `paused`, `completed`, `killed`, `failed`.
- `audience_source`: `saved`, `custom`, `csv`, `ai_recommended`.
- `outreach_channel`: `email`, `whatsapp`, `instagram`, `linkedin`, `manual_call`.
- `website_status`: `no_website`, `outdated`, `poor_mobile`, `directory_only`,
  `slow`, `no_booking`, `no_ecommerce`, `no_bilingual`, `modern`, `unknown`.
- `evidence_confidence`: `verified`, `likely`, `unverified`, `missing`.
- `email_verification_status`: `verified`, `risky`, `invalid`, `unverified`,
  `missing`.
- `phone_verification_status`: `verified`, `risky`, `invalid`, `unverified`,
  `missing`.
- `whatsapp_consent_status`: `opted_in`, `opted_out`, `unknown`, `not_required`.
- `lead_status`: `new`, `qualified`, `disqualified`, `contacted`, `replied`,
  `interested`, `won`, `lost`, `do_not_contact`, `archived`.
- `actor_type`: `user`, `system`, `ai`, `provider`.
- `approval_status`: `needs_review`, `approved`, `rejected`, `revision_requested`.
- `message_direction`: `outbound`, `inbound`.
- `message_send_status`: `draft`, `queued`, `scheduled`, `sending`, `sent`,
  `delivered`, `read`, `replied`, `failed`, `paused`, `cancelled`, `suppressed`.
- `conversation_status`: `open`, `interested`, `needs_response`,
  `follow_up_later`, `not_interested`, `meeting`, `archived`, `spam`, `closed`.
- `conversation_intent`: `interested`, `asking_price`, `wants_information`,
  `follow_up_later`, `not_interested`, `wrong_contact`, `stop_contact`,
  `automatic_response`, `unknown`.
- `integration_provider`: `gmail`, `outlook`, `smtp`, `resend`, `ses`,
  `whatsapp`, `google_calendar`, `posthog`.
- `integration_status`: `disconnected`, `connecting`, `connected`, `error`,
  `paused`, `expired`.
- `subscription_plan`: `starter`, `growth`, `agency`, `trial`, `none`.
- `subscription_status`: Stripe-compatible normalized states plus `none` and
  `restricted`.
- `suppression_type`: `email`, `phone`, `domain`, `business`, `social_profile`.
- `suppression_source`: `user`, `unsubscribe`, `opt_out`, `bounce`, `complaint`,
  `invalid`, `system`.
- `scheduled_event_type`: `message`, `follow_up`, `meeting`, `campaign_start`,
  `campaign_end`, `call`.
- `job_status`: `pending`, `running`, `succeeded`, `failed`, `dead_lettered`,
  `cancelled`.

## Identity and Workspace

### `profiles`

- `id uuid primary key references auth.users(id) on delete cascade`
- `full_name text not null`, `avatar_url text`, `locale text not null default 'en'`
- `timezone text not null default 'UTC'`
- timestamps
- Policy: self-read/update; active workspace members may read minimal profile fields
  for teammates through a security-invoker view.

### `workspaces`

- `id`, `name`, `slug citext unique`, `logo_url`, `country`, `city`
- `timezone`, `default_language`, `currency`, `status`
- `sending_locked_at`, `sending_locked_reason` for administrative abuse controls
- `created_by references profiles(id)`, timestamps
- Index: `status`, `created_by`.

### `workspace_members`

- `id`, `workspace_id`, `user_id`, `role`, `status`, `invited_by`, `joined_at`
- Unique: `(workspace_id, user_id)`.
- Index: `(user_id, status)`, `(workspace_id, role, status)`.

### `workspace_invitations`

- `id`, `workspace_id`, `email citext`, `role`, `hashed_token`, `expires_at`
- `accepted_at`, `cancelled_at`, `invited_by`, timestamps
- Unique active invitation: `(workspace_id, email)` where not accepted/cancelled.

### `role_permissions`

- `role`, `permission text`, `allowed boolean`, timestamps
- Primary key: `(role, permission)`.
- Seed the complete permission matrix; application code uses the same typed
  permission identifiers and server checks.

### `workspace_settings`

- `workspace_id primary key`
- `branding jsonb`, `ai jsonb`, `sending jsonb`, `compliance jsonb`,
  `security jsonb`, `feature_flags jsonb`
- `pause_all boolean`, `emergency_kill_switch boolean`, timestamps
- Zod schemas version each JSON section so settings can migrate safely.

## Business and Onboarding

### `business_profiles`

- `id`, `workspace_id unique`, `company_name`, `website_url`, `industry`
- `country`, `city`, `company_size`, `employee_range`, `description`, `logo_url`
- `instagram_url`, `linkedin_url`, `whatsapp_number`
- `main_service`, `additional_services jsonb`, `average_project_value numeric`
- `pricing_model`, `sales_cycle`, `main_customer_problem`,
  `competitive_advantage`, `default_cta`, `brand_tone`
- `target_industry_summary`, `selling_points jsonb`
- `onboarding_completed boolean`, `onboarding_step smallint check (1..6)`
- `imported_from_website_at`, timestamps

### `ideal_customer_profiles`

- `id`, `workspace_id`, `name`, `natural_language_description`
- `countries text[]`, `cities text[]`, `industries text[]`, `company_sizes text[]`
- employee, revenue, and business-age min/max numeric ranges
- `website_statuses website_status[]`, social/review minimums, `keywords text[]`
- `excluded_industries text[]`, `excluded_companies text[]`
- `contact_requirements jsonb`, `minimum_score smallint check (0..100)`
- `active boolean`, timestamps
- Index: `(workspace_id, active)`.

### `website_imports`

- `id`, `workspace_id`, `business_profile_id`, `requested_url`, `normalized_url`
- `status`, `job_run_id`, `requested_by`, `started_at`, `completed_at`
- `error_code`, `error_message`, timestamps

### `website_import_suggestions`

- `id`, `website_import_id`, `field_name`, `suggested_value jsonb`
- `source_url`, `citation_text`, `confidence`, `decision`, `decided_by`,
  `decided_at`, timestamps
- Never mutates business data until an explicit accepted decision is submitted.

## Campaigns

### `campaigns`

- `id`, `workspace_id`, `name`, `description`, `goal`, `custom_goal`
- `icp_id`, `status`, `audience_source`, `target_prospect_count`
- `main_offer`, `main_cta`, `tone`, `custom_tone`, `message_length`
- `follow_up_count`, `language`, `arabic_dialect`, `personalization_depth`
- `start_at`, `sending_days smallint[]`, `send_window_start time`,
  `send_window_end time`, `timezone`
- `daily_limit`, `monthly_limit`, `min_interval_minutes`, `max_interval_minutes`
- `stop_on_reply`, `auto_replenish`, `replenish_threshold`, `replenish_count`
- `replenish_minimum_score`, `replenish_require_approval`,
  `auto_generate_messages`
- `paused_at`, `launched_at`, `completed_at`, `killed_at`, `created_by`, timestamps
- Checks: positive bounded limits, min interval <= max, valid window/day values.
- Indexes: `(workspace_id, status)`, `(workspace_id, start_at)`.

### `campaign_channels`

- `id`, `campaign_id`, `channel`, `integration_id`, `enabled`
- `daily_limit_override`, `priority`, `configuration jsonb`, timestamps
- Unique: `(campaign_id, channel, integration_id)`.

### `campaign_leads`

- `id`, `campaign_id`, `lead_id`, `status`, `approval_status`
- `added_by`, `approved_by`, `approved_at`, `rejected_reason`, `sequence_position`
- `sequence_stopped_at`, `sequence_stop_reason`, timestamps
- Unique: `(campaign_id, lead_id)`.
- Index: `(campaign_id, approval_status, status)`.

### `campaign_replenishment_runs`

- `id`, `workspace_id`, `campaign_id`, `status`, `requested_count`, `added_count`
- `minimum_score`, `require_approval`, `usage_reserved`, `cooldown_until`
- `job_run_id`, `failure_code`, timestamps
- Index and constraint enforce configured maximum runs per campaign/day.

## Leads, Evidence, and Imports

### `leads`

- `id`, `workspace_id`, `business_name`, `legal_name`, `logo_url`
- `industry`, `category`, `description`, `country`, `city`, `address`
- `website_url`, `website_status`, `website_status_confidence`
- `email citext`, `email_verification_status`, `phone`,
  `phone_verification_status`, `whatsapp_available`, `whatsapp_consent_status`
- `instagram_url`, `facebook_url`, `linkedin_url`
- `review_count`, `average_rating`, `social_activity_score`
- `employee_estimate`, `revenue_estimate`, `services jsonb`
- `qualification_score check (0..100)`, `qualification_reason`,
  `suggested_opportunity`, `recommended_channel`, `personalization_angle`
- `status`, `do_not_contact`, `do_not_contact_reason`, `assigned_to`
- `first_contacted_at`, `last_contacted_at`, `last_replied_at`, `created_by`
- Canonical values: `normalized_domain`, `normalized_email`, `normalized_phone`,
  `normalized_business_city`, and normalized social URLs.
- Fingerprints: SHA-256 hashes for each canonical identity, allowing scoped unique
  partial indexes without exposing raw data in idempotency logs.
- Indexes: workspace/status/score/activity/assignee plus partial unique indexes on
  non-null canonical identities within a workspace.

### `lead_sources`

- `id`, `workspace_id`, `lead_id`, `source_type`, `source_url`, `source_title`
- `source_domain`, `extracted_data jsonb`, `retrieved_at`, `confidence`
- `allowed_for_automated_use`, `citation_text`, `content_hash`, timestamps
- Unique: `(lead_id, content_hash)`.

### `lead_field_evidence`

- `id`, `workspace_id`, `lead_id`, `field_name`, `value jsonb`, `confidence`
- `source_id`, `verified_at`, `verification_method`, timestamps
- Index: `(lead_id, field_name, confidence)`.

### `lead_score_components`

- `id`, `workspace_id`, `lead_id`, optional `campaign_id`
- Integer components for ICP, location, industry, website opportunity, social
  activity, reviews, contact availability, verification, size fit, buying signals,
  exclusion penalty, and confidence.
- `total_score check (0..100)`, `explanation`, `model_version`, timestamps
- Unique latest scoring revision is selected by timestamp, not overwritten.

### `lead_notes`

- `id`, `workspace_id`, `lead_id`, `author_id`, `content`, `pinned`
- `mentioned_user_ids uuid[]`, timestamps, optional `deleted_at`.

### `lead_activities`

- `id`, `workspace_id`, `lead_id`, optional `campaign_id`
- `actor_type`, optional `actor_id`, `event_type`, `summary`, `metadata`,
  `created_at`
- Append-only chronological activity index on `(lead_id, created_at desc)`.

### `tags` and `lead_tags`

- `tags`: `id`, `workspace_id`, `name`, semantic color token, timestamps; unique
  `(workspace_id, name)`.
- `lead_tags`: `workspace_id`, `lead_id`, `tag_id`, `created_by`, `created_at`;
  primary key `(lead_id, tag_id)`.

### `saved_views`

- `id`, `workspace_id`, `owner_id`, `entity_type`, `name`, `filters jsonb`,
  `sorting jsonb`, `visible_columns jsonb`, `shared`, timestamps.

### `suppression_entries`

- `id`, `workspace_id`, `type`, `normalized_value`, `reason`, `source`
- `created_by`, optional `lead_id`, optional `expires_at`, timestamps
- Unique: `(workspace_id, type, normalized_value)`.

### `consent_records`

- `id`, `workspace_id`, `lead_id`, `channel`, `status`, `consent_source`
- `consent_text`, `evidence_url`, `evidence_metadata jsonb`, `captured_at`
- `revoked_at`, `created_by`, timestamps
- Consent is historical; revocation inserts/updates state and triggers suppression.

### `import_jobs` and `import_rows`

- `import_jobs`: workspace, source type, storage object, mapping, status, totals,
  actor, job run, errors, timestamps.
- `import_rows`: job, row number, raw/mapped/normalized JSON, validation errors,
  duplicate lead reference, decision, timestamps.
- Unique: `(import_job_id, row_number)`.

## Messaging, Queue, Inbox, and Calendar

### `message_templates`

- `id`, nullable `workspace_id` for system templates, `name`, `category`, `channel`
- `language`, nullable `subject_template`, `body_template`, `variables jsonb`
- `is_default`, provider template name/status/language, `archived_at`, `created_by`
- timestamps; unique default constraint per workspace/category/channel/language.

### `conversations`

- `id`, `workspace_id`, `lead_id`, optional `campaign_id`, `channel`
- `external_thread_id`, `status`, `intent`, `intent_confidence`
- `unread_count`, `last_message_at`, `assigned_to`, timestamps
- Unique partial index on `(workspace_id, channel, external_thread_id)`.

### `messages`

- `id`, `workspace_id`, optional `campaign_id`, `lead_id`, optional
  `conversation_id`, `channel`, `direction`, `sequence_step`
- `subject`, `body`, `personalization_facts jsonb`, `grounding_source_ids uuid[]`
- `generation_model`, `generation_prompt_version`, `approval_status`
- `approved_by`, `approved_at`, `send_status`, scheduling/delivery/read/reply times
- provider message/thread IDs and non-secret metadata
- failure code/message, `idempotency_key citext unique`, `created_by`, timestamps
- Indexes: due queue `(send_status, scheduled_at)`, campaign/lead/conversation,
  provider identifiers.

### `message_versions`

- `id`, `workspace_id`, `message_id`, version number, subject/body, generation
  metadata, grounding, risk flags, unsupported claims, created_by/type, timestamps
- Unique: `(message_id, version_number)`.

### `message_attempts`

- `id`, `workspace_id`, `message_id`, `attempt_number`, start/completion, result
- provider status, redacted response metadata, error code/message, correlation ID
- Unique: `(message_id, attempt_number)`.

### `message_events`

- `id`, `workspace_id`, `message_id`, provider event ID, event type, occurred_at`
- signature-verified flag, redacted payload metadata, received_at
- Unique: `(integration_id, provider_event_id, event_type)` for webhook idempotency.

### `reply_suggestions`

- `id`, `workspace_id`, `conversation_id`, source message, body, language, tone
- model/prompt version, grounding, risk flags, confidence, status, created_by,
  timestamps.

### `scheduled_events`

- `id`, `workspace_id`, optional campaign/lead/message IDs, `type`, `title`
- `starts_at`, `ends_at`, `status`, external calendar/event IDs, `metadata jsonb`
- `orliqo_owned boolean`, timestamps
- Only `orliqo_owned` external records may be updated or deleted.

### `opportunities`

- `id`, `workspace_id`, `lead_id`, optional campaign/conversation/meeting IDs`
- `stage`, estimated value, currency, probability, won/lost timestamps, owner,
  attribution metadata, timestamps.

## Integrations and Provider State

### `integrations`

- `id`, `workspace_id`, `provider`, `status`, `display_name`
- external account ID/email, non-secret `configuration jsonb`
- nullable `credential_reference uuid`, `scopes text[]`, `token_expires_at`
- `last_synced_at`, `last_error_code`, redacted `last_error`, `created_by`, timestamps
- Unique active account constraint per workspace/provider/external account.

### `private.integration_credentials`

- `id`, `workspace_id`, `integration_id`, `encrypted_payload bytea`, `nonce bytea`
- `key_version`, `rotated_at`, timestamps
- No `anon`/`authenticated` grants. Access only through trusted server code using
  a separate encryption key; never returned by a Data API view.

### `private.oauth_states`

- `id`, `workspace_id`, `provider`, hashed state, PKCE verifier ciphertext, redirect
  path allowlist value, expiry, used timestamp, actor, timestamps.
- One-time use and short expiry; no client grants.

### `provider_webhook_events`

- `id`, provider, external event ID, optional workspace/integration, received time`
- signature status, processing status/attempts, payload hash, redacted metadata,
  processed time, error code
- Unique `(provider, external_event_id)`.

### `provider_sync_states`

- `id`, `workspace_id`, `integration_id`, sync type, cursor/subscription metadata,
  last success/attempt, expiry, lag, error, timestamps.

### `whatsapp_templates`

- `id`, `workspace_id`, `integration_id`, provider template ID, name, language`
- category, status, components, quality score, rejection reason, last synced, timestamps
- Unique `(integration_id, provider_template_id)`.

### `email_accounts`

- `id`, `workspace_id`, `integration_id`, email address, sender name, signature HTML`
- daily limit, sent today, bounce/reply rates, health, paused, warmup status,
  daily counter date, timestamps.

## Billing and Usage

### `subscriptions`

- `id`, `workspace_id unique`, Stripe customer/subscription/price IDs`
- plan, status, billing interval, period start/end, cancel-at-period-end, trial end,
  grace end, timestamps.

### `plan_entitlements`

- `id`, `plan`, `metric`, nullable numeric limit, nullable feature value`
- billing interval and effective dates; unique `(plan, metric, effective_from)`.
- Seed exact Starter/Growth/Agency limits from the master specification.

### `usage_counters`

- `id`, `workspace_id`, `metric`, `period_start`, `period_end`
- `used`, `reserved`, `limit_value`, timestamps
- Unique `(workspace_id, metric, period_start, period_end)`.

### `usage_reservations`

- `id`, `workspace_id`, `metric`, amount, idempotency key, status`
- source entity type/ID, expires_at, committed/released timestamps, timestamps
- Unique idempotency key enables atomic check-reserve-commit/release.

### `billing_events`

- `stripe_event_id text primary key`, type, livemode, processing status`
- optional workspace/subscription, payload hash and minimal redacted metadata,
  attempts, processed/error timestamps
- Never store unnecessary full Stripe payloads containing customer data.

## Audit, Notifications, Analytics, Jobs, and Compliance

### `audit_logs`

- `id`, `workspace_id`, actor ID/type, action, entity type/ID`
- `before_state`, `after_state`, IP hash or policy-approved value, user agent`
- correlation ID, `created_at`
- Append-only; no client insert/update/delete grants. Retention is documented.

### `notifications`

- `id`, `workspace_id`, `user_id`, type, title, body, `read_at`, action URL`
- metadata, created_at; index unread by user/workspace.

### `daily_analytics`

- `id`, `workspace_id`, optional campaign, metric date, channel/industry/country`
- discovered, qualified, approved, contacted, sent, delivered, opened, read, replied,
  positive, meetings, conversions, cost, revenue, timestamps
- Unique dimensional key; generated by idempotent aggregation.

### `job_runs`

- `id`, `workspace_id`, Inngest run/function/event IDs, job type, entity references`
- status, attempt, idempotency key, progress, correlation ID, scheduled/start/end`
- retryable, error code/redacted message, dead-letter timestamp, timestamps
- Unique idempotency key where supplied.

### `compliance_requests`

- `id`, `workspace_id`, type (`export`, `deletion`, `abuse_report`, `suspension`)`
- requester, target, status, reason, evidence metadata, due/completed timestamps,
  handled_by, audit reference, timestamps.

## RLS and Grant Model

1. Grant `authenticated` only the table operations required by the application.
   Grant `anon` only public plan data if pricing is database-backed. Grant no client
   role access to private credentials, OAuth state, billing events, webhook events,
   job internals, or audit writes.
2. Enable RLS on every `public` table. A missing policy must fail closed.
3. Workspace reads require an active `workspace_members` row for `auth.uid()`.
4. Workspace writes additionally require the role permission for that action.
5. `UPDATE` policies include both `USING` and `WITH CHECK`, plus a matching SELECT
   policy. Membership and policy columns are indexed.
6. Client-visible views use `security_invoker = true`.
7. To avoid recursive membership policies, justified helper functions live in
   `private`, fix `search_path`, check `auth.uid()` explicitly, expose only boolean
   results, revoke execution from `public`/`anon`, and grant narrowly to
   `authenticated`.
8. Billing, webhook, job, analytics aggregation, usage reconciliation, and audit
   mutations use trusted server credentials only after signature/auth validation.
9. Integration credentials and OAuth state are never client-readable.
10. Automated tests create two users in two workspaces and prove cross-tenant
    select/insert/update/delete denial for every policy family.

## Storage

- Private bucket `workspace-assets` for logos and approved imports.
- Object key prefix is `<workspace_id>/<category>/<uuid>.<ext>`.
- Active members may read their workspace prefix. Branding/workspace managers may
  write logos; import-capable roles may write import files.
- Validate allowed MIME types, extension consistency, and size before upload and in
  Storage policy-compatible metadata checks.
- Upsert paths receive SELECT, INSERT, and UPDATE policies; delete is separately
  permissioned and audited.

## Migration Order

Each file is created with `supabase migration new <name>`; timestamps are generated
by the CLI rather than invented manually.

1. Extensions, private schema, common functions, and enums.
2. Identity, workspace, settings, permissions, and auth profile trigger.
3. Business, onboarding, leads, evidence, imports, consent, and suppression.
4. Campaigns, messaging, queue, inbox, opportunities, and scheduling.
5. Integrations, private credentials/OAuth state, provider events, and sync state.
6. Billing, usage reservation, audit, notifications, analytics, jobs, compliance.
7. Explicit grants, RLS policies, private helper grants, and Storage policies.
8. Seed plan entitlements, system templates, permission matrix, and synthetic demo
   records in `supabase/seed.sql`.

Every migration is verified with a clean `supabase db reset`, tenant-isolation SQL
tests, generated TypeScript types, and Supabase database/security advisors before a
remote push is ever considered.
