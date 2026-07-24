import { describe, expect, it } from "vitest";

import {
  normalizeGraphInbound,
  normalizeResendInbound,
  normalizeSesInbound,
} from "./provider-inbound";

describe("provider inbound normalization", () => {
  it("normalizes Resend inbound email", () => {
    expect(
      normalizeResendInbound({
        id: "evt-1",
        type: "email.received",
        created_at: "2026-07-23T10:00:00.000Z",
        data: {
          email_id: "email-1",
          from: "buyer@example.test",
          to: "reply@orliqo.test",
          subject: "Re: audit",
          text: "What does it cost?",
        },
      }),
    ).toMatchObject({
      provider: "resend",
      providerMessageId: "email-1",
      senderAddress: "buyer@example.test",
    });
  });

  it("normalizes SES received content", () => {
    expect(
      normalizeSesInbound({
        MessageId: "sns-1",
        Timestamp: "2026-07-23T10:00:00.000Z",
        Message: JSON.stringify({
          notificationType: "Received",
          mail: {
            messageId: "ses-1",
            timestamp: "2026-07-23T10:00:00.000Z",
            commonHeaders: {
              from: ["buyer@example.test"],
              to: ["reply@orliqo.test"],
              subject: "Reply",
            },
          },
          content: "Please send more information.",
        }),
      }),
    ).toMatchObject({ provider: "ses", providerMessageId: "ses-1" });
  });

  it("normalizes supported Graph resource data", () => {
    expect(
      normalizeGraphInbound({
        subscriptionId: "sub-1",
        changeType: "created",
        resourceData: {
          id: "graph-1",
          conversationId: "thread-1",
          receivedDateTime: "2026-07-23T10:00:00.000Z",
          from: {
            emailAddress: { name: "Buyer", address: "buyer@example.test" },
          },
          subject: "Reply",
          body: { content: "Sounds good. What are the next steps?" },
        },
      }),
    ).toMatchObject({
      provider: "outlook",
      providerMessageId: "graph-1",
      providerThreadId: "thread-1",
    });
  });

  it("rejects notifications without message bodies", () => {
    expect(
      normalizeGraphInbound({ resourceData: { id: "graph-1" } }),
    ).toBeNull();
    expect(normalizeResendInbound({ type: "email.delivered" })).toBeNull();
  });
});
