import { DEMO_WORKSPACE_ID } from "@/features/demo/data";
import type { InboxConversation, InboxIntent } from "@/features/inbox/types";

const intentDetails: Array<{
  intent: InboxIntent;
  businessName: string;
  contactName: string;
  channel: InboxConversation["channel"];
  inbound: string;
  status: InboxConversation["status"];
}> = [
  {
    intent: "interested",
    businessName: "Shutterly Studio",
    contactName: "Omar",
    channel: "email",
    inbound: "Thanks for the audit. Could you share the next steps?",
    status: "interested",
  },
  {
    intent: "asking_price",
    businessName: "Lens & Light Co.",
    contactName: "Nadine",
    channel: "linkedin",
    inbound: "What would the website package cost for a small studio?",
    status: "needs_response",
  },
  {
    intent: "wants_information",
    businessName: "Capture House",
    contactName: "Mahmoud",
    channel: "whatsapp",
    inbound: "Can you send more information about what the audit covers?",
    status: "needs_response",
  },
  {
    intent: "follow_up_later",
    businessName: "Focus Studio",
    contactName: "Rana",
    channel: "email",
    inbound: "Please follow up after the first week of August.",
    status: "follow_up_later",
  },
  {
    intent: "not_interested",
    businessName: "Olive Branch Events",
    contactName: "Lina",
    channel: "instagram",
    inbound: "Thank you, but this is not a priority for us.",
    status: "not_interested",
  },
  {
    intent: "wrong_contact",
    businessName: "Cedar Creative",
    contactName: "Tareq",
    channel: "email",
    inbound: "I am not the person responsible for the website.",
    status: "needs_response",
  },
  {
    intent: "stop_contact",
    businessName: "Petra Kitchens",
    contactName: "Maya",
    channel: "whatsapp",
    inbound: "Please remove this number and do not contact us again.",
    status: "needs_response",
  },
  {
    intent: "automatic_response",
    businessName: "Wadi Wellness",
    contactName: "Inbox",
    channel: "email",
    inbound: "Automatic reply: our office reopens on Sunday.",
    status: "open",
  },
  {
    intent: "unknown",
    businessName: "Atlas Architecture",
    contactName: "Samer",
    channel: "linkedin",
    inbound: "Can you clarify?",
    status: "meeting",
  },
];

function createConversation(
  item: (typeof intentDetails)[number],
  index: number,
): InboxConversation {
  const id = `phase5-conversation-${index + 1}`;
  const leadId = `20000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
  return {
    id,
    leadId,
    businessName: item.businessName,
    contactName: item.contactName,
    channel: item.channel,
    preview: item.inbound,
    intent: item.intent,
    intentConfidence: item.intent === "unknown" ? 0.48 : 0.82 + index * 0.01,
    status: item.status,
    unreadCount: index < 3 ? 1 : 0,
    relativeTime: index === 0 ? "28m" : `${index + 1}h`,
    lastMessageAt: `2026-07-${String(23 - index).padStart(2, "0")}T${String(13 - Math.min(index, 8)).padStart(2, "0")}:00:00.000Z`,
    campaignName: "Amman Studios - Website Audit",
    score: 92 - index * 3,
    leadStatus: item.status === "meeting" ? "Meeting" : "Contacted",
    assignedName: index % 2 ? "Sara Nasser" : "Ali Haddad",
    notes: index === 0 ? ["Asked for a concise audit before booking."] : [],
    messages: [
      {
        id: `${id}-outbound`,
        direction: "outbound",
        body: `Hi ${item.contactName}, I noticed a practical conversion opportunity for ${item.businessName}. May I share a concise audit?`,
        sentAt: "2026-07-22T09:00:00.000Z",
        deliveryStatus: item.channel === "whatsapp" ? "read" : "delivered",
      },
      {
        id: `${id}-inbound`,
        direction: "inbound",
        body: item.inbound,
        sentAt: `2026-07-23T${String(10 + (index % 4)).padStart(2, "0")}:00:00.000Z`,
        deliveryStatus: "received",
      },
    ],
    aiSuggestion:
      item.intent === "stop_contact"
        ? "No reply suggested. Confirm the atomic stop-contact workflow instead."
        : `Thanks, ${item.contactName}. I can share a concise overview tailored to ${item.businessName}. Would you prefer it here or by email?`,
    replySuggestion:
      item.intent === "stop_contact"
        ? null
        : {
            id: `phase5-suggestion-${index + 1}`,
            body: `Thanks, ${item.contactName}. I can share a concise overview tailored to ${item.businessName}. Would you prefer it here or by email?`,
            status: "pending",
          },
  };
}

const conversations = intentDetails.map(createConversation);
const workspaceConversations = new Map<string, InboxConversation[]>([
  [DEMO_WORKSPACE_ID, conversations],
]);

export function demoPhase5Store() {
  return workspaceConversations;
}

export function demoPhase5Conversations(
  workspaceId: string,
): InboxConversation[] {
  return structuredClone(workspaceConversations.get(workspaceId) ?? []);
}
