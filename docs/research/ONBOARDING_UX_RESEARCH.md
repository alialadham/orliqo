# Onboarding UX Research

Reviewed: 2026-08-11

| Source | Finding | Orliqo application |
| --- | --- | --- |
| [GOV.UK question pages](https://design-system.service.gov.uk/patterns/question-pages/) | Ask only information that is genuinely needed, mark optional fields, retain answers when navigating back, and use a simple reliable step count. | Use four short stages: account, business, audience, review. Website, location, company size, and role can be optional. Preserve form state and support Back. |
| [GOV.UK check answers](https://design-system.service.gov.uk/patterns/check-answers/) | A final review increases confidence and gives a chance to correct errors; change links must identify what they edit. | Show a compact business/audience summary before final setup, with accessible Change actions and no duplicate data entry. |
| [Apple design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles) | Guided flows should be easy to escape when possible, explain data use, preserve work, and provide clear feedback. | Advanced setup moves to workspace settings; onboarding explains why information is requested and never requires a website. |
| [Apple progress indicators](https://developer.apple.com/design/human-interface-guidelines/progress-indicators) | Progress must be accurate. Use determinate indicators only for measurable work, indeterminate indicators for unknown duration, and explain stalls/recovery. | Step progress reflects completed screens. Server setup uses an indeterminate spinner plus the single truthful current operation, then confirms only after the server succeeds. |
| [Apple motion](https://developer.apple.com/design/human-interface-guidelines/motion) | Motion should communicate feedback, be brief and precise, never block interaction, and be optional. | Use short opacity/position transitions for step changes and checks; avoid bouncing/springs and remove movement under reduced-motion preferences. |
| [W3C `prefers-reduced-motion` technique](https://www.w3.org/WAI/WCAG22/Techniques/css/C39) | CSS can suppress nonessential motion based on the user's platform setting. | Add a global reduced-motion override and keep state understandable without animation. |
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | AA adds focus-not-obscured, minimum target size, redundant-entry, and accessible-authentication requirements. | Keep controls keyboard reachable and visible, use autofill, allow password-manager paste, avoid cognitive puzzles, and do not ask twice. |
| [W3C status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) | Loading, progress, success, and validation changes that do not move focus must be programmatically announced. | Use `role=status`/`aria-live=polite` for progress and success; use associated field errors and an assertive summary for failed submission. |
| [GOV.UK password input](https://design-system.service.gov.uk/components/password-input/) | A labeled show/hide control reduces entry errors; use correct autocomplete, no autocapitalization/spellcheck, and do not silently truncate with `maxlength`. | Add accessible Show/Hide, `autocomplete=new-password`, no spellcheck/autocapitalize, and schema-based length feedback. |
| [Nielsen Norman Group animation guidance](https://www.nngroup.com/articles/animation-usability/) | Feedback motion should begin promptly enough to preserve cause-and-effect and repeated animations must not become task roadblocks. | Begin check/step feedback immediately and keep it under roughly 200 ms; no forced waits or decorative repeated motion. |

## Applied flow

1. Account: full name, work email, password—or Continue with Google.
2. Business: business name, type/industry, optional website.
3. Audience: target industry; optional location, company size, and role/title.
4. Review: confirm and create the real workspace profile.

The Supabase database trigger creates the account workspace transactionally at
registration. Onboarding updates that existing workspace; it must never create a
second workspace or report success before persistence completes.

