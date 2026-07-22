# Page and Route Structure

The project uses the Next.js App Router under `src/app`. Route groups organize
layouts without changing URLs. Server Components are the default; interactive
tables, forms, charts, command menus, drawers, and composers are isolated client
components.

## Route Groups

```text
src/app/
  (marketing)/          Public product, pricing, and legal pages
  (auth)/               Logged-out authentication pages
  (onboarding)/         Authenticated resumable onboarding
  (product)/app/        Protected multi-workspace product
  auth/                 Supabase Auth callback/confirmation handlers
  api/                  Webhooks, OAuth, exports, jobs, search, and health
```

## Public Pages

| URL | File | Purpose |
| --- | --- | --- |
| `/` | `src/app/(marketing)/page.tsx` | Product landing and primary signup path |
| `/pricing` | `src/app/(marketing)/pricing/page.tsx` | Starter/Growth/Agency monthly and annual pricing |
| `/privacy` | `src/app/(marketing)/privacy/page.tsx` | Privacy and data-handling terms |
| `/terms` | `src/app/(marketing)/terms/page.tsx` | Terms of service |
| `/acceptable-use` | `src/app/(marketing)/acceptable-use/page.tsx` | Outreach, platform, and abuse rules |

Marketing pages use a lightweight public layout and never load privileged clients.
Pricing may read public entitlement data through a server-only query or static typed
configuration; no billing mutation occurs on a public page.

## Authentication Pages

| URL | File | Purpose |
| --- | --- | --- |
| `/login` | `src/app/(auth)/login/page.tsx` | Password, Google, Microsoft, and demo login |
| `/register` | `src/app/(auth)/register/page.tsx` | Account/workspace creation |
| `/forgot-password` | `src/app/(auth)/forgot-password/page.tsx` | Send recovery email |
| `/reset-password` | `src/app/(auth)/reset-password/page.tsx` | Verify recovery session and set password |
| `/auth/callback` | `src/app/auth/callback/route.ts` | Validate PKCE code and safe next path |
| `/auth/confirm` | `src/app/auth/confirm/route.ts` | Confirm email token hash |
| `/auth/error` | `src/app/auth/error/page.tsx` | Friendly expired/invalid callback state |

Authenticated users are redirected away from logged-out pages. Incomplete accounts
are redirected to `/onboarding`; complete accounts go to `/app/dashboard`.

## Onboarding

| URL | File | Purpose |
| --- | --- | --- |
| `/onboarding` | `src/app/(onboarding)/onboarding/page.tsx` | Resume the current persisted step |
| `/onboarding/business` | segment/page | Business profile and website import |
| `/onboarding/offer` | segment/page | Offer, value, sales cycle, CTA |
| `/onboarding/audience` | segment/page | ICP natural language and structured filters |
| `/onboarding/channels` | segment/page | Connection/capability/compliance cards |
| `/onboarding/goals` | segment/page | Usage-aware goals and scheduling defaults |
| `/onboarding/review` | segment/page | Review, save draft, or create first campaign |

The top-level `/onboarding` URL remains canonical and can render steps from persisted
state; child URLs are optional deep links that still enforce completed prerequisites.

## Product Pages

All `/app/*` pages use `src/app/(product)/app/layout.tsx`. The layout verifies the
session, active workspace membership, workspace status, onboarding completion, and
page-level permission before loading data.

| URL | File/segment | Primary surface | Phase |
| --- | --- | --- | --- |
| `/app/dashboard` | `dashboard/page.tsx` | Metrics, performance, active campaign, recommendations, replies | 1 shell, 7 data |
| `/app/campaigns` | `campaigns/page.tsx` | Searchable campaign table | 3 |
| `/app/campaigns/new` | `campaigns/new/page.tsx` | Campaign builder | 3 |
| `/app/campaigns/[campaignId]` | `campaigns/[campaignId]/page.tsx` | Overview, Leads, Messages, Queue, Replies, Analytics, Settings, Activity | 3-7 |
| `/app/leads` | `leads/page.tsx` | Search/filter/bulk/saved-view lead table | 2 |
| `/app/leads/[leadId]` | `leads/[leadId]/page.tsx` | Overview, Outreach, Activity, Notes | 2-5 |
| `/app/discovery` | `discovery/page.tsx` | Research prompt, filters, progressive results | 2 |
| `/app/queue` | `queue/page.tsx` | Approval, scheduling, attempts, errors, pause/resume | 3 |
| `/app/inbox` | `inbox/page.tsx` | Three-column unified inbox and reply composer | 5 |
| `/app/calendar` | `calendar/page.tsx` | Month/week events and meetings | 4-5 |
| `/app/analytics` | `analytics/page.tsx` | Metrics, funnel, comparisons, AI insights | 7 |
| `/app/templates` | `templates/page.tsx` | Channel/category templates and tests | 3 |
| `/app/integrations` | `integrations/page.tsx` | Provider connections and health | 4 |
| `/app/integrations/whatsapp/templates` | nested page | Meta template sync, preview, status, rejection | 4 |
| `/app/billing` | `billing/page.tsx` | Plan, usage, invoices, portal, changes | 6 |
| `/app/billing/success` | nested page | Reconciled Stripe checkout result | 6 |
| `/app/billing/cancel` | nested page | Safe checkout cancellation return | 6 |
| `/app/settings` | `settings/page.tsx` | Redirect to workspace settings | 1 |
| `/app/settings/workspace` | `settings/workspace/page.tsx` | Company, logo, website, locale | 8 |
| `/app/settings/branding` | `settings/branding/page.tsx` | Theme, customer logo, signature, tone, colors | 8 |
| `/app/settings/ai` | `settings/ai/page.tsx` | Tone, length, words, CTA, languages, personalization | 8 |
| `/app/settings/sending` | `settings/sending/page.tsx` | Limits, windows, intervals, stops, pause/kill | 8 |
| `/app/settings/compliance` | `settings/compliance/page.tsx` | DNC, suppression, consent, export/delete, audit | 8 |
| `/app/settings/team` | `settings/team/page.tsx` | Invites, roles, removal, ownership transfer | 8 |
| `/app/settings/security` | `settings/security/page.tsx` | Password, sessions, accounts, audit, MFA-ready | 8 |
| `/app/settings/health` | `settings/health/page.tsx` | Owner/admin provider and queue health without secrets | 8 |

Route-level `loading.tsx`, `error.tsx`, and `not-found.tsx` files are added to data-
heavy or dynamic segments. Permission, plan-limit, provider-down, offline, empty,
and partial-success states are reusable domain surfaces rather than generic errors.

## Route Handlers

### Health, Search, Imports, and Exports

| Method and URL | Responsibility |
| --- | --- |
| `GET /api/health` | Version, environment, database reachability, queue lag summary; no secrets |
| `GET /api/search` | Workspace-scoped campaigns, leads, conversations, templates, and notes |
| `POST /api/imports/csv` | Validate upload metadata and start durable import |
| `POST /api/imports/website` | Validate a public URL, create durable job/import records, and enqueue extraction |
| `GET /api/imports/website?importId=…` | Permissioned status polling and pending review suggestions |
| `GET /api/imports/[importId]` | Workspace-scoped progress and partial failures |
| `GET /api/exports/leads` | Permissioned, audited, streamed CSV export |
| `POST /api/compliance/export` | Start workspace data export |
| `POST /api/compliance/deletion` | Start reviewed deletion request |

### Provider OAuth and Operations

| Method and URL | Responsibility |
| --- | --- |
| `POST /api/integrations/[provider]/connect` | Create one-time state/PKCE and return authorization URL |
| `GET /api/integrations/google/callback` | Gmail/Calendar OAuth callback with state validation |
| `GET /api/integrations/microsoft/callback` | Graph OAuth callback with state validation |
| `GET /api/integrations/meta/callback` | Embedded-signup callback when configured |
| `POST /api/integrations/[provider]/test` | Server-only capability and credential validation |
| `POST /api/integrations/[provider]/disconnect` | Revoke when supported, delete ciphertext, audit |
| `POST /api/integrations/[provider]/sync` | Start a permissioned durable sync |
| `POST /api/integrations/email/preview` | Render HTML/text and no-send demo preview |
| `POST /api/integrations/whatsapp/preview` | Validate template/session and no-send preview |

### Webhooks and Durable Jobs

| Method and URL | Responsibility |
| --- | --- |
| `GET|POST|PUT /api/inngest` | Serve registered Inngest functions |
| `POST /api/webhooks/stripe` | Verify signature, store idempotent event, reconcile billing |
| `GET /api/webhooks/whatsapp` | Meta verification challenge |
| `POST /api/webhooks/whatsapp` | Verify app signature and process inbound/status events |
| `POST /api/webhooks/gmail` | Validate Pub/Sub push envelope and enqueue sync |
| `POST /api/webhooks/microsoft` | Validate Graph notification/subscription and enqueue sync |
| `POST /api/webhooks/calendar/google` | Validate channel/resource and enqueue owned-event sync |

Webhook handlers acknowledge only after durable event acceptance. They never trust a
workspace ID from the request body; provider account identity is resolved through a
validated integration record.

### Billing

| Method and URL | Responsibility |
| --- | --- |
| `POST /api/billing/checkout` | Permission, plan, test/live, and idempotency validation |
| `POST /api/billing/portal` | Create a short-lived customer portal session |
| `POST /api/billing/change-plan` | Upgrade/downgrade with proration preview |
| `POST /api/billing/cancel` | Cancel at period end with confirmation |
| `POST /api/billing/reactivate` | Reactivate an eligible subscription |

## Domain Module Layout

```text
src/
  components/
    ui/                     shadcn source components
    shell/                  desktop/mobile product shell
    feedback/               empty/loading/error/permission/limit states
  features/
    ai/
    analytics/
    auth/
    billing/
    calendar/
    campaigns/
    compliance/
    discovery/
    email/
    inbox/
    integrations/
    leads/
    messaging/
    notifications/
    permissions/
    scheduling/
    usage/
    whatsapp/
    workspaces/
  lib/
    env/                    validated public/server environment access
    inngest/                client, events, functions, middleware
    providers/              adapter contracts and provider implementations
    security/               encryption, OAuth state, SSRF, signatures, redaction
    supabase/               browser/server/admin clients and generated types
  test/
    fixtures/               deterministic demo and provider fixtures
    factories/              tenant-safe test data builders
```

Each feature owns schemas, queries, mutations, permissions, components, tests, and
provider mapping for its domain. Shared helpers must have one clear responsibility;
there is no catch-all `utils.ts`.

## Implemented Phase 2 routes

| Route | State |
| --- | --- |
| `/onboarding` | Resumable six-step business setup |
| `/app/settings/workspace` | Editable business/offer/ICP/channel/goal profile and import history |
| `/app/leads` | Search, URL filters, saved views, responsive list/table, bulk actions, export |
| `/app/leads/import` | CSV/XLSX mapping, preview, confirmation, and summary |
| `/app/leads/[leadId]` | Overview, draft-only outreach, activity, notes, evidence, score, suppression |
| `/app/discovery` | Deterministic demo discovery over evidence-backed records |
| `POST /api/imports/website` | Permissioned, rate-limited enqueue; demo mode remains deterministic and no-network |
| `GET /api/imports/website?importId=…` | Workspace-scoped website import status and review payload |
| `GET|POST|PUT /api/inngest` | Registered durable Phase 2 website import function |
| `POST|PUT /api/imports/leads` | Preview/stage and confirm a resumable lead import |
| `POST|DELETE /api/workspace/logo` | Validated private logo upload/removal |

## Navigation and Search

- Desktop sidebar order exactly follows the master specification.
- Mobile bottom navigation contains Dashboard, Campaigns, Leads, Inbox, and More;
  More exposes the remaining routes in a full-screen sheet.
- Global search is available from the product top bar and queries only the active
  workspace across campaigns, leads, conversations, templates, and notes.
- Search results include entity type, primary label, context, and a safe deep link.
- All dynamic IDs are revalidated against active workspace membership; knowing an
  ID never grants access.
