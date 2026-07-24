# Phase 8 - Release Hardening

Status: implemented and verified locally on 2026-07-24.

Phase 8 is the final Orliqo phase. It preserves the existing UI, provider choices,
database model, workspace architecture, and Phase 1-7 workflows while hardening the
release boundary.

## Production hardening

- Nonce-based CSP is generated per request and includes `strict-dynamic`.
- HSTS is production-only; frame, MIME, referrer, opener, resource, and permissions
  policies are set on responses.
- Protected application and API responses are not publicly cached.
- Authenticated mutations validate origin/fetch-site, body size, and Zod schemas.
- Production rate limiting uses an atomic private database bucket and fails closed
  when its backend is unavailable. Demo/development uses a bounded local limiter.
- Redirects are restricted to safe application paths. Website research protects
  against private-network SSRF and provider requests use bounded timeouts.
- React output escaping, schema validation, parameterized Supabase queries, and
  non-dynamic SQL protect XSS and SQL boundaries.
- User, active workspace, membership, permission, and entitlement checks are
  resolved server-side. Service-role operations never trust a client workspace ID.
- Webhooks verify Dodo, Meta, Gmail, Microsoft, Resend, and SES/SNS authenticity at
  their relevant boundary, then use durable event IDs/hashes for replay and
  idempotency control.
- Campaign creation, approval, revision, and transitions use private
  service-role-only functions with row locks, optimistic timestamps, audit records,
  complete schedules, grounding, suppression, consent, and provider gates.
- Repeat message approval is idempotent in the UI, demo store, and database RPC.
- Delivery workers require the explicit live enable flag plus the channel live
  mode, claim work idempotently, enforce consent/suppression, bound retries, record
  attempts, and recover exhausted jobs.
- Email, WhatsApp, billing, research, OAuth, AI, and certificate requests use
  explicit timeouts and normalized provider errors.

## Environment validation

`src/lib/env.ts` validates at startup:

- application URLs and demo session security;
- Supabase public/server credentials and storage;
- encryption versioning;
- Gemini, Groq, OpenRouter, and OpenAI-compatible configuration;
- Dodo Payments test/live keys, webhooks, and plan products;
- Inngest event/signing keys and development mode;
- Gmail/Google authentication and Calendar OAuth;
- Microsoft/Outlook OAuth and webhook client state;
- SMTP, Resend, SES, WhatsApp Cloud API, and Meta verification;
- PostHog and Sentry runtime/build groups;
- research provider configuration.

Demo defaults are no-send, preview, test billing, mock AI, and simulation. Production
with `DEMO_MODE=false` requires Supabase, service-role, encryption, Inngest, a real
AI provider, complete Dodo configuration, HTTPS, and disabled mock/fixture/simulator
paths. Live email, WhatsApp, or billing also requires the corresponding explicit
enable flag.

## Performance evidence

- `React.cache()` deduplicates current-user and workspace-context reads per request.
- Independent shell search/notification queries run concurrently.
- Production campaign detail, notifications, search, templates, analytics, billing,
  and inbox surfaces query the active workspace instead of hydrating demo fixtures.
- Campaign message generation batches large ID queries and inserts.
- Phase 8 adds focused expiry, campaign-release, and automated-grounding indexes.
- Optional Sentry/PostHog client code initializes only when configured; session
  recording is disabled.
- The wide leads table keeps its inner horizontal scroller while layout/paint
  containment prevents document-level overflow.
- The optimized webpack production build compiles 41 routes without warnings.

## Accessibility and failure states

- A first-tab skip link targets focusable `main#main-content`.
- Headings, labels, pressed state, progress, captions, column headers, chart
  summaries, image alternatives, focus rings, and status announcements are exposed
  to assistive technology.
- Dialogs and responsive navigation retain semantic names and keyboard controls.
- Root, global, and protected error boundaries capture redacted Sentry errors when
  configured and expose retry controls.
- Root/protected loading, 404, session-expired login, offline, empty, permission,
  provider-unavailable, rate-limit, quota, and retry responses are represented by
  shared or domain-specific states.
- In-app browser checks found no framework overlay, console error/warning, missing
  heading, or document-level overflow on the audited desktop, tablet, and mobile
  routes after the leads containment fix.

## Workflow QA

The automated and rendered checks cover:

- protected redirects, password/OAuth/demo entry, registration, logout, workspace
  switching, and viewer billing restrictions;
- six-step onboarding and website context;
- discovery, lead filtering/creation/import/detail/notes/scoring/suppression;
- campaign builder, grounded generation, approval, launch, queue, and deterministic
  no-send dispatch;
- Gmail/Outlook/email health, WhatsApp templates, manual social, and calendar;
- inbox review, filters, classification, stop-contact, and meetings;
- Dodo-backed plan/billing test UI without checkout or live provider calls;
- dashboard, analytics, funnel, dimensions, and recommendations;
- templates, workspace settings, roles/permissions, provider simulators, 404, CSP,
  keyboard skip navigation, and responsive overflow.

## Verification

| Gate                            | Result                                                                           |
| ------------------------------- | -------------------------------------------------------------------------------- |
| `pnpm lint`                     | Passed, zero warnings                                                            |
| `pnpm typecheck`                | Passed                                                                           |
| `pnpm test`                     | 37 files, 140 tests passed                                                       |
| Phase 8 integration suite       | 1 file, 6 tests passed                                                           |
| Playwright                      | 40 applicable desktop/tablet/mobile Chromium tests passed; 44 expected skips     |
| Production build                | Passed; 41 routes; no application/build warnings                                 |
| In-app Browser QA               | Login plus major app routes passed at desktop, 1024 px tablet, and 390 px mobile |
| Static migration/security tests | Passed                                                                           |
| Local Supabase reset and pgTAP  | Blocked: Docker command unavailable                                              |

The Node `NO_COLOR`/`FORCE_COLOR` diagnostic printed by the managed Playwright
runner is an external test-harness environment warning, not an application,
React, console, lint, TypeScript, or build warning.

## Release boundary

- No live provider was enabled or contacted for delivery.
- No Dodo checkout, email, WhatsApp send, or hosted Supabase operation ran.
- No production credential was created or changed.
- No deployment, commit, push, or Phase 9 work occurred.
- Docker-backed migration, RLS, and pgTAP execution must pass in a Docker-capable
  environment before any release or remote migration.
