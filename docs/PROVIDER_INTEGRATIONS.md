# Provider Integration Requirements

Orliqo starts with `DEMO_MODE=true`. A provider remains `disconnected`, `test`, or
`expired` until server-side credential validation succeeds. No UI may display
`connected` or `live` based only on environment-variable presence.

## Shared Integration Contract

Every adapter exposes a typed capability descriptor and normalized operations:

```ts
type ProviderMode = "demo" | "sandbox" | "live"

type ProviderCapability = {
  supported: boolean
  automated: boolean
  requiresConsent: boolean
  reason?: string
}

type ProviderHealth = {
  ok: boolean
  mode: ProviderMode
  checkedAt: string
  errorCode?: string
  retryable?: boolean
}
```

Adapters must:

- Initialize lazily on the server; never construct SDK clients in browser code or
  at module evaluation when missing environment values could break a build.
- Validate input/output with Zod and return normalized error codes, retryability,
  provider request IDs, and redacted metadata.
- Support a no-network deterministic demo implementation with the same interface.
- Use idempotency keys for every external mutation.
- Record attempts, correlation IDs, provider IDs, last success, last failure, and
  health without storing sensitive payloads in logs.
- Enforce authentication, workspace membership, role, entitlement, usage, and
  compliance before work is queued and again immediately before execution.
- Encrypt refresh tokens, long-lived access tokens, SMTP credentials, app secrets,
  and webhook verification material using `INTEGRATION_ENCRYPTION_KEY` and key
  version metadata.
- Use one-time, short-lived, hashed OAuth state and PKCE where supported. Store only
  allowlisted post-callback paths to prevent open redirects.
- Revoke credentials on disconnect when the provider supports revocation, then
  destroy local ciphertext and retain a non-secret audit record.
- Separate test and live credentials and reject mixed-mode configuration.

## Capability Policy

| Channel | Discovery | Generate | Automated send | Initial rule |
| --- | --- | --- | --- | --- |
| Email | Yes | Yes | Yes | Only through a validated Gmail, Outlook, SMTP, Resend, or SES account |
| WhatsApp | Yes | Yes | Yes, constrained | Official Meta Cloud API only; consent and session/template rules required |
| Instagram | Public permitted sources only | Yes | No | Open profile, copy, mark sent, and track manually |
| LinkedIn | Public permitted sources only | Yes | No | Open profile, copy, mark sent, and track manually |
| Manual call | Public permitted sources only | Script/notes | No | Export or mark manual activity only |

Capability flags are provider-account specific. Future official permissions may
enable a capability, but code must not infer authorization from provider name alone.

## Supabase

Products: Auth, Postgres, Storage, and Row Level Security.

Requirements:

- Local Supabase CLI and Docker-compatible runtime for migrations/tests.
- `@supabase/supabase-js` and `@supabase/ssr` with cookie-based PKCE auth.
- A publishable key may be used by the browser. Secret/service-role keys remain
  server-only and are used only for trusted webhooks/jobs after validation.
- Explicit table grants are required for the Data API; RLS is enabled separately on
  every exposed table.
- Google and Microsoft auth providers are configured in Supabase for user login.
  Provider integrations for mailbox access use separate OAuth state and scopes.
- Private `workspace-assets` bucket with workspace-prefixed object paths.
- Local seed data contains no real personal data.

Environment:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
SUPABASE_DB_URL                  # local/CI administrative tests only
SUPABASE_AUTH_GOOGLE_CLIENT_ID   # local config substitution
SUPABASE_AUTH_GOOGLE_SECRET
SUPABASE_AUTH_AZURE_CLIENT_ID
SUPABASE_AUTH_AZURE_SECRET
```

Production setup is deferred. No remote project is linked or migrated without
explicit approval.

## OpenAI and Research Providers

OpenAI responsibilities:

- Responses API structured outputs for lead scoring explanations, grounded message
  generation, reply classification, and reply suggestions.
- OpenAI web search only where the source permits the use and the result can be
  stored with URL, title/domain, citation, retrieval time, confidence, content hash,
  and `allowed_for_automated_use`.
- Zod-validated output; unsupported claims are rejected rather than silently used.
- Store model name and prompt version, but never full secrets or unnecessary source
  content.

Research uses an adapter interface so licensed business-data and contact-verification
providers can be added deliberately. Initial modes:

- `demo`: deterministic synthetic candidates and citations.
- `openai_web_search`: public-source discovery with evidence rules.
- `licensed`: disabled until a specific provider agreement, fields, retention,
  geographic restrictions, and credentials are configured.

Email/phone verification is a separate adapter. A guessed pattern can only be stored
as unverified evidence; it can never become a verified contact or enter a live send.

Environment:

```text
OPENAI_API_KEY
OPENAI_MODEL
OPENAI_RESEARCH_MODEL
OPENAI_PROMPT_VERSION
RESEARCH_PROVIDER=demo
CONTACT_VERIFICATION_PROVIDER=demo
```

## Inngest

Inngest is the selected durable job provider for all named jobs in the master
specification.

Requirements:

- App Router endpoint at `GET|POST|PUT /api/inngest`.
- Typed events and payload schemas.
- Step-level retries/backoff, idempotency, concurrency, rate limiting/throttling,
  cancellation checks, progress, and dead-letter recording.
- Local Inngest Dev Server for Phase 1 and demo flows; no cloud account is required
  for local execution.
- Production signing and event keys are not configured without permission.
- Database-level atomic claims remain mandatory for sends; job durability alone is
  not a duplicate-send guarantee.

Named functions:

```text
researchCampaign, enrichLead, verifyLead, scoreLead,
generateLeadMessages, scheduleCampaign, dispatchDueMessages,
sendEmailMessage, sendWhatsAppMessage, syncEmailReplies,
processWhatsAppWebhook, classifyReply, generateReplySuggestion,
replenishCampaign, aggregateAnalytics, resetDailyUsage,
refreshProviderTokens, reconcileProviderStatuses
```

Environment:

```text
INNGEST_DEV=1
INNGEST_EVENT_KEY
INNGEST_SIGNING_KEY
INNGEST_BASE_URL                 # optional local/test override
```

## Gmail API

Required capabilities: connect, validate, send one recipient, send HTML plus text,
thread-aware reply, sync replies, refresh, revoke, test, and account health.

Requirements:

- Google OAuth web client with exact redirect URI.
- Minimum scopes: identity/email, send, and the least mailbox read/modify scope
  needed for reply synchronization. Scope expansion requires user re-consent.
- Store encrypted refresh/access token data and expiry; never expose it to clients.
- Preserve Gmail message/thread IDs.
- Reply sync uses validated Google Pub/Sub push architecture when configured, with
  scheduled sync as a sandbox/local fallback.
- Handle revocation, expiry, quota, invalid recipient, bounce-equivalent signals,
  and normalized retryability.
- Optional tracking is workspace-controlled and never implied where unsupported.

Environment:

```text
GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET
GOOGLE_OAUTH_REDIRECT_URI
GMAIL_PUBSUB_TOPIC
GMAIL_PUBSUB_VERIFICATION_AUDIENCE
```

Demo mode renders a preview and deterministic provider response but never calls
Gmail.

## Microsoft Graph

Required capabilities mirror Gmail for Outlook mailbox accounts.

Requirements:

- Microsoft Entra application, tenant policy, exact redirect URI, and least Graph
  scopes for identity, offline access, send, and reply synchronization.
- Authorization code plus PKCE/state validation.
- Encrypted token storage, refresh, revoke/disconnect, health, and expiry handling.
- Preserve Graph message/conversation IDs and use subscriptions where available,
  with a scheduled delta sync fallback.
- Validate Graph webhook subscription challenges and client state before enqueueing
  work.

Environment:

```text
MICROSOFT_CLIENT_ID
MICROSOFT_CLIENT_SECRET
MICROSOFT_TENANT_ID=common
MICROSOFT_REDIRECT_URI
MICROSOFT_WEBHOOK_CLIENT_STATE_SECRET
```

## SMTP, Resend, and Amazon SES

These adapters are optional and disabled by default.

Shared rules:

- One recipient per outreach message; no BCC blasting.
- HTML plus plain text, normalized sender identity, unsubscribe/suppression,
  idempotency, provider IDs, limits, and error mapping.
- SMTP credentials are workspace-encrypted, not environment-wide, when entered by
  a customer. Host/port/TLS validation must block private-network abuse where the
  product allows custom hosts.
- Resend and SES API credentials remain server-only and are validated with a safe
  account/domain capability call before Connected is shown.
- Bounce and complaint webhooks are signature-verified and immediately trigger the
  applicable suppression and queued-message cancellation.

Environment for platform-owned sandbox adapters:

```text
SMTP_HOST
SMTP_PORT
SMTP_USERNAME
SMTP_PASSWORD
SMTP_SECURE
RESEND_API_KEY
RESEND_WEBHOOK_SECRET
AWS_REGION
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_SES_CONFIGURATION_SET
```

No platform SMTP/Resend/SES credential is required for Phase 1.

## Meta WhatsApp Cloud API

Only the official Meta WhatsApp Business Platform is permitted. WhatsApp Web,
browser/QR sessions, Selenium, unofficial SDKs, session extraction, and personal
account automation are prohibited.

Requirements:

- Embedded signup or explicit secure setup for WABA ID, Phone Number ID, access
  token, app secret, and verify token.
- Server-side Cloud API version configuration and capability validation.
- E.164 normalization, DNC/suppression, consent status, workspace/campaign limits,
  integration health, and duplicate/idempotency checks before every send.
- Correctly distinguish a free-form customer-service session from a required
  approved template; validate language, components, and variables.
- Store Meta message IDs and reconcile sent/delivered/read/failed statuses.
- `GET /api/webhooks/whatsapp` verifies the subscription challenge.
- POST webhook verifies `X-Hub-Signature-256`, stores one idempotent event, then
  processes inbound text/media metadata, statuses, template changes, quality, and
  account limit updates.
- Block campaign launch when a required template is missing or unapproved.

Environment:

```text
META_APP_ID
META_APP_SECRET
META_WHATSAPP_API_VERSION
META_WHATSAPP_VERIFY_TOKEN
META_WHATSAPP_REDIRECT_URI
META_WHATSAPP_TEST_WABA_ID
META_WHATSAPP_TEST_PHONE_NUMBER_ID
META_WHATSAPP_TEST_ACCESS_TOKEN
```

Demo mode performs full validation and state transitions against fixtures but
always returns a no-send test result.

## Instagram and LinkedIn

Initial integration is manual by design:

- Store a discovered public profile URL with evidence and permission metadata.
- Generate a grounded message, open the profile, copy message, mark sent, store the
  timestamp/user, and allow manual reply tracking.
- Never display automated-send capacity and never claim unrestricted auto-DM.
- A future adapter must expose explicit official permission/capability flags before
  any automated action can be enabled.

No credentials are required for the initial manual workflows.

## Stripe Billing

Requirements:

- Test mode only until explicit production approval.
- Server-side customer creation, Checkout Sessions, Customer Portal, subscription
  sync, upgrade/downgrade, proration preview, cancel-at-period-end, reactivation,
  invoices, trials, failed-payment grace/restriction, and test/live separation.
- Verify webhook signature against the raw body.
- Store Stripe event ID before processing and make handling idempotent.
- Handle checkout completion, subscription create/update/delete, invoice paid/
  failed, and any additional event required by the chosen billing flow.
- Price IDs map to seeded plan entitlements; never trust a client-supplied price or
  workspace ID.
- Usage reservation is database-atomic and independent of Stripe metering.

Environment:

```text
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_STARTER_MONTHLY_PRICE_ID
STRIPE_STARTER_YEARLY_PRICE_ID
STRIPE_GROWTH_MONTHLY_PRICE_ID
STRIPE_GROWTH_YEARLY_PRICE_ID
STRIPE_AGENCY_MONTHLY_PRICE_ID
STRIPE_AGENCY_YEARLY_PRICE_ID
STRIPE_ANNUAL_DISCOUNT_PERCENT
```

Demo mode simulates checkout success/failure and entitlement changes with explicit
test labeling; it does not create Stripe objects.

## Google Calendar API

Requirements:

- Google OAuth with identity, offline access, and the narrow calendar scope needed
  for calendar selection and Orliqo-owned events.
- Store selected calendar ID and encrypted tokens.
- Create/update/delete only events carrying Orliqo ownership metadata and known
  external IDs. Never mutate unrelated events.
- Sync changes idempotently and reconcile expiry/revocation.
- Positive replies may create meetings only after user action or an explicit safe
  workspace rule.

Environment:

```text
GOOGLE_CALENDAR_OAUTH_CLIENT_ID
GOOGLE_CALENDAR_OAUTH_CLIENT_SECRET
GOOGLE_CALENDAR_OAUTH_REDIRECT_URI
```

The Gmail OAuth client may be shared only when the consent screen, scopes, and
credential ownership are intentionally configured together.

## PostHog

Requirements:

- Separate development/test/production projects or environments.
- Capture product events and feature flags without message bodies, contact details,
  provider tokens, or other sensitive outreach content.
- Respect consent and disable analytics in tests unless explicitly enabled.
- Identify by internal user/workspace IDs only; document retention and deletion.

Environment:

```text
NEXT_PUBLIC_POSTHOG_KEY
NEXT_PUBLIC_POSTHOG_HOST
POSTHOG_PERSON_PROFILES=identified_only
```

## Sentry

Requirements:

- Server, edge, and client setup appropriate to Next.js.
- `beforeSend`/logging redaction for tokens, cookies, authorization headers,
  contact data, message bodies, provider payloads, and source content.
- Correlation IDs connect UI errors, Route Handlers, jobs, attempts, and audit logs.
- Source-map upload token is CI/build-only and is never exposed to the browser.

Environment:

```text
NEXT_PUBLIC_SENTRY_DSN
SENTRY_DSN
SENTRY_ORG
SENTRY_PROJECT
SENTRY_AUTH_TOKEN
SENTRY_ENVIRONMENT
```

## Vercel

Vercel is the intended deployment target, but deployment is out of scope until the
user explicitly authorizes it.

Requirements prepared in code/docs:

- No local filesystem persistence assumptions.
- Validated environment at startup and lazy provider clients.
- `/api/health`, documented OAuth callbacks/webhooks, Inngest route, function
  duration settings, Supabase migration process, and Stripe mode separation.
- Preview deployments use demo/sandbox providers and a non-production database.
- Production checklist verifies RLS, grants, secrets, callback origins, webhook
  signatures, domains, Sentry redaction, PostHog consent, and kill switches.

Environment:

```text
NEXT_PUBLIC_APP_URL
APP_ENV=development
DEMO_MODE=true
INTEGRATION_ENCRYPTION_KEY
INTEGRATION_ENCRYPTION_KEY_VERSION
CRON_SECRET
```

## Provider Readiness Gate

A provider can move to `connected` only when all are true:

1. Required configuration is present and belongs to the current environment.
2. OAuth state/signature/credential validation succeeds server-side.
3. Required scopes and account capabilities are confirmed.
4. A safe test call succeeds and returns the expected account identity.
5. Tokens are encrypted and no secret appears in client output or logs.
6. Webhook verification is active when required.
7. Workspace role, entitlement, usage, and compliance settings permit use.
8. The integration records `last_synced_at` or `last_tested_at`, health, and mode.

Until that gate passes, the UI shows `Demo`, `Test`, `Disconnected`, `Expired`, or
`Error`, never `Connected`.
