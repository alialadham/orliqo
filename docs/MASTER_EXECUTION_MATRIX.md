# Orliqo Master Execution Matrix

This matrix maps phased requirements to implementation boundaries. The master
prompt remains authoritative. Status: `[ ]` pending, `[~]` in progress, `[x]`
verified, `[!]` blocked by local infrastructure.

| Requirement | Phase | Route | Component | Database table | Server action/API | Background job | Permission | Test | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Foundation, auth, workspace shell | 1 | public/auth/app routes | auth forms, app shell | profiles, workspaces, memberships | auth/workspace actions | none | authenticated membership | unit, integration, Playwright, build | [x] |
| Supabase migration runtime gate | 1 | n/a | migrations | all public tables | Supabase CLI | none | local admin | db reset + pgTAP | [!] |
| Resumable six-step onboarding | 2 | `/onboarding` | `OnboardingWizard` | business_profiles, workspace_settings | onboarding actions | none | `settings:manage` | schemas + desktop/mobile E2E | [x] |
| Business profile and private logo | 2 | onboarding, `/app/settings/workspace` | business/settings editors | business_profiles, Storage | workspace/logo API + actions | none | `settings:manage` | validation + role E2E | [x] |
| Grounded website import and review | 2 | onboarding, settings | website review UI | website_imports, website_import_suggestions, job_runs | `POST/GET /api/imports/website` | `phase2-import-website` | `settings:manage` | SSRF/provider unit + onboarding E2E | [x] |
| Multiple ICPs and audience rules | 2 | onboarding, settings | `AudienceStep` | ideal_customer_profiles | ICP actions | none | `settings:manage` | schema/action + E2E | [x] |
| Lead discovery and evidence | 2 | `/app/discovery`, lead detail | discovery/evidence views | leads, lead_sources, lead_field_evidence | discovery/evidence actions | deterministic demo only | `lead:view`, `lead:update` | integration + E2E | [x] |
| Lead list, detail, notes, activity | 2 | lead list/detail | lead table/detail | leads, lead_notes, lead_activities | lead/note actions | none | lead permissions | unit, integration, E2E | [x] |
| CSV/XLSX lead import | 2 | `/app/leads/import` | lead import wizard | import_jobs, import_rows, leads | `/api/imports/leads` | none in demo | `lead:create` | parser + import E2E | [x] |
| Scoring, verification, suppression | 2 | lead list/detail | score/evidence controls | lead_score_components, suppression_entries | lead actions/RPCs | none | `lead:update` | scoring/security + E2E | [x] |
| Campaign builder and queue preparation | 3 | `/app/campaigns`, `/app/campaigns/new`, `/app/campaigns/[id]`, `/app/templates`, `/app/queue` | campaign builder/detail/controls, queue, templates | campaigns, campaign_channels, campaign_leads, messages, message_versions, attempts, usage reservations, job_runs | campaign/message server actions + private atomic RPCs | all 18 named Phase 3 Inngest jobs | campaign/message permissions | 60 Vitest + 22 Playwright cases + build + responsive QA | [x] |
| Provider integrations and scheduling | 4 | integrations/calendar | pending | integration/calendar tables | pending | sync/schedule jobs | integration permissions | pending | [ ] |
| Unified inbox and reply handling | 5 | inbox | pending | conversation/message tables | pending | reply sync/classification | inbox permissions | pending | [ ] |
| Billing and entitlements | 6 | billing | pending | billing/usage tables | pending | reconciliation jobs | billing permissions | pending | [ ] |
| Analytics and reporting | 7 | analytics | pending | daily_analytics | pending | aggregation jobs | `analytics:view` | pending | [ ] |
| Settings, compliance, health, hardening | 8 | settings routes | pending | settings/audit/compliance tables | pending | maintenance jobs | settings/audit permissions | pending | [ ] |

Phase-specific detail and exceptions are tracked in `PHASE_2_CHECKLIST.md` and
`IMPLEMENTATION_CHECKLIST.md`.
