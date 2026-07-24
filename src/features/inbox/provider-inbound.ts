import type { NormalizedInboundMessage } from "./inbound";

export type ProviderInboundProjection = Omit<
  NormalizedInboundMessage,
  "workspaceId" | "integrationId"
>;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function firstAddress(value: unknown): string {
  if (typeof value === "string") return value;
  const item = Array.isArray(value) ? value[0] : value;
  if (typeof item === "string") return item;
  const candidate = record(item);
  return String(candidate.email ?? candidate.address ?? "").trim();
}

export function normalizeResendInbound(
  payload: unknown,
): ProviderInboundProjection | null {
  const root = record(payload);
  if (root.type !== "email.received") return null;
  const data = record(root.data);
  const body = String(data.text ?? data.text_body ?? "").trim();
  const senderAddress = firstAddress(data.from);
  const providerMessageId = String(data.email_id ?? data.id ?? "").trim();
  if (!body || !senderAddress || !providerMessageId) return null;
  return {
    provider: "resend",
    providerEventId: String(root.id ?? providerMessageId),
    providerMessageId,
    providerThreadId: String(
      data.thread_id ?? data.in_reply_to ?? providerMessageId,
    ),
    channel: "email",
    senderAddress,
    senderName: String(record(data.from).name ?? "") || undefined,
    recipientAddress: firstAddress(data.to) || undefined,
    subject: String(data.subject ?? "") || undefined,
    body,
    occurredAt: String(root.created_at ?? new Date().toISOString()),
    metadata: { source: "resend_inbound" },
  };
}

export function normalizeSesInbound(
  payload: unknown,
): ProviderInboundProjection | null {
  const notification = record(payload);
  let message: Record<string, unknown>;
  try {
    message = record(JSON.parse(String(notification.Message ?? "{}")));
  } catch {
    return null;
  }
  if (String(message.notificationType ?? "").toLowerCase() !== "received")
    return null;
  const mail = record(message.mail);
  const headers = record(mail.commonHeaders);
  const body = String(message.content ?? "").trim();
  const providerMessageId = String(mail.messageId ?? "").trim();
  const senderAddress = firstAddress(headers.from);
  if (!body || !providerMessageId || !senderAddress) return null;
  return {
    provider: "ses",
    providerEventId: String(notification.MessageId ?? providerMessageId),
    providerMessageId,
    providerThreadId: String(
      headers.messageId ?? headers.inReplyTo ?? providerMessageId,
    ),
    channel: "email",
    senderAddress,
    recipientAddress: firstAddress(headers.to) || undefined,
    subject: String(headers.subject ?? "") || undefined,
    body,
    occurredAt: String(
      mail.timestamp ?? notification.Timestamp ?? new Date().toISOString(),
    ),
    metadata: { source: "ses_inbound" },
  };
}

export function normalizeGraphInbound(
  notification: unknown,
): ProviderInboundProjection | null {
  const root = record(notification);
  const data = record(root.resourceData);
  const bodyRecord = record(data.body);
  const body = String(bodyRecord.content ?? data.bodyPreview ?? "").trim();
  const sender = record(record(data.from).emailAddress);
  const providerMessageId = String(data.id ?? "").trim();
  const senderAddress = String(sender.address ?? "").trim();
  if (!providerMessageId || !senderAddress || !body) return null;
  return {
    provider: "outlook",
    providerEventId: `${String(root.subscriptionId ?? "graph")}:${providerMessageId}:${String(root.changeType ?? "created")}`,
    providerMessageId,
    providerThreadId: String(data.conversationId ?? providerMessageId),
    channel: "email",
    senderAddress,
    senderName: String(sender.name ?? "") || undefined,
    recipientAddress:
      firstAddress(
        record(Array.isArray(data.toRecipients) ? data.toRecipients[0] : null)
          .emailAddress,
      ) || undefined,
    subject: String(data.subject ?? "") || undefined,
    body,
    occurredAt: String(data.receivedDateTime ?? new Date().toISOString()),
    metadata: { source: "microsoft_graph", changeType: root.changeType },
  };
}
