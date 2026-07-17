# Orliqo

Orliqo is a workspace-based AI outreach platform. Phase 1 includes the product
shell, authentication, workspace roles and permissions, a Supabase schema with
RLS, synthetic demo data, and a no-send dashboard workflow.

## Requirements

- Node.js 20.9 or newer
- pnpm
- Docker Desktop only when running the local Supabase stack

## Local setup

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

Open `http://127.0.0.1:3000`. Keep `DEMO_MODE=true` and set a unique
`DEMO_SESSION_SECRET` with at least 32 characters. Demo mode uses synthetic data
and blocks email and WhatsApp delivery.

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm format:check
pnpm build
```

The production build validates the demo session secret. If `.env.local` is not
present, provide a disposable local value:

```bash
DEMO_MODE=true \
DEMO_SESSION_SECRET=phase1-local-build-secret-change-me \
pnpm build
```

## Local Supabase

After Docker Desktop is running:

```bash
pnpm exec supabase start
pnpm exec supabase db reset
pnpm exec supabase test db
```

Migrations are in `supabase/migrations`, synthetic fixtures are in
`supabase/seed.sql`, and pgTAP tenant-isolation coverage is in
`supabase/tests/tenant_isolation.sql`.

Provider credentials are optional in Phase 1. Leave them blank and retain the
preview, no-send, fixture, sandbox, and test-mode defaults in `.env.example`.
No deployment or production credential setup is part of this phase.
