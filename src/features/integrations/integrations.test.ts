import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { decryptCredential, encryptCredential, stateMatches } from "./crypto";
import { createDemoCalendarAdapter } from "./calendar-adapter";
import { createEmailAdapter } from "./email-adapters";
import { createGmailAdapter } from "./configured-email-adapters";
import { normalizeResendWebhook, verifyResendWebhook } from "./email-webhooks";
import { allowlistedOAuthRedirect, createOAuthRequest } from "./oauth";
import { normalizeDeliveryEvent } from "./provider-events";
import { emailDraftSchema, whatsappSendSchema } from "./schemas";
import { validateSmtpConfiguration } from "./smtp";
import {
  projectWhatsAppWebhook,
  verifyWhatsAppSignature,
  whatsappWebhookEventId,
} from "./whatsapp";
import { createWhatsAppAdapter } from "./whatsapp-adapter";

describe("Phase 4 provider safety", () => {
  it("encrypts credential payloads with authenticated encryption", () => {
    const secret = "phase4-integration-encryption-secret-for-tests";
    const encrypted = encryptCredential(
      { refreshToken: "private-token" },
      secret,
      2,
    );
    expect(encrypted.ciphertext).not.toContain("private-token");
    expect(
      decryptCredential<{ refreshToken: string }>(encrypted, secret),
    ).toEqual({ refreshToken: "private-token" });
    expect(() =>
      decryptCredential({ ...encrypted, authTag: "invalid" }, secret),
    ).toThrow();
  });

  it("creates one-time PKCE requests with least provider scopes", () => {
    const request = createOAuthRequest({
      provider: "gmail",
      clientId: "client",
      redirectUri: "https://orliqo.test/api/integrations/google/callback",
    });
    const url = new URL(request.authorizationUrl);
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("scope")).toContain("gmail.send");
    expect(url.searchParams.get("scope")).toContain("gmail.modify");
    expect(stateMatches(request.state, request.hashedState)).toBe(true);
    expect(allowlistedOAuthRedirect("/app/integrations")).toBe(true);
    expect(allowlistedOAuthRedirect("//attacker.example")).toBe(false);
  });

  it("enforces one recipient and completes email delivery as no-send", async () => {
    const draft = emailDraftSchema.parse({
      provider: "gmail",
      from: "sender@example.com",
      to: "lead@example.com",
      subject: "Audit",
      text: "Plain text",
      html: "<p>Plain text</p>",
      signature: "Sender",
      scheduledAt: null,
      followUpDays: 3,
      threadId: "thread-1",
      idempotencyKey: "message-idempotency-001",
      trackingEnabled: false,
      bcc: [],
    });
    const result = await createEmailAdapter("gmail").send(draft);
    expect(result).toMatchObject({
      ok: true,
      delivered: false,
      mode: "demo",
      threadId: "thread-1",
    });
    expect(
      emailDraftSchema.safeParse({ ...draft, bcc: ["hidden@example.com"] })
        .success,
    ).toBe(false);
  });

  it("requires WhatsApp consent and an approved template outside a service window", () => {
    const base = {
      to: "+962790000000",
      body: "Hello",
      consent: "granted",
      doNotContact: false,
      sessionOpen: false,
      templateName: "audit_offer",
      templateStatus: "approved",
      variables: { business: "Demo" },
      requiredVariables: ["business"],
      idempotencyKey: "whatsapp-idempotency-001",
    } as const;
    expect(whatsappSendSchema.safeParse(base).success).toBe(true);
    expect(
      whatsappSendSchema.safeParse({ ...base, consent: "unknown" }).success,
    ).toBe(false);
    expect(
      whatsappSendSchema.safeParse({ ...base, templateStatus: "pending" })
        .success,
    ).toBe(false);
    expect(
      whatsappSendSchema.safeParse({ ...base, variables: {} }).success,
    ).toBe(false);
  });

  it("verifies Meta signatures and extracts stable webhook IDs", () => {
    const body = JSON.stringify({
      entry: [{ changes: [{ value: { statuses: [{ id: "wamid.123" }] } }] }],
    });
    const secret = "meta-app-secret";
    const signature = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
    expect(verifyWhatsAppSignature(body, signature, secret)).toBe(true);
    expect(verifyWhatsAppSignature(`${body}x`, signature, secret)).toBe(false);
    expect(whatsappWebhookEventId(JSON.parse(body))).toBe("wamid.123");
    const projected = projectWhatsAppWebhook({
      entry: [
        {
          changes: [
            {
              value: {
                metadata: { phone_number_id: "phone-1" },
                statuses: [
                  {
                    id: "wamid.123",
                    status: "delivered",
                    timestamp: "1784743200",
                  },
                ],
              },
            },
          ],
        },
      ],
    });
    expect(projected).toMatchObject({
      phoneNumberId: "phone-1",
      kind: "status",
      statuses: [{ providerMessageId: "wamid.123", status: "delivered" }],
    });
  });

  it("normalizes bounces and complaints into immediate suppression actions", () => {
    const occurredAt = new Date().toISOString();
    expect(
      normalizeDeliveryEvent({
        id: "evt-1",
        messageId: "msg-1",
        event: "bounced",
        occurredAt,
      }),
    ).toMatchObject({
      type: "hard_bounce",
      suppressRecipient: true,
      cancelQueuedMessages: true,
      retryable: false,
    });
    expect(
      normalizeDeliveryEvent({
        id: "evt-2",
        messageId: "msg-1",
        event: "deferred",
        occurredAt,
      }),
    ).toMatchObject({
      type: "soft_bounce",
      suppressRecipient: false,
      retryable: true,
    });
  });

  it("keeps calendar and WhatsApp provider actions no-send in demo mode", async () => {
    const calendar = createDemoCalendarAdapter();
    const created = await calendar.create({
      title: "Demo",
      type: "meeting",
      startsAt: new Date().toISOString(),
      endsAt: null,
    });
    expect(created.delivered).toBe(false);
    await expect(
      calendar.delete({
        id: "external",
        workspaceId: "workspace",
        type: "meeting",
        title: "External",
        startsAt: new Date().toISOString(),
        endsAt: null,
        status: "scheduled",
        orliqoOwned: false,
        externalCalendarId: "primary",
        externalEventId: "external",
      }),
    ).rejects.toThrow("Orliqo-owned");
    const whatsapp = createWhatsAppAdapter({ mode: "demo" });
    const result = await whatsapp.send({
      to: "+962790000000",
      body: "Hello",
      consent: "granted",
      doNotContact: false,
      sessionOpen: true,
      templateName: null,
      templateStatus: null,
      variables: {},
      requiredVariables: [],
      idempotencyKey: "whatsapp-demo-001",
    });
    expect(result).toMatchObject({ ok: true, delivered: false });
  });

  it("blocks private SMTP hosts before any credential test", async () => {
    const configuration = {
      host: "smtp.example.com",
      port: 587,
      secure: false,
      username: "user",
      password: "secret",
      from: "sender@example.com",
    };
    const publicResolver = async () => [
      { address: "8.8.8.8", family: 4 as const },
    ];
    const privateResolver = async () => [
      { address: "127.0.0.1", family: 4 as const },
    ];
    await expect(
      validateSmtpConfiguration(configuration, publicResolver as never),
    ).resolves.toMatchObject({ host: "smtp.example.com" });
    await expect(
      validateSmtpConfiguration(configuration, privateResolver as never),
    ).rejects.toThrow("blocked network");
  });

  it("preserves Gmail message and thread IDs through the configured adapter", async () => {
    const fetcher = async () =>
      new Response(
        JSON.stringify({ id: "gmail-message", threadId: "gmail-thread" }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    const adapter = createGmailAdapter({
      mode: "sandbox",
      accessToken: "access",
      refreshToken: "refresh",
      clientId: "client",
      clientSecret: "secret",
      fetcher: fetcher as typeof fetch,
    });
    const draft = emailDraftSchema.parse({
      provider: "gmail",
      from: "sender@example.com",
      to: "lead@example.com",
      subject: "Audit",
      text: "Plain",
      html: "<p>Plain</p>",
      signature: "Sender",
      scheduledAt: null,
      followUpDays: null,
      threadId: "existing-thread",
      idempotencyKey: "gmail-configured-001",
      trackingEnabled: false,
      bcc: [],
    });
    await expect(adapter.send(draft)).resolves.toMatchObject({
      ok: true,
      delivered: true,
      providerMessageId: "gmail-message",
      threadId: "gmail-thread",
    });
  });

  it("verifies and normalizes Resend bounce webhooks", () => {
    const secret = `whsec_${Buffer.from("resend-webhook-secret").toString("base64")}`;
    const timestamp = String(Math.floor(Date.now() / 1000));
    const body = JSON.stringify({
      type: "email.bounced",
      created_at: new Date().toISOString(),
      data: { id: "event-1", email_id: "email-1" },
    });
    const id = "msg_webhook_1";
    const signature = createHmac(
      "sha256",
      Buffer.from(secret.slice(6), "base64"),
    )
      .update(`${id}.${timestamp}.${body}`)
      .digest("base64");
    const headers = new Headers({
      "svix-id": id,
      "svix-timestamp": timestamp,
      "svix-signature": `v1,${signature}`,
    });
    expect(verifyResendWebhook(body, headers, secret)).toBe(true);
    expect(normalizeResendWebhook(JSON.parse(body))).toMatchObject({
      type: "hard_bounce",
      suppressRecipient: true,
      providerMessageId: "email-1",
    });
  });
});
