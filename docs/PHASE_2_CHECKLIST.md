# Phase 2 Implementation Checklist

Status: `[ ]` pending, `[~]` in progress, `[x]` verified, `[!]` blocked.

| Requirement | Route | Component/module | Database | Server boundary | Permission | Test | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Resumable six-step onboarding | `/onboarding` | `OnboardingWizard` | `business_profiles`, `workspace_settings` | onboarding actions | `settings:manage` | persistence/resume + desktop/mobile E2E | [x] |
| Business information and normalization | `/onboarding`, `/app/settings/workspace` | `BusinessStep`, `BusinessProfileEditor` | `business_profiles`, `workspaces` | save business action | `settings:manage` | URL/phone schemas + mutation integration | [x] |
| Private logo upload/remove | onboarding/settings | `LogoUploader` | Storage `workspace-assets` | logo route handler | `settings:manage` | MIME/size/path tests | [x] |
| SSRF-safe website import | `/onboarding`, settings | `WebsiteImportReview` | `website_imports`, `website_import_suggestions`, `job_runs` | `/api/imports/website`, `phase2-import-website` Inngest function | `settings:manage` | IP-range/credential SSRF, provider fallback, polling + E2E | [x] |
| Gemini/Groq/OpenRouter/mock adapters | server only | `features/ai/providers` | import/provider metadata | provider registry | `settings:manage` | structured output/fallback tests | [x] |
| Offer/products/services | `/onboarding` | `OfferStep` | `business_profiles` | save offer action | `settings:manage` | validation/persistence integration | [x] |
| Multiple ICPs, default, duplicate, archive | `/onboarding` | `AudienceStep`, `IcpManager` | `ideal_customer_profiles` | ICP actions | `settings:manage` | ICP validation/actions + E2E | [x] |
| Channel preference states | `/onboarding` | `ChannelsStep` | `workspace_settings.feature_flags` | save channels action | `settings:manage` | honest-state integration | [x] |
| Goal/campaign defaults | `/onboarding` | `GoalsStep` | `workspace_settings.sending` | save goals action | `settings:manage` | limits/time validation | [x] |
| Review, draft, completion | `/onboarding` | `ReviewStep` | `business_profiles` | complete/draft actions | `settings:manage` | completion/redirect E2E | [x] |
| Business profile settings | `/app/settings/workspace` | `BusinessProfileEditor` | business/import tables | settings actions | `settings:manage` | role restriction E2E | [x] |
| Leads list/search/sort/pagination/URL filters | `/app/leads` | `LeadsTable` | `leads`, teammate view | lead queries | `lead:view` | filter/query tests + E2E | [x] |
| Saved views | `/app/leads` | `SavedViewControls` | `saved_views` | saved-view actions | `lead:view`/`lead:update` | integration test | [x] |
| Create/edit/deduplicate lead | `/app/leads`, lead detail | `LeadEditor` | `leads`, `lead_activities`, `audit_logs` | lead actions | `lead:create`/`lead:update` | normalization/dedup/mutation tests + E2E | [x] |
| CSV/XLSX map/preview/confirm | `/app/leads` | `LeadImport` | `import_jobs`, `import_rows`, Storage | `/api/imports/leads` | `lead:create` | parser/mapping/import tests + E2E | [x] |
| Bulk tag/assign/suppress/archive/export | `/app/leads` | `LeadBulkActions` | leads/tags/suppression/activity | bulk actions + export route | `lead:update`/`lead:export` | bulk integration + E2E | [x] |
| Lead detail overview/activity/notes | `/app/leads/[leadId]` | `LeadDetail` | lead aggregate tables | detail queries/actions | `lead:view` | detail/mobile E2E | [x] |
| Sources, evidence, confidence/manual verify | lead detail | evidence controls | `lead_sources`, `lead_field_evidence` | evidence actions | `lead:update` | evidence isolation/integrity tests | [x] |
| Deterministic score and explanation | list/detail | `ScoreBreakdown` | `lead_score_components`, `leads` | score actions | `lead:update` | scoring boundaries/bulk tests | [x] |
| Notes, pin/edit/delete | lead detail | `LeadNotes` | `lead_notes`, `lead_activities` | note actions | `lead:update` | ownership/role tests + E2E | [x] |
| Assignment and tags | list/detail | assignment/tag controls | `workspace_members`, `tags`, `lead_tags` | assignment/tag actions | `lead:update` | role/mutation tests | [x] |
| Suppression/DNC and restore | list/detail | suppression controls | `leads`, `suppression_entries`, `messages` | suppression actions | `lead:update`/`lead:delete` | normalization/enforcement/restore + E2E | [x] |
| Demo equivalents and 30+ synthetic leads | all Phase 2 routes | demo repository | deterministic fixtures | same action contracts | same role matrix | demo workflow unit/E2E | [x] |
| RLS, Storage, indexes, audit | all | migration | all Phase 2 tables | database policies | database matrix | SQL static passed; pgTAP runtime Docker-blocked | [!] |
| Responsive and accessible behavior | all | wizard/table/detail/dialogs | n/a | n/a | n/a | 1440px/1024px/390px Playwright + screenshots | [x] |
| Documentation and final gate | n/a | docs | n/a | n/a | n/a | lint/typecheck/test/E2E/build/browser | [x] |

Phase 3 sending, campaign queue execution, live mailbox/WhatsApp providers, Stripe
checkout, unified inbox, and replenishment execution remain intentionally out of
scope.
