import "server-only";

import { createHmac, createVerify, timingSafeEqual } from "node:crypto";

import { fetchWithTimeout } from "@/lib/http";
import {
  normalizeDeliveryEvent,
  type NormalizedDeliveryEvent,
} from "./provider-events";

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyResendWebhook(
  rawBody: string,
  headers: Headers,
  secret: string,
  now = Date.now(),
): boolean {
  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const signatures = headers.get("svix-signature")?.split(" ") ?? [];
  if (!id || !timestamp || !signatures.length || !secret.startsWith("whsec_"))
    return false;
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds) || Math.abs(now - seconds * 1000) > 5 * 60_000)
    return false;
  let key: Buffer;
  try {
    key = Buffer.from(secret.slice(6), "base64");
  } catch {
    return false;
  }
  const expected = createHmac("sha256", key)
    .update(`${id}.${timestamp}.${rawBody}`, "utf8")
    .digest("base64");
  return signatures.some(
    (signature) =>
      signature.startsWith("v1,") && safeEqual(signature.slice(3), expected),
  );
}

type SnsNotification = {
  Type: string;
  MessageId: string;
  TopicArn: string;
  Subject?: string;
  Message: string;
  Timestamp: string;
  SignatureVersion: "1" | "2";
  Signature: string;
  SigningCertURL: string;
};

function snsCanonical(notification: SnsNotification): string {
  const fields: Array<[string, string | undefined]> = [
    ["Message", notification.Message],
    ["MessageId", notification.MessageId],
    ["Subject", notification.Subject],
    ["Timestamp", notification.Timestamp],
    ["TopicArn", notification.TopicArn],
    ["Type", notification.Type],
  ];
  return fields
    .filter((entry): entry is [string, string] => typeof entry[1] === "string")
    .map(([name, value]) => `${name}\n${value}\n`)
    .join("");
}

export async function verifySesSnsWebhook(
  notification: SnsNotification,
  fetcher: typeof fetch = fetch,
): Promise<boolean> {
  if (
    notification.Type !== "Notification" ||
    !["1", "2"].includes(notification.SignatureVersion)
  )
    return false;
  let certificateUrl: URL;
  try {
    certificateUrl = new URL(notification.SigningCertURL);
  } catch {
    return false;
  }
  if (
    certificateUrl.protocol !== "https:" ||
    !/^sns\.[a-z0-9-]+\.amazonaws\.com$/i.test(certificateUrl.hostname) ||
    !/^\/SimpleNotificationService-[A-Za-z0-9_-]+\.pem$/.test(
      certificateUrl.pathname,
    )
  )
    return false;
  const certificate = await fetchWithTimeout(
    fetcher,
    certificateUrl,
    { cache: "no-store" },
    5_000,
  );
  if (!certificate.ok) return false;
  const pem = await certificate.text();
  if (pem.length > 20_000 || !pem.includes("BEGIN CERTIFICATE")) return false;
  const verifier = createVerify(
    notification.SignatureVersion === "1" ? "RSA-SHA1" : "RSA-SHA256",
  );
  verifier.update(snsCanonical(notification), "utf8");
  verifier.end();
  return verifier.verify(pem, notification.Signature, "base64");
}

export function normalizeResendWebhook(
  payload: unknown,
): NormalizedDeliveryEvent | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const data =
    record.data && typeof record.data === "object"
      ? (record.data as Record<string, unknown>)
      : {};
  const type = String(record.type ?? "").replace(/^email\./, "");
  return normalizeDeliveryEvent({
    id: String(data.id ?? record.id ?? ""),
    messageId: String(data.email_id ?? data.id ?? ""),
    event: type === "delivery_delayed" ? "deferred" : type,
    occurredAt:
      typeof record.created_at === "string"
        ? record.created_at
        : new Date().toISOString(),
  });
}

export function normalizeSesWebhook(
  notification: SnsNotification,
): NormalizedDeliveryEvent | null {
  let message: Record<string, unknown>;
  try {
    message = JSON.parse(notification.Message) as Record<string, unknown>;
  } catch {
    return null;
  }
  const mail =
    message.mail && typeof message.mail === "object"
      ? (message.mail as Record<string, unknown>)
      : {};
  const notificationType = String(message.notificationType ?? "").toLowerCase();
  const event =
    notificationType === "bounce"
      ? "bounced"
      : notificationType === "complaint"
        ? "complaint"
        : notificationType === "delivery"
          ? "delivered"
          : notificationType;
  return normalizeDeliveryEvent({
    id: notification.MessageId,
    messageId: String(mail.messageId ?? ""),
    event,
    occurredAt:
      typeof mail.timestamp === "string"
        ? mail.timestamp
        : notification.Timestamp,
  });
}

export type { SnsNotification };
