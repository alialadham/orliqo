# Orliqo Production Readiness Report

Date: 2026-08-11  
Branch: `codex/fix-auth-login`  
No commit, push, migration deployment, or application deployment was performed.

## 1. Authentication failure root cause

The original authenticated render called the full production environment parser from historical `src/features/auth/session.ts:18`, `src/features/workspaces/data.ts:25`, and `src/lib/supabase/server.ts:20`. Missing unrelated provider configuration raised `EnvironmentValidationError` before normal Supabase session/workspace reads, and the exception reached the generic safe boundary.

A second production-only failure was found during live QA: the distributed limiter called `private.consume_rate_limit` through PostgREST, while the hosted Data API did not expose the `private` schema (`PGRST106`). The limiter correctly failed closed but the UI incorrectly described this as user throttling.

## 2. Authentication architecture after the fix

- Supabase auth/data, application URL, privileged Supabase, and optional provider configuration have separate parsers.
- Protected routes refresh and validate the Supabase session in the proxy; expired sessions redirect to login with a useful message.
- Email/password and Google callbacks converge on one idempotent bootstrap path.
- The database trigger and repair RPC create or restore profile → workspace → active owner membership → settings → business profile → trial/audit rows.
- Returning users reuse their active workspace; the repair path does not create duplicates.
- Auth-critical privileged RPCs use service-role-only functions in the exposed `public` schema and delegate to private database functions.
- Logout clears Supabase cookies and local workspace/demo cookies.
- Server Function argument logging is disabled so passwords are not printed by Next.js development diagnostics.

## 3. Demo/customer prototype removal

Customer login, registration, app navigation, dashboards, campaign panels, integrations, lead/inbox/analytics surfaces, and public copy no longer expose demo workspaces, fake successes, synthetic replies, demo credits, or demo badges. Internal deterministic fixtures remain only for automated/local testing. They cannot be activated when `NODE_ENV=production`; production also rejects `DEMO_MODE=true`.

## 4. UX, onboarding, metadata, and accessibility

- Registration is minimal and includes Google directly.
- Onboarding is three post-account stages: business, audience, and review/ready; website is optional.
- Advanced setup remains available later in Settings.
- Passwords use the implemented NIST-aligned 15–128 character policy, a common-password check, live accessible guidance, strength feedback, and show/hide controls without composition rules.
- Submission states are truthful, duplicate submissions are blocked, and reduced motion is supported.
- Copy is business-agnostic and uses plain language.
- Orliqo metadata, manifest, Open Graph/Twitter metadata, application name, theme colors, and real brand icon replace framework defaults.
- Keyboard focus, labels, autocomplete, status/progress semantics, contrast-oriented existing styles, and responsive layouts target WCAG 2.2 AA.

## 5. Security and rate limiting

- Feature-scoped environment validation prevents optional integrations from blocking auth/database reads.
- Distributed, hashed-key production limits cover login, registration, recovery/reset, Google initiation, imports, campaign creation/control/generation/sending, and inbox generation/replies.
- The limiter fails closed if its privileged backend is unavailable and distinguishes unavailability from actual throttling.
- Input hardening includes MIME/signature checks for logo and XLSX uploads, CSV NUL rejection, bounded import sizes/rows, spreadsheet-formula neutralization, URL/redirect validation, existing SSRF address pinning, and Zod validation.
- Nonce CSP, HSTS in production, frame restrictions, nosniff, referrer policy, permissions policy, secure auth cookies, RLS/workspace authorization, server-action reauthorization, and service-role isolation remain enabled.
- Auth diagnostics contain only event/stage/status and safe error class/code/status; passwords, OAuth codes, tokens, cookies, emails, and secrets are excluded.

## 6. Privacy, terms, and research

The Privacy Policy, Terms of Service, and Acceptable Use Policy now describe actual Orliqo processing, outreach responsibilities, AI assistance, integrations, billing, opt-outs/suppression, retention, international processing, rights, abuse controls, and legal limitations. Research is recorded in:

- `docs/research/AUTH_SECURITY_RESEARCH.md`
- `docs/research/ONBOARDING_UX_RESEARCH.md`
- `docs/research/PRIVACY_COMPLIANCE_RESEARCH.md`
- `docs/research/AUTH_FAILURE_ROOT_CAUSE.md`

Licensed review is still required for the operating entity details, Jordan PDPL duties, EU/UK representation and transfers, CCPA/CPRA applicability, governing law/venue, liability/indemnity/refunds, and the operational retention/deletion schedule.

## 7. Test and browser results

- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm test`: 45 files, 171 tests passed.
- `pnpm test:e2e`: 42 tests passed across desktop/tablet/mobile projects.
- `pnpm build`: passed; 42 application routes generated/validated.
- `git diff --check`: passed.
- Browser QA: no hydration failures; no horizontal overflow at 390, 430, 768, 1024, 1280, 1440, or 1920 px; keyboard/password controls and reduced-motion behavior passed.
- Live hosted-Supabase flow: confirmed Auth user, profile, workspace, exactly one active owner membership, business profile, saved business/audience, onboarding completion, dashboard, logout, expired-session redirect, returning login, and Google OAuth initiation. Browser console errors: 0; page errors: 0; first-party 500 responses: 0.
- All temporary verification users/workspaces/audits were removed; final temporary-user count: 0.
- Local Supabase/pgTAP execution remains blocked because Docker is not running.

## 8. External configuration and remaining risks

Required before release:

1. Review and deploy both pending migrations:
   - `20260811110333_auth_bootstrap_repair.sql`
   - `20260811143500_auth_service_rpc_boundary.sql`
2. Set production `APP_URL` and `NEXT_PUBLIC_APP_URL`, Auth redirect allow-list entries, Google provider credentials/branding, and the exact Supabase callback URL.
3. Resolve Supabase confirmation-email capacity/custom SMTP. A direct `/register` test reached Supabase but was rejected with `over_email_send_rate_limit` (429); no Auth user was created. The UI now explains the retry path.
4. Run a real new/returning Google consent flow with a controlled Google test identity. Initiation and callback/error logic are tested, but interactive third-party consent was not completed here.
5. Run the migration/RLS/pgTAP suite with Docker or a disposable release database, then run Supabase security advisors.
6. Complete licensed legal review and supply the operating legal entity, registration/address, privacy contact, subprocessor list/DPA, sender postal-address workflow, and enforceable retention/erasure procedures.
7. Validate configured provider credentials and signed webhook callbacks in staging. Optional providers remain feature-scoped and are not required for sign-in.

Do not deploy until items 1–5 are complete.

## 9. Commands

Verification:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

After reviewing the SQL, deploy migrations separately:

```bash
pnpm exec supabase db push
```

Commit and push only when ready:

```bash
git add --all
git commit -m "fix: harden authentication and production onboarding"
git push -u origin codex/fix-auth-login
```

## 10. Exact changed-file inventory

- `docs/PRODUCTION_READINESS_REPORT.md`
- `docs/research/AUTH_FAILURE_ROOT_CAUSE.md`
- `docs/research/AUTH_SECURITY_RESEARCH.md`
- `docs/research/ONBOARDING_UX_RESEARCH.md`
- `docs/research/PRIVACY_COMPLIANCE_RESEARCH.md`
- `next.config.ts`
- `playwright.config.ts`
- `src/app/acceptable-use/page.tsx`
- `src/app/api/health/route.ts`
- `src/app/api/imports/leads/route.ts`
- `src/app/api/imports/website/route.ts`
- `src/app/api/integrations/[provider]/connect/route.ts`
- `src/app/api/webhooks/dodo/route.ts`
- `src/app/api/webhooks/email/[provider]/route.ts`
- `src/app/api/webhooks/gmail/route.ts`
- `src/app/api/webhooks/microsoft/route.ts`
- `src/app/api/webhooks/whatsapp/route.ts`
- `src/app/api/workspace/logo/route.ts`
- `src/app/app/analytics/page.tsx`
- `src/app/app/billing/page.tsx`
- `src/app/app/campaigns/[campaignId]/page.tsx`
- `src/app/app/dashboard/page.tsx`
- `src/app/app/discovery/page.tsx`
- `src/app/app/error.tsx`
- `src/app/app/integrations/page.tsx`
- `src/app/app/integrations/whatsapp/templates/page.tsx`
- `src/app/app/leads/[leadId]/page.tsx`
- `src/app/app/leads/page.tsx`
- `src/app/app/queue/page.tsx`
- `src/app/auth/callback/route.test.ts`
- `src/app/auth/callback/route.ts`
- `src/app/auth/confirm/route.ts`
- `src/app/auth/google/route.test.ts`
- `src/app/auth/google/route.ts`
- `src/app/error.tsx`
- `src/app/favicon.ico`
- `src/app/forgot-password/page.tsx`
- `src/app/global-error.tsx`
- `src/app/layout.tsx`
- `src/app/login/page.tsx`
- `src/app/manifest.ts`
- `src/app/onboarding/page.tsx`
- `src/app/page.tsx`
- `src/app/pricing/page.tsx`
- `src/app/privacy/page.tsx`
- `src/app/register/page.tsx`
- `src/app/reset-password/page.tsx`
- `src/app/terms/page.tsx`
- `src/components/analytics/analytics-view.tsx`
- `src/components/app/app-shell.tsx`
- `src/components/app/desktop-sidebar.tsx`
- `src/components/app/mobile-navigation.tsx`
- `src/components/auth/auth-shell.tsx`
- `src/components/auth/login-form.tsx`
- `src/components/auth/password-guidance.tsx`
- `src/components/auth/recovery-form.tsx`
- `src/components/auth/register-form.tsx`
- `src/components/campaigns/campaign-builder.tsx`
- `src/components/campaigns/campaign-controls.tsx`
- `src/components/dashboard/campaign-panel.tsx`
- `src/components/dashboard/metric-rail.tsx`
- `src/components/dashboard/performance-panel.tsx`
- `src/components/dashboard/recent-replies.tsx`
- `src/components/feedback/demo-notice.tsx`
- `src/components/inbox/inbox-view.tsx`
- `src/components/integrations/email-composer.tsx`
- `src/components/leads/lead-detail.tsx`
- `src/components/leads/lead-import.tsx`
- `src/components/leads/leads-table.tsx`
- `src/components/onboarding/onboarding-wizard.tsx`
- `src/components/public/public-shell.tsx`
- `src/features/ai/providers/index.ts`
- `src/features/audit/server.ts`
- `src/features/auth/actions.ts`
- `src/features/auth/bootstrap.ts`
- `src/features/auth/demo-session.ts`
- `src/features/auth/schemas.test.ts`
- `src/features/auth/schemas.ts`
- `src/features/auth/session.test.ts`
- `src/features/auth/session.ts`
- `src/features/billing/actions.ts`
- `src/features/campaigns/actions.ts`
- `src/features/demo/phase2-store.ts`
- `src/features/inbox/actions.ts`
- `src/features/integrations/credential-service.ts`
- `src/features/integrations/oauth-service.ts`
- `src/features/onboarding/actions.ts`
- `src/features/onboarding/data.ts`
- `src/features/onboarding/schemas.ts`
- `src/features/onboarding/types.ts`
- `src/features/workspaces/data.ts`
- `src/lib/env.test.ts`
- `src/lib/env.ts`
- `src/lib/inngest/functions/phase3.ts`
- `src/lib/inngest/functions/phase4.ts`
- `src/lib/inngest/functions/phase7.ts`
- `src/lib/security/rate-limit.ts`
- `src/lib/supabase/admin.ts`
- `src/lib/supabase/browser.ts`
- `src/lib/supabase/server.test.ts`
- `src/lib/supabase/server.ts`
- `src/proxy.ts`
- `supabase/migrations/20260811110333_auth_bootstrap_repair.sql`
- `supabase/migrations/20260811143500_auth_service_rpc_boundary.sql`
- `tests/e2e/phase1.spec.ts`
- `tests/e2e/phase2.spec.ts`
- `tests/e2e/phase3.spec.ts`
- `tests/e2e/phase4.spec.ts`
- `tests/e2e/phase5.spec.ts`
- `tests/e2e/phase6.spec.ts`
- `tests/e2e/phase7.spec.ts`
- `tests/e2e/phase8.spec.ts`
- `tests/integration/auth-environment-isolation.test.ts`

