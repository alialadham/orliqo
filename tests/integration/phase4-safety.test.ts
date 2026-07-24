import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("Phase 4 database and webhook safety", () => {
  const migration = readFileSync(
    "supabase/migrations/20260723100000_phase4_channel_and_calendar_integrations.sql",
    "utf8",
  );
  const webhook = readFileSync(
    "src/app/api/webhooks/whatsapp/route.ts",
    "utf8",
  );
  const jobs = readFileSync("src/lib/inngest/functions/phase4.ts", "utf8");
  const previousJobs = readFileSync(
    "src/lib/inngest/functions/phase3.ts",
    "utf8",
  );

  it("protects provider records with integration management policies", () => {
    expect(migration).toContain(
      "private.has_workspace_permission(workspace_id, 'integrations:manage')",
    );
    expect(migration).toContain(
      "revoke all on public.provider_webhook_events from anon, authenticated",
    );
    expect(migration).toContain("whatsapp_templates_update");
    expect(migration).toContain("email_accounts_update");
  });

  it("prevents mutation of unrelated external calendar events", () => {
    expect(migration).toContain("not old.orliqo_owned");
    expect(migration).toContain("External calendar events are read-only");
    expect(migration).toContain(
      "before update or delete on public.scheduled_events",
    );
  });

  it("requires signed and idempotent WhatsApp webhook processing", () => {
    expect(webhook).toContain("verifyWhatsAppSignature");
    expect(webhook).toContain("x-hub-signature-256");
    expect(webhook).toContain("recordWebhookEvent");
    expect(webhook).toContain("duplicate");
  });

  it("atomically suppresses hard bounces and complaints", () => {
    expect(migration).toContain("private.apply_email_delivery_event");
    expect(migration).toContain("delivery_event = 'soft_bounce'");
    expect(migration).toContain("email.provider_suppressed_lead");
    expect(migration).toContain(
      "grant execute on function private.apply_email_delivery_event",
    );
    expect(migration).toContain("to service_role");
  });

  it("reconciles official WhatsApp delivery states idempotently", () => {
    expect(migration).toContain("private.apply_whatsapp_status_event");
    expect(migration).toContain("target.channel <> 'whatsapp'");
    expect(migration).toContain("WHATSAPP_PROVIDER_FAILED");
    expect(migration).toContain(
      "grant execute on function private.apply_whatsapp_status_event",
    );
  });

  it("uses configured provider adapters instead of the Phase 3 success placeholder", () => {
    expect(jobs).toContain("configuredEmailAdapter");
    expect(jobs).toContain("configuredWhatsAppAdapter");
    expect(jobs).toContain("claim_due_message");
    expect(jobs).toContain("message_attempts");
    expect(previousJobs).not.toContain(
      '["send-email-message","sendEmailMessage"]',
    );
    expect(previousJobs).not.toContain(
      '["send-whatsapp-message","sendWhatsAppMessage"]',
    );
  });
});
