import { z } from "zod";

export const DELIVERY_EVENTS = [
  "delivered",
  "hard_bounce",
  "soft_bounce",
  "complaint",
  "rejected",
  "read",
] as const;
export type DeliveryEvent = (typeof DELIVERY_EVENTS)[number];

export type NormalizedDeliveryEvent = {
  type: DeliveryEvent;
  providerEventId: string;
  providerMessageId: string;
  occurredAt: string;
  suppressRecipient: boolean;
  cancelQueuedMessages: boolean;
  retryable: boolean;
};

const eventSchema = z.object({
  id: z.string().min(1),
  messageId: z.string().min(1),
  event: z.string().min(1),
  occurredAt: z.iso.datetime(),
});

const mappings: Record<string, DeliveryEvent> = {
  delivered: "delivered",
  delivery: "delivered",
  sent: "delivered",
  bounced: "hard_bounce",
  bounce: "hard_bounce",
  hard_bounce: "hard_bounce",
  soft_bounce: "soft_bounce",
  deferred: "soft_bounce",
  complained: "complaint",
  complaint: "complaint",
  spamreport: "complaint",
  rejected: "rejected",
  failed: "rejected",
  read: "read",
};

export function normalizeDeliveryEvent(
  input: unknown,
): NormalizedDeliveryEvent | null {
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) return null;
  const type = mappings[parsed.data.event.toLowerCase()];
  if (!type) return null;
  const suppressRecipient =
    type === "hard_bounce" || type === "complaint" || type === "rejected";
  return {
    type,
    providerEventId: parsed.data.id,
    providerMessageId: parsed.data.messageId,
    occurredAt: parsed.data.occurredAt,
    suppressRecipient,
    cancelQueuedMessages: suppressRecipient,
    retryable: type === "soft_bounce",
  };
}
