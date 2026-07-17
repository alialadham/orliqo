# ORLIQO AUTOMATED OUTREACH SaaS — CODEX MASTER BUILD PROMPT

You are the principal product designer, staff full-stack engineer, database architect, AI systems engineer, security engineer, QA lead, and DevOps engineer responsible for building **Orliqo**, a production-grade, multi-tenant AI outreach SaaS.

Build the complete product below. Do not create a static prototype, disconnected dashboard, fake integration, or UI-only demo. Implement real authentication, persistence, permissions, billing state, AI workflows, background jobs, integration adapters, audit logs, tests, responsive UX, and deployment documentation. When credentials are unavailable, implement a clearly labeled sandbox/test mode rather than pretending the integration is live.

## Non-negotiable execution rules

1. Inspect the repository before changing anything.
2. Preserve useful existing code and all Orliqo brand assets.
3. Use strict TypeScript. Avoid `any`.
4. Never place provider secrets in client code.
5. Do not leave core buttons inert.
6. Never guess contact data and label it verified.
7. Never send duplicate outreach accidentally.
8. Stop queued sequences after opt-out, suppression, hard bounce, invalid recipient, or reply when `stop_on_reply` is enabled.
9. WhatsApp must use the official Meta WhatsApp Business Platform. Do not automate WhatsApp Web/Desktop, browser sessions, QR sessions, Selenium, unofficial libraries, or session extraction.
10. Instagram and LinkedIn begin as discovery plus manual-send workflows unless official provider permissions support the exact action.
11. Research only from approved web-search tools, licensed APIs, and public sources that permit the use. Store citations and evidence.
12. Use UTC in the database and workspace time zones in the UI.
13. Make all jobs idempotent, retryable, observable, and safe against concurrent duplicate execution.
14. Every server mutation must verify authentication, workspace membership, role permission, subscription entitlement, usage limit, and relevant compliance checks.
15. Do not deploy or push unless explicitly instructed.

---

# 1. Product purpose

Orliqo helps businesses:

1. Describe what they sell.
2. Define their ideal customer.
3. Automatically discover matching businesses.
4. Verify, deduplicate, enrich, and rank prospects.
5. Generate grounded personalized outreach for email, WhatsApp, Instagram, LinkedIn, and follow-ups.
6. Review and approve campaigns.
7. Send approved campaigns gradually through authorized channels.
8. Track delivery, replies, meetings, opportunities, and conversions.
9. Suggest responses with AI.
10. Continuously refill the qualified prospect queue according to controlled settings.

Core flow:

```text
Create workspace and business profile
        ↓
Define offer and target audience
        ↓
Connect outreach channels
        ↓
Create campaign
        ↓
AI discovers matching prospects
        ↓
AI verifies, deduplicates, and scores them
        ↓
AI generates grounded messages
        ↓
User reviews and approves
        ↓
Messages enter a durable queue
        ↓
Messages send gradually within limits
        ↓
Provider webhooks update status
        ↓
Replies appear in a unified inbox
        ↓
AI classifies intent and proposes responses
        ↓
Meetings and outcomes are tracked
        ↓
Queue falls below threshold
        ↓
AI finds replacement prospects for review
```

---

# 2. Required technology

Use current stable compatible versions:

- Next.js App Router and React
- TypeScript strict mode
- Tailwind CSS
- shadcn/ui and Radix primitives
- Lucide icons, with custom production-quality SVG only where required by Orliqo branding
- Supabase Auth, PostgreSQL, Storage, and Row Level Security
- Zod
- React Hook Form
- TanStack Table
- Recharts or another lightweight accessible chart library
- OpenAI Responses API with structured outputs
- OpenAI web search plus configurable licensed data providers
- Trigger.dev or Inngest for durable jobs; choose one and use it consistently
- Gmail API
- Microsoft Graph
- Optional SMTP, Resend, and Amazon SES adapters
- Meta WhatsApp Cloud API
- Stripe Billing with Checkout Sessions and Customer Portal
- Google Calendar API
- PostHog
- Sentry
- Vercel
- Vitest, React Testing Library, and Playwright
- ESLint and Prettier

Use Server Components where appropriate. Use Route Handlers for OAuth callbacks, webhooks, exports, and provider APIs. Use client components only for actual interaction.

---

# 3. Application routes and structure

Create routes equivalent to:

```text
/
/pricing
/privacy
/terms
/acceptable-use
/login
/register
/forgot-password
/reset-password
/onboarding
/app/dashboard
/app/campaigns
/app/campaigns/new
/app/campaigns/[campaignId]
/app/leads
/app/leads/[leadId]
/app/discovery
/app/queue
/app/inbox
/app/calendar
/app/analytics
/app/templates
/app/integrations
/app/billing
/app/settings/workspace
/app/settings/branding
/app/settings/ai
/app/settings/sending
/app/settings/compliance
/app/settings/team
/app/settings/security
```

Create domain-oriented folders for auth, billing, campaigns, compliance, discovery, email, integrations, leads, messaging, permissions, scheduling, usage, WhatsApp, AI, and Supabase. Avoid a monolithic `utils.ts` or one giant page component.

---

# 4. Visual identity and app shell

Use the real Orliqo logo and typography if present in the repository. Do not redraw an existing brand mark inaccurately.

Visual direction:

- Premium dark application shell
- Deep charcoal navigation and top bar
- Soft off-white content surfaces
- Existing Orliqo accent; otherwise restrained muted violet/electric blue
- Minimal gradients
- Thin borders
- Clean rounded components
- Strong typography hierarchy
- Clear data visualizations
- Subtle motion
- No excessive glows
- No cluttered dashboard
- No generic futuristic AI artwork

Typography fallback:

- Headings: Manrope or Sora
- UI/body: Inter
- Arabic: IBM Plex Sans Arabic or Alexandria

Weights:

- Hero/page title: 700
- Section title: 600
- Card title: 600
- Label: 500
- Body: 400

Buttons:

- Primary: New Campaign, Launch, Approve, Send, Upgrade
- Secondary: Preview, Edit, Regenerate, Save Draft
- Destructive: Delete, Disconnect, Kill/Cancel
- Ghost: filters, row actions, navigation

Every button needs loading, disabled, hover, focus, active, success, and error behavior where relevant.

Desktop shell:

- Fixed left sidebar
- Sticky top bar
- Main scrollable content

Sidebar order:

1. Dashboard
2. Campaigns
3. Leads
4. Discovery
5. Outreach Queue
6. Inbox
7. Calendar
8. Analytics
9. Templates
10. Integrations
11. Billing
12. Settings

Sidebar bottom:

- Workspace selector
- Help and support
- User avatar
- Subscription badge
- Logout

Top-right:

- Global search
- Remaining credits
- Notifications
- Persistent `+ New Campaign`
- User avatar

Mobile:

- Compact header
- Bottom navigation: Dashboard, Campaigns, Leads, Inbox, More
- More sheet contains remaining routes
- Drawers become full-screen sheets
- Tables preserve essential information and may become responsive lists

Global search must search campaigns, leads, conversations, templates, and notes within the active workspace only.

---

# 5. Authentication, workspaces, and roles

Implement:

- Email/password registration
- Email verification
- Login/logout
- Forgot/reset password
- Google OAuth
- Microsoft OAuth
- Secure OAuth state and callback validation
- Session refresh
- Protected routes
- Redirect incomplete accounts to onboarding
- Multi-workspace membership and workspace switching

Registration fields:

- Full name
- Work email
- Password
- Company name
- Country
- Team size
- Terms agreement
- Separate optional marketing consent

Button: `Create My Workspace`

After registration:

1. Create profile.
2. Create workspace.
3. Assign owner role.
4. Create trial/inactive subscription record according to configuration.
5. Redirect to onboarding.

Roles:

- Owner
- Administrator
- Campaign Manager
- Sales Representative
- Viewer

Permissions must include:

- workspace manage/delete
- team invite/manage roles
- billing view/manage
- integrations view/manage
- campaign create/update/approve/launch/pause/kill
- lead view/create/update/delete/export
- message generate/edit/approve/send
- inbox view/reply
- analytics view
- settings manage
- audit view

Enforce permissions server-side.

---

# 6. Database and RLS

Create versioned Supabase SQL migrations with UUID keys, timestamps, foreign keys, indexes, constraints, enums, and RLS.

Required tables:

## Identity and workspace

### profiles
- id references auth.users
- full_name
- avatar_url
- locale
- timezone
- created_at
- updated_at

### workspaces
- id
- name
- slug unique
- logo_url
- country
- city
- timezone
- default_language
- currency
- status: active/suspended/deleted
- created_by
- timestamps

### workspace_members
- workspace_id
- user_id
- role
- status invited/active/suspended
- invited_by
- joined_at
- unique workspace/user

### workspace_invitations
- email
- role
- hashed token
- expires_at
- accepted_at
- invited_by

## Business and onboarding

### business_profiles
- workspace_id unique
- company_name
- website_url
- industry
- country
- city
- company_size
- employee_range
- description
- logo_url
- instagram_url
- linkedin_url
- whatsapp_number
- main_service
- additional_services jsonb
- average_project_value
- pricing_model
- sales_cycle
- main_customer_problem
- competitive_advantage
- default_cta
- brand_tone
- target_industry_summary
- selling_points jsonb
- onboarding_completed
- onboarding_step
- imported_from_website_at

### ideal_customer_profiles
- workspace_id
- name
- natural_language_description
- countries
- cities
- industries
- company_sizes
- employee_min/max
- revenue_min/max
- business_age_min/max
- website_statuses
- social_activity_min
- review_count_min
- keywords
- excluded_industries
- excluded_companies
- contact_requirements jsonb
- minimum_score
- active

## Campaigns

### campaigns
- workspace_id
- name
- description
- goal and custom_goal
- icp_id
- status: draft/researching/awaiting_approval/scheduled/running/paused/completed/killed/failed
- audience_source: saved/custom/csv/ai_recommended
- target_prospect_count
- main_offer
- main_cta
- tone/custom_tone
- message_length
- follow_up_count
- language
- arabic_dialect
- personalization_depth
- start_at
- sending_days
- send_window_start/end
- timezone
- daily_limit
- monthly_limit
- min_interval_minutes
- max_interval_minutes
- stop_on_reply
- auto_replenish
- replenish_threshold
- replenish_count
- replenish_minimum_score
- replenish_require_approval
- auto_generate_messages
- paused_at/launched_at/completed_at/killed_at
- created_by
- timestamps

### campaign_channels
- campaign_id
- channel: email/whatsapp/instagram/linkedin/manual_call
- integration_id nullable
- enabled
- daily_limit_override
- priority
- configuration jsonb

### campaign_leads
- campaign_id
- lead_id
- status
- approval_status
- added_by
- approved_by/approved_at
- rejected_reason
- sequence_position
- unique campaign/lead

## Leads and evidence

### leads
- workspace_id
- business_name
- legal_name
- logo_url
- industry/category/description
- country/city/address
- website_url
- website_status: no_website/outdated/poor_mobile/directory_only/slow/no_booking/no_ecommerce/no_bilingual/modern/unknown
- website_status_confidence: verified/likely/unverified/missing
- email
- email_verification_status: verified/risky/invalid/unverified/missing
- phone
- phone_verification_status
- whatsapp_available
- whatsapp_consent_status: opted_in/opted_out/unknown/not_required
- instagram_url/facebook_url/linkedin_url
- review_count/average_rating/social_activity_score
- employee_estimate/revenue_estimate
- services jsonb
- qualification_score
- qualification_reason
- suggested_opportunity
- recommended_channel
- personalization_angle
- status: new/qualified/disqualified/contacted/replied/interested/won/lost/do_not_contact/archived
- do_not_contact and reason
- first_contacted_at/last_contacted_at/last_replied_at
- created_by
- timestamps

Create deduplication fingerprints for normalized domain, email, phone, business name plus city, and social URLs.

### lead_sources
- lead_id
- source_type
- source_url
- source_title/domain
- extracted_data jsonb
- retrieved_at
- confidence
- allowed_for_automated_use
- citation_text
- content_hash

### lead_field_evidence
- lead_id
- field_name
- value jsonb
- confidence
- source_id
- verified_at
- verification_method

### lead_notes
- lead_id/workspace_id/author_id/content/pinned/timestamps

### lead_activities
- lead_id
- campaign_id nullable
- actor_type: user/system/ai/provider
- actor_id
- event_type
- summary
- metadata jsonb
- created_at

### suppression_entries
- workspace_id
- type: email/phone/domain/business/social_profile
- normalized_value
- reason
- source: user/unsubscribe/opt_out/bounce/complaint/invalid/system
- created_by
- expires_at nullable
- unique workspace/type/value

### consent_records
- workspace_id
- lead_id
- channel
- status
- consent_source
- consent_text
- evidence_url
- evidence_metadata
- captured_at
- revoked_at
- created_by

## Messaging and inbox

### message_templates
- workspace_id nullable for system templates
- name/category/channel/language
- subject_template nullable
- body_template
- variables jsonb
- is_default
- provider_template_name/status/language
- created_by
- timestamps

### messages
- workspace_id
- campaign_id nullable
- lead_id
- channel
- direction outbound/inbound
- sequence_step
- subject/body
- personalization_facts jsonb
- grounding_source_ids
- generation_model
- generation_prompt_version
- approval_status: needs_review/approved/rejected/revision_requested
- approved_by/approved_at
- send_status: draft/queued/scheduled/sending/sent/delivered/read/replied/failed/paused/cancelled/suppressed
- scheduled_at/sent_at/delivered_at/read_at/replied_at
- provider_message_id/provider_thread_id/provider_metadata
- failure_code/failure_message
- idempotency_key unique
- created_by
- timestamps

### message_attempts
- message_id
- attempt_number
- started_at/completed_at
- result
- provider_status_code
- response_metadata
- error_code/error_message

### conversations
- workspace_id
- lead_id
- campaign_id nullable
- channel
- external_thread_id
- status: open/interested/needs_response/follow_up_later/not_interested/meeting/archived/spam/closed
- intent: interested/asking_price/wants_information/follow_up_later/not_interested/wrong_contact/stop_contact/automatic_response/unknown
- unread_count
- last_message_at
- assigned_to

### scheduled_events
- workspace_id
- campaign_id/lead_id/message_id nullable
- type: message/follow_up/meeting/campaign_start/campaign_end/call
- title
- starts_at/ends_at
- status
- external_calendar_id/external_event_id
- metadata

## Integrations

### integrations
- workspace_id
- provider: gmail/outlook/smtp/resend/ses/whatsapp/google_calendar/posthog
- status: disconnected/connecting/connected/error/paused/expired
- display_name
- external_account_id/email
- non-secret configuration jsonb
- encrypted credential reference
- scopes
- token_expires_at
- last_synced_at
- last_error
- created_by
- timestamps

### whatsapp_templates
- integration_id
- provider_template_id
- name/language/category/status
- components jsonb
- quality_score
- rejection_reason
- last_synced_at

### email_accounts
- integration_id
- email_address
- sender_name
- signature_html
- daily_limit
- sent_today
- bounce_rate/reply_rate
- health_status
- paused
- warmup_status

## Billing

### subscriptions
- workspace_id unique
- stripe_customer_id/subscription_id/price_id
- plan: starter/growth/agency/trial/none
- status
- billing_interval
- current_period_start/end
- cancel_at_period_end
- trial_ends_at
- timestamps

### plan_entitlements
Seed all plan limits from the pricing section.

### usage_counters
- workspace_id
- metric
- period_start/end
- used/reserved/limit_value
- unique workspace/metric/period

### billing_events
- Stripe event ID unique
- type
- processing status
- payload metadata

## Audit and notifications

### audit_logs
- workspace_id
- actor_id/type
- action
- entity_type/id
- before_state/after_state
- IP/user agent
- created_at

### notifications
- workspace_id/user_id
- type/title/body
- read_at
- action_url
- metadata

### daily_analytics
Pre-aggregated workspace/campaign/date metrics.

RLS rules:

- Active workspace members can access only their workspace records.
- Sensitive write actions depend on role.
- Integration credentials are never client-readable.
- Billing writes occur through trusted server code.
- Webhook writes use service role after signature verification.
- Audit logs are append-only from trusted code.
- Storage paths are workspace-prefixed.
- Add automated tests proving tenant isolation.

---

# 7. Login and registration UI

Login is split-screen.

Left:

- Orliqo logo
- Dark branded visual
- “Find the right businesses. Reach them personally. Convert more clients.”
- Small code-native dashboard preview
- Trust indicators

Right card:

- Email
- Password
- Continue
- Continue with Google
- Continue with Microsoft
- Forgot password
- Create account

Registration:

- Full name
- Work email
- Password
- Company name
- Country
- Team size
- Terms agreement
- Create My Workspace

Include complete validation, loading, error, verification, and recovery states.

---

# 8. Six-step onboarding

Progress:

`Business → Offer → Audience → Channels → Goals → Review`

Persist each step immediately and support resume. Back lower-left, Continue lower-right.

## Business

- Company name
- Website
- Industry
- Country
- City
- Company size
- Description
- Logo upload
- Instagram
- LinkedIn
- WhatsApp

Button: `Import from Website`

Website import:

1. Validate URL and block SSRF/private-network targets.
2. Start background job.
3. Fetch permitted public content.
4. Extract description, services, brand tone, target industry, and selling points.
5. Return structured suggestions with sources.
6. Present field-by-field accept/reject.
7. Never silently overwrite edits.

## Offer

- Main service
- Additional services
- Average project value
- Pricing model
- Sales cycle
- Main problem
- Competitive advantage
- CTA

CTA options:

- Book a call
- Request a quote
- See a free concept
- Reply for information
- Contact on WhatsApp
- Custom

## Audience

Natural language plus:

- Countries/cities/industries
- Company size
- Employees
- Revenue
- Business age
- Website status
- Social activity
- Review count
- Keywords
- Excluded industries/companies

Website status filters:

- No website
- Outdated
- Poor mobile
- Directory only
- Slow
- No booking
- No e-commerce
- No bilingual support

Show editable AI-generated ICP summary.

## Channels

Cards:

- Email
- WhatsApp Business
- Instagram
- LinkedIn
- Manual call list

Each shows connection, limitations, setup, estimated capacity, and compliance note. Instagram/LinkedIn are manual unless official permissions support sending.

## Goals

- Leads/month
- Messages/day
- Days
- Hours
- Conversion goal
- Follow-ups
- Minimum score
- Auto replenish

Use sliders plus exact inputs and validate plan limits.

## Review

- Business
- Offer
- Audience
- Channels
- Limits
- Estimated monthly use
- Recommended plan

Buttons:

- Save as Draft
- Start First Campaign

---

# 9. Dashboard

Header:

- Dynamic local greeting such as “Good afternoon, Ali”
- “Here is how your outreach is performing.”
- New Campaign

Metrics:

- Qualified leads
- Sent
- Replies
- Positive replies
- Meetings
- Estimated pipeline

Each includes current value, previous-period change, mini trend, tooltip, empty state.

Large performance chart:

- Sent
- Delivered
- Opened where email tracking is enabled
- Read where supported
- Replied
- Positive

Filters: 7/30/90/custom.

Active campaign card:

- Name/status/market/queued/sent today/next send/daily limit/reply rate
- View/Pause or Resume/Add Leads

AI Recommendations card:

- Real recommendations derived from metrics
- Apply/Review/Dismiss
- Evidence and confidence

Recent replies:

- Logo/business/channel/preview/intent/time/open

All values come from real records.

---

# 10. Campaigns and campaign builder

Campaign list:

- Search/status/date/New Campaign
- Campaign/Audience/Channels/Leads/Sent/Replies/Meetings/Status/Last activity/Actions

Statuses:

- Draft
- Researching
- Awaiting approval
- Scheduled
- Running
- Paused
- Completed
- Killed
- Failed

Detail tabs:

- Overview
- Leads
- Messages
- Queue
- Replies
- Analytics
- Settings
- Activity

Builder steps:

## Goal

- Sell service
- Generate appointments
- Promote product
- Free audit
- Partnership
- Custom

## Audience

- Saved
- New
- CSV/XLSX
- AI recommended
- Find Matching Businesses

Import workflow:

- Upload
- Parse
- Map columns
- Validate
- Normalize
- Preview
- Duplicate detection
- Missing-data flags
- Confirm

## Discovery settings

- Prospect count
- Countries
- Cities
- Industries
- Score threshold
- Contact requirements
- Exclusions

Checkboxes:

- Must have email
- Must have public phone
- Must have Instagram
- Exclude modern websites
- Exclude duplicates
- Exclude previously contacted
- Exclude suppressed

## Messaging

Tones:

- Professional
- Friendly
- Direct
- Consultative
- Luxury
- Custom

Set:

- Offer
- CTA
- Length
- Follow-ups
- Language
- Arabic dialect
- Personalization depth

Show live samples.

## Schedule

- Start date
- Days
- Time range
- Daily limit
- Minimum and maximum randomized interval
- Timezone

Default interval 2–6 minutes. Show finish estimate, daily sends, next send, calendar preview, and limit warnings.

## Review and launch

- Audience
- Count
- Channel distribution
- Samples
- Credits
- Schedule
- Safety
- Opt-in/template warnings

Buttons:

- Save Draft
- Generate Leads
- Launch Campaign

Launch validation must verify permission, subscription, usage, integration, approvals, audience, schedule, suppression, and compliance.

---

# 11. AI lead discovery

Discovery page:

Prompt: “Describe the type of businesses you want Orliqo to find.”

Example: “Photography studios in Amman with active Instagram accounts and no professional website.”

Right filter panel.

Results table:

- Select
- Business
- Score
- Location
- Website
- Email
- Phone
- Instagram
- Reason
- Verification
- Actions

Actions:

- View
- Generate Message
- Add to Campaign
- Reject

Research job:

1. Parse query and ICP.
2. Create structured search plan.
3. Query approved tools/providers.
4. Store raw sources and citations.
5. Extract candidates.
6. Normalize names/domains/phones/emails/locations/social URLs.
7. Deduplicate.
8. Check suppression and history.
9. Evaluate website status using deterministic and AI checks.
10. Verify public emails only through evidence/provider; never guess.
11. Score.
12. Store explanation and score components.
13. Return progressive results.
14. Charge usage correctly.
15. Log partial failures.

Lead score 0–100 components:

- ICP
- Location
- Industry
- Website opportunity
- Social activity
- Reviews
- Contact availability
- Verification
- Size fit
- Buying signals
- Exclusion penalties
- Confidence

Store component values and explanation.

Every field shows Verified/Likely/Unverified/Missing and an evidence popover.

---

# 12. Leads

List supports search, filters, sorting, bulk selection, saved views, tags, assignment, add to campaign, generate, approve, reject, suppress, and export.

Columns:

- Business
- Score
- Industry
- Location
- Website status
- Email
- Phone
- Instagram
- Status
- Last activity

Lead detail header:

- Logo/name/industry/location/score
- Add to Campaign/Contact/More

Tabs:

## Overview

- Website
- Contacts
- Socials
- Description
- Reviews
- Score breakdown
- Qualification
- Opportunity
- Sources/evidence

## Outreach

Cards for email, WhatsApp, Instagram, LinkedIn, follow-up 1 and 2.

Each supports preview, edit, regenerate, tone, approve, schedule, facts, warnings, and version history.

## Activity

Discovery, verification, scoring, generation, approval, send, delivery/read/open, reply, meeting, status changes.

## Notes

Create/edit/pin/mention.

---

# 13. AI message generation

Use OpenAI Responses API structured output.

Input:

- Workspace business profile
- Offer
- Goal
- Lead evidence
- Score
- Channel
- Tone
- Language/dialect
- Length
- CTA
- Previous communication
- Words to avoid
- Compliance rules

Output:

- subject nullable
- body
- verified facts used
- source IDs
- personalization summary
- risk flags
- unsupported claims
- recommended channel
- confidence

Validate output with Zod. Reject unsupported claims. Store prompt/model/version and grounding.

Actions:

- Personalize
- Improve subject
- Shorten
- Rewrite tone
- Add CTA
- Translate
- Custom regeneration
- Compare and restore versions

---

# 14. Outreach queue and scheduler

Top controls:

- Campaign
- Channel
- Status
- Date
- Search
- Pause All
- Resume
- Approve Selected

Columns:

- Scheduled time
- Business
- Channel
- Preview
- Campaign
- Approval
- Status
- Actions

Statuses:

- Needs review
- Approved
- Queued
- Sending
- Sent
- Delivered
- Read
- Replied
- Failed
- Paused
- Suppressed

Right drawer:

- Business
- Full message
- Sources
- Edit
- Schedule
- Send Now
- Remove
- Attempts
- Errors

Atomic pre-send checks:

- Campaign running
- Message approved
- Workspace active
- Subscription active
- Usage available
- Integration connected/not paused
- Within window
- Limits
- Not suppressed
- No opt-out
- No duplicate
- Stop-on-reply
- WhatsApp consent/template
- Valid recipient
- Idempotency unused

Use database locking/atomic claim to prevent duplicate workers.

Durable jobs:

- researchCampaign
- enrichLead
- verifyLead
- scoreLead
- generateLeadMessages
- scheduleCampaign
- dispatchDueMessages
- sendEmailMessage
- sendWhatsAppMessage
- syncEmailReplies
- processWhatsAppWebhook
- classifyReply
- generateReplySuggestion
- replenishCampaign
- aggregateAnalytics
- resetDailyUsage
- refreshProviderTokens
- reconcileProviderStatuses

Jobs need retries, backoff, dead-letter state, idempotency, concurrency limits, pause/kill checks, logs, progress, and no duplicate sends.

Randomized scheduling must stay inside sending days, windows, limits, provider constraints, and workspace timezone.

Auto replenishment:

- Display queue health and threshold.
- Toggle automatic replacement.
- Configure threshold/count/minimum score/manual approval/auto generation.
- Check cooldown, usage, max replenishments/day.
- New leads default to Needs Review unless explicit safe settings permit otherwise.
- Never create an infinite loop.

---

# 15. Unified inbox

Three columns.

Left folders:

- All
- Interested
- Needs response
- Follow up later
- Not interested
- Meetings
- Archived
- Spam

Channel filters:

- Email
- WhatsApp
- Instagram
- LinkedIn

Middle:

- Business
- Channel
- Preview
- Intent
- Time
- Unread

Right:

- Message history
- Business profile
- Campaign
- Score
- Status
- Notes
- AI suggestion

Composer actions:

- Generate Reply
- Shorten
- Make Friendlier
- Translate
- Send
- Schedule

Intent classification:

- Interested
- Asking price
- Wants information
- Follow up later
- Not interested
- Wrong contact
- Stop contact
- Automatic response
- Unknown

Stop-contact workflow:

1. Mark lead DNC.
2. Add suppression.
3. Cancel queued messages.
4. Stop sequences.
5. Audit.
6. Notify assignee.

Do not auto-send AI replies by default. Low-risk reply automation may exist only behind an explicit workspace setting and clear audit trail.

---

# 16. Email integrations

Providers:

- Gmail
- Outlook
- SMTP
- Resend
- SES

Create a provider adapter interface for send, test, sync, and refresh.

Gmail:

- OAuth with one-time expiring state
- Minimum scopes
- Encrypted tokens
- Refresh
- Send
- Thread IDs
- Reply sync
- Push architecture or scheduled sync
- Disconnect/revoke
- Test

Outlook equivalent through Microsoft Graph.

Account card:

- Email
- Daily limit
- Sent today
- Bounce rate
- Reply rate
- Health
- Last sync
- Pause

Buttons:

- Connect Inbox
- Test Email
- Edit Signature
- Pause

Composer:

- From
- To
- Subject
- Body
- Signature
- Schedule
- Follow-up

Rules:

- One recipient per outreach message
- HTML plus plain text
- Thread-aware replies
- Unsubscribe/suppression
- Bounce/complaint handling
- Limits
- No BCC blasting
- Idempotency
- Provider error mapping
- Optional tracking controlled by settings
- Store external IDs

---

# 17. WhatsApp integration

Use official Meta WhatsApp Cloud API only.

Integration card:

- Status
- Business number
- Meta Business account
- Phone Number ID
- Templates
- Quality
- Limit
- Webhook status

Buttons:

- Connect WhatsApp
- Manage Templates
- Test Connection
- Disconnect

Configuration:

- Embedded signup or secure credential setup
- WABA ID
- Phone Number ID
- Access token
- App secret
- Verify token
- Webhook subscription
- Template sync
- Test-number mode

Encrypt secrets.

Send flow:

- Official connection
- E.164 normalization
- Consent check
- DNC check
- Free-form session versus approved template determination
- Template variable validation
- Send
- Store Meta ID
- Update status
- Reconcile failures

Webhook:

- GET verification
- POST signature verification
- sent/delivered/read/failed
- inbound text/media metadata
- template updates
- quality/limit updates when available
- idempotent event storage
- conversation/reply classification

Templates page:

- Name/language/category/status/components/variables/preview/sync/rejection
- Block launch if required template is not approved.

---

# 18. Instagram and LinkedIn

Initial behavior:

- Discover/store profile URL
- Generate personalized DM
- Open profile
- Copy message
- Mark sent
- Save timestamp
- Manual reply tracking

Buttons:

- Open Instagram/LinkedIn
- Copy
- Mark Sent

Use capability flags for future official integrations. Do not claim unrestricted auto-DM.

---

# 19. Calendar

Month and week views.

Events:

- Scheduled messages
- Follow-ups
- Meetings
- Campaign start/end
- Calls

Buttons:

- Schedule Meeting
- Add Follow-up
- Connect Google Calendar

Google integration:

- OAuth
- Calendar selection
- Create/update/delete only Orliqo-owned events
- External IDs
- Sync
- Do not alter unrelated events

Positive reply can create a meeting and update analytics/status.

---

# 20. Analytics

Metrics:

- Discovered
- Approved
- Sent
- Delivery
- Open where enabled
- Read
- Reply
- Positive response
- Meeting
- Conversion
- Cost per lead
- Revenue attributed

Charts:

- Day
- Channel
- Industry
- Country
- Template
- Campaign comparison
- Funnel

Funnel example:

```text
1,000 discovered
520 qualified
400 approved
350 contacted
82 replied
27 interested
12 meetings
4 clients
```

AI insights:

- Best opener
- Best send time
- Best industry
- Best CTA
- Weakest follow-up
- Recommendations

Require adequate sample size and show confidence/evidence.

---

# 21. Templates

Categories:

- Website development
- E-commerce
- Medical clinics
- Restaurants
- Photography studios
- Real estate
- Partnerships
- Follow-ups
- Price responses

Channels:

- Email
- WhatsApp
- Instagram
- LinkedIn

Actions:

- Edit
- Duplicate
- Preview
- Set default
- Test with sample lead
- Archive

Validate template variables.

---

# 22. Billing and plans

Plans:

## Starter — $39/month

- 100 monthly leads
- 200 AI messages
- 3 campaigns
- 1 inbox
- 1 member
- Basic research
- Basic analytics
- Email support

## Growth — $119/month

- 500 monthly leads
- 1,000 AI messages
- Unlimited campaigns
- 3 inboxes
- 5 members
- Advanced research
- Full analytics
- Priority support

## Agency — $349/month

- 2,000 monthly leads
- 5,000 AI messages
- Unlimited campaigns
- 10 inboxes
- 20 members
- Advanced research
- Full analytics
- Dedicated support

Include monthly/yearly toggle and configurable annual discount.

Use Stripe Billing and Checkout Sessions.

Implement:

- Customer
- Checkout
- Success/cancel
- Subscription sync
- Customer Portal
- Upgrade/downgrade
- Proration
- Cancel at period end
- Reactivate
- Webhook signatures
- Event idempotency
- Invoices
- Trial support
- Payment failure banner
- Grace/restriction logic
- Test/live separation

Webhook types include checkout completion, subscription changes/deletion, invoice paid/failed, and other required billing state events.

Billing page:

- Plan
- Renewal
- Usage
- Credits
- Payment method
- Invoices/download
- Upgrade/downgrade/cancel/portal

Usage meters:

- Leads
- AI messages
- Email sends
- Team members
- Connected inboxes

Show upgrade warning above 80%.

Use server-side atomic usage reservation: check → reserve → execute → commit use or release.

---

# 23. Settings

Workspace:

- Company
- Logo
- Website
- Timezone
- Language
- Currency

Branding:

- Orliqo theme
- Customer logo
- Signature
- Tone
- Colors

AI:

- Tone
- Length
- Avoided words
- CTA
- Languages
- Personalization

Sending:

- Daily limit
- Hours
- Days
- Min/max interval
- Follow-up limit
- Stop on reply
- Stop on opt-out
- Pause all
- Emergency kill switch

Compliance:

- DNC
- Suppression
- Consent
- Data deletion
- Export
- Audit

Team:

- Invite/resend/cancel
- Roles/remove
- Ownership transfer with strong confirmation

Security:

- Sessions
- Password
- Connected accounts
- Audit history
- MFA-ready structure

---

# 24. Notifications

Create notification center for:

- Positive reply
- Reply needs attention
- Campaign paused/completed
- Integration expired
- Failure threshold
- Usage limit
- Payment failure
- New replenishment leads
- Team invitation
- Meeting booked

Support read/unread and deep links.

---

# 25. Safeguards and compliance

Create Privacy, Terms, Acceptable Use, data-handling explanation, abuse reporting, and workspace suspension architecture.

Every campaign requires:

- Daily/monthly limit
- Pause
- Kill
- Approval
- Duplicate check
- Suppression
- Audit
- Schedule
- Integration verification

Never:

- Guess verified contacts
- Duplicate sends
- Continue after opt-out
- Hide failures
- Start unbounded campaigns
- Send unauthorized WhatsApp messages
- Circumvent platform restrictions
- Expose credentials

Monitor complaints, failures, and abuse indicators. Allow an administrator to lock sending for a workspace.

---

# 26. Security

Implement:

- Secure OAuth state
- Secure cookies
- Server-only secrets
- Encryption at rest for tokens
- Webhook signature verification
- Rate limiting
- Zod validation
- Output encoding
- Upload MIME/size validation
- Strict access control
- XSS/CSRF protections
- Security headers and CSP where practical
- No open redirects
- SSRF-safe website import with private IP and redirect blocking
- Least-privilege scopes
- Sensitive log redaction
- Audit logs

---

# 27. Error handling and observability

Every async/provider flow needs:

- Friendly error
- Internal code
- Retryability
- Last attempt
- Recommended action
- Settings link
- Audit event
- Sentry capture with redaction

Create loading, empty, partial-success, offline, expired-token, plan-limit, permission-denied, provider-down, and retry states.

Observability:

- Sentry
- Job logs
- Correlation IDs
- Webhook logs
- Audit logs
- Health checks
- Integration status
- Queue lag
- Failure rate
- Sync lag
- Usage reconciliation

Add owner/admin health panel without secret exposure.

---

# 28. Performance

- Parallelize independent data fetching.
- Avoid waterfalls.
- Keep server logic out of client bundles.
- Dynamically import heavy charts/editors.
- Paginate tables.
- Virtualize very large lists where justified.
- Add indexes.
- Pre-aggregate analytics.
- Use Suspense and loading states.
- Cache only safe data.
- Minimize re-renders.
- Use accessible, responsive charts.

---

# 29. Demo and test modes

Implement `DEMO_MODE=true`.

Provide:

- Seed workspace
- Demo campaigns
- At least 30 fake leads
- Mixed verification states
- Messages and queue statuses
- Reply classifications
- Meetings
- Analytics
- Integration states connected/test/expired
- Templates
- Billing usage

No real personal contact data.

Provider simulators:

- Research mock
- AI deterministic fixture mode
- Email preview/no-send
- WhatsApp no-send test
- Stripe test mode
- Inbound reply simulator

Clearly label demo behavior.

Create `.env.example` containing all required variables for Supabase, OpenAI, job provider, Gmail, Microsoft, WhatsApp, Stripe plan IDs, Sentry, PostHog, encryption, app URL, and demo mode. Never commit actual values.

---

# 30. Tests

Unit:

- Phone/email/URL normalization
- Dedup fingerprints
- Scoring
- Scheduling/random interval bounds
- Usage reservation
- Permission matrix
- Suppression
- Consent
- WhatsApp template validation
- AI schema validation

Integration:

- Tenant isolation
- Campaign launch validation
- Queue atomic claim
- Send idempotency
- Stripe webhook idempotency
- WhatsApp webhook idempotency
- OAuth state
- Entitlements
- Replenishment cooldown
- Stop on reply
- Opt-out suppression
- Retry behavior

E2E:

1. Register and onboard.
2. Login.
3. Create campaign.
4. Import/discover.
5. Review lead.
6. Generate and approve.
7. Launch in demo mode.
8. Queue simulates send.
9. Simulated reply reaches inbox.
10. AI classifies.
11. User replies.
12. Meeting is scheduled.
13. Analytics update.
14. Stripe test upgrade.
15. Restricted user is blocked from billing/integrations.
16. Mobile navigation works.

Run lint, typecheck, unit, integration, E2E, and production build.

---

# 31. Accessibility

- Keyboard navigation
- Visible focus
- Correct labels
- Error associations
- Dialog focus traps
- Screen-reader table labels
- Chart summaries
- Contrast
- Reduced motion
- Mobile target sizes
- Semantic headings

---

# 32. Deployment and docs

Prepare Vercel deployment:

- No local filesystem persistence assumptions
- Startup env validation
- Health endpoint
- Supabase migration instructions
- OAuth callback URLs
- Webhook URLs
- Job deployment
- Stripe test/live separation
- Production RLS checklist

Create:

- README.md
- SETUP.md
- INTEGRATIONS.md
- DEPLOYMENT.md
- SECURITY.md
- TESTING.md

---

# 33. Implementation phases

## Phase 1

- Inspect repo and brand
- Design concepts
- Design system
- App shell
- Auth
- Supabase
- Schema/RLS
- Workspaces/roles
- Demo seed

## Phase 2

- Onboarding
- Business profile
- ICP
- Leads
- Evidence/sources
- Notes/activity
- Imports

## Phase 3

- Campaign builder
- AI generation
- Approval
- Templates
- Queue
- Durable scheduling
- Suppression

## Phase 4

- Gmail
- Outlook
- WhatsApp
- Instagram/LinkedIn manual flows
- Calendar

## Phase 5

- Inbox
- Webhook/sync
- Classification
- Reply suggestions
- Meetings

## Phase 6

- Pricing
- Stripe
- Entitlements
- Usage
- Billing UI

## Phase 7

- Analytics
- AI recommendations
- Replenishment

## Phase 8

- Tests
- Security review
- Accessibility
- Browser QA
- Performance
- Documentation

At the end of each phase:

1. Lint.
2. Typecheck.
3. Test.
4. Run the app.
5. Verify the visible workflow.
6. Fix defects.
7. Update the implementation checklist.

---

# 34. Final acceptance checklist

Do not declare completion until all required routes, flows, database policies, jobs, integrations, billing, settings, analytics, safety controls, tests, responsive states, and documentation are present and verified.

No critical button may be inert. No integration may display Connected without actual validation. No provider-backed feature may be described as live without configured credentials and a successful test.

Final handoff must include:

1. Implemented capability summary.
2. Important files/modules.
3. Migrations.
4. Environment variables.
5. Provider setup.
6. Local run instructions.
7. Test commands/results.
8. Browser flows verified.
9. Known limitations.
10. Features needing provider approval/credentials.
11. Security/compliance notes.
12. Deployment instructions.
13. Desktop/mobile screenshots.
14. Intentional deviations.

Begin now by inspecting the repository, locating Orliqo brand assets, producing a complete implementation checklist, and then proceeding phase by phase. Do not omit any requirement in this prompt.
