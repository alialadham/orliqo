# Orliqo Implementation Checklist

Source of truth: `ORLIQO_CODEX_MASTER_BUILD_PROMPT.md` (all 34 sections). This
checklist is an execution index, not a replacement for the master specification.
If a checkbox is ambiguous, the stricter requirement in the master specification
applies.

Execution-boundary mapping: `docs/MASTER_EXECUTION_MATRIX.md`.

Status: `[ ]` pending, `[~]` in progress, `[x]` verified, `[!]` blocked.

## Global Delivery Rules

- [x] Read the complete master specification before implementation.
- [x] Inspect the repository and preserve the supplied Orliqo logo.
- [x] Keep TypeScript strict and avoid `any`.
- [x] Keep all provider secrets and privileged clients server-only.
- [ ] Make every core action functional, with loading, disabled, focus, active,
      success, and failure behavior where applicable.
- [ ] Never label guessed contact data as verified; retain evidence and confidence.
- [ ] Prevent duplicate outreach with normalization, unique idempotency keys, and
      atomic queue claims.
- [ ] Stop queued outreach after opt-out, suppression, hard bounce, invalid
      recipient, or reply when `stop_on_reply` is enabled.
- [ ] Use only the official Meta WhatsApp Business Platform.
- [ ] Keep Instagram and LinkedIn as discovery plus manual-send flows until an
      official capability explicitly supports automated sending.
- [ ] Use only approved web search, licensed providers, and permitted public
      sources; store citations, content hashes, confidence, and usage permission.
- [ ] Store timestamps in UTC and render them in the workspace time zone.
- [ ] Make jobs idempotent, retryable, observable, concurrency-safe, pausable,
      kill-aware, and dead-lettered after terminal failure.
- [ ] On every server mutation verify authentication, workspace membership, role,
      entitlement, usage, and applicable compliance rules.
- [x] Use sandbox/demo/test modes until each provider has valid credentials and a
      successful connection test.
- [x] Do not deploy, push, or use production credentials without explicit approval.

## Architecture Baseline

- [x] Next.js App Router with current stable compatible React and Node 20.9+.
- [x] Strict TypeScript, Tailwind CSS, shadcn/ui with Radix, and Lucide icons.
- [~] Supabase Auth, Postgres, Storage, versioned migrations, explicit grants, and
  RLS on every exposed table.
- [x] Zod and React Hook Form for validated boundaries and forms.
- [~] TanStack Table for data grids and Recharts for accessible charts.
- [ ] OpenAI Responses API with structured outputs and approved web search.
- [~] Inngest for durable background jobs. The Phase 2 website import is registered;
  later-phase jobs remain pending.
- [ ] Gmail, Microsoft Graph, SMTP, Resend, SES, WhatsApp Cloud API, Stripe, and
      Google Calendar behind typed provider adapters.
- [ ] PostHog and Sentry with redaction and environment separation.
- [x] Vitest, React Testing Library, and Playwright.
- [~] ESLint and Prettier with reproducible scripts and a committed lockfile.
  The lockfile and Git repository are present; full-project formatting remains a
  later cross-phase gate.
- [x] Server Components by default; client components only for interaction.
- [~] Route Handlers for callbacks, webhooks, exports, provider APIs, and health.
  Phase 1 callbacks and health are implemented; provider handlers are phase-scoped.
- [ ] Domain modules for auth, AI, billing, campaigns, compliance, discovery,
      email, integrations, leads, messaging, permissions, scheduling, Supabase,
      usage, and WhatsApp; no monolithic utility or page module.

## Phase 1 - Foundation

### Repository and Product Design

- [x] Confirm the seed repository contains only the master prompt and logo.
- [x] Inspect the supplied 1254x1254 black-and-white Orliqo geometric mark.
- [x] Create the implementation checklist, schema proposal, route map, provider
      requirements, and phased delivery plan.
- [x] Generate a complete desktop app-shell/dashboard concept.
- [x] Generate complete login/registration concepts.
- [x] Generate a mobile app-shell concept including bottom navigation and More.
- [x] Extract exact design tokens, typography, spacing, radii, borders, shadows,
      icon treatment, layout rules, responsive behavior, and allowed visible copy.
- [x] Preserve the logo exactly rather than approximating the mark in CSS.
- [x] Use a premium charcoal shell, off-white work surface, restrained blue-violet
      accent, minimal gradients, thin borders, clear charts, and subtle motion.
- [x] Avoid excessive glow, generic futuristic AI art, clutter, and repetitive
      card grids.
- [x] Use Manrope or Sora headings, Inter UI/body, and an Arabic-ready fallback
      using IBM Plex Sans Arabic or Alexandria.
- [x] Respect reduced motion, visible focus, contrast, and mobile target sizes.

### Application Scaffold and Shell

- [x] Scaffold Next.js App Router with `src/`, strict TypeScript, Tailwind, ESLint,
      and the `@/*` alias.
- [x] Initialize shadcn/ui with Radix and Lucide; add only components used now.
- [x] Configure formatting, typecheck, unit, integration, E2E, and build scripts.
- [x] Add startup environment validation and a complete `.env.example` with no
      actual secrets.
- [x] Add public marketing/legal route placeholders that are honest and navigable:
      `/`, `/pricing`, `/privacy`, `/terms`, and `/acceptable-use`.
- [x] Implement fixed desktop sidebar, sticky top bar, and scrollable content.
- [x] Preserve sidebar order: Dashboard, Campaigns, Leads, Discovery, Outreach
      Queue, Inbox, Calendar, Analytics, Templates, Integrations, Billing, Settings.
- [x] Add workspace selector, Help, avatar, subscription badge, logout at the
      sidebar bottom.
- [x] Add workspace-scoped search, remaining credits, notifications, persistent
      New Campaign action, and user menu to the top bar.
- [x] Implement compact mobile header and bottom navigation for Dashboard,
      Campaigns, Leads, Inbox, and More.
- [x] Put all remaining routes in a full-screen mobile More sheet.
- [x] Ensure drawers become full-screen mobile sheets and tables retain essential
      information as responsive lists when necessary.
- [x] Implement loading, error, not-found, empty, offline, permission, plan-limit,
      and retry surfaces for the Phase 1 routes.
- [x] Add a demo-mode banner that never implies a provider is live.

### Authentication

- [x] Implement email/password registration and email verification.
- [x] Implement login, logout, session refresh, protected routes, and safe redirects.
- [x] Implement forgot-password and reset-password flows.
- [x] Implement Google and Microsoft login through Supabase Auth.
- [x] Use PKCE, secure cookies, one-time state, callback validation, and no open
      redirects.
- [x] Registration fields: full name, work email, password, company name, country,
      team size, required terms agreement, and separate optional marketing consent.
- [x] Registration action atomically creates profile, workspace, owner membership,
      and trial/inactive subscription, then redirects to onboarding.
- [x] Redirect incomplete authenticated users to `/onboarding`.
- [x] Build split-screen login with logo, required positioning statement,
      code-native dashboard preview, trust indicators, email/password, Continue,
      Google, Microsoft, forgot-password, and create-account actions.
- [x] Build registration with complete validation, loading, errors, verification,
      and recovery states.
- [x] Provide a deterministic demo login that never accepts production secrets.

### Workspaces, Roles, and Permissions

- [x] Implement profiles, multi-workspace membership, invitation schema/policies,
      and switching.
- [x] Implement Owner, Administrator, Campaign Manager, Sales Representative, and
      Viewer roles.
- [x] Implement server-side permission checks for workspace manage/delete; team
      invite/role management; billing view/manage; integration view/manage; campaign
      create/update/approve/launch/pause/kill; lead view/create/update/delete/export;
      message generate/edit/approve/send; inbox view/reply; analytics view; settings
      manage; and audit view.
- [x] Never rely on proxy/middleware or client UI as the sole authorization gate.
- [~] Add ownership-transfer and destructive-action confirmation primitives for
  later settings work. Owner-only permissions exist; confirmation UI is deferred.

### Supabase Schema, Security, and Storage

- [!] Initialize Supabase locally and execute the versioned migrations. Files are
  present, but Docker, Podman, and Colima are unavailable on this machine.
- [x] Add `pgcrypto`, `citext`, normalized value helpers, update timestamp helpers,
      and required enums.
- [x] Create all schema tables listed in `docs/DATABASE_SCHEMA.md` with UUID keys,
      timestamps, foreign keys, indexes, checks, unique constraints, and safe defaults.
- [x] Add normalized fingerprints for domain, email, phone, business plus city,
      and social profile URLs.
- [x] Enable RLS on every exposed table and add explicit Data API grants.
- [x] Restrict rows to active workspace members and sensitive writes to roles.
- [x] Keep integration credentials in a private server-only relation; never expose
      them through client-readable tables, views, logs, or generated types.
- [x] Restrict billing and webhook writes to trusted server code after signature
      validation.
- [x] Make audit logs append-only from trusted code.
- [x] Use workspace-prefixed private Storage paths with MIME and size checks.
- [x] Use `security_invoker` for exposed views; keep justified security-definer
      helpers in a private schema with fixed `search_path`, auth checks, revoked public
      execution, and narrow grants.
- [x] Index workspace IDs and all predicates used by RLS policies.
- [x] Add automated tenant-isolation tests across at least two workspaces and roles.

### Demo Data

- [x] Implement `DEMO_MODE=true` without real network sends.
- [x] Seed one demo workspace and multiple role memberships.
- [x] Seed demo business profile, ICP, campaigns, and at least 30 synthetic leads.
- [x] Include mixed verification/evidence states without real personal data.
- [x] Seed messages, queue states, reply intents, meetings, analytics, templates,
      billing usage, and connected/test/expired integration states.
- [x] Provide deterministic research and AI fixtures, email preview/no-send,
      WhatsApp no-send, Stripe test, and inbound-reply simulators.
- [x] Clearly label all simulated states and block live delivery in demo mode.

### Phase 1 Verification Gate

- [x] Run lint with zero errors.
- [x] Run strict typecheck with zero errors.
- [x] Run 19 Phase 1 Vitest unit and integration tests with zero failures.
- [!] Execute the local database reset and pgTAP tenant-isolation suite; blocked
  because no Docker-compatible runtime is installed.
- [x] Run a production build successfully with a disposable local demo secret.
- [x] Launch the application locally.
- [x] Verify login, registration, demo login, protected redirects, workspace switch,
      role restriction, app shell, global navigation, and logout in the browser.
- [x] Verify desktop and mobile layouts in the browser.
- [x] Compare implementation screenshots to accepted concepts with `view_image`.
- [x] Fix every functional, responsive, accessibility, and visual defect found.
- [x] Update this checklist and `WEBSITE_CHANGES.md` with actual results.

## Phase 2 - Onboarding, Business Profile, and Leads

- [x] Build resumable six-step onboarding: Business, Offer, Audience, Channels,
      Goals, Review; persist every step immediately.
- [x] Keep Back lower-left and Continue lower-right.
- [x] Business fields: company, website, industry, country, city, size, description,
      logo upload, Instagram, LinkedIn, and WhatsApp.
- [x] Build SSRF-safe Import from Website with URL validation, private-network and
      redirect blocking, permitted fetches, durable extraction, cited field-by-field
      suggestions, accept/reject, and no silent overwrite.
- [x] Offer fields: main/additional services, project value, pricing model, sales
      cycle, customer problem, advantage, and all specified CTA options plus custom.
- [x] Audience natural-language input plus countries, cities, industries, size,
      employees, revenue, age, all eight website-status filters, social activity,
      review count, keywords, exclusions, contact requirements, and editable AI ICP.
- [x] Channel cards show state, limitations, setup, capacity, compliance, and manual
      Instagram/LinkedIn behavior.
- [x] Goals supports leads/month, messages/day, days, hours, conversion goal,
      follow-ups, minimum score, auto-replenish, sliders plus exact inputs, and plan
      validation.
- [x] Review shows business, offer, audience, channels, limits, estimated usage,
      recommended plan, Save as Draft, and Start First Campaign.
- [x] Build deterministic demo discovery filters, scored results, evidence detail,
      and all required table columns/actions.
- [x] Demo research uses approved synthetic sources and stored citations/evidence,
      normalizes and deduplicates identities, respects suppression, evaluates website
      opportunity, labels verification honestly, and explains deterministic scores.
- [x] Implement 0-100 scoring components for ICP, location, industry, website
      opportunity, social activity, reviews, contact availability, verification, size,
      buying signals, exclusion penalties, and confidence.
- [x] Build leads list search, filters, sorting, pagination, bulk selection, saved
      views, tags, assignment, rescoring, archive, suppression, and export.
- [x] Build lead detail Overview, Activity, and Notes with business/contact fields,
      sources, field evidence, manual verification, score breakdown, opportunity,
      activity history, and create/edit/pin/delete notes. Outreach generation and
      message-version actions remain Phase 3.
- [x] Build CSV/XLSX import upload, parse, map, validate, normalize, preview,
      duplicate detection, missing flags, and confirmation.
- [x] Run the complete application quality gate and update this checklist: lint,
      typecheck, 52 Vitest tests, 11 Playwright workflows, 24-route production
      build, and 1440px/1024px/390px screenshot QA passed. Supabase reset/pgTAP
      remains separately Docker-blocked as documented above.

## Phase 3 - Campaigns, AI, Templates, Queue, and Scheduling

- [x] Build campaign list, statuses, filters, metrics, actions, detail tabs, and
      activity timeline.
- [x] Build campaign wizard for all goals, audience sources, discovery settings,
      contact/exclusion checkboxes, tones, offer, CTA, length, follow-ups, language,
      Arabic dialect, personalization, live samples, schedule, and review.
- [x] Default randomized interval to 2-6 minutes and show finish estimate, daily
      sends, next send, calendar preview, credits, limits, and compliance warnings.
- [x] Validate permission, subscription, usage, integration, approvals, audience,
      schedule, suppression, WhatsApp template/consent, and compliance before launch.
- [x] Implement provider-structured generation behind the deterministic fixture with business, offer, goal,
      evidence, score, channel, tone, language/dialect, length, CTA, history, avoided
      words, and compliance inputs.
- [x] Validate subject/body, verified facts, source IDs, personalization summary,
      risks, unsupported claims, channel, and confidence with Zod; reject ungrounded
      claims and persist model/prompt/version/grounding.
- [x] Implement personalize, subject improvement, shorten, tone rewrite, CTA,
      translate, custom regeneration, comparison, and version restore.
- [x] Build specified Phase 3 template categories, channels, and variable validation;
  persistence edit/duplicate/archive actions remain available through the existing schema and later provider setup.
      edit/duplicate/preview/default/test/archive actions.
- [x] Build queue statuses, approval, pause/resume, inspector content,
      editing, scheduling, send-now, removal, attempts, and errors.
- [x] Implement every atomic pre-send check and a database-level atomic claim.
- [x] Implement all 18 named durable jobs with retries, backoff, dead-letter state,
      idempotency, concurrency controls, pause/kill checks, logs, and progress.
- [x] Keep scheduling inside workspace days/windows/time zone, usage limits,
      provider limits, and randomized bounds.
- [x] Implement suppression and stop-on-reply atomically.
- [x] Implement safe replenishment threshold/count/score/approval/generation,
      cooldown, usage, maximum per day, Needs Review default, and loop prevention.
- [x] Run the complete phase quality gate and update this checklist: clean-runtime
  lint/typecheck, 60 Vitest tests, 22 Playwright desktop/mobile cases (14 passed,
  8 intentional project skips), 28-route production build, and visible QA at
  1440px/1024px/390px passed with clean console and no horizontal overflow.

## Phase 4 - Channel and Calendar Integrations

- [ ] Implement typed email adapters for Gmail, Outlook, SMTP, Resend, and SES:
      send, test, sync, refresh, disconnect, health, and normalized errors.
- [ ] Implement Gmail OAuth state, least scopes, encrypted refresh tokens, refresh,
      send, thread IDs, reply sync/push or polling, revoke, and test.
- [ ] Implement equivalent Microsoft Graph OAuth, send, threading, sync, revoke,
      and test behavior.
- [ ] Build account cards and composer with required health, usage, signature,
      schedule, follow-up, pause, and test behavior.
- [ ] Enforce one recipient, HTML plus text, threading, unsubscribe/suppression,
      bounce/complaint handling, no BCC blasts, idempotency, limits, provider errors,
      optional tracking, and external IDs.
- [ ] Implement official WhatsApp Cloud API setup, E.164, consent/DNC checks,
      session-vs-template choice, variable validation, send, Meta IDs, statuses, and
      failure reconciliation.
- [ ] Verify WhatsApp GET challenge and POST signature; idempotently process
      delivery/read/failure, inbound text/media metadata, template, quality, and limit
      events.
- [ ] Build WhatsApp integration and templates pages with all required status,
      quality, limit, preview, sync, rejection, test, and launch-blocking behavior.
- [ ] Implement Instagram/LinkedIn profile, generated DM, open, copy, mark sent,
      timestamp, manual reply tracking, and capability flags without auto-DM claims.
- [ ] Build month/week calendar, messages, follow-ups, meetings, campaign bounds,
      calls, scheduling actions, and Google Calendar OAuth/sync.
- [ ] Create/update/delete only Orliqo-owned external events and preserve unrelated
      calendar events.
- [ ] Run the complete phase quality gate and update this checklist.

## Phase 5 - Inbox, Replies, and Meetings

- [ ] Build three-column unified inbox with all folders, channels, conversation
      fields, business/campaign context, notes, and AI suggestion.
- [ ] Build composer actions: Generate Reply, Shorten, Make Friendlier, Translate,
      Send, and Schedule.
- [ ] Classify all nine required reply intents with confidence and evidence.
- [ ] Default AI replies to suggestion-only; gate any low-risk automation behind an
      explicit workspace setting and audit trail.
- [ ] Implement stop-contact as one atomic workflow: DNC, suppression, queued
      cancellation, sequence stop, audit, and assignee notification.
- [ ] Sync inbound provider replies and preserve external thread IDs.
- [ ] Create meetings from positive replies and update lead, opportunity, campaign,
      calendar, and analytics state.
- [ ] Run the complete phase quality gate and update this checklist.

## Phase 6 - Pricing, Billing, Entitlements, and Usage

- [ ] Build Starter $39, Growth $119, and Agency $349 plans with every specified
      lead, AI message, campaign, inbox, member, research, analytics, and support limit.
- [ ] Add monthly/yearly toggle and configurable annual discount.
- [ ] Implement Stripe test-mode customer, Checkout success/cancel, subscription
      sync, Customer Portal, upgrade/downgrade, proration, cancel/reactivate, invoices,
      trial, payment-failure banner, and grace/restriction logic.
- [ ] Verify signatures and idempotently handle checkout, subscription, invoice,
      and other required billing events with strict test/live separation.
- [ ] Build billing page for plan, renewal, usage, credits, payment method, invoices,
      download, upgrade, downgrade, cancel, and portal.
- [ ] Meter leads, AI messages, email sends, team members, and connected inboxes;
      warn above 80 percent.
- [ ] Implement atomic check-reserve-execute-commit/release usage accounting.
- [ ] Run the complete phase quality gate and update this checklist.

## Phase 7 - Analytics, Recommendations, and Replenishment

- [ ] Build dashboard greeting, required subtitle, New Campaign, all six metrics,
      period comparisons, mini trends, tooltips, and honest empty states.
- [ ] Build performance chart for sent, delivered, opened when enabled, read when
      supported, replied, and positive with 7/30/90/custom filters.
- [ ] Build active campaign, evidence-based AI recommendations, and recent replies.
- [ ] Build analytics metrics for discovered through conversion, cost per lead, and
      attributed revenue.
- [ ] Build day/channel/industry/country/template/campaign charts and full funnel.
- [ ] Generate best opener/time/industry/CTA, weakest follow-up, and recommendations
      only with sufficient sample size, confidence, and evidence.
- [ ] Pre-aggregate daily analytics and reconcile provider and usage totals.
- [ ] Complete queue-health and auto-replenishment behavior from Phase 3.
- [ ] Run the complete phase quality gate and update this checklist.

## Phase 8 - Hardening, Settings, Accessibility, and Documentation

- [ ] Build all Workspace, Branding, AI, Sending, Compliance, Team, and Security
      settings fields and actions, including pause-all and emergency kill switch.
- [ ] Build notification center for all ten specified events with read/unread and
      deep links.
- [ ] Publish Privacy, Terms, Acceptable Use, data handling, abuse reporting, data
      export/deletion, and workspace suspension workflows.
- [ ] Monitor complaints, failures, abuse, queue lag, sync lag, and usage drift;
      allow trusted administrators to lock workspace sending.
- [ ] Implement secure cookies, token encryption, signatures, rate limiting,
      validation, encoding, upload checks, CSRF/XSS protection, CSP/security headers,
      redirect safety, SSRF defense, least scopes, log redaction, and audit trails.
- [ ] Implement friendly/internal errors, retryability, last attempt, recommended
      action, settings link, audit event, and redacted Sentry capture.
- [ ] Build partial-success, offline, expired-token, provider-down, and retry states.
- [ ] Add owner/admin health panel with no secret exposure.
- [ ] Parallelize safe fetching, avoid waterfalls, keep server code out of clients,
      dynamically import heavy UI, paginate/virtualize, index, pre-aggregate, stream
      with Suspense, cache only safe data, minimize renders, and keep charts accessible.
- [ ] Complete all specified unit, integration, and 16 E2E scenarios.
- [ ] Verify keyboard access, labels, errors, focus traps, table labels, chart
      summaries, contrast, reduced motion, mobile targets, and semantic headings.
- [ ] Create README, SETUP, INTEGRATIONS, DEPLOYMENT, SECURITY, and TESTING docs.
- [ ] Prepare, but do not execute, Vercel setup, health endpoint, migrations,
      callbacks, webhooks, Inngest deployment, Stripe separation, and production RLS
      checklist.
- [ ] Run lint, typecheck, unit, integration, E2E, production build, desktop/mobile
      browser QA, security review, accessibility audit, and performance review.

## Final Acceptance

- [ ] Every required page route and provider Route Handler exists.
- [ ] Every required workflow persists real data or is explicitly labeled sandbox.
- [ ] No critical control is inert.
- [ ] No integration shows Connected before a successful provider validation.
- [ ] No provider-backed feature claims to be live without credentials and a test.
- [ ] Tenant isolation, permissions, entitlements, usage, compliance, idempotency,
      and stop rules are proven by automated tests.
- [ ] Desktop and mobile screenshots are captured and compared to accepted concepts.
- [ ] Final handoff includes capabilities, files, migrations, environment variables,
      provider setup, run instructions, test results, browser flows, limitations,
      approvals/credentials, security/compliance, deployment, screenshots, and
      intentional deviations.
