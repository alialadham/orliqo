"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { writeAuditLog } from "@/features/audit/server";
import { readDemoSession } from "@/features/auth/demo-session";
import {
  demoPhase4Store,
  recordProviderAttempt,
} from "@/features/demo/phase4-store";
import { normalizeEmail } from "@/features/leads/normalization";
import { requirePermission } from "@/features/permissions/server";
import { fetchWithTimeout } from "@/lib/http";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  destroyIntegrationCredential,
  readIntegrationCredential,
} from "./credential-service";
import { createGoogleCalendarAdapter } from "./calendar-adapter";
import {
  createEmailAdapter,
  isEmailProvider,
  type EmailProvider,
} from "./email-adapters";
import { beginOAuthIntegration } from "./oauth-service";
import { configuredEmailAdapter, integrationHealth } from "./provider-runtime";
import { calendarEventInputSchema, emailDraftSchema } from "./schemas";
import type { CalendarEventInput } from "./schemas";
import {
  isIntegrationProvider,
  type IntegrationActionResult,
  type IntegrationProvider,
} from "./types";

async function actionContext(
  permission: "integrations:manage" | "message:send" | "inbox:reply",
) {
  const context = await requirePermission(permission);
  if (!context) return null;
  const session = await readDemoSession();
  return { context, demo: session?.kind === "workspace" };
}

function configurationRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function findIntegration(id: string) {
  return [...demoPhase4Store().integrations.values()]
    .flat()
    .find((item) => item.id === id);
}

export async function connectIntegrationAction(
  provider: IntegrationProvider,
): Promise<IntegrationActionResult> {
  const action = await actionContext("integrations:manage");
  if (!action)
    return {
      ok: false,
      message: "You do not have permission to manage integrations.",
    };
  const { context } = action;
  if (!action.demo) {
    if (!["gmail", "outlook", "google_calendar"].includes(provider))
      return {
        ok: false,
        message:
          "This provider requires its secure credential setup form before connection testing.",
      };
    try {
      const result = await beginOAuthIntegration({
        provider: provider as "gmail" | "outlook" | "google_calendar",
        workspaceId: context.activeWorkspace.id,
        actorId: context.user.id,
        redirectPath: "/app/integrations",
      });
      return {
        ok: true,
        message: "Redirecting to the provider authorization screen.",
        redirectUrl: result.authorizationUrl,
      };
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Provider authorization could not start.",
      };
    }
  }
  const integration = (
    demoPhase4Store().integrations.get(context.activeWorkspace.id) ?? []
  ).find((item) => item.provider === provider);
  if (!integration) return { ok: false, message: "Integration not found." };
  integration.status = "connected";
  integration.health = {
    ok: true,
    mode: "demo",
    checkedAt: new Date().toISOString(),
  };
  integration.configuration.mode = "demo";
  recordProviderAttempt(provider, "connect", "validated");
  revalidatePath("/app/integrations");
  return {
    ok: true,
    message: `${integration.displayName} sandbox connection validated. No live credential was stored.`,
  };
}

export async function testIntegrationAction(
  id: string,
): Promise<IntegrationActionResult> {
  const action = await actionContext("integrations:manage");
  if (!action)
    return {
      ok: false,
      message: "You do not have permission to test integrations.",
    };
  const { context } = action;
  if (!action.demo) {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
      .from("integrations")
      .select("*")
      .eq("id", id)
      .eq("workspace_id", context.activeWorkspace.id)
      .maybeSingle();
    if (!data) return { ok: false, message: "Integration not found." };
    if (!isIntegrationProvider(data.provider))
      return {
        ok: false,
        message:
          "This provider is not available in the channel integration workspace.",
      };
    try {
      const checked = await integrationHealth({
        id: data.id,
        workspaceId: data.workspace_id,
        provider: data.provider,
        configuration: configurationRecord(data.configuration),
      });
      await supabase
        .from("integrations")
        .update({
          status: checked.ok ? "connected" : "error",
          last_synced_at: checked.checkedAt,
          last_error_code: checked.errorCode ?? null,
          last_error: checked.ok
            ? null
            : "Provider readiness validation failed.",
        })
        .eq("id", id)
        .eq("workspace_id", context.activeWorkspace.id);
      await writeAuditLog({
        workspaceId: context.activeWorkspace.id,
        actorId: context.user.id,
        action: "integration.test",
        entityType: "integration",
        entityId: id,
        after: {
          ok: checked.ok,
          mode: checked.mode,
          errorCode: checked.errorCode,
        },
      });
      revalidatePath("/app/integrations");
      return {
        ok: checked.ok,
        message: checked.ok
          ? `${data.display_name} passed its provider readiness check.`
          : `${data.display_name} failed readiness: ${checked.errorCode ?? "provider unavailable"}.`,
      };
    } catch {
      return {
        ok: false,
        message: "Provider readiness could not be validated safely.",
      };
    }
  }
  const integration = findIntegration(id);
  if (!integration || integration.workspaceId !== context.activeWorkspace.id)
    return { ok: false, message: "Integration not found." };
  if (
    ["gmail", "outlook", "smtp", "resend", "ses"].includes(integration.provider)
  ) {
    integration.health = await createEmailAdapter(
      integration.provider as EmailProvider,
    ).test();
  } else
    integration.health = {
      ok: true,
      mode: "demo",
      checkedAt: new Date().toISOString(),
    };
  integration.status = "connected";
  integration.lastSyncedAt = new Date().toISOString();
  recordProviderAttempt(integration.provider, "health_check", "validated");
  revalidatePath("/app/integrations");
  return {
    ok: true,
    message: `${integration.displayName} passed its deterministic sandbox health check.`,
  };
}

export async function toggleIntegrationPauseAction(
  id: string,
): Promise<IntegrationActionResult> {
  const action = await actionContext("integrations:manage");
  if (!action)
    return {
      ok: false,
      message: "You do not have permission to pause integrations.",
    };
  const { context } = action;
  if (!action.demo) {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
      .from("integrations")
      .select("id,status,display_name")
      .eq("id", id)
      .eq("workspace_id", context.activeWorkspace.id)
      .maybeSingle();
    if (!data) return { ok: false, message: "Integration not found." };
    const paused = data.status === "paused";
    const nextStatus = paused ? "connected" : "paused";
    const [{ error }, accountResult] = await Promise.all([
      supabase
        .from("integrations")
        .update({ status: nextStatus })
        .eq("id", id)
        .eq("workspace_id", context.activeWorkspace.id),
      supabase
        .from("email_accounts")
        .update({ paused: !paused })
        .eq("integration_id", id)
        .eq("workspace_id", context.activeWorkspace.id),
    ]);
    if (error || accountResult.error)
      return {
        ok: false,
        message: "Integration pause state could not be updated.",
      };
    await writeAuditLog({
      workspaceId: context.activeWorkspace.id,
      actorId: context.user.id,
      action: paused ? "integration.resumed" : "integration.paused",
      entityType: "integration",
      entityId: id,
    });
    revalidatePath("/app/integrations");
    return {
      ok: true,
      message: `${data.display_name} ${paused ? "resumed" : "paused"}.`,
    };
  }
  const integration = findIntegration(id);
  if (!integration || integration.workspaceId !== context.activeWorkspace.id)
    return { ok: false, message: "Integration not found." };
  const paused = integration.status === "paused";
  integration.status = paused ? "connected" : "paused";
  integration.paused = !paused;
  recordProviderAttempt(
    integration.provider,
    paused ? "resume" : "pause",
    "validated",
  );
  revalidatePath("/app/integrations");
  return {
    ok: true,
    message: `${integration.displayName} ${paused ? "resumed" : "paused"}.`,
  };
}

export async function disconnectIntegrationAction(
  id: string,
): Promise<IntegrationActionResult> {
  const action = await actionContext("integrations:manage");
  if (!action)
    return {
      ok: false,
      message: "You do not have permission to disconnect integrations.",
    };
  const { context } = action;
  if (!action.demo) {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
      .from("integrations")
      .select("*")
      .eq("id", id)
      .eq("workspace_id", context.activeWorkspace.id)
      .maybeSingle();
    if (!data) return { ok: false, message: "Integration not found." };
    const credential = await readIntegrationCredential<Record<string, unknown>>(
      data.id,
      data.workspace_id,
    );
    const adapter = isEmailProvider(data.provider)
      ? await configuredEmailAdapter({
          id: data.id,
          workspaceId: data.workspace_id,
          provider: data.provider,
          configuration: configurationRecord(data.configuration),
        })
      : null;
    if (adapter)
      await adapter
        .disconnect()
        .catch(() => ({ ok: true as const, revoked: false }));
    if (credential)
      await destroyIntegrationCredential(
        credential.id,
        data.id,
        data.workspace_id,
      );
    const { error } = await supabase
      .from("integrations")
      .update({
        status: "disconnected",
        credential_reference: null,
        scopes: [],
        token_expires_at: null,
        last_error_code: null,
        last_error: null,
      })
      .eq("id", id)
      .eq("workspace_id", context.activeWorkspace.id);
    if (error)
      return { ok: false, message: "Integration could not be disconnected." };
    await writeAuditLog({
      workspaceId: context.activeWorkspace.id,
      actorId: context.user.id,
      action: "integration.disconnected",
      entityType: "integration",
      entityId: id,
      after: { credentialDestroyed: Boolean(credential) },
    });
    revalidatePath("/app/integrations");
    return {
      ok: true,
      message: `${data.display_name} disconnected and local ciphertext was destroyed.`,
    };
  }
  const integration = findIntegration(id);
  if (!integration || integration.workspaceId !== context.activeWorkspace.id)
    return { ok: false, message: "Integration not found." };
  integration.status = "disconnected";
  integration.scopes = [];
  integration.health = {
    ok: false,
    mode: "demo",
    checkedAt: new Date().toISOString(),
    errorCode: "disconnected",
    retryable: false,
  };
  recordProviderAttempt(integration.provider, "disconnect", "validated");
  revalidatePath("/app/integrations");
  return {
    ok: true,
    message: `${integration.displayName} disconnected and its sandbox credential fixture was cleared.`,
  };
}

export async function sendTestEmailAction(
  formData: FormData,
): Promise<IntegrationActionResult> {
  const action = await actionContext("message:send");
  if (!action)
    return { ok: false, message: "You do not have permission to test email." };
  const { context } = action;
  const provider = String(formData.get("provider") ?? "gmail") as EmailProvider;
  const text = String(formData.get("body") ?? "");
  const parsed = emailDraftSchema.safeParse({
    provider,
    from: String(formData.get("from") ?? ""),
    to: String(formData.get("to") ?? ""),
    subject: String(formData.get("subject") ?? ""),
    text,
    html: `<p>${text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</p>`,
    signature: String(formData.get("signature") ?? ""),
    scheduledAt: null,
    followUpDays: Number(formData.get("followUpDays") || 0) || null,
    threadId: null,
    idempotencyKey: `composer:${context.activeWorkspace.id}:${randomUUID()}`,
    trackingEnabled: formData.get("tracking") === "on",
    bcc: [],
  });
  if (!parsed.success)
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check the email fields.",
    };
  if (!action.demo) {
    const supabase = await createServerSupabaseClient();
    const { data: integration } = await supabase
      .from("integrations")
      .select("*")
      .eq("workspace_id", context.activeWorkspace.id)
      .eq("provider", provider)
      .eq("status", "connected")
      .maybeSingle();
    if (!integration)
      return {
        ok: false,
        message: "Select a connected, active email account.",
      };
    const [{ data: account }, { data: suppression }] = await Promise.all([
      supabase
        .from("email_accounts")
        .select("daily_limit,sent_today,paused")
        .eq("integration_id", integration.id)
        .eq("workspace_id", context.activeWorkspace.id)
        .maybeSingle(),
      supabase
        .from("suppression_entries")
        .select("id")
        .eq("workspace_id", context.activeWorkspace.id)
        .eq("type", "email")
        .eq("normalized_value", normalizeEmail(parsed.data.to))
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .maybeSingle(),
    ]);
    if (suppression)
      return {
        ok: false,
        message: "Suppression rules blocked this recipient.",
      };
    if (account?.paused)
      return { ok: false, message: "The selected email account is paused." };
    if (account && account.sent_today >= account.daily_limit)
      return {
        ok: false,
        message: "The account daily limit has been reached.",
      };
    if (!isEmailProvider(integration.provider))
      return {
        ok: false,
        message: "The selected integration is not an email provider.",
      };
    const adapter = await configuredEmailAdapter({
      id: integration.id,
      workspaceId: integration.workspace_id,
      provider: integration.provider,
      configuration: configurationRecord(integration.configuration),
    });
    if (!adapter)
      return {
        ok: false,
        message: "The provider credential is unavailable or unsupported.",
      };
    const result = await adapter.send(parsed.data);
    if (!result.ok) return { ok: false, message: result.error.message };
    if (account)
      await supabase
        .from("email_accounts")
        .update({ sent_today: account.sent_today + 1 })
        .eq("integration_id", integration.id)
        .eq("workspace_id", context.activeWorkspace.id)
        .eq("sent_today", account.sent_today);
    await writeAuditLog({
      workspaceId: context.activeWorkspace.id,
      actorId: context.user.id,
      action: "integration.test_email_sent",
      entityType: "integration",
      entityId: integration.id,
      after: {
        provider,
        providerMessageId: result.providerMessageId,
        recipientDomain: parsed.data.to.split("@")[1] ?? "",
      },
    });
    return {
      ok: true,
      message: `Provider test email accepted with ID ${result.providerMessageId}.`,
    };
  }
  const integration = (
    demoPhase4Store().integrations.get(context.activeWorkspace.id) ?? []
  ).find((item) => item.provider === provider);
  if (!integration || integration.status !== "connected" || integration.paused)
    return { ok: false, message: "Select a connected, active email account." };
  if ((integration.sentToday ?? 0) >= (integration.dailyLimit ?? 0))
    return { ok: false, message: "The account daily limit has been reached." };
  const result = await createEmailAdapter(provider).send(parsed.data);
  recordProviderAttempt(
    provider,
    "send_test",
    result.ok ? "simulated_no_send" : "failed",
  );
  if (!result.ok) return { ok: false, message: result.error.message };
  return {
    ok: true,
    message: `Validated ${provider} message ${result.providerMessageId}. Deterministic no-send completed.`,
  };
}

export async function syncWhatsAppTemplatesAction(): Promise<IntegrationActionResult> {
  const action = await actionContext("integrations:manage");
  if (!action)
    return {
      ok: false,
      message: "You do not have permission to sync templates.",
    };
  const { context } = action;
  if (!action.demo) {
    const supabase = await createServerSupabaseClient();
    const { data: integration } = await supabase
      .from("integrations")
      .select("*")
      .eq("workspace_id", context.activeWorkspace.id)
      .eq("provider", "whatsapp")
      .eq("status", "connected")
      .maybeSingle();
    if (!integration)
      return {
        ok: false,
        message: "Connect and validate WhatsApp Business first.",
      };
    const credential = await readIntegrationCredential<Record<string, unknown>>(
      integration.id,
      integration.workspace_id,
    );
    const configuration = configurationRecord(integration.configuration);
    const accessToken = credential?.payload.access_token;
    const wabaId = configuration.wabaId;
    const apiVersion = configuration.apiVersion;
    if (
      typeof accessToken !== "string" ||
      typeof wabaId !== "string" ||
      typeof apiVersion !== "string"
    )
      return {
        ok: false,
        message: "Official WhatsApp Cloud API setup is incomplete.",
      };
    const response = await fetchWithTimeout(
      fetch,
      `https://graph.facebook.com/${encodeURIComponent(apiVersion)}/${encodeURIComponent(wabaId)}/message_templates?fields=id,name,language,category,status,components,quality_score,rejected_reason&limit=100`,
      {
        headers: { authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      },
      12_000,
    ).catch(() => null);
    if (!response)
      return {
        ok: false,
        message: "WhatsApp template sync timed out. Try again.",
      };
    const payload = (await response.json().catch(() => null)) as {
      data?: Array<Record<string, unknown>>;
      error?: { message?: string };
    } | null;
    if (!response.ok || !payload?.data)
      return {
        ok: false,
        message:
          payload?.error?.message ??
          "WhatsApp templates could not be synchronized.",
      };
    const syncedAt = new Date().toISOString();
    const rows = payload.data.flatMap((template) =>
      typeof template.id === "string" &&
      typeof template.name === "string" &&
      typeof template.language === "string"
        ? [
            {
              workspace_id: integration.workspace_id,
              integration_id: integration.id,
              provider_template_id: template.id,
              name: template.name,
              language: template.language,
              category: String(template.category ?? "utility").toLowerCase(),
              status: String(template.status ?? "pending").toLowerCase(),
              components: Array.isArray(template.components)
                ? template.components
                : [],
              quality_score:
                typeof template.quality_score === "string"
                  ? template.quality_score.toLowerCase()
                  : null,
              rejection_reason:
                typeof template.rejected_reason === "string"
                  ? template.rejected_reason
                  : null,
              last_synced_at: syncedAt,
            },
          ]
        : [],
    );
    const { error } = rows.length
      ? await supabase
          .from("whatsapp_templates")
          .upsert(rows, { onConflict: "integration_id,provider_template_id" })
      : { error: null };
    if (error)
      return {
        ok: false,
        message: "WhatsApp template state could not be stored.",
      };
    await supabase
      .from("integrations")
      .update({ last_synced_at: syncedAt })
      .eq("id", integration.id)
      .eq("workspace_id", integration.workspace_id);
    await writeAuditLog({
      workspaceId: integration.workspace_id,
      actorId: context.user.id,
      action: "whatsapp.templates_synced",
      entityType: "integration",
      entityId: integration.id,
      after: { count: rows.length },
    });
    revalidatePath("/app/integrations/whatsapp/templates");
    return {
      ok: true,
      message: `${rows.length} official Cloud API templates synchronized.`,
    };
  }
  const templates =
    demoPhase4Store().templates.get(context.activeWorkspace.id) ?? [];
  const syncedAt = new Date().toISOString();
  templates.forEach((template) => {
    template.lastSyncedAt = syncedAt;
  });
  recordProviderAttempt("whatsapp", "template_sync", "validated");
  revalidatePath("/app/integrations/whatsapp/templates");
  return {
    ok: true,
    message: `${templates.length} official Cloud API template fixtures reconciled.`,
  };
}

export async function markManualSocialSentAction(
  id: string,
): Promise<IntegrationActionResult> {
  const action = await actionContext("message:send");
  if (!action)
    return {
      ok: false,
      message: "You do not have permission to mark outreach sent.",
    };
  const { context } = action;
  if (!action.demo) {
    const separator = id.lastIndexOf(":");
    const leadId = separator > 0 ? id.slice(0, separator) : "";
    const channel = separator > 0 ? id.slice(separator + 1) : "";
    if (!leadId || !["instagram", "linkedin"].includes(channel))
      return { ok: false, message: "Manual draft not found." };
    const supabase = await createServerSupabaseClient();
    const { data: lead } = await supabase
      .from("leads")
      .select("id,business_name,instagram_url,linkedin_url")
      .eq("id", leadId)
      .eq("workspace_id", context.activeWorkspace.id)
      .eq("do_not_contact", false)
      .maybeSingle();
    const profileUrl =
      channel === "instagram" ? lead?.instagram_url : lead?.linkedin_url;
    if (!lead || !profileUrl)
      return { ok: false, message: "Manual social profile was not found." };
    const sentAt = new Date().toISOString();
    const [{ error }] = await Promise.all([
      supabase
        .from("leads")
        .update({ first_contacted_at: sentAt })
        .eq("id", lead.id)
        .eq("workspace_id", context.activeWorkspace.id),
      supabase.from("lead_activities").insert({
        workspace_id: context.activeWorkspace.id,
        lead_id: lead.id,
        actor_type: "user",
        actor_id: context.user.id,
        event_type: "manual_social.sent",
        summary: `${channel === "instagram" ? "Instagram" : "LinkedIn"} outreach marked sent manually`,
        metadata: { channel, profile_url: profileUrl },
      }),
    ]);
    if (error)
      return {
        ok: false,
        message: "Manual outreach activity could not be saved.",
      };
    revalidatePath("/app/integrations/manual-social");
    return {
      ok: true,
      message: `${channel === "instagram" ? "Instagram" : "LinkedIn"} activity marked as manually sent.`,
    };
  }
  const item = (
    demoPhase4Store().socialDrafts.get(context.activeWorkspace.id) ?? []
  ).find((draft) => draft.id === id);
  if (!item) return { ok: false, message: "Manual draft not found." };
  item.sentAt ??= new Date().toISOString();
  recordProviderAttempt(item.channel, "manual_mark_sent", "validated");
  revalidatePath("/app/integrations/manual-social");
  return {
    ok: true,
    message: `${item.channel === "instagram" ? "Instagram" : "LinkedIn"} activity marked as manually sent.`,
  };
}

export async function toggleManualReplyAction(
  id: string,
): Promise<IntegrationActionResult> {
  const action = await actionContext("inbox:reply");
  if (!action)
    return {
      ok: false,
      message: "You do not have permission to track replies.",
    };
  const { context } = action;
  if (!action.demo) {
    const separator = id.lastIndexOf(":");
    const leadId = separator > 0 ? id.slice(0, separator) : "";
    const channel = separator > 0 ? id.slice(separator + 1) : "";
    if (!leadId || !["instagram", "linkedin"].includes(channel))
      return { ok: false, message: "Manual draft not found." };
    const supabase = await createServerSupabaseClient();
    const repliedAt = new Date().toISOString();
    const { data: lead, error } = await supabase
      .from("leads")
      .update({ last_replied_at: repliedAt })
      .eq("id", leadId)
      .eq("workspace_id", context.activeWorkspace.id)
      .select("id")
      .maybeSingle();
    if (error || !lead)
      return { ok: false, message: "Manual reply could not be recorded." };
    await supabase.from("lead_activities").insert({
      workspace_id: context.activeWorkspace.id,
      lead_id: leadId,
      actor_type: "user",
      actor_id: context.user.id,
      event_type: "manual_social.replied",
      summary: `${channel === "instagram" ? "Instagram" : "LinkedIn"} reply recorded manually`,
      metadata: { channel },
    });
    revalidatePath("/app/integrations/manual-social");
    return { ok: true, message: "Manual reply recorded." };
  }
  const item = (
    demoPhase4Store().socialDrafts.get(context.activeWorkspace.id) ?? []
  ).find((draft) => draft.id === id);
  if (!item) return { ok: false, message: "Manual draft not found." };
  item.replyStatus = item.replyStatus === "replied" ? "none" : "replied";
  revalidatePath("/app/integrations/manual-social");
  return {
    ok: true,
    message:
      item.replyStatus === "replied"
        ? "Manual reply recorded."
        : "Reply marker cleared.",
  };
}

export async function createCalendarEventAction(
  input: CalendarEventInput,
): Promise<IntegrationActionResult> {
  const action = await actionContext("inbox:reply");
  if (!action)
    return {
      ok: false,
      message: "You do not have permission to schedule events.",
    };
  const { context } = action;
  const parsed = calendarEventInputSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check the event fields.",
    };
  if (!action.demo) {
    const supabase = await createServerSupabaseClient();
    const databaseType =
      parsed.data.type === "campaign" ? "campaign_start" : parsed.data.type;
    const { data: event, error } = await supabase
      .from("scheduled_events")
      .insert({
        workspace_id: context.activeWorkspace.id,
        type: databaseType,
        title: parsed.data.title,
        starts_at: parsed.data.startsAt,
        ends_at: parsed.data.endsAt,
        metadata: parsed.data.leadName
          ? { lead_name: parsed.data.leadName }
          : {},
        orliqo_owned: true,
      })
      .select("*")
      .single();
    if (error || !event)
      return { ok: false, message: "Calendar event could not be scheduled." };
    const { data: integration } = await supabase
      .from("integrations")
      .select("*")
      .eq("workspace_id", context.activeWorkspace.id)
      .eq("provider", "google_calendar")
      .eq("status", "connected")
      .maybeSingle();
    let synced = false;
    if (integration) {
      const credential = await readIntegrationCredential<
        Record<string, unknown>
      >(integration.id, integration.workspace_id);
      const configuration = configurationRecord(integration.configuration);
      if (
        credential &&
        typeof credential.payload.access_token === "string" &&
        typeof configuration.selectedCalendarId === "string"
      ) {
        try {
          const result = await createGoogleCalendarAdapter({
            accessToken: credential.payload.access_token,
            calendarId: configuration.selectedCalendarId,
          }).create(parsed.data);
          await supabase
            .from("scheduled_events")
            .update({
              external_calendar_id: configuration.selectedCalendarId,
              external_event_id: result.externalEventId,
            })
            .eq("id", event.id)
            .eq("workspace_id", context.activeWorkspace.id);
          synced = result.delivered;
        } catch {
          synced = false;
        }
      }
    }
    await writeAuditLog({
      workspaceId: context.activeWorkspace.id,
      actorId: context.user.id,
      action: "calendar.event_created",
      entityType: "scheduled_event",
      entityId: event.id,
      after: { type: parsed.data.type, providerSynced: synced },
    });
    revalidatePath("/app/calendar");
    return {
      ok: true,
      message: synced
        ? "Orliqo-owned event scheduled and synchronized to Google Calendar."
        : "Orliqo-owned event scheduled locally; provider sync remains pending.",
    };
  }
  const events = demoPhase4Store().events.get(context.activeWorkspace.id) ?? [];
  events.push({
    id: randomUUID(),
    workspaceId: context.activeWorkspace.id,
    ...parsed.data,
    status: "scheduled",
    orliqoOwned: true,
    externalCalendarId: "orliqo-demo",
    externalEventId: `demo-${randomUUID()}`,
  });
  demoPhase4Store().events.set(context.activeWorkspace.id, events);
  recordProviderAttempt("google_calendar", "create_owned_event", "validated");
  revalidatePath("/app/calendar");
  return {
    ok: true,
    message: "Orliqo-owned calendar event scheduled in sandbox mode.",
  };
}

export async function deleteCalendarEventAction(
  id: string,
): Promise<IntegrationActionResult> {
  const action = await actionContext("inbox:reply");
  if (!action)
    return {
      ok: false,
      message: "You do not have permission to delete events.",
    };
  const { context } = action;
  if (!action.demo) {
    const supabase = await createServerSupabaseClient();
    const { data: event } = await supabase
      .from("scheduled_events")
      .select("*")
      .eq("id", id)
      .eq("workspace_id", context.activeWorkspace.id)
      .maybeSingle();
    if (!event) return { ok: false, message: "Calendar event not found." };
    if (!event.orliqo_owned)
      return {
        ok: false,
        message:
          "External events are read-only and cannot be changed by Orliqo.",
      };
    if (event.external_event_id && event.external_calendar_id) {
      const { data: integration } = await supabase
        .from("integrations")
        .select("*")
        .eq("workspace_id", context.activeWorkspace.id)
        .eq("provider", "google_calendar")
        .eq("status", "connected")
        .maybeSingle();
      if (!integration)
        return {
          ok: false,
          message:
            "Reconnect Google Calendar before deleting this synchronized event.",
        };
      const credential = await readIntegrationCredential<
        Record<string, unknown>
      >(integration.id, integration.workspace_id);
      if (!credential || typeof credential.payload.access_token !== "string")
        return {
          ok: false,
          message: "Google Calendar credentials are unavailable.",
        };
      try {
        await createGoogleCalendarAdapter({
          accessToken: credential.payload.access_token,
          calendarId: event.external_calendar_id,
        }).delete({
          id: event.id,
          workspaceId: event.workspace_id,
          type:
            event.type === "campaign_start" || event.type === "campaign_end"
              ? "campaign"
              : event.type,
          title: event.title,
          startsAt: event.starts_at,
          endsAt: event.ends_at,
          status: event.status,
          orliqoOwned: event.orliqo_owned,
          externalCalendarId: event.external_calendar_id,
          externalEventId: event.external_event_id,
        });
      } catch {
        return {
          ok: false,
          message:
            "Google Calendar rejected the delete; the local event was preserved.",
        };
      }
    }
    const { error } = await supabase
      .from("scheduled_events")
      .delete()
      .eq("id", id)
      .eq("workspace_id", context.activeWorkspace.id)
      .eq("orliqo_owned", true);
    if (error)
      return { ok: false, message: "Calendar event could not be deleted." };
    await writeAuditLog({
      workspaceId: context.activeWorkspace.id,
      actorId: context.user.id,
      action: "calendar.event_deleted",
      entityType: "scheduled_event",
      entityId: id,
    });
    revalidatePath("/app/calendar");
    return { ok: true, message: "Orliqo-owned calendar event removed." };
  }
  const events = demoPhase4Store().events.get(context.activeWorkspace.id) ?? [];
  const event = events.find((item) => item.id === id);
  if (!event) return { ok: false, message: "Calendar event not found." };
  if (!event.orliqoOwned)
    return {
      ok: false,
      message: "External events are read-only and cannot be changed by Orliqo.",
    };
  demoPhase4Store().events.set(
    context.activeWorkspace.id,
    events.filter((item) => item.id !== id),
  );
  recordProviderAttempt("google_calendar", "delete_owned_event", "validated");
  revalidatePath("/app/calendar");
  return { ok: true, message: "Orliqo-owned calendar event removed." };
}

export async function selectGoogleCalendarAction(
  calendarId: string,
  label: string,
): Promise<IntegrationActionResult> {
  const action = await actionContext("integrations:manage");
  if (!action)
    return {
      ok: false,
      message: "You do not have permission to select calendars.",
    };
  const { context } = action;
  if (action.demo) {
    if (calendarId !== "orliqo-demo")
      return {
        ok: false,
        message: "The primary calendar is read-only in this fixture.",
      };
    const integration = (
      demoPhase4Store().integrations.get(context.activeWorkspace.id) ?? []
    ).find((item) => item.provider === "google_calendar");
    if (!integration)
      return { ok: false, message: "Google Calendar integration not found." };
    integration.configuration.selectedCalendar = label;
    integration.configuration.selectedCalendarId = calendarId;
    revalidatePath("/app/calendar");
    return { ok: true, message: `${label} selected for Orliqo-owned events.` };
  }
  const supabase = await createServerSupabaseClient();
  const { data: integration } = await supabase
    .from("integrations")
    .select("*")
    .eq("workspace_id", context.activeWorkspace.id)
    .eq("provider", "google_calendar")
    .eq("status", "connected")
    .maybeSingle();
  if (!integration)
    return { ok: false, message: "Connect Google Calendar first." };
  const credential = await readIntegrationCredential<Record<string, unknown>>(
    integration.id,
    integration.workspace_id,
  );
  if (!credential || typeof credential.payload.access_token !== "string")
    return {
      ok: false,
      message: "Google Calendar credentials are unavailable.",
    };
  const response = await fetchWithTimeout(
    fetch,
    `https://www.googleapis.com/calendar/v3/users/me/calendarList/${encodeURIComponent(calendarId)}`,
    {
      headers: { authorization: `Bearer ${credential.payload.access_token}` },
      cache: "no-store",
    },
    10_000,
  ).catch(() => null);
  if (!response)
    return {
      ok: false,
      message: "Google Calendar validation timed out. Try again.",
    };
  const calendar = (await response.json().catch(() => null)) as {
    id?: string;
    summary?: string;
    accessRole?: string;
  } | null;
  if (
    !response.ok ||
    calendar?.id !== calendarId ||
    !["owner", "writer"].includes(calendar.accessRole ?? "")
  )
    return { ok: false, message: "Select a writable Google Calendar." };
  const configuration = {
    ...configurationRecord(integration.configuration),
    selectedCalendarId: calendarId,
    selectedCalendar: calendar.summary ?? label,
  };
  const { error } = await supabase
    .from("integrations")
    .update({ configuration })
    .eq("id", integration.id)
    .eq("workspace_id", integration.workspace_id);
  if (error)
    return { ok: false, message: "Calendar selection could not be saved." };
  await writeAuditLog({
    workspaceId: integration.workspace_id,
    actorId: context.user.id,
    action: "calendar.selected",
    entityType: "integration",
    entityId: integration.id,
    after: { calendarId },
  });
  revalidatePath("/app/calendar");
  revalidatePath("/app/integrations");
  return {
    ok: true,
    message: `${calendar.summary ?? label} selected for Orliqo-owned events.`,
  };
}
