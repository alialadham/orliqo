import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { whatsappSendSchema } from "./schemas";

export function verifyWhatsAppSignature(
  rawBody: string,
  signature: string | null,
  appSecret: string,
): boolean {
  if (!signature?.startsWith("sha256=") || !appSecret) return false;
  const expected = `sha256=${createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export function validateWhatsAppSend(input: unknown) {
  return whatsappSendSchema.safeParse(input);
}

export function whatsappWebhookEventId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const body = payload as Record<string, unknown>;
  const entry = Array.isArray(body.entry) ? body.entry[0] : null;
  if (!entry || typeof entry !== "object") return null;
  const changes = Array.isArray((entry as Record<string, unknown>).changes)
    ? ((entry as Record<string, unknown>).changes as unknown[])
    : [];
  const change = changes[0];
  if (!change || typeof change !== "object") return null;
  const value = (change as Record<string, unknown>).value;
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const message = Array.isArray(record.messages) ? record.messages[0] : null;
  const status = Array.isArray(record.statuses) ? record.statuses[0] : null;
  const template = Array.isArray(record.message_template_status_update)
    ? record.message_template_status_update[0]
    : record.message_template_status_update;
  for (const candidate of [message, status, template]) {
    if (
      candidate &&
      typeof candidate === "object" &&
      typeof (candidate as Record<string, unknown>).id === "string"
    )
      return (candidate as Record<string, unknown>).id as string;
  }
  return null;
}

export type WhatsAppStatusProjection = {
  providerMessageId: string;
  providerEventId: string;
  status: "sent" | "delivered" | "read" | "failed";
  occurredAt: string;
};

export function projectWhatsAppWebhook(payload: unknown): {
  phoneNumberId: string | null;
  businessAccountId: string | null;
  statuses: WhatsAppStatusProjection[];
  kind: "status" | "inbound" | "template" | "account" | "unknown";
  templateUpdate: {
    id: string;
    status: string;
    rejectionReason: string | null;
  } | null;
  accountUpdate: Record<string, string | number>;
  inbound: {
    id: string;
    from: string;
    type: string;
    occurredAt: string;
    mediaId: string | null;
    body: string;
  } | null;
} {
  const empty = {
    phoneNumberId: null,
    businessAccountId: null,
    statuses: [],
    kind: "unknown" as const,
    templateUpdate: null,
    accountUpdate: {},
    inbound: null,
  };
  if (!payload || typeof payload !== "object") return empty;
  const entry = Array.isArray((payload as Record<string, unknown>).entry)
    ? ((payload as Record<string, unknown>).entry as unknown[])[0]
    : null;
  const businessAccountId =
    entry &&
    typeof entry === "object" &&
    typeof (entry as Record<string, unknown>).id === "string"
      ? ((entry as Record<string, unknown>).id as string)
      : null;
  const changes =
    entry &&
    typeof entry === "object" &&
    Array.isArray((entry as Record<string, unknown>).changes)
      ? ((entry as Record<string, unknown>).changes as unknown[])
      : [];
  const change = changes[0];
  const changeField =
    change &&
    typeof change === "object" &&
    typeof (change as Record<string, unknown>).field === "string"
      ? ((change as Record<string, unknown>).field as string)
      : "";
  const value =
    change && typeof change === "object"
      ? (change as Record<string, unknown>).value
      : null;
  if (!value || typeof value !== "object")
    return { ...empty, businessAccountId };
  const record = value as Record<string, unknown>;
  const metadata =
    record.metadata && typeof record.metadata === "object"
      ? (record.metadata as Record<string, unknown>)
      : {};
  const phoneNumberId =
    typeof metadata.phone_number_id === "string"
      ? metadata.phone_number_id
      : null;
  const rawStatuses = Array.isArray(record.statuses) ? record.statuses : [];
  const statuses = rawStatuses.flatMap((item): WhatsAppStatusProjection[] => {
    if (!item || typeof item !== "object") return [];
    const status = item as Record<string, unknown>;
    if (
      typeof status.id !== "string" ||
      !["sent", "delivered", "read", "failed"].includes(String(status.status))
    )
      return [];
    const timestamp = Number(status.timestamp);
    return [
      {
        providerMessageId: status.id,
        providerEventId: `${status.id}:${String(status.status)}:${String(status.timestamp ?? "")}`,
        status: status.status as WhatsAppStatusProjection["status"],
        occurredAt: Number.isFinite(timestamp)
          ? new Date(timestamp * 1000).toISOString()
          : new Date().toISOString(),
      },
    ];
  });
  const kind = statuses.length
    ? "status"
    : Array.isArray(record.messages) && record.messages.length
      ? "inbound"
      : record.message_template_status_update ||
          changeField.includes("template")
        ? "template"
        : record.quality_update ||
            record.account_update ||
            changeField.includes("quality") ||
            changeField.includes("account")
          ? "account"
          : "unknown";
  const rawTemplate =
    record.message_template_status_update &&
    typeof record.message_template_status_update === "object"
      ? (record.message_template_status_update as Record<string, unknown>)
      : kind === "template"
        ? record
        : null;
  const templateId =
    rawTemplate &&
    (typeof rawTemplate.message_template_id === "string" ||
      typeof rawTemplate.id === "string")
      ? String(rawTemplate.message_template_id ?? rawTemplate.id)
      : null;
  const templateUpdate = templateId
    ? {
        id: templateId,
        status: String(
          rawTemplate?.event ?? rawTemplate?.status ?? "pending",
        ).toLowerCase(),
        rejectionReason:
          typeof rawTemplate?.reason === "string" ? rawTemplate.reason : null,
      }
    : null;
  const accountUpdate = Object.fromEntries(
    Object.entries(record).filter(
      (entry): entry is [string, string | number] => {
        const [key, item] = entry;
        return (
          [
            "quality_rating",
            "messaging_limit_tier",
            "current_limit",
            "quality_update",
            "account_update",
          ].includes(key) &&
          (typeof item === "string" || typeof item === "number")
        );
      },
    ),
  );
  const rawInbound =
    Array.isArray(record.messages) &&
    record.messages[0] &&
    typeof record.messages[0] === "object"
      ? (record.messages[0] as Record<string, unknown>)
      : null;
  const inboundType =
    rawInbound && typeof rawInbound.type === "string"
      ? rawInbound.type
      : "unknown";
  const media =
    rawInbound &&
    rawInbound[inboundType] &&
    typeof rawInbound[inboundType] === "object"
      ? (rawInbound[inboundType] as Record<string, unknown>)
      : null;
  const inboundTimestamp = Number(rawInbound?.timestamp);
  const inbound =
    rawInbound &&
    typeof rawInbound.id === "string" &&
    typeof rawInbound.from === "string"
      ? {
          id: rawInbound.id,
          from: rawInbound.from,
          type: inboundType,
          occurredAt: Number.isFinite(inboundTimestamp)
            ? new Date(inboundTimestamp * 1000).toISOString()
            : new Date().toISOString(),
          mediaId: media && typeof media.id === "string" ? media.id : null,
          body:
            inboundType === "text" && media && typeof media.body === "string"
              ? media.body
              : `[${inboundType} message]`,
        }
      : null;
  return {
    phoneNumberId,
    businessAccountId,
    statuses,
    kind,
    templateUpdate,
    accountUpdate,
    inbound,
  };
}
