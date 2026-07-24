import "server-only";

import { randomUUID } from "node:crypto";

import { DEMO_WORKSPACE_ID } from "./data";
import { demoPhase2Store } from "./phase2-store";
import type {
  CalendarEvent,
  IntegrationSummary,
  ManualSocialDraft,
  WhatsAppTemplate,
} from "@/features/integrations/types";

type ProviderAttempt = {
  id: string;
  provider: string;
  operation: string;
  result: "simulated_no_send" | "validated" | "failed";
  at: string;
};

type WebhookReceipt = {
  id: string;
  signatureVerified: boolean;
  status: "succeeded" | "ignored";
  receivedAt: string;
};

type Store = {
  integrations: Map<string, IntegrationSummary[]>;
  templates: Map<string, WhatsAppTemplate[]>;
  events: Map<string, CalendarEvent[]>;
  socialDrafts: Map<string, ManualSocialDraft[]>;
  attempts: ProviderAttempt[];
  webhookEvents: Map<string, WebhookReceipt>;
};

declare global {
  var __orliqoPhase4DemoStore: Store | undefined;
}

const now = () => new Date().toISOString();
const inDays = (dayOffset: number, hour: number, minute = 0) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + dayOffset);
  date.setUTCHours(hour, minute, 0, 0);
  return date.toISOString();
};

function seedIntegrations(): IntegrationSummary[] {
  const commonHealth = { ok: true, mode: "demo" as const, checkedAt: now() };
  const emailCapability = {
    supported: true,
    automated: true,
    requiresConsent: false,
  };
  return [
    {
      id: "71000000-0000-4000-8000-000000000001",
      workspaceId: DEMO_WORKSPACE_ID,
      provider: "gmail",
      status: "connected",
      displayName: "Gmail",
      accountLabel: "hello@northstar.demo",
      description:
        "Mailbox send, threads, refresh, and reply sync in deterministic sandbox mode.",
      scopes: ["openid", "email", "gmail.send", "gmail.modify"],
      health: commonHealth,
      capabilities: {
        send: emailCapability,
        sync: { ...emailCapability, automated: true },
      },
      lastSyncedAt: now(),
      dailyLimit: 40,
      sentToday: 12,
      bounceRate: 0.012,
      replyRate: 0.184,
      paused: false,
      configuration: { mode: "demo", signature: "Northstar Growth" },
    },
    {
      id: "71000000-0000-4000-8000-000000000002",
      workspaceId: DEMO_WORKSPACE_ID,
      provider: "outlook",
      status: "expired",
      displayName: "Microsoft Outlook",
      accountLabel: "sales@northstar.demo",
      description: "Microsoft Graph connection needs sandbox re-consent.",
      scopes: ["openid", "offline_access", "Mail.Send", "Mail.Read"],
      health: {
        ok: false,
        mode: "demo",
        checkedAt: now(),
        errorCode: "token_expired",
        retryable: false,
      },
      capabilities: { send: emailCapability, sync: emailCapability },
      lastSyncedAt: inDays(-2, 8),
      dailyLimit: 35,
      sentToday: 0,
      bounceRate: 0.008,
      replyRate: 0.16,
      paused: false,
      configuration: { mode: "demo", signature: "Northstar Growth" },
    },
    {
      id: "71000000-0000-4000-8000-000000000003",
      workspaceId: DEMO_WORKSPACE_ID,
      provider: "smtp",
      status: "disconnected",
      displayName: "Custom SMTP",
      accountLabel: "Not configured",
      description:
        "Optional single-recipient SMTP transport with TLS and private-host validation.",
      scopes: [],
      health: {
        ok: false,
        mode: "demo",
        checkedAt: now(),
        errorCode: "configuration_missing",
        retryable: false,
      },
      capabilities: {
        send: emailCapability,
        sync: {
          supported: false,
          automated: false,
          requiresConsent: false,
          reason: "SMTP does not provide mailbox sync.",
        },
      },
      lastSyncedAt: null,
      configuration: { mode: "demo" },
    },
    {
      id: "71000000-0000-4000-8000-000000000004",
      workspaceId: DEMO_WORKSPACE_ID,
      provider: "resend",
      status: "disconnected",
      displayName: "Resend",
      accountLabel: "Domain not validated",
      description:
        "Optional API delivery adapter; inbound sync is not claimed.",
      scopes: [],
      health: {
        ok: false,
        mode: "demo",
        checkedAt: now(),
        errorCode: "configuration_missing",
        retryable: false,
      },
      capabilities: {
        send: emailCapability,
        sync: {
          supported: false,
          automated: false,
          requiresConsent: false,
          reason: "Webhook events only.",
        },
      },
      lastSyncedAt: null,
      configuration: { mode: "demo" },
    },
    {
      id: "71000000-0000-4000-8000-000000000005",
      workspaceId: DEMO_WORKSPACE_ID,
      provider: "ses",
      status: "disconnected",
      displayName: "Amazon SES",
      accountLabel: "Region not configured",
      description:
        "Optional SES transport with verified-identity readiness checks.",
      scopes: [],
      health: {
        ok: false,
        mode: "demo",
        checkedAt: now(),
        errorCode: "configuration_missing",
        retryable: false,
      },
      capabilities: {
        send: emailCapability,
        sync: {
          supported: false,
          automated: false,
          requiresConsent: false,
          reason: "Bounce and complaint webhooks only.",
        },
      },
      lastSyncedAt: null,
      configuration: { mode: "demo" },
    },
    {
      id: "71000000-0000-4000-8000-000000000006",
      workspaceId: DEMO_WORKSPACE_ID,
      provider: "whatsapp",
      status: "connected",
      displayName: "WhatsApp Business",
      accountLabel: "+962 7 9000 0000",
      description:
        "Official Meta Cloud API contract in deterministic test-number mode.",
      scopes: ["whatsapp_business_management", "whatsapp_business_messaging"],
      health: commonHealth,
      capabilities: {
        send: { supported: true, automated: true, requiresConsent: true },
        sync: { supported: true, automated: true, requiresConsent: true },
      },
      lastSyncedAt: now(),
      configuration: {
        mode: "demo",
        waba: "Demo WABA",
        phoneNumberId: "test-phone-001",
        quality: "High",
        limit: "1K/day",
        webhook: "Verified fixture",
      },
    },
    {
      id: "71000000-0000-4000-8000-000000000007",
      workspaceId: DEMO_WORKSPACE_ID,
      provider: "google_calendar",
      status: "connected",
      displayName: "Google Calendar",
      accountLabel: "Orliqo demo calendar",
      description:
        "Calendar selection and Orliqo-owned event sync in sandbox mode.",
      scopes: ["openid", "email", "calendar.events.owned"],
      health: commonHealth,
      capabilities: {
        send: {
          supported: false,
          automated: false,
          requiresConsent: false,
          reason: "Not a messaging provider.",
        },
        sync: { supported: true, automated: true, requiresConsent: false },
        calendar: { supported: true, automated: true, requiresConsent: false },
      },
      lastSyncedAt: now(),
      configuration: { mode: "demo", selectedCalendar: "Orliqo Outreach" },
    },
  ];
}

function seedTemplates(): WhatsAppTemplate[] {
  const integrationId = "71000000-0000-4000-8000-000000000006";
  return [
    {
      id: "72000000-0000-4000-8000-000000000001",
      integrationId,
      name: "audit_offer",
      language: "en_US",
      category: "marketing",
      status: "approved",
      body: "Hi {{1}}, we prepared the website audit you requested. Reply to receive it.",
      variables: ["business_name"],
      quality: "high",
      rejectionReason: null,
      lastSyncedAt: now(),
    },
    {
      id: "72000000-0000-4000-8000-000000000002",
      integrationId,
      name: "meeting_reminder",
      language: "ar",
      category: "utility",
      status: "approved",
      body: "مرحباً {{1}}، تذكير بموعدنا في {{2}}.",
      variables: ["name", "time"],
      quality: "high",
      rejectionReason: null,
      lastSyncedAt: now(),
    },
    {
      id: "72000000-0000-4000-8000-000000000003",
      integrationId,
      name: "generic_promo",
      language: "en_US",
      category: "marketing",
      status: "rejected",
      body: "Grow instantly with our guaranteed results.",
      variables: [],
      quality: "low",
      rejectionReason: "Unsupported or misleading claims",
      lastSyncedAt: now(),
    },
  ];
}

function seedEvents(): CalendarEvent[] {
  return [
    {
      id: "73000000-0000-4000-8000-000000000001",
      workspaceId: DEMO_WORKSPACE_ID,
      type: "campaign",
      title: "Amman studios campaign",
      startsAt: inDays(0, 7),
      endsAt: inDays(0, 16),
      status: "scheduled",
      orliqoOwned: true,
      externalCalendarId: "orliqo-demo",
      externalEventId: "demo-campaign-1",
    },
    {
      id: "73000000-0000-4000-8000-000000000002",
      workspaceId: DEMO_WORKSPACE_ID,
      type: "message",
      title: "Queued email · Petra Design",
      startsAt: inDays(0, 9, 30),
      endsAt: null,
      status: "scheduled",
      orliqoOwned: true,
      externalCalendarId: null,
      externalEventId: null,
      leadName: "Petra Design",
    },
    {
      id: "73000000-0000-4000-8000-000000000003",
      workspaceId: DEMO_WORKSPACE_ID,
      type: "follow_up",
      title: "Follow up · Cedar Studio",
      startsAt: inDays(1, 11),
      endsAt: null,
      status: "scheduled",
      orliqoOwned: true,
      externalCalendarId: "orliqo-demo",
      externalEventId: "demo-followup-1",
      leadName: "Cedar Studio",
    },
    {
      id: "73000000-0000-4000-8000-000000000004",
      workspaceId: DEMO_WORKSPACE_ID,
      type: "meeting",
      title: "Discovery call · Lunar Labs",
      startsAt: inDays(2, 12),
      endsAt: inDays(2, 12, 30),
      status: "scheduled",
      orliqoOwned: true,
      externalCalendarId: "orliqo-demo",
      externalEventId: "demo-meeting-1",
      leadName: "Lunar Labs",
    },
    {
      id: "73000000-0000-4000-8000-000000000005",
      workspaceId: DEMO_WORKSPACE_ID,
      type: "call",
      title: "Manual qualification call",
      startsAt: inDays(3, 10),
      endsAt: inDays(3, 10, 30),
      status: "scheduled",
      orliqoOwned: true,
      externalCalendarId: null,
      externalEventId: null,
    },
    {
      id: "73000000-0000-4000-8000-000000000006",
      workspaceId: DEMO_WORKSPACE_ID,
      type: "meeting",
      title: "Unrelated personal event",
      startsAt: inDays(4, 13),
      endsAt: inDays(4, 14),
      status: "scheduled",
      orliqoOwned: false,
      externalCalendarId: "primary",
      externalEventId: "external-readonly-1",
    },
  ];
}

function seedSocialDrafts(): ManualSocialDraft[] {
  const leads = demoPhase2Store().leads.get(DEMO_WORKSPACE_ID) ?? [];
  return leads
    .flatMap((lead, index) => {
      const items: ManualSocialDraft[] = [];
      if (lead.instagramUrl)
        items.push({
          id: randomUUID(),
          workspaceId: DEMO_WORKSPACE_ID,
          leadId: lead.id,
          businessName: lead.businessName,
          channel: "instagram",
          profileUrl: lead.instagramUrl,
          body: `Hi ${lead.businessName} team — I noticed a practical website conversion opportunity in your public profile. May I share a concise audit?`,
          capability: {
            supported: true,
            automated: false,
            requiresConsent: false,
            reason: "Manual open, copy, and tracking only.",
          },
          sentAt: index === 0 ? now() : null,
          replyStatus: "none",
        });
      if (lead.linkedinUrl)
        items.push({
          id: randomUUID(),
          workspaceId: DEMO_WORKSPACE_ID,
          leadId: lead.id,
          businessName: lead.businessName,
          channel: "linkedin",
          profileUrl: lead.linkedinUrl,
          body: `Hello ${lead.businessName} — your public business profile suggests a useful conversion audit opportunity. Happy to share it if relevant.`,
          capability: {
            supported: true,
            automated: false,
            requiresConsent: false,
            reason: "Manual open, copy, and tracking only.",
          },
          sentAt: null,
          replyStatus: "none",
        });
      return items;
    })
    .slice(0, 6);
}

function seed(): Store {
  return {
    integrations: new Map([[DEMO_WORKSPACE_ID, seedIntegrations()]]),
    templates: new Map([[DEMO_WORKSPACE_ID, seedTemplates()]]),
    events: new Map([[DEMO_WORKSPACE_ID, seedEvents()]]),
    socialDrafts: new Map([[DEMO_WORKSPACE_ID, seedSocialDrafts()]]),
    attempts: [],
    webhookEvents: new Map(),
  };
}

export function demoPhase4Store(): Store {
  globalThis.__orliqoPhase4DemoStore ??= seed();
  return globalThis.__orliqoPhase4DemoStore;
}

export function recordProviderAttempt(
  provider: string,
  operation: string,
  result: ProviderAttempt["result"],
): void {
  demoPhase4Store().attempts.unshift({
    id: randomUUID(),
    provider,
    operation,
    result,
    at: now(),
  });
}

export function recordWebhookEvent(
  eventId: string,
  signatureVerified: boolean,
): "created" | "duplicate" {
  const store = demoPhase4Store();
  if (store.webhookEvents.has(eventId)) return "duplicate";
  store.webhookEvents.set(eventId, {
    id: eventId,
    signatureVerified,
    status: signatureVerified ? "succeeded" : "ignored",
    receivedAt: now(),
  });
  return "created";
}
