# Phase 3 — Campaigns, Grounded Messages, and Queue

Status: complete. Quality gate passed on 2026-07-22.

## Delivered

- Campaign list, detail, eight-tab information architecture, and six-step builder.
- Deterministic grounded email, WhatsApp, Instagram, and LinkedIn/manual-social drafts with stored source IDs, confidence, prompt/model metadata, unsupported-claim rejection, versions, transforms, and approval reset.
- Queue scheduling within configured days/windows, deterministic 2–6 minute defaults, daily/monthly limits, reservations, pause/resume/kill, and no-send simulation.
- Database-private atomic claim, stop-lead-outreach, and usage reservation functions restricted to `service_role`.
- All 18 specified Inngest functions with workspace concurrency, retries, idempotency records, failure/dead-letter updates, and demo no-send behavior.
- Templates and queue inspector surfaces, attempts, statuses, audit activity, suppression, stop-on-reply, and duplicate protection.

## Safety boundary

No provider credentials are configured. Demo dispatch changes local deterministic state only and never performs a network send. Instagram and LinkedIn remain manual message workflows. WhatsApp has no live sending path in Phase 3.

## Infrastructure note

The local Supabase runtime remains Docker-blocked. The workspace `node_modules` optional native Rolldown binding also rehydrated incompletely; the full gate ran from a clean lockfile-pinned temporary runtime without modifying the workspace install.

## Gate evidence

- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm test`: 19 files, 60 tests passed.
- `pnpm test:e2e`: 14 passed, 8 intentionally project-scoped skips across 22 desktop/mobile cases.
- `pnpm build`: passed, 28 routes, using a disposable build-only demo secret.
- Visible Browser QA: 1440×900 campaign detail, 1024×800 queue, and 390×844 builder; no horizontal overflow or relevant console warnings/errors. Pause→resume and Goal→Audience interactions passed.
- Local Supabase reset/pgTAP remains blocked because Docker-compatible infrastructure is unavailable.
