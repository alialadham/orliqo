# Website Changes

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
  Stripe is test-only, and research/AI use deterministic fixtures.
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
