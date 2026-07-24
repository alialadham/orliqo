import "server-only";

import { readDemoSession } from "@/features/auth/demo-session";
import { demoPhase4Store } from "@/features/demo/phase4-store";
import { getWorkspaceContext } from "@/features/workspaces/data";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { readIntegrationCredential } from "./credential-service";
import {
  isIntegrationProvider,
  type CalendarEvent,
  type CalendarOption,
  type IntegrationSummary,
  type ManualSocialDraft,
  type WhatsAppTemplate,
} from "./types";

async function demoWorkspaceId(): Promise<string | null> {
  const session = await readDemoSession();
  return session?.kind === "workspace" ? session.activeWorkspaceId : null;
}

export async function getIntegrations(): Promise<IntegrationSummary[]> {
  const workspaceId = await demoWorkspaceId();
  if (workspaceId)
    return structuredClone(
      demoPhase4Store().integrations.get(workspaceId) ?? [],
    );
  const context = await getWorkspaceContext();
  if (!context) return [];
  const supabase = await createServerSupabaseClient();
  const [integrationsResult, accountsResult] = await Promise.all([
    supabase
      .from("integrations")
      .select("*")
      .eq("workspace_id", context.activeWorkspace.id)
      .order("created_at"),
    supabase
      .from("email_accounts")
      .select("*")
      .eq("workspace_id", context.activeWorkspace.id),
  ]);
  const accounts = new Map(
    (accountsResult.data ?? []).map((account) => [
      account.integration_id,
      account,
    ]),
  );
  return (integrationsResult.data ?? []).flatMap(
    (row): IntegrationSummary[] => {
      if (!isIntegrationProvider(row.provider)) return [];
      const account = accounts.get(row.id);
      const mode =
        row.configuration &&
        typeof row.configuration === "object" &&
        !Array.isArray(row.configuration) &&
        typeof row.configuration.mode === "string" &&
        ["demo", "sandbox", "live"].includes(row.configuration.mode)
          ? (row.configuration.mode as "demo" | "sandbox" | "live")
          : "sandbox";
      const isEmail = ["gmail", "outlook", "smtp", "resend", "ses"].includes(
        row.provider,
      );
      const sendSupported = isEmail || row.provider === "whatsapp";
      return [
        {
          id: row.id,
          workspaceId: row.workspace_id,
          provider: row.provider,
          status: row.status,
          displayName: row.display_name,
          accountLabel:
            row.external_account_email ??
            row.external_account_id ??
            "Not configured",
          description:
            row.last_error ??
            (row.status === "connected"
              ? "Provider readiness validated server-side."
              : "Connect and validate this provider before use."),
          scopes: row.scopes,
          health: {
            ok: row.status === "connected",
            mode,
            checkedAt: row.last_synced_at ?? row.updated_at,
            ...(row.last_error_code
              ? {
                  errorCode: row.last_error_code,
                  retryable: row.status === "error",
                }
              : {}),
          },
          capabilities: {
            send: {
              supported: sendSupported,
              automated: sendSupported,
              requiresConsent: row.provider === "whatsapp",
              ...(!sendSupported
                ? { reason: "This integration does not send messages." }
                : {}),
            },
            sync: {
              supported: [
                "gmail",
                "outlook",
                "whatsapp",
                "google_calendar",
              ].includes(row.provider),
              automated: [
                "gmail",
                "outlook",
                "whatsapp",
                "google_calendar",
              ].includes(row.provider),
              requiresConsent: row.provider === "whatsapp",
            },
            ...(row.provider === "google_calendar"
              ? {
                  calendar: {
                    supported: true,
                    automated: true,
                    requiresConsent: false,
                  },
                }
              : {}),
          },
          lastSyncedAt: row.last_synced_at,
          dailyLimit: account?.daily_limit,
          sentToday: account?.sent_today,
          bounceRate: account?.bounce_rate,
          replyRate: account?.reply_rate,
          paused: account?.paused ?? row.status === "paused",
          configuration: Object.fromEntries(
            Object.entries(
              row.configuration &&
                typeof row.configuration === "object" &&
                !Array.isArray(row.configuration)
                ? row.configuration
                : {},
            ).filter((entry): entry is [string, string | number | boolean] =>
              ["string", "number", "boolean"].includes(typeof entry[1]),
            ),
          ),
        },
      ];
    },
  );
}

export async function getWhatsAppTemplates(): Promise<WhatsAppTemplate[]> {
  const workspaceId = await demoWorkspaceId();
  if (workspaceId)
    return structuredClone(demoPhase4Store().templates.get(workspaceId) ?? []);
  const context = await getWorkspaceContext();
  if (!context) return [];
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("whatsapp_templates")
    .select("*")
    .eq("workspace_id", context.activeWorkspace.id)
    .order("name");
  return (data ?? []).map((row) => {
    const components = Array.isArray(row.components) ? row.components : [];
    const bodyComponent = components.find(
      (component) =>
        component &&
        typeof component === "object" &&
        !Array.isArray(component) &&
        String(component.type).toLowerCase() === "body",
    );
    const bodyRecord =
      bodyComponent &&
      typeof bodyComponent === "object" &&
      !Array.isArray(bodyComponent)
        ? bodyComponent
        : {};
    const body =
      typeof bodyRecord.text === "string"
        ? bodyRecord.text
        : "Template body is managed by Meta.";
    const variables = [...body.matchAll(/{{\s*(\d+)\s*}}/g)].map(
      (match) => match[1] ?? "",
    );
    return {
      id: row.id,
      integrationId: row.integration_id,
      name: row.name,
      language: row.language,
      category: ["marketing", "utility", "authentication"].includes(
        row.category,
      )
        ? (row.category as WhatsAppTemplate["category"])
        : "utility",
      status: ["approved", "pending", "rejected", "paused"].includes(row.status)
        ? (row.status as WhatsAppTemplate["status"])
        : "pending",
      body,
      variables,
      quality: ["high", "medium", "low"].includes(row.quality_score ?? "")
        ? (row.quality_score as WhatsAppTemplate["quality"])
        : "unknown",
      rejectionReason: row.rejection_reason,
      lastSyncedAt: row.last_synced_at ?? row.updated_at,
    };
  });
}

export async function getCalendarEvents(): Promise<CalendarEvent[]> {
  const workspaceId = await demoWorkspaceId();
  if (workspaceId)
    return structuredClone(demoPhase4Store().events.get(workspaceId) ?? []);
  const context = await getWorkspaceContext();
  if (!context) return [];
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("scheduled_events")
    .select("*")
    .eq("workspace_id", context.activeWorkspace.id)
    .order("starts_at")
    .limit(120);
  return (data ?? []).map((row) => ({
    id: row.id,
    workspaceId: row.workspace_id,
    type:
      row.type === "campaign_start" || row.type === "campaign_end"
        ? "campaign"
        : row.type,
    title: row.title,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
    orliqoOwned: row.orliqo_owned,
    externalCalendarId: row.external_calendar_id,
    externalEventId: row.external_event_id,
    leadName:
      typeof row.metadata === "object" &&
      row.metadata &&
      !Array.isArray(row.metadata) &&
      typeof row.metadata.lead_name === "string"
        ? row.metadata.lead_name
        : undefined,
  }));
}

export async function getCalendarOptions(): Promise<CalendarOption[]> {
  const workspaceId = await demoWorkspaceId();
  if (workspaceId)
    return [
      {
        id: "orliqo-demo",
        label: "Orliqo Outreach",
        primary: false,
        selected: true,
      },
      {
        id: "demo-primary",
        label: "Primary calendar (read-only fixture)",
        primary: true,
        selected: false,
      },
    ];
  const context = await getWorkspaceContext();
  if (!context) return [];
  const supabase = await createServerSupabaseClient();
  const { data: integration } = await supabase
    .from("integrations")
    .select("*")
    .eq("workspace_id", context.activeWorkspace.id)
    .eq("provider", "google_calendar")
    .eq("status", "connected")
    .maybeSingle();
  if (!integration) return [];
  const credential = await readIntegrationCredential<Record<string, unknown>>(
    integration.id,
    integration.workspace_id,
  );
  if (!credential || typeof credential.payload.access_token !== "string")
    return [];
  const response = await fetchWithTimeout(
    fetch,
    "https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=writer",
    {
      headers: { authorization: `Bearer ${credential.payload.access_token}` },
      cache: "no-store",
    },
    10_000,
  );
  const payload = (await response.json().catch(() => null)) as {
    items?: Array<{
      id?: string;
      summary?: string;
      primary?: boolean;
      accessRole?: string;
    }>;
  } | null;
  if (!response.ok || !payload?.items) return [];
  const configuration =
    integration.configuration &&
    typeof integration.configuration === "object" &&
    !Array.isArray(integration.configuration)
      ? integration.configuration
      : {};
  return payload.items.flatMap((item) =>
    item.id &&
    item.summary &&
    ["owner", "writer"].includes(item.accessRole ?? "")
      ? [
          {
            id: item.id,
            label: item.summary,
            primary: Boolean(item.primary),
            selected: configuration.selectedCalendarId === item.id,
          },
        ]
      : [],
  );
}

export async function getManualSocialDrafts(): Promise<ManualSocialDraft[]> {
  const workspaceId = await demoWorkspaceId();
  if (workspaceId)
    return structuredClone(
      demoPhase4Store().socialDrafts.get(workspaceId) ?? [],
    );
  const context = await getWorkspaceContext();
  if (!context) return [];
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("leads")
    .select(
      "id,business_name,instagram_url,linkedin_url,personalization_angle,first_contacted_at,last_replied_at",
    )
    .eq("workspace_id", context.activeWorkspace.id)
    .eq("do_not_contact", false)
    .limit(30);
  return (data ?? [])
    .flatMap((lead): ManualSocialDraft[] => [
      ...(lead.instagram_url
        ? [
            {
              id: `${lead.id}:instagram`,
              workspaceId: context.activeWorkspace.id,
              leadId: lead.id,
              businessName: lead.business_name,
              channel: "instagram" as const,
              profileUrl: lead.instagram_url,
              body: `Hi ${lead.business_name} team — ${lead.personalization_angle ?? "I found a relevant opportunity in your public business profile."} May I share a concise audit?`,
              capability: {
                supported: true,
                automated: false,
                requiresConsent: false,
                reason: "Manual open, copy, and tracking only.",
              },
              sentAt: lead.first_contacted_at,
              replyStatus: lead.last_replied_at
                ? ("replied" as const)
                : ("none" as const),
            },
          ]
        : []),
      ...(lead.linkedin_url
        ? [
            {
              id: `${lead.id}:linkedin`,
              workspaceId: context.activeWorkspace.id,
              leadId: lead.id,
              businessName: lead.business_name,
              channel: "linkedin" as const,
              profileUrl: lead.linkedin_url,
              body: `Hello ${lead.business_name} — ${lead.personalization_angle ?? "your public business profile suggests a relevant audit opportunity."} Happy to share it if useful.`,
              capability: {
                supported: true,
                automated: false,
                requiresConsent: false,
                reason: "Manual open, copy, and tracking only.",
              },
              sentAt: lead.first_contacted_at,
              replyStatus: lead.last_replied_at
                ? ("replied" as const)
                : ("none" as const),
            },
          ]
        : []),
    ])
    .slice(0, 30);
}
import { fetchWithTimeout } from "@/lib/http";
