# Phase 6 — Billing, Entitlements, and Usage

Status: complete for the authorized test/demo scope.

## Architecture

- Billing contracts are provider-neutral and cover checkout, subscription
  retrieval, cancellation, hosted billing management, payment history, and
  webhook processing.
- Dodo Payments is the initial Merchant of Record provider. Stripe has no runtime
  configuration, adapter, or webhook route and remains unsupported.
- Provider identifiers are stored as `provider_customer_id`,
  `provider_subscription_id`, `provider_product_id`, and the composite billing
  event identity `(billing_provider, provider_event_id)`.
- Starter, Growth, and Agency product IDs are resolved from server configuration.
  Client input can choose only a typed plan and interval.
- Dodo `pending`, `active`, `on_hold`, `cancelled`, `failed`, and `expired`
  subscription states map to Orliqo's provider-neutral subscription status.
- Payment success, processing, failure, and cancellation update the existing
  subscription without applying an event twice.

## Security and reliability

- All provider mutations require an authenticated workspace context with
  `billing:manage`.
- Subscription reads are workspace-scoped and protected by the existing
  `billing:view` RLS policy. Client roles receive no billing write grants.
- Dodo webhooks use the raw body and Standard Webhooks
  `webhook-id`, `webhook-timestamp`, and `webhook-signature` headers.
- Webhook timestamps have a five-minute tolerance and signatures use constant-time
  comparison.
- Events are persisted before processing. Repeated provider event IDs return as
  duplicates without reapplying subscription changes.
- Billing persistence, subscription/payment reconciliation, and usage mutations
  are private-schema, service-role-only functions.
- Usage reservation locks the active counter and verifies an active/trialing
  subscription. Idempotent retries return the original reservation. Commit and
  release lock the reservation and update counter totals atomically.
- Demo sessions never call Dodo Payments. Live adapter operations remain
  code-disabled even when live credentials are present.

## User workflows

- `/pricing` shows authoritative monthly/yearly plan pricing.
- `/app/billing` shows the current plan, subscription warnings, usage meters, and
  80 percent warnings.
- Authorized users can create a Dodo test Checkout Session, open the hosted
  customer portal, or schedule cancellation at period end.
- The hosted portal provides supported invoice/payment history, payment-method
  management, plan management, and on-hold recovery.

## Test-mode setup

Set all values below with Dodo test-mode credentials and test products:

```text
BILLING_PROVIDER=dodo
BILLING_PROVIDER_MODE=test
BILLING_LIVE_ENABLED=false
DODO_TEST_API_KEY=
DODO_TEST_WEBHOOK_SECRET=
DODO_TEST_STARTER_MONTHLY_PRODUCT_ID=
DODO_TEST_STARTER_YEARLY_PRODUCT_ID=
DODO_TEST_GROWTH_MONTHLY_PRODUCT_ID=
DODO_TEST_GROWTH_YEARLY_PRODUCT_ID=
DODO_TEST_AGENCY_MONTHLY_PRODUCT_ID=
DODO_TEST_AGENCY_YEARLY_PRODUCT_ID=
```

Configure the Dodo test webhook endpoint as `/api/webhooks/dodo`. Do not use
unsigned CLI-triggered fixtures against this route; it intentionally requires a
valid signature.

## Dependency repair

The existing `node_modules` installation was incomplete: ESLint was missing an
internal file and pnpm's top-level links were absent. `pnpm fetch --force`
restored the exact lockfile packages, and generated dependency links were rebuilt
from pnpm's package map. `package.json` and `pnpm-lock.yaml` were unchanged.

## Verification

- `pnpm typecheck` — passed.
- `pnpm lint` — passed.
- `pnpm test` — 30 files and 115 tests passed.
- Billing-focused Vitest command — 5 files and 16 tests passed.
- Targeted Prettier — passed.
- Full-worktree `git diff --check` stalled on the large preserved uncommitted
  worktree and was stopped after the required code checks passed.
- Local Supabase migration execution remains blocked because no Docker-compatible
  runtime is installed; migration-security tests passed against the SQL.

No Dodo API call, live provider call, credential configuration, deployment,
commit, or push occurred.

## Completion checklist

- [x] Provider-neutral billing contracts and persisted identifiers.
- [x] Dodo Payments test adapter and separated test/live configuration.
- [x] Live mode fails closed and live provider execution is disabled.
- [x] Authenticated, permissioned, workspace-scoped test checkout.
- [x] Subscription retrieval, hosted billing management, and cancellation.
- [x] Standard Webhooks signature verification.
- [x] Persist-before-process event idempotency.
- [x] Subscription and payment state normalization and reconciliation.
- [x] Service-role-only billing and usage database functions.
- [x] Atomic usage reserve, commit, and release.
- [x] Usage meters, payment warnings, and billing-management UI.
- [x] Unit, integration, authorization, webhook, and migration-security tests.
- [x] Typecheck, lint, full Vitest, and focused billing verification.

## Limitations

- Live Dodo Payments and Stripe are intentionally unsupported.
- Plan changes, invoice downloads, payment-method updates, and on-hold recovery
  use Dodo's hosted customer portal rather than duplicating Merchant of Record UI.
- A real signed Dodo test webhook and Checkout completion require user-supplied
  test credentials; automated tests use deterministic fetch and signature fixtures.
- Local migration/pgTAP execution is Docker-blocked on this workstation.
