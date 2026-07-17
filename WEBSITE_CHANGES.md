# Website Changes

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
