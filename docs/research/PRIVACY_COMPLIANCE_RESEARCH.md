# Privacy and Outreach Compliance Research

Reviewed: 2026-08-11. This is product/legal research, not a legal opinion.

## Actual Orliqo processing found in the repository

Orliqo stores account/profile data; workspace and business details; audience
criteria; uploaded CSV/XLSX lead data; public-source URLs and evidence; lead/contact
details; suppression and consent records; campaigns, message content, replies,
meetings, notes, and analytics; integration identifiers and encrypted credentials;
subscription, usage, invoice/event references; audit/security events; and optional
product telemetry.

Data can be processed by Supabase; Google or Microsoft for identity and connected
mail/calendar; Meta for WhatsApp; configured email services (Gmail, Microsoft,
SMTP, Resend, or SES); Dodo Payments; selected AI providers (Gemini, Groq,
OpenRouter, or OpenAI-compatible services); Inngest; and optional Sentry/PostHog.
Only configured/used providers should receive data.

## Sources and application

| Source | Finding | Orliqo application |
| --- | --- | --- |
| [European Commission: privacy notice contents](https://commission.europa.eu/law/law-topic/data-protection/rules-business-and-organisations/principles-gdpr/what-information-must-be-given-individuals-whose-data-collected_en) | GDPR notices identify the controller, purposes, categories, lawful bases, retention, recipients, transfers, rights, complaint route, and automated decision-making. Article 14 also matters when data comes from another/public source. | The policy distinguishes account users from prospect/contact data, lists sources and processors, explains AI-assisted scoring/drafting, and provides rights/contact information. Outreach users remain controllers for their own lead data; Orliqo is generally their processor/service provider. |
| [European Commission: GDPR principles](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/principles-gdpr_en) | Lawfulness, purpose limitation, minimization, accuracy, storage limitation, security, and accountability apply. | Collect the minimum setup data, support correction/deletion/export, keep evidence provenance, isolate workspaces, and define a retention schedule instead of indefinite storage. |
| [ICO B2B marketing](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/business-to-business-marketing/) | UK GDPR still applies to named business contacts. PECR treatment differs for corporate subscribers versus sole traders/some partnerships. Direct-marketing objections are absolute and suppression records should be retained. | Require users to determine recipient type/lawful basis, identify themselves, honor opt-outs, and screen all campaigns against suppression. Do not present “B2B” as a blanket consent exemption. |
| [FTC CAN-SPAM guide](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business) | CAN-SPAM applies to B2B commercial email, requires truthful identity/subject, postal address, clear opt-out, and honoring opt-outs within 10 business days. Responsibility cannot be contracted away. | Terms and acceptable use place sender compliance on the customer; campaign safeguards must preserve sender identity, postal address, unsubscribe/opt-out handling, and suppression. |
| [California Attorney General: CCPA](https://oag.ca.gov/privacy/ccpa) | In-scope businesses need notice at collection and policies explaining categories/purposes plus access, deletion, correction, opt-out/limit, and non-discrimination rights. | Provide category/purpose disclosures and a request channel. Current code does not sell personal information or use cross-context behavioral advertising; re-evaluate before enabling advertising or data monetization and determine whether statutory thresholds apply. |
| [Jordan Personal Data Protection Law No. 24 of 2023](https://www.modee.gov.jo/EBV4.0/Root_Storage/EN/1/PDP_Law_-_English_Version-_officail_translation.pdf) and [Jordan PDPU](https://www.modee.gov.jo/EN/Pages/Personal_Data_Protection_Unit?View=2201) | Effective 2024-03-17; it provides notice/access/correction/erasure/objection/portability/breach rights, requires security measures, governs consent and overseas transfers, and identifies cases requiring a DPO. | Publish accurate notice and request procedures, document security and processors, assess overseas Supabase/provider transfers, and obtain Jordan counsel on lawful bases, transfer mechanisms, registration/licensing, and DPO appointment before launch. |
| [Supabase DPA](https://supabase.com/downloads/docs/Supabase%2BDPA%2B260317.pdf) | Supabase publishes controller/processor and subprocessor commitments for customer data. | Execute and retain the applicable DPA, choose the intended region, and document transfer safeguards/subprocessors. |
| [Google OAuth best practices](https://developers.google.com/identity/protocols/oauth2/resources/best-practices) | OAuth credentials and tokens require secure storage and minimal authorized use. | Describe connected-account data separately, request minimal scopes, encrypt refresh tokens, and delete/revoke them on disconnect where supported. |

## Legal and operational review required before launch

- Confirm the operating entity's legal name, registration number, postal address,
  privacy contact, and governing-law/dispute venue. These cannot be invented in code.
- Obtain Jordan counsel's view on DPO appointment, Personal Data Protection Unit
  registration/licensing, consent/lawful bases, overseas transfers, and breach duties.
- Confirm whether Orliqo targets/offers services to EU/UK residents and whether an
  EU/UK representative or DPO is required; complete transfer impact assessments and
  processor agreements where applicable.
- Determine CCPA/CPRA threshold coverage and whether any analytics configuration is
  a “sale” or “sharing”; implement required request methods/links if it is.
- Create and enforce a record-level retention/deletion schedule for account,
  prospect, communication, billing, audit, webhook, OAuth-state, import, and backup
  data. The repository currently has expiry fields but no complete workspace-erasure
  workflow.
- Validate each customer's sender identity, physical postal address, lawful basis,
  opt-out mechanism, and suppression handling before live outreach.
- Maintain a public subprocessor list and a data processing addendum for customers.

