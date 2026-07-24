import { createHmac, timingSafeEqual } from "node:crypto";

import type { InternalSubscriptionStatus } from "./provider";

const TOLERANCE_SECONDS = 300;

function signingKey(secret: string): Buffer {
  const encoded = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  try {
    return Buffer.from(encoded, "base64");
  } catch {
    return Buffer.from(encoded);
  }
}

export function verifyDodoWebhook(
  payload: string,
  headers: {
    id: string;
    signature: string;
    timestamp: string;
  },
  secret: string,
  now = Date.now(),
): boolean {
  const timestamp = Number(headers.timestamp);
  if (
    !headers.id ||
    !headers.signature ||
    !Number.isFinite(timestamp) ||
    Math.abs(Math.floor(now / 1000) - timestamp) > TOLERANCE_SECONDS
  )
    return false;
  const expected = createHmac("sha256", signingKey(secret))
    .update(`${headers.id}.${headers.timestamp}.${payload}`)
    .digest();
  return headers.signature.split(" ").some((candidate) => {
    const [version, encoded] = candidate.split(",");
    if (version !== "v1" || !encoded) return false;
    const received = Buffer.from(encoded, "base64");
    return (
      received.length === expected.length && timingSafeEqual(received, expected)
    );
  });
}

export function mapDodoSubscriptionStatus(
  status: string,
): InternalSubscriptionStatus | null {
  switch (status) {
    case "pending":
      return "incomplete";
    case "active":
      return "active";
    case "on_hold":
      return "past_due";
    case "cancelled":
    case "expired":
      return "canceled";
    case "failed":
      return "incomplete_expired";
    default:
      return null;
  }
}

export function mapDodoPaymentEvent(
  eventType: string,
): InternalSubscriptionStatus | null {
  switch (eventType) {
    case "payment.succeeded":
    case "payment.success":
      return "active";
    case "payment.failed":
      return "past_due";
    case "payment.cancelled":
      return "incomplete_expired";
    case "payment.processing":
      return "incomplete";
    default:
      return null;
  }
}
