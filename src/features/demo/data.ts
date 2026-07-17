import type { WorkspaceRole } from "@/features/permissions/permissions";

export const DEMO_USER_ID = "00000000-0000-4000-8000-000000000001";
export const DEMO_WORKSPACE_ID = "10000000-0000-4000-8000-000000000001";
export const VIEWER_WORKSPACE_ID = "10000000-0000-4000-8000-000000000002";

export type DemoWorkspace = {
  id: string;
  name: string;
  slug: string;
  role: WorkspaceRole;
  plan: "growth" | "starter";
  credits: number;
};

export const DEMO_PROFILE = {
  id: DEMO_USER_ID,
  fullName: "Ali Haddad",
  email: "ali.haddad@example.invalid",
  initials: "AH",
  timezone: "Asia/Amman",
};

export const DEMO_WORKSPACES: readonly DemoWorkspace[] = [
  {
    id: DEMO_WORKSPACE_ID,
    name: "Orliqo Demo",
    slug: "orliqo-demo",
    role: "owner",
    plan: "growth",
    credits: 742,
  },
  {
    id: VIEWER_WORKSPACE_ID,
    name: "Northstar Demo",
    slug: "northstar-demo",
    role: "viewer",
    plan: "starter",
    credits: 180,
  },
] as const;

const leadNames = [
  "Shutterly Studio",
  "Lens & Light Co.",
  "Capture House",
  "Focus Studio",
  "Olive Branch Events",
  "Cedar Creative",
  "Petra Kitchens",
  "Wadi Wellness",
  "Atlas Architecture",
  "Nahla Ceramics",
  "Moonline Dental",
  "Dar Coffee Roasters",
  "Mosaic Interiors",
  "Amman Cycle Works",
  "Blue Fig Bakery",
] as const;

export const DEMO_LEADS = Array.from({ length: 30 }, (_, index) => {
  const company = leadNames[index % leadNames.length] ?? `Demo Business ${index + 1}`;
  const suffix = index + 1;

  return {
    id: `20000000-0000-4000-8000-${String(suffix).padStart(12, "0")}`,
    company,
    contact: `Demo Contact ${suffix}`,
    email: `contact-${suffix}@example.invalid`,
    website: `https://business-${suffix}.example.test`,
    city: suffix % 3 === 0 ? "Zarqa" : suffix % 2 === 0 ? "Aqaba" : "Amman",
    score: 68 + ((suffix * 7) % 29),
    verification: suffix % 5 === 0 ? "unverified" : suffix % 3 === 0 ? "likely" : "verified",
  };
});

export const DASHBOARD_METRICS = [
  { key: "leads", label: "Qualified leads", value: "184", trend: "12.3%" },
  { key: "sent", label: "Sent", value: "327", trend: "8.7%" },
  { key: "replies", label: "Replies", value: "48", trend: "14.3%" },
  { key: "positive", label: "Positive replies", value: "19", trend: "18.8%" },
  { key: "meetings", label: "Meetings", value: "7", trend: "16.7%" },
  { key: "pipeline", label: "Estimated pipeline", value: "$28.4k", trend: "11.2%" },
] as const;

export const DASHBOARD_CHART_DATA = [
  { date: "May 8", sent: 30, delivered: 24, replied: 6, positive: 1, rate: 9 },
  { date: "May 9", sent: 50, delivered: 42, replied: 10, positive: 3, rate: 14 },
  { date: "May 10", sent: 69, delivered: 58, replied: 16, positive: 6, rate: 18 },
  { date: "May 11", sent: 86, delivered: 73, replied: 23, positive: 9, rate: 15 },
  { date: "May 12", sent: 99, delivered: 83, replied: 30, positive: 13, rate: 16 },
  { date: "May 13", sent: 108, delivered: 91, replied: 38, positive: 16, rate: 15 },
  { date: "May 14", sent: 113, delivered: 97, replied: 45, positive: 19, rate: 16 },
] as const;

export const DEMO_RECENT_REPLIES = [
  {
    id: "reply-1",
    contact: "Omar Shraideh",
    company: "Shutterly Studio",
    channel: "Email",
    preview: "Thanks Ali, we’re interested in the audit. Can you share some details?",
    intent: "Positive",
    time: "28m ago",
  },
  {
    id: "reply-2",
    contact: "Nadine Faraj",
    company: "Lens & Light Co.",
    channel: "LinkedIn",
    preview: "This looks great. We’d love to learn more about your process.",
    intent: "Positive",
    time: "1h ago",
  },
  {
    id: "reply-3",
    contact: "Mahmoud Ayas",
    company: "Capture House",
    channel: "Email",
    preview: "Not a priority right now, but keep us in mind for Q3.",
    intent: "Neutral",
    time: "2h ago",
  },
  {
    id: "reply-4",
    contact: "Rana Bdour",
    company: "Focus Studio",
    channel: "Email",
    preview: "We currently have someone handling this. Thanks anyway.",
    intent: "Negative",
    time: "3h ago",
  },
] as const;

export const DEMO_SEARCH_RECORDS = [
  { id: "campaign-1", type: "Campaign", title: "Amman Studios - Website Audit", href: "/app/campaigns/campaign-1" },
  { id: "lead-1", type: "Lead", title: "Shutterly Studio", href: "/app/leads/lead-1" },
  { id: "lead-2", type: "Lead", title: "Lens & Light Co.", href: "/app/leads/lead-2" },
  { id: "conversation-1", type: "Conversation", title: "Omar at Shutterly Studio", href: "/app/inbox?conversation=reply-1" },
  { id: "template-1", type: "Template", title: "Website audit introduction", href: "/app/templates?template=template-1" },
  { id: "note-1", type: "Note", title: "Follow up after portfolio review", href: "/app/leads/lead-1?tab=notes" },
] as const;

export const DEMO_INTEGRATIONS = [
  { provider: "gmail", status: "connected", mode: "test" },
  { provider: "whatsapp", status: "connected", mode: "no-send" },
  { provider: "outlook", status: "expired", mode: "test" },
] as const;
