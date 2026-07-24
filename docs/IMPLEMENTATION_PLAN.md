# Phased Implementation Plan

The master specification is delivered in eight dependency-ordered phases. A phase
does not close until code, database changes, automated checks, a running app, and
visible browser workflows all pass. Failed checks are fixed before the next phase.

## Common Phase Gate

Every phase ends with this exact evidence set:

1. Update `IMPLEMENTATION_CHECKLIST.md` with completed and deferred items.
2. Run formatting verification and lint.
3. Run strict TypeScript typecheck.
4. Run all unit and integration tests relevant to the phase.
5. Run the full regression suite accumulated through that phase.
6. Run a production build.
7. Launch the application with demo/sandbox configuration.
8. Exercise the visible desktop workflow in the browser.
9. Exercise the responsive/mobile workflow in the browser.
10. Inspect browser console, server output, network failures, accessibility, and
    empty/loading/error states.
11. Compare accepted design concepts to implementation screenshots and fix visual
    drift.
12. Record actual commands/results in `WEBSITE_CHANGES.md` and phase notes.

No provider credential, remote database, deployment, GitHub push, or production
operation is part of a gate unless separately authorized.

## Phase 1 - Product Foundation

Goal: establish a secure, testable multi-tenant base and a production-quality shell
that all later domains can reuse.

Delivery sequence:

1. Preserve and inspect the real Orliqo logo and complete the architecture artifacts.
2. Generate desktop dashboard shell, split-screen auth, and mobile shell concepts.
3. Extract the design system, visible-copy lock, icon inventory, component families,
   responsive rules, and motion rules.
4. Scaffold current stable Next.js App Router, strict TypeScript, Tailwind, shadcn/
   Radix, Lucide, ESLint, Prettier, Vitest, RTL, and Playwright.
5. Add environment validation, `DEMO_MODE`, provider-mode boundaries, and docs
   placeholders without live secrets.
6. Implement public/auth/product layouts, desktop sidebar/top bar, mobile bottom
   navigation/More sheet, search shell, notification shell, demo banner, and
   loading/error/empty primitives.
7. Initialize Supabase locally; create extensions, enums, identity/workspace tables,
   role permissions, complete schema foundations, explicit grants, RLS, storage
   policies, and generated types.
8. Implement cookie-based Supabase Auth: register, verify, login, logout, recover,
   reset, Google/Microsoft auth hooks, protected routes, and safe callbacks.
9. Implement transactional profile/workspace/owner/trial creation, active workspace
   selection, role permissions, onboarding redirect, and server authorization.
10. Seed the synthetic demo workspace, 30+ leads, campaigns, messages, queue,
    replies, meetings, templates, analytics, integrations, and billing usage.
11. Test tenant isolation, permission matrix, auth redirects, demo behavior, and
    shell navigation.

Exit workflow:

- New user can register through the complete UI and reaches onboarding.
- Existing/demo user can log in, see the responsive app shell, switch workspace if
  seeded, encounter role restrictions, and log out.
- No cross-workspace record can be read or mutated in automated RLS tests.
- Demo provider states are clearly labeled and cannot send externally.

## Phase 2 - Onboarding, Business Context, and Lead Intelligence

Goal: capture grounded workspace context and turn approved sources/imports into
deduplicated, evidence-backed prospects.

Delivery sequence:

1. Build resumable six-step onboarding with immediate persistence and plan-aware
   validation.
2. Add business, offer, ICP, goals, channels, and review domain mutations.
3. Implement logo upload and workspace-prefixed Storage rules.
4. Implement SSRF-safe website import as an Inngest workflow with cited suggestions
   and explicit field-level acceptance.
5. Implement deterministic normalization and fingerprints for URL, email, phone,
   business/city, and social profiles.
6. Add lead, source, field evidence, scoring component, note, activity, tag, saved
   view, assignment, consent, suppression, and import persistence.
7. Build discovery search planning and provider adapter; begin with deterministic
   fixtures and approved OpenAI web search only when credentials are configured.
8. Implement scoring, verification labels, evidence popovers, progressive results,
   rejection, and usage accounting.
9. Build lead list/detail surfaces, CSV/XLSX mapping/validation, export, notes,
   activity, and outreach placeholders grounded in actual records.

Exit workflow:

- User completes/resumes onboarding, accepts cited website suggestions, defines an
  ICP, runs demo discovery, inspects evidence, imports a file, deduplicates leads,
  and manages lead detail without fabricated verification.

## Phase 3 - Campaigns, AI Messages, Queue, and Durable Scheduling

Goal: convert qualified leads into approved, safe, idempotently scheduled outreach.

Delivery sequence:

1. Build campaign list/detail, all statuses, activity, and wizard steps.
2. Add audience selection, imports, AI recommendations, discovery settings, channel
   allocation, live samples, and usage/safety preview.
3. Implement OpenAI Responses structured generation behind deterministic fixtures;
   validate grounding, unsupported claims, risks, confidence, and prompt versions.
4. Build message editing, regeneration actions, approval, versions, comparison,
   restore, and all template categories/channels.
5. Implement launch validator across permission, subscription, usage, provider,
   approval, schedule, suppression, consent, and template state.
6. Implement campaign scheduling and every atomic pre-send rule.
7. Add database locking/atomic claim and provider-agnostic idempotency.
8. Register all named Inngest functions with typed events, retries, backoff,
   concurrency, cancellation, progress, and local dead-letter records.
9. Build queue table/drawer, bulk approval, pause/resume/kill, attempts, errors, and
   randomized scheduling inside workspace windows.
10. Implement safe replenishment cooldowns, daily caps, usage, review defaults, and
    infinite-loop prevention.

Exit workflow:

- User creates a demo campaign, discovers/imports leads, generates grounded
  messages, edits/approves them, launches, observes gradual no-send dispatch, pauses,
  resumes, kills, and cannot create duplicate or suppressed sends.

## Phase 4 - Email, WhatsApp, Manual Social, and Calendar

Goal: connect official provider channels through uniform, validated adapters while
keeping sandbox behavior available without credentials.

Delivery sequence:

1. Finalize shared provider contracts, encryption, OAuth state, token refresh,
   capability flags, health, normalized errors, and disconnect/revoke.
2. Implement Gmail and Microsoft Graph OAuth, send, threading, sync/push, test, and
   account health.
3. Implement optional SMTP, Resend, and SES adapters, bounce/complaint mapping, and
   signatures.
4. Build integration cards, account details, signatures, composer, preview, tests,
   limits, and pause controls.
5. Implement official Meta WhatsApp Cloud API setup, template sync, send rules,
   status reconciliation, and signed webhooks.
6. Build WhatsApp account and template management surfaces, blocking unapproved
   launch paths.
7. Build Instagram and LinkedIn manual open/copy/mark-sent/reply tracking with no
   unsupported automation claims.
8. Build calendar month/week views and Google OAuth/select/sync for Orliqo-owned
   meetings, follow-ups, calls, and campaign events.

Exit workflow:

- Sandbox tests prove provider adapters and UI states without network sends. If the
  user later supplies test credentials, each provider must pass its readiness gate
  before Connected appears.

## Phase 5 - Unified Inbox, Classification, Replies, and Meetings

Goal: centralize inbound conversations and move positive replies into a controlled
sales outcome without unsafe automatic replies.

Delivery sequence:

1. Normalize provider inbound events into messages and conversations.
2. Build the three-column inbox, folders, channel filters, unread state, lead/
   campaign context, notes, assignment, and responsive mobile flow.
3. Implement all intent classifications with deterministic fixtures and structured
   AI output when configured.
4. Build grounded reply suggestions and transformations; default to human approval.
5. Implement send/schedule composer through the same pre-send rules as campaigns.
6. Implement atomic stop-contact behavior: DNC, suppression, queued cancellation,
   sequence stop, audit, and notification.
7. Add meeting creation, calendar sync, opportunity state, and analytics updates.

Exit workflow:

- A simulated inbound reply appears once, is classified, can be answered safely,
  triggers stop-contact when requested, or creates a meeting and outcome trail.

## Phase 6 - Merchant of Record Billing, Plans, Entitlements, and Usage

Goal: make product access and capacity enforceable from authoritative billing state.

Delivery sequence:

1. Seed exact Starter, Growth, and Agency prices/features/limits and annual discount.
2. Implement Dodo Payments test-mode customer, Checkout, success reconciliation,
   portal, plan changes, proration, cancellation/reactivation, invoices, and trials.
3. Add raw-body signature verification and idempotent billing event handling.
4. Implement failed-payment grace and restriction state.
5. Implement atomic usage check/reserve/execute/commit-or-release.
6. Enforce entitlements and usage in every relevant server mutation and job.
7. Build pricing and billing UI, usage meters, invoices, payment method/portal,
   actions, and 80 percent warnings.

Exit workflow:

- Dodo Payments fixtures/test mode upgrade the demo workspace, update entitlements, block a
  restricted role, enforce limits, and reconcile duplicate webhooks exactly once.

## Phase 7 - Analytics, Recommendations, and Replenishment

Goal: expose trustworthy funnel performance and evidence-backed optimization.

Delivery sequence:

1. Implement idempotent daily aggregation and reconciliation from provider/message/
   campaign/meeting/opportunity records.
2. Complete dashboard metrics, trends, performance chart, active campaign, recent
   replies, and period filters.
3. Build analytics dimensions, comparisons, funnel, cost, and revenue attribution.
4. Generate recommendations only above sample thresholds and show confidence and
   evidence.
5. Complete queue health and automatic replenishment using measured outcomes and
   all Phase 3 safeguards.

Exit workflow:

- Demo sends/replies/meetings roll into charts and funnel exactly once; low-sample
  insights are withheld or labeled insufficient, and replenishment remains bounded.
- Phase 7 is complete across build, tests, and development/production browser QA.
  See `docs/PHASE_7.md` for the external Docker and dataless Git object blockers.

## Phase 8 - Security, Compliance, Accessibility, Performance, and Docs

Goal: close the cross-cutting release criteria and prepare a deployable artifact
without deploying it.

Implemented boundary:

1. Validate the complete runtime environment with descriptive Zod failures, safe
   demo defaults, and production fail-closed provider and live-mode gates.
2. Enforce nonce CSP, security headers, CSRF/origin checks, bounded bodies,
   workspace-aware rate limits, safe redirects, SSRF controls, request timeouts,
   signed webhooks, replay protection, and log redaction.
3. Move production campaign creation, approval, revision, and state transitions
   behind service-role-only transactions with row locks, optimistic timestamps,
   grounding, suppression, consent, provider, idempotency, and audit gates.
4. Harden queue failures, retry exhaustion, no-send demo behavior, and explicit
   live-delivery authorization.
5. Deduplicate request-scoped auth/workspace queries, parallelize independent
   layout data, add query indexes, and defer optional client observability.
6. Add skip navigation, focusable main content, semantic tables/captions, accessible
   charts, labels, retry controls, offline state, session-expired handling, global
   404/500 boundaries, and responsive overflow remediation.
7. Use real workspace data for production notifications, search, templates,
   campaigns, leads, analytics, billing, and inbox surfaces while keeping synthetic
   fixtures explicitly demo-only.
8. Initialize Sentry and PostHog only when configured, with PII and session
   recording disabled.
9. Verify lint, strict TypeScript, unit/integration tests, focused Phase 8 security
   tests, the production build, the full Playwright matrix, and in-app desktop,
   tablet, and mobile QA.
10. Reconcile the README, schema, routes, provider, execution, checklist, and change
    documentation with the implementation.

Exit condition:

- All feasible local gates pass with no live provider call, deployment, commit,
  push, production credential change, or hosted Supabase connection. Docker-backed
  migration/RLS/pgTAP execution is documented as the remaining infrastructure
  blocker.

## Current Execution Boundary

Phases 1 through 8 are implemented. Phase 8 is the final phase; there is no Phase 9.
Provider credentials remain unchanged, and local verification uses the deterministic
demo/no-send boundary. No deployment, push, hosted database connection, or
production operation is authorized.
