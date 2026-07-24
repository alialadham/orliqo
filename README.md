# Orliqo

Orliqo is a workspace-isolated SaaS for evidence-backed lead discovery, reviewed
outreach, provider integrations, a unified inbox, scheduling, billing, and
analytics. The application supports a deterministic no-send demo and a
fail-closed production runtime.

## Requirements

- Node.js 20.9 or newer
- pnpm
- Docker Desktop for the local Supabase stack

## Local setup

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

Open `http://127.0.0.1:3000`.

For demo mode, keep `DEMO_MODE=true` and set a unique
`DEMO_SESSION_SECRET` containing at least 32 characters. Demo data is synthetic;
email, WhatsApp, live billing, and hosted provider mutations are blocked.

## Environment validation

`src/lib/env.ts` validates the complete server environment at startup. Production
fails closed when required Supabase, encryption, Inngest, AI, billing, delivery, or
provider configuration is missing or unsafe. Mock AI, fixture mode, reply
simulation, development Inngest, and live delivery without explicit enable flags
are rejected outside the permitted demo boundary.

Use `.env.example` as the authoritative variable inventory. Do not copy real
credentials into source control.

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm exec vitest run tests/integration/phase8-release-hardening.test.ts
pnpm test:e2e
pnpm build
```

A production demo build can use disposable local values:

```bash
APP_URL=https://orliqo.example \
NEXT_PUBLIC_APP_URL=https://orliqo.example \
DEMO_MODE=true \
DEMO_SESSION_SECRET=phase8-verification-secret-at-least-32-characters \
pnpm build
```

## Local Supabase

After Docker Desktop is available:

```bash
pnpm exec supabase start
pnpm exec supabase db reset
pnpm exec supabase test db
```

Migrations are in `supabase/migrations`, synthetic fixtures are in
`supabase/seed.sql`, and tenant-isolation pgTAP coverage is in
`supabase/tests/tenant_isolation.sql`. When Docker is unavailable, migration
security is still checked statically, but runtime SQL and RLS execution remain an
explicit release blocker.

## Runtime safety

- Protected routes require a valid demo session or Supabase user and active
  workspace context.
- Server actions and route handlers re-check permissions and workspace scope.
- CSP nonces, secure headers, CSRF checks, bounded request bodies, input schemas,
  rate limiting, request timeouts, signed webhooks, replay protection,
  idempotency, optimistic locking, suppression, consent, and provider gates are
  enforced in their relevant boundaries.
- Production delivery remains disabled unless the provider mode and the explicit
  live enable flags both permit it.
- Sentry and PostHog initialize only when configured; PII and session recording
  are disabled.

## Documentation

- [Phase 8 release record](docs/PHASE_8.md)
- [Database schema](docs/DATABASE_SCHEMA.md)
- [Routes](docs/ROUTES.md)
- [Provider integrations](docs/PROVIDER_INTEGRATIONS.md)
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md)
- [Execution matrix](docs/MASTER_EXECUTION_MATRIX.md)
- [Implementation checklist](IMPLEMENTATION_CHECKLIST.md)
- [Website changes](WEBSITE_CHANGES.md)

No deployment, production credential change, hosted Supabase connection, live
send, commit, or push is performed by the Phase 8 release-hardening work.
