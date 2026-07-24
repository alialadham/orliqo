# Website Changes

## 2026-07-24 - Phase 8 Release Hardening

### Files Changed

- Environment, security headers/CSRF/rate-limit/timeout, proxy, and observability
  modules
- Campaign actions/data/components and Phase 8 private RPC migration
- Protected shell, notifications, templates, route errors, offline/session states,
  and accessibility updates
- Phase 8 Vitest/Playwright coverage and desktop/tablet/mobile configuration
- README, Phase 8 record, schema, routes, provider, plan, matrix, and checklist docs

### What Changed

- Added fail-closed startup validation for every configured provider and prevented
  mock, simulator, unsafe live, and partial credential groups in production.
- Added nonce CSP and secure headers, CSRF/body bounds, atomic production rate
  limiting, provider timeouts, authenticated workspace/permission enforcement, and
  hardened signed webhook acceptance.
- Made campaign creation, grounded message approval/revision, and
  launch/pause/resume/kill transactional, optimistic, suppression/consent-aware,
  provider-gated, idempotent, and audited.
- Replaced production synthetic notification/search/template/campaign detail paths
  with workspace-scoped records while preserving visibly labeled demo fixtures.
- Added retryable error boundaries, offline/session states, semantic table/chart
  updates, skip navigation, responsive checks, and leads-table containment.
- Added configured-only Sentry and PostHog instrumentation without PII or session
  recording.
- Removed unused default Next.js public assets.

### Verification

- Lint, strict TypeScript, 37 Vitest files/140 tests, and the focused Phase 8
  hardening suite pass.
- The optimized 41-route production build passes without application/build warnings.
- Playwright passes 40 applicable desktop/tablet/mobile Chromium workflows with 44
  intentional project skips.
- In-app browser QA covers login and all major application routes with clean console,
  no framework overlay, and no document overflow at desktop/tablet/mobile sizes.
- Static migration security tests pass. Docker-backed reset/RLS/pgTAP is blocked
  because Docker is unavailable.

### Notes

- No live provider, hosted Supabase, production credential, checkout, send,
  deployment, commit, push, or Phase 9 operation occurred.

## 2026-07-24 01:27 - Phase 7 Verification Closed

### Files Changed

- `public/brand/orliqo-mark.png`
- `src/components/analytics/analytics-view.tsx`
- `src/features/analytics/demo.ts` and `demo.test.ts`
- `supabase/migrations/20260723200000_phase7_analytics_and_replenishment.sql`
- `tests/e2e/phase1.spec.ts` and Phase 7 verification documentation

### What Changed

- Resolved Next.js and `/login` stalls by materializing the byte-identical tracked
  brand image that macOS had left as a dataless cloud placeholder.
- Removed mobile chart resize warnings, enforced demo funnel invariants, hardened
  analytics template UUID handling, and corrected one stale Playwright locator.

### Verification

- Lint, strict TypeScript, 33 Vitest files/123 tests, and focused Phase 7 tests pass.
- Production build passes with 41 routes using an ephemeral test-only demo secret.
- Playwright passes 27 applicable desktop/mobile workflows with 21 expected skips.
- Development and production in-app Browser QA passes on desktop and 412 px mobile
  with no console errors, warnings, framework overlay, or horizontal overflow.
- Modified-file `git diff --check` passes. The unscoped command is externally
  blocked by 514 private dataless Git objects.

### Notes

- Local Supabase reset remains blocked because Docker Desktop is unavailable.
- No live provider call, credential file change, deployment, commit, push, or
  Phase 8 work occurred.

## 2026-07-24 00:25 - Phase 7 Analytics and Replenishment

### Files Changed

- `src/features/analytics`, `src/components/analytics`, and dashboard components
- `src/app/app/analytics/page.tsx` and `src/app/app/dashboard/page.tsx`
- `src/lib/inngest/functions/phase7.ts`
- `supabase/migrations/20260723200000_phase7_analytics_and_replenishment.sql`
- Phase 7 tests and documentation

### What Changed

- Added record-backed dashboard and analytics reporting, funnel and dimension
  comparisons, attributed cost/revenue, and threshold-gated recommendations.
- Added idempotent daily aggregation and capped, once-daily, suppression-safe
  automatic replenishment with scheduled jobs.

### Verification

- `pnpm lint` and `pnpm typecheck` passed.
- `pnpm test` passed 32 files and 122 tests.
- Local Supabase reset was Docker-blocked. Next.js build and browser navigation
  remained stuck compiling after clean-cache retries.

### Notes

- No live provider call, deployment, commit, push, or Phase 8 work occurred.

## 2026-07-23 - Phase 6: Dodo Payments Billing Foundation

### Files Changed

- `src/features/billing`, `/api/webhooks/dodo`, and `/app/billing`
- `supabase/migrations/20260723170000_phase6_billing_events.sql`
- `.env.example`, generated database types, Phase 6 docs, and billing tests

### What Changed

- Replaced Stripe-specific runtime work with provider-neutral billing contracts.
- Added Dodo Payments test checkout, portal, cancellation, subscription/payment
  state normalization, Standard Webhooks verification, and idempotent reconciliation.
- Added atomic service-role-only usage reserve, commit, and release operations.
- Rebuilt the damaged dependency links from the unchanged pnpm lockfile.

### Notes

- Stripe remains unsupported. Live billing is code-disabled and no provider call
  was made during implementation or verification.

## 2026-07-23 - Phase 6 Started: Plan Catalog

### Files Changed

- `src/features/billing/plans.ts` and tests
- `src/components/billing/pricing-grid.tsx`
- `/pricing` and `/app/billing`
- `.env.example`, Phase 6 docs, checklist, plan, and execution matrix

### What Changed

- Added the authoritative Starter $39, Growth $119, and Agency $349 catalog with
  exact lead, AI message, campaign, inbox, member, research, analytics, and support
  limits.
- Added monthly/yearly pricing with a bounded configured annual discount that
  defaults to zero.
- Kept every billing mutation visibly disabled until the signed test-mode workflow
  is implemented.

### Verification

- ESLint and strict TypeScript passed.
- 26 Vitest files and 102 tests passed.
- Accumulated Playwright passed 24 applicable workflows with 18 intentional
  project skips; the Phase 6 pricing/billing slice passed desktop and mobile.
- Production build passed with 39 routes.

### Notes

- No provider request, production credential, live mutation, deployment, commit, or
  push occurred.

## 2026-07-23 - Phase 5: Unified Inbox Complete

### Files Changed

- `src/app/app/inbox/page.tsx`
- `src/components/inbox/inbox-view.tsx`
- `src/features/inbox`, provider adapters/webhooks/jobs, and demo Phase 5 store
- `supabase/migrations/20260723140000_phase5_unified_inbox.sql`
- `tests/e2e/phase5.spec.ts` and Phase 5 unit/integration security tests
- `docs/PHASE_5.md`, implementation checklist, plan, and execution matrix

### What Changed

- Completed persistent inbound normalization, threading, deduplication, lead
  matching, unread state, classification evidence, and provider sync for Gmail,
  Graph/Outlook, Resend, SES, and WhatsApp.
- Added reviewed reply generation/transforms, approval/edit/rejection/regeneration,
  durable scheduling, explicit adapter-only send, assignment, notes, search, and
  manual intent controls. Demo remains deterministic and no-send.
- Added atomic stop-contact and meeting outcome workflows with suppression,
  cancellation, campaign/lead/opportunity/calendar/analytics updates, audit, and
  notifications.

### Verification

- `eslint .` and strict TypeScript passed with zero errors.
- `vitest run` passed 25 files and 99 tests.
- `playwright test` passed 22 applicable workflows with 16 intentional skips.
- Next production build passed with 38 routes.
- Desktop review/stop-contact and mobile responsive QA passed without horizontal
  overflow; `git diff --check` passed.

### Notes

- Local Supabase reset/pgTAP remains Docker-blocked; migration security and static
  workflow coverage passed.
- No live provider traffic, external send, production credential, deployment,
  commit, or push occurred.
- Missing assets: None.

## 2026-07-23 02:34 - Phase 4: Channel and Calendar Integrations

### Files Changed

- `src/app/api/integrations`, `src/app/api/webhooks`, and Inngest registration
- `src/app/app/integrations`, `src/app/app/calendar`, and integration components
- `src/features/integrations`, `src/features/demo/phase4-store.ts`, and campaign guards
- `src/features/leads/save.ts` and the lead-import route
- `supabase/migrations/20260723100000_phase4_channel_and_calendar_integrations.sql`
- Phase 4 tests, environment example, ESLint ignores, and implementation documentation

### What Changed

- Added typed Gmail, Outlook, SMTP, Resend, SES, WhatsApp Cloud API, and Google Calendar contracts with OAuth, credential, health, webhook, suppression, and reconciliation boundaries.
- Added deterministic provider cards/composer, WhatsApp templates, manual Instagram/LinkedIn tracking, and responsive calendar workflows without live sends.
- Fixed strict provider typing, WhatsApp consent and webhook parsing, SMTP sockets, calendar render purity, generated-report linting, and the accumulated CSV import action-context regression.

### Verification

- Isolated lockfile-pinned install - passed; dependency versions and repository manifests were unchanged.
- `eslint .` and strict TypeScript - passed with zero errors.
- `vitest run` - 21 files and 76 tests passed.
- `playwright test` - 19 applicable workflows passed; 13 project-specific cases skipped intentionally.
- `next build --webpack` - passed; 36 routes generated.
- Focused 1440×900 and 390×844 browser QA passed with visible interaction state, no console errors/warnings, and no horizontal overflow.
- `git diff --check` - passed.

### Notes

- No live provider traffic, production credentials, deployment, commit, or push occurred.
- Local Supabase reset/pgTAP remains blocked by the missing Docker-compatible runtime.
- Changed Phase 4 files were formatted. Historical repository-wide formatting drift remains deferred to the final cross-phase cleanup.
- Missing assets: None.

## 2026-07-21 - Phase 2: Onboarding, Business Context, and Lead Intelligence

### Files Changed

- `src/app/onboarding`, `src/app/app/leads`, `src/app/app/discovery`, and workspace settings
- `src/app/api/imports` and `src/app/api/workspace`
- `src/components/onboarding` and `src/components/leads`
- `src/features/ai`, `src/features/onboarding`, `src/features/leads`, `src/features/imports`, and security helpers
- `supabase/migrations/20260717232822_phase2_business_context_and_lead_intelligence.sql`
- `supabase/seed.sql`, tests, environment example, and Phase 2 documentation

### What Changed

- Added resumable six-step onboarding, business/offer/ICP/channel/goal settings,
  private logo handling, and review/draft/completion flows.
- Added a durable Inngest website-import job with status polling, cited suggestions,
  IP-pinned SSRF protection, and typed Gemini/Groq/OpenRouter/grounded mock fallbacks.
- Added discovery, a responsive lead CRM, evidence and source review, deterministic
  scoring, notes/activity, saved views, assignment/tags, suppression/restore, and
  CSV/XLSX staging with duplicate and suppression checks.
- Expanded deterministic demo data to 30+ synthetic leads and added Phase 2 schema,
  grants, policies, indexes, audit behavior, and security tests.

### Verification

- `pnpm lint` - passed with zero errors.
- `pnpm typecheck` - passed with zero errors.
- `pnpm test` - 16 files and 52 tests passed.
- `pnpm test:e2e` - 11 passed and 5 intentionally project-specific tests skipped.
- Disposable local demo secret + `pnpm build` - passed; 24 route targets generated.
- Visible 1440px/1024px/390px QA passed. The 1024px audit found and fixed lead
  table/filter overflow; the final screenshot and browser diagnostics show every
  filter visible, no page overflow, and zero console errors/warnings.

### Notes

- Hosted Supabase is not connected. Local migration execution and pgTAP remain
  blocked until a Docker-compatible runtime is available.
- Live AI provider keys remain unset; deterministic fallback is active.
- Campaign generation, approval, queueing, scheduling, and sending remain Phase 3.
- No deployment, Git push, production credentials, or external sends were used.

## 2026-07-18 00:40 - Website Update

### Files Changed

- `.gitignore`
- `package.json`
- `WEBSITE_CHANGES.md`

### What Changed

- Ignored the local pnpm store so dependency cache files cannot enter Git history.
- Pinned pnpm and the supported Node.js range for reproducible Vercel builds.
- Switched the production build command to Next.js's supported webpack builder
  after Turbopack repeatedly stalled during compiler startup.

### Verification

- `pnpm install` - passed; dependencies were already current.
- `pnpm lint` - passed with zero errors.
- `pnpm typecheck` - passed with zero errors.
- `pnpm test` - 9 files and 19 tests passed.
- `pnpm build` - passed; 16 route targets generated successfully.

### Notes

- No application behavior, layout, or existing functionality was changed.
- The install emitted a non-fatal registry metadata warning under restricted
  network access.
- Missing assets: None.

## 2026-07-17 15:41 - Website Update

### Files Changed

- `src/app/**`
- `src/components/**`
- `src/features/**`
- `src/lib/**`
- `src/proxy.ts`
- `public/brand/orliqo-mark.png`
- `supabase/**`
- `tests/**`
- `docs/**`
- `.env.example`
- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `next.config.ts`
- `playwright.config.ts`
- `vitest.config.ts`
- `README.md`
- `IMPLEMENTATION_CHECKLIST.md`

### What Changed

- Built the Phase 1 Next.js foundation, public routes, authentication flows,
  protected app shell, responsive dashboard, workspace switching, and server-side
  permission gates.
- Added signed deterministic demo sessions, synthetic no-send workflows, provider
  simulators, and clear demo-state labeling.
- Added versioned Supabase schema, grants, RLS, storage policies, synthetic seeds,
  and pgTAP tenant-isolation coverage.
- Added desktop/mobile design concepts, implementation planning documents, setup
  guidance, and responsive browser workflow coverage.

### Verification

- `pnpm lint` - passed with zero errors.
- `pnpm typecheck` - passed with zero errors.
- `pnpm test` - 9 files and 19 tests passed.
- `pnpm test:e2e` - latest completed run passed 5 tests with 1 mobile-only skip.
- Final `pnpm test:e2e` rerun - blocked before test execution because the sandbox
  denied the local port bind and the escalation quota was unavailable.
- `pnpm build` - completed Phase 1 run passed with Turbopack; the final sandbox
  rerun stalled during compiler startup and was stopped after a bounded wait.
- `next build --webpack` - final fallback passed; 16 route targets generated
  successfully.
- `HOME=/private/tmp/orliqo-supabase-home supabase db reset` - blocked because no
  Docker daemon is installed or running.
- In-app browser QA - passed login, registration, protected redirect, dashboard
  controls, workspace/role gates, logout, and desktop/mobile responsive checks.
- Concept comparison with `view_image` - completed for desktop dashboard and mobile
  More sheet.

### Notes

- Local migration execution and pgTAP remain blocked until Docker, Podman, or
  Colima is installed.
- All provider credentials remain unset; email and WhatsApp are preview/no-send,
  billing is test-only, and research/AI use deterministic fixtures.
- Ownership-transfer confirmation UI remains deferred to the settings phase.
- No deployment, Git push, production credentials, or external sends were used.
- Missing assets: None.

# Phase 3 — Campaigns and safe outreach (2026-07-22)

- Added campaign list/detail, six-step builder, templates, and outreach queue routes.
- Added grounded deterministic message generation, source validation, versioning, transforms, approval, scheduling, pause/resume/kill, suppression, idempotency, usage reservations, and no-send dispatch simulation.
- Registered all 18 Phase 3 Inngest jobs and added private atomic queue/stop/usage database functions.
- Added Phase 3 unit, integration, and Playwright coverage. Gate passed: lint,
  typecheck, 19 files/60 tests, 14 passed + 8 intentionally scoped Playwright
  skips across 22 cases, 28-route build, and visible 1440/1024/390 browser QA.
- Fixed request-bound demo authentication in Route Handlers by verifying the signed
  demo cookie from each incoming request, preventing cross-request cookie-context
  failures in the accumulated Phase 2 import regression suite.
