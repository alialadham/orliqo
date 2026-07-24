# Orliqo Routes

This document matches the Next.js App Router tree produced by the Phase 8
production build.

## Public and authentication routes

| Route              | Behavior                                 |
| ------------------ | ---------------------------------------- |
| `/`                | Public product landing page              |
| `/pricing`         | Starter, Growth, and Agency plan catalog |
| `/privacy`         | Privacy notice                           |
| `/terms`           | Terms of service                         |
| `/acceptable-use`  | Acceptable use policy                    |
| `/login`           | Password, OAuth, and no-send demo entry  |
| `/register`        | Workspace registration                   |
| `/forgot-password` | Password recovery request                |
| `/reset-password`  | Password reset completion                |
| `/auth/callback`   | Supabase OAuth callback                  |
| `/auth/confirm`    | Email confirmation callback              |
| `/onboarding`      | Protected resumable business onboarding  |

Unknown public routes render the root 404 page.

## Protected application routes

`/app/*` requires a valid demo session or Supabase user. The protected layout then
requires an active workspace context and completed onboarding.

| Route                                  | Surface                                                                                  |
| -------------------------------------- | ---------------------------------------------------------------------------------------- |
| `/app`                                 | Redirects to `/app/dashboard`                                                            |
| `/app/dashboard`                       | Workspace metrics, performance, active campaign, recommendations, and replies            |
| `/app/discovery`                       | Evidence-backed lead discovery                                                           |
| `/app/leads`                           | Workspace-scoped lead filters, saved views, table/cards, bulk actions, and export        |
| `/app/leads/import`                    | CSV/XLSX lead import                                                                     |
| `/app/leads/[leadId]`                  | Lead evidence, outreach scratchpad, activity, notes, scoring, and suppression            |
| `/app/campaigns`                       | Campaign list                                                                            |
| `/app/campaigns/new`                   | Campaign builder                                                                         |
| `/app/campaigns/[campaignId]`          | Grounded messages, approvals, queue state, controls, attempts, usage, and audit activity |
| `/app/queue`                           | Message review and delivery queue                                                        |
| `/app/inbox`                           | Unified email, WhatsApp, and manual-social conversations                                 |
| `/app/calendar`                        | Orliqo events and meetings                                                               |
| `/app/analytics`                       | Record-backed metrics, funnel, dimensions, and evidence-gated recommendations            |
| `/app/templates`                       | Workspace and system outreach templates                                                  |
| `/app/integrations`                    | Provider connection, health, test, pause, and disconnect controls                        |
| `/app/integrations/whatsapp/templates` | WhatsApp template sync and status                                                        |
| `/app/integrations/manual-social`      | Manual Instagram and LinkedIn outreach tracking                                          |
| `/app/billing`                         | Plans, usage, invoices, Dodo checkout/portal actions, and subscription controls          |
| `/app/settings`                        | Redirects to `/app/settings/workspace`                                                   |
| `/app/settings/workspace`              | Business profile, offer, ICP, channel, goal, website context, and private logo settings  |

Other `/app/*` paths render the application 404 boundary. The catch-all does not
provide placeholder or sandbox pages.

## Route handlers

| Method               | Route                                  | Responsibility                                                        |
| -------------------- | -------------------------------------- | --------------------------------------------------------------------- |
| `GET`                | `/api/health`                          | Version, environment, and configuration-safe health summary           |
| `POST`, `PUT`        | `/api/imports/leads`                   | Validate/stage and confirm resumable lead imports                     |
| `GET`, `POST`        | `/api/imports/website`                 | Workspace-scoped import status and durable website import enqueue     |
| `GET`, `POST`, `PUT` | `/api/inngest`                         | Serve registered Inngest functions                                    |
| `POST`               | `/api/integrations/[provider]/connect` | Start a permissioned provider connection                              |
| `GET`                | `/api/integrations/google/callback`    | Complete Google OAuth with state validation                           |
| `GET`                | `/api/integrations/microsoft/callback` | Complete Microsoft OAuth with state validation                        |
| `POST`               | `/api/webhooks/dodo`                   | Verify and idempotently reconcile Dodo events                         |
| `POST`               | `/api/webhooks/email/[provider]`       | Verify Resend or SES/SNS events and accept durable work               |
| `POST`               | `/api/webhooks/gmail`                  | Verify Gmail Pub/Sub signals and enqueue sync                         |
| `POST`               | `/api/webhooks/microsoft`              | Validate Microsoft client state and enqueue/persist notification work |
| `GET`, `POST`        | `/api/webhooks/whatsapp`               | Meta challenge and signed WhatsApp event processing                   |
| `POST`, `DELETE`     | `/api/workspace/logo`                  | Validate private workspace logo upload/removal                        |

Mutation handlers apply the relevant combination of session, workspace,
permission, CSRF/origin, body-size, Zod, rate-limit, signature, replay, and
idempotency checks. Webhook workspace identity is resolved from trusted provider
configuration rather than request-supplied workspace IDs.

## Server-action workflows

The following workflows use authenticated server actions instead of separate
REST-style handlers:

- Authentication, logout, and workspace switching.
- Onboarding and workspace profile persistence.
- Lead notes, evidence verification, scoring, suppression, saved views, and bulk
  changes.
- Campaign creation, grounded generation, message revision/approval, atomic
  launch/pause/resume/kill, and guarded dispatch.
- Inbox assignment, classification, notes, reply review, stop-contact, meetings,
  scheduling, and guarded send.
- Integration test/pause/disconnect, preview email, WhatsApp sync, manual social,
  and calendar operations.
- Dodo checkout, billing portal, and cancellation.

Every production action resolves the active user and workspace on the server and
does not trust client-supplied membership, role, or workspace claims.

## Loading and failure behavior

- Root and protected application loading boundaries provide non-blocking skeletons.
- Root, protected application, and global error boundaries provide retry controls
  and redacted Sentry capture when configured.
- Unknown routes render 404 states.
- Missing sessions redirect to login with a session-expired message.
- Permission, quota, provider, rate-limit, empty, offline, and retry states use
  shared domain feedback components or action-level responses.
- Protected application and API responses are not publicly cached.
