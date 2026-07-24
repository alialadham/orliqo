export const INTEGRATION_PROVIDERS = [
  "gmail",
  "outlook",
  "smtp",
  "resend",
  "ses",
  "whatsapp",
  "google_calendar",
] as const;

export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number];

export function isIntegrationProvider(
  value: string,
): value is IntegrationProvider {
  return (INTEGRATION_PROVIDERS as readonly string[]).includes(value);
}
export type IntegrationStatus =
  "disconnected" | "connecting" | "connected" | "error" | "paused" | "expired";
export type ProviderMode = "demo" | "sandbox" | "live";

export type ProviderCapability = {
  supported: boolean;
  automated: boolean;
  requiresConsent: boolean;
  reason?: string;
};

export type ProviderHealth = {
  ok: boolean;
  mode: ProviderMode;
  checkedAt: string;
  errorCode?: string;
  retryable?: boolean;
};

export type IntegrationSummary = {
  id: string;
  workspaceId: string;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  displayName: string;
  accountLabel: string;
  description: string;
  scopes: string[];
  health: ProviderHealth;
  capabilities: {
    send: ProviderCapability;
    sync: ProviderCapability;
    calendar?: ProviderCapability;
  };
  lastSyncedAt: string | null;
  dailyLimit?: number;
  sentToday?: number;
  bounceRate?: number;
  replyRate?: number;
  paused?: boolean;
  configuration: Record<string, string | number | boolean>;
};

export type WhatsAppTemplate = {
  id: string;
  integrationId: string;
  name: string;
  language: string;
  category: "marketing" | "utility" | "authentication";
  status: "approved" | "pending" | "rejected" | "paused";
  body: string;
  variables: string[];
  quality: "high" | "medium" | "low" | "unknown";
  rejectionReason: string | null;
  lastSyncedAt: string;
};

export type CalendarEventType =
  "message" | "follow_up" | "meeting" | "campaign" | "call";
export type CalendarEvent = {
  id: string;
  workspaceId: string;
  type: CalendarEventType;
  title: string;
  startsAt: string;
  endsAt: string | null;
  status: "scheduled" | "completed" | "cancelled" | "failed";
  orliqoOwned: boolean;
  externalCalendarId: string | null;
  externalEventId: string | null;
  leadName?: string;
};

export type CalendarEventInput = {
  title: string;
  type: CalendarEventType;
  startsAt: string;
  endsAt: string | null;
  leadName?: string;
};

export type CalendarOption = {
  id: string;
  label: string;
  primary: boolean;
  selected: boolean;
};

export type ManualSocialDraft = {
  id: string;
  workspaceId: string;
  leadId: string;
  businessName: string;
  channel: "instagram" | "linkedin";
  profileUrl: string;
  body: string;
  capability: ProviderCapability;
  sentAt: string | null;
  replyStatus: "none" | "replied";
};

export type IntegrationActionResult = {
  ok: boolean;
  message: string;
  redirectUrl?: string;
};
