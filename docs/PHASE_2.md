# Phase 2

Phase 2 delivers business onboarding and the evidence-backed core CRM. It is local
only: no deployment, Git push, production credentials, or external sends were used.

## Delivered

- Resumable six-step onboarding with validated Business, Offer, Audience, Channels,
  Goals, and Review steps.
- Editable business settings, private workspace logo paths, website-import history,
  multiple ICPs, channel preferences, and campaign defaults.
- Durable SSRF-safe website analysis with an Inngest job, status polling, structured
  Gemini/Groq/OpenRouter adapters, and a grounded deterministic fallback. Every
  suggestion requires explicit acceptance.
- Lead list/detail, URL filters, saved views, mobile cards, create/edit, duplicate
  warnings, assignment, tags, export, sources, field evidence, deterministic score
  breakdowns, notes, activity, suppression, restoration, and draft-only outreach.
- CSV/XLSX staging, column mapping, preview, validation, duplicate/suppression
  detection, confirmation, and result counters.
- Synthetic demo equivalents with 30+ businesses and no network contact.

## Safety boundaries

- Website fetches reject private/reserved/local/metadata addresses, pin the validated
  public IP to prevent DNS rebinding, validate every redirect, enforce time and size
  limits, and accept only readable public content.
- Provider keys are server-only. An adapter is never presented as connected solely
  because an environment variable exists.
- Numeric qualification scores use `phase2-v1` deterministic rules. AI may explain
  context but does not determine the numeric score.
- Suppression atomically records normalized identities and cancels eligible future
  messages. Restoration requires `lead:delete` permission and confirmation.
- Email, WhatsApp, Instagram, and LinkedIn remain no-send/manual in Phase 2.

## Known limitation

Local migration execution and pgTAP require Docker. Until it is available, SQL is
covered by static migration tests only. Live AI providers also remain untested while
their credentials are blank; the mock provider is the verified fallback.
