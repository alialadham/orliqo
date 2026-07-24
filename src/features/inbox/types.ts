export const INBOX_INTENTS = [
  "interested",
  "asking_price",
  "wants_information",
  "follow_up_later",
  "not_interested",
  "wrong_contact",
  "stop_contact",
  "automatic_response",
  "unknown",
] as const;

export type InboxIntent = (typeof INBOX_INTENTS)[number];
export type InboxChannel = "email" | "whatsapp" | "instagram" | "linkedin";
export type InboxFolder =
  | "all"
  | "interested"
  | "needs_response"
  | "follow_up_later"
  | "not_interested"
  | "meetings"
  | "archived"
  | "spam";

export type InboxMessage = {
  id: string;
  direction: "inbound" | "outbound";
  body: string;
  sentAt: string;
  deliveryStatus: "sent" | "delivered" | "read" | "received";
};

export type InboxConversation = {
  id: string;
  leadId: string;
  businessName: string;
  contactName: string;
  channel: InboxChannel;
  preview: string;
  intent: InboxIntent;
  intentConfidence: number;
  status:
    | "open"
    | "interested"
    | "needs_response"
    | "follow_up_later"
    | "not_interested"
    | "meeting"
    | "archived"
    | "spam"
    | "closed";
  unreadCount: number;
  relativeTime: string;
  lastMessageAt: string;
  campaignName: string;
  score: number;
  leadStatus: string;
  assignedName: string;
  notes: string[];
  messages: InboxMessage[];
  aiSuggestion: string;
  replySuggestion: {
    id: string;
    body: string;
    status: "pending" | "accepted" | "edited" | "dismissed";
    scheduledAt?: string;
  } | null;
};
