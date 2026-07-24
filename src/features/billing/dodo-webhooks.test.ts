import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  mapDodoPaymentEvent,
  mapDodoSubscriptionStatus,
  verifyDodoWebhook,
} from "./dodo-webhooks";

describe("Dodo Payments webhooks", () => {
  it("verifies a Standard Webhooks signature", () => {
    const payload = '{"type":"subscription.active"}';
    const id = "msg_test";
    const timestamp = "1800000000";
    const key = Buffer.from("test-secret");
    const secret = `whsec_${key.toString("base64")}`;
    const signature = createHmac("sha256", key)
      .update(`${id}.${timestamp}.${payload}`)
      .digest("base64");
    expect(
      verifyDodoWebhook(
        payload,
        { id, timestamp, signature: `v1,${signature}` },
        secret,
        Number(timestamp) * 1000,
      ),
    ).toBe(true);
  });

  it("rejects stale signatures", () => {
    expect(
      verifyDodoWebhook(
        "{}",
        { id: "msg_test", timestamp: "1", signature: "v1,invalid" },
        "whsec_dGVzdA==",
        1_800_000_000_000,
      ),
    ).toBe(false);
  });

  it("maps provider states into internal subscription states", () => {
    expect(mapDodoSubscriptionStatus("pending")).toBe("incomplete");
    expect(mapDodoSubscriptionStatus("active")).toBe("active");
    expect(mapDodoSubscriptionStatus("on_hold")).toBe("past_due");
    expect(mapDodoSubscriptionStatus("cancelled")).toBe("canceled");
    expect(mapDodoSubscriptionStatus("failed")).toBe("incomplete_expired");
    expect(mapDodoSubscriptionStatus("expired")).toBe("canceled");
    expect(mapDodoSubscriptionStatus("unknown")).toBeNull();
  });

  it("maps payment outcomes into internal subscription states", () => {
    expect(mapDodoPaymentEvent("payment.succeeded")).toBe("active");
    expect(mapDodoPaymentEvent("payment.failed")).toBe("past_due");
    expect(mapDodoPaymentEvent("payment.cancelled")).toBe("incomplete_expired");
    expect(mapDodoPaymentEvent("payment.processing")).toBe("incomplete");
  });
});
