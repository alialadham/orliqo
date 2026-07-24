"use server";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requirePermission } from "@/features/permissions/server";
import { readDemoSession } from "@/features/auth/demo-session";
import { campaignInputSchema, type CampaignInput } from "./schemas";
import {
  createDemoCampaign,
  demoPhase3Store,
  generateDemoMessages,
  logDemoCampaign,
} from "@/features/demo/phase3-store";
import { demoPhase2Store } from "@/features/demo/phase2-store";
import { scheduleMessages } from "./scheduling";
import { demoPhase4Store } from "@/features/demo/phase4-store";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  reserveUsage,
  commitUsage,
  releaseUsage,
} from "@/features/billing/usage";
import { writeAuditLog } from "@/features/audit/server";
import { getServerEnvironment } from "@/lib/env";
import { inngest } from "@/lib/inngest/client";

export type CampaignActionResult = {
  ok: boolean;
  message: string;
  id?: string;
  fieldErrors?: Record<string, string[]>;
};

function productionClient(): SupabaseClient {
  return createAdminSupabaseClient() as unknown as SupabaseClient;
}

function actionError(error: unknown, fallback: string): CampaignActionResult {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("OPTIMISTIC_LOCK_CONFLICT"))
    return {
      ok: false,
      message: "This record changed in another session. Refresh and retry.",
    };
  if (
    message.includes("USAGE_LIMIT_EXCEEDED") ||
    message.includes("USAGE_COUNTER_NOT_FOUND")
  )
    return {
      ok: false,
      message: "The workspace message quota is unavailable or exceeded.",
    };
  if (message.includes("SUBSCRIPTION_NOT_ENTITLED"))
    return { ok: false, message: "An active subscription is required." };
  if (message.includes("GROUNDING"))
    return {
      ok: false,
      message: "Resolve grounding warnings before approval.",
    };
  if (message.includes("CAMPAIGN_PROVIDER_UNAVAILABLE"))
    return {
      ok: false,
      message: "Connect and validate the required provider before launch.",
    };
  if (message.includes("CAMPAIGN_SAFETY_GATE_FAILED"))
    return {
      ok: false,
      message:
        "Approval, suppression, consent, or grounding checks blocked launch.",
    };
  if (message.includes("CAMPAIGN_STATE_INVALID"))
    return {
      ok: false,
      message: "The campaign changed state. Refresh and retry.",
    };
  return { ok: false, message: fallback };
}

function chunks<T>(values: T[], size = 250): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size)
    result.push(values.slice(index, index + size));
  return result;
}
async function context(
  permission:
    | "campaign:create"
    | "campaign:update"
    | "campaign:approve"
    | "campaign:launch"
    | "campaign:pause"
    | "campaign:kill"
    | "message:generate"
    | "message:edit"
    | "message:approve"
    | "message:send",
) {
  const value = await requirePermission(permission);
  if (!value) return null;
  const demo = (await readDemoSession())?.kind === "workspace";
  return { value, demo };
}
export async function createCampaignAction(
  input: CampaignInput,
): Promise<CampaignActionResult> {
  const parsed = campaignInputSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message: "Check the campaign fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  const ctx = await context("campaign:create");
  if (!ctx)
    return {
      ok: false,
      message: "You do not have permission to create campaigns.",
    };
  if (!ctx.demo) {
    try {
      const { data, error } = await productionClient()
        .schema("private")
        .rpc("create_campaign", {
          target_workspace_id: ctx.value.activeWorkspace.id,
          target_actor_id: ctx.value.user.id,
          campaign_input: parsed.data,
        });
      if (error || typeof data !== "string")
        throw new Error(error?.message ?? "Campaign creation failed.");
      revalidatePath("/app/campaigns");
      return { ok: true, id: data, message: "Campaign draft created." };
    } catch (error) {
      return actionError(
        error,
        "The campaign could not be created. Retry shortly.",
      );
    }
  }
  const item = createDemoCampaign(ctx.value.activeWorkspace.id, parsed.data);
  revalidatePath("/app/campaigns");
  return { ok: true, id: item.id, message: "Campaign draft created." };
}
function locate(campaignId: string) {
  const store = demoPhase3Store();
  const campaign = [...store.campaigns.values()]
    .flat()
    .find((item) => item.id === campaignId);
  return { store, campaign };
}
export async function generateCampaignMessagesAction(
  campaignId: string,
): Promise<CampaignActionResult> {
  const ctx = await context("message:generate");
  if (!ctx)
    return {
      ok: false,
      message: "You do not have permission to generate messages.",
    };
  if (!ctx.demo) {
    const client = productionClient();
    const workspaceId = ctx.value.activeWorkspace.id;
    let reservationId: string | null = null;
    try {
      const [
        { data: campaign },
        { data: campaignLeads },
        { data: channelRows },
      ] = await Promise.all([
        client
          .from("campaigns")
          .select("id,name,main_offer,main_cta,tone,language,updated_at")
          .eq("id", campaignId)
          .eq("workspace_id", workspaceId)
          .maybeSingle(),
        client
          .from("campaign_leads")
          .select("lead_id")
          .eq("campaign_id", campaignId)
          .eq("workspace_id", workspaceId)
          .limit(5000),
        client
          .from("campaign_channels")
          .select("channel,priority")
          .eq("campaign_id", campaignId)
          .eq("workspace_id", workspaceId)
          .eq("enabled", true)
          .order("priority"),
      ]);
      if (!campaign) return { ok: false, message: "Campaign not found." };
      const leadIds = (campaignLeads ?? []).map((row) => row.lead_id as string);
      if (!leadIds.length)
        return {
          ok: false,
          message: "No eligible, unsuppressed leads are in this campaign.",
        };

      const leads: Array<{
        id: string;
        business_name: string;
        email: string | null;
        phone: string | null;
        whatsapp_consent_status: string;
        instagram_url: string | null;
        linkedin_url: string | null;
        do_not_contact: boolean;
      }> = [];
      const sources: Array<{
        id: string;
        lead_id: string;
        citation_text: string | null;
        source_title: string | null;
        source_url: string;
      }> = [];
      for (const batch of chunks(leadIds)) {
        const [leadResult, sourceResult] = await Promise.all([
          client
            .from("leads")
            .select(
              "id,business_name,email,phone,whatsapp_consent_status,instagram_url,linkedin_url,do_not_contact",
            )
            .eq("workspace_id", workspaceId)
            .in("id", batch),
          client
            .from("lead_sources")
            .select("id,lead_id,citation_text,source_title,source_url")
            .eq("workspace_id", workspaceId)
            .eq("allowed_for_automated_use", true)
            .in("lead_id", batch)
            .order("retrieved_at", { ascending: false }),
        ]);
        if (leadResult.error || sourceResult.error)
          throw new Error(
            leadResult.error?.message ?? sourceResult.error?.message,
          );
        leads.push(...((leadResult.data ?? []) as typeof leads));
        sources.push(...((sourceResult.data ?? []) as typeof sources));
      }

      const channelOrder = (channelRows ?? []).map(
        (row) => row.channel as string,
      );
      const candidates = leads.flatMap((lead) => {
        if (lead.do_not_contact) return [];
        const channel = channelOrder.find(
          (value) =>
            (value === "email" && Boolean(lead.email)) ||
            (value === "whatsapp" &&
              Boolean(lead.phone) &&
              lead.whatsapp_consent_status === "opted_in") ||
            (value === "instagram" && Boolean(lead.instagram_url)) ||
            (value === "linkedin" && Boolean(lead.linkedin_url)),
        );
        const source = sources.find((item) => item.lead_id === lead.id);
        if (!channel || !source) return [];
        const fact =
          source.citation_text?.trim() ||
          source.source_title?.trim() ||
          `Public source: ${source.source_url.slice(0, 240)}`;
        const subject =
          channel === "email"
            ? `${campaign.main_offer} for ${lead.business_name}`.slice(0, 200)
            : null;
        const body =
          `Hi ${lead.business_name} team — ${fact}. ` +
          `${campaign.main_offer}. ${campaign.main_cta}.`;
        return [
          {
            workspace_id: workspaceId,
            campaign_id: campaignId,
            lead_id: lead.id,
            channel,
            direction: "outbound",
            sequence_step: 0,
            subject,
            body: body.slice(0, 4000),
            personalization_facts: [fact],
            grounding_source_ids: [source.id],
            generation_model: "grounded-template-v1",
            generation_prompt_version: "phase8-grounded-v1",
            approval_status: "needs_review",
            send_status: "draft",
            idempotency_key: `${campaignId}:${lead.id}:${channel}:0`,
            created_by: ctx.value.user.id,
            provider_metadata: { confidence: 0.9 },
          },
        ];
      });
      if (!candidates.length)
        return {
          ok: false,
          message:
            "No lead has both a selected contact channel and an approved stored source.",
        };

      const { data: existing, error: existingError } = await client
        .from("messages")
        .select("idempotency_key")
        .eq("workspace_id", workspaceId)
        .eq("campaign_id", campaignId);
      if (existingError) throw new Error(existingError.message);
      const existingKeys = new Set(
        (existing ?? []).map((row) => String(row.idempotency_key)),
      );
      const pendingMessages = candidates.filter(
        (candidate) => !existingKeys.has(candidate.idempotency_key),
      );
      if (!pendingMessages.length)
        return {
          ok: true,
          message: "All eligible grounded messages already exist.",
        };

      reservationId = await reserveUsage({
        workspaceId,
        metric: "ai_messages",
        amount: pendingMessages.length,
        idempotencyKey: `campaign-generation:${campaignId}:${campaign.updated_at}`,
        sourceEntityType: "campaign",
        sourceEntityId: campaignId,
      });
      let insertedCount = 0;
      for (const batch of chunks(pendingMessages, 200)) {
        const { data: inserted, error } = await client
          .from("messages")
          .insert(batch)
          .select(
            "id,subject,body,personalization_facts,grounding_source_ids,generation_model,generation_prompt_version",
          );
        if (error) throw new Error(error.message);
        const versions = (inserted ?? []).map((message) => ({
          workspace_id: workspaceId,
          message_id: message.id,
          version_number: 1,
          subject: message.subject,
          body: message.body,
          generation_model: message.generation_model,
          generation_prompt_version: message.generation_prompt_version,
          personalization_facts: message.personalization_facts,
          grounding_source_ids: message.grounding_source_ids,
          risk_flags: [],
          unsupported_claims: [],
          created_by: ctx.value.user.id,
          created_by_type: "user",
        }));
        if (versions.length) {
          const versionResult = await client
            .from("message_versions")
            .insert(versions);
          if (versionResult.error) throw new Error(versionResult.error.message);
        }
        insertedCount += versions.length;
      }
      await commitUsage(reservationId);
      reservationId = null;
      await client
        .from("campaigns")
        .update({ status: "awaiting_approval" })
        .eq("id", campaignId)
        .eq("workspace_id", workspaceId)
        .in("status", ["draft", "researching", "awaiting_approval"]);
      await writeAuditLog({
        workspaceId,
        actorId: ctx.value.user.id,
        action: "campaign.messages_generated",
        entityType: "campaign",
        entityId: campaignId,
        after: { count: insertedCount, groundingRequired: true },
      });
      revalidatePath(`/app/campaigns/${campaignId}`);
      revalidatePath("/app/queue");
      return {
        ok: true,
        message: `Generated ${insertedCount} grounded messages with stored source IDs.`,
      };
    } catch (error) {
      if (reservationId)
        await releaseUsage(reservationId).catch(() => undefined);
      return actionError(
        error,
        "Grounded message generation failed. Retry shortly.",
      );
    }
  }
  const count = generateDemoMessages(campaignId);
  revalidatePath(`/app/campaigns/${campaignId}`);
  revalidatePath("/app/queue");
  return {
    ok: true,
    message: `Generated ${count} grounded messages with stored source IDs.`,
  };
}
export async function approveMessageAction(
  messageId: string,
): Promise<CampaignActionResult> {
  const ctx = await context("message:approve");
  if (!ctx)
    return {
      ok: false,
      message: "You do not have permission to approve messages.",
    };
  if (!ctx.demo) {
    try {
      const client = productionClient();
      const workspaceId = ctx.value.activeWorkspace.id;
      const { data: message } = await client
        .from("messages")
        .select("updated_at,campaign_id")
        .eq("id", messageId)
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (!message) return { ok: false, message: "Message not found." };
      const { data, error } = await client
        .schema("private")
        .rpc("approve_message", {
          target_workspace_id: workspaceId,
          target_message_id: messageId,
          target_actor_id: ctx.value.user.id,
          expected_updated_at: message.updated_at,
        });
      if (error || data !== true)
        throw new Error(error?.message ?? "Message approval failed.");
      revalidatePath(`/app/campaigns/${message.campaign_id}`);
      revalidatePath("/app/queue");
      return { ok: true, message: "Message approved." };
    } catch (error) {
      return actionError(error, "Message approval failed. Refresh and retry.");
    }
  }
  const message = [...demoPhase3Store().messages.values()]
    .flat()
    .find((item) => item.id === messageId);
  if (!message) return { ok: false, message: "Message not found." };
  if (message.approvalStatus === "approved")
    return { ok: true, message: "Message is already approved." };
  if (
    !message.sourceIds.length ||
    message.versions.at(-1)?.unsupportedClaims.length
  )
    return {
      ok: false,
      message: "Resolve grounding warnings before approval.",
    };
  message.approvalStatus = "approved";
  logDemoCampaign(
    message.campaignId,
    `${message.businessName} message approved`,
    "message.approved",
  );
  revalidatePath(`/app/campaigns/${message.campaignId}`);
  revalidatePath("/app/queue");
  return { ok: true, message: "Message approved." };
}
export async function rewriteMessageAction(
  messageId: string,
  mode: "shorten" | "friendly" | "translate" | "subject",
): Promise<CampaignActionResult> {
  const ctx = await context("message:edit");
  if (!ctx)
    return {
      ok: false,
      message: "You do not have permission to edit messages.",
    };
  if (!ctx.demo) {
    try {
      const client = productionClient();
      const workspaceId = ctx.value.activeWorkspace.id;
      const { data: message } = await client
        .from("messages")
        .select("id,campaign_id,subject,body,updated_at,lead_id")
        .eq("id", messageId)
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (!message) return { ok: false, message: "Message not found." };
      if (mode === "translate")
        return {
          ok: false,
          message:
            "Translation is unavailable until a language-capable provider is configured.",
        };
      const { data: lead } = await client
        .from("leads")
        .select("business_name")
        .eq("id", message.lead_id)
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      let nextSubject = message.subject ?? "";
      let nextBody = message.body;
      if (mode === "shorten")
        nextBody = message.body
          .split(/(?<=[.!?])\s+/)
          .slice(0, 2)
          .join(" ");
      if (mode === "friendly")
        nextBody = `Hello! ${message.body.replace(/^Hi[^—]+—\s*/, "")}`;
      if (mode === "subject")
        nextSubject = `A concise growth idea for ${lead?.business_name ?? "your team"}`;
      const { data, error } = await client
        .schema("private")
        .rpc("revise_message", {
          target_workspace_id: workspaceId,
          target_message_id: messageId,
          target_actor_id: ctx.value.user.id,
          expected_updated_at: message.updated_at,
          next_subject: nextSubject,
          next_body: nextBody,
        });
      if (error || data !== true)
        throw new Error(error?.message ?? "Message revision failed.");
      revalidatePath(`/app/campaigns/${message.campaign_id}`);
      revalidatePath("/app/queue");
      return {
        ok: true,
        message: "A new grounded version was saved for review.",
      };
    } catch (error) {
      return actionError(error, "Message editing failed. Refresh and retry.");
    }
  }
  const message = [...demoPhase3Store().messages.values()]
    .flat()
    .find((item) => item.id === messageId);
  if (!message) return { ok: false, message: "Message not found." };
  if (mode === "shorten")
    message.body = message.body
      .split(/(?<=[.!?])\s+/)
      .slice(0, 2)
      .join(" ");
  if (mode === "friendly")
    message.body = `Hello! ${message.body.replace(/^Hi[^—]+—\s*/, "")}`;
  if (mode === "translate")
    message.body = `مرحباً فريق ${message.businessName} — هذه مسودة عربية تجريبية مبنية على المصدر العام المحفوظ. يرجى الرد للاطلاع على المراجعة.`;
  if (mode === "subject")
    message.subject = `A concise growth idea for ${message.businessName}`;
  const current = message.versions.at(-1)!;
  message.versions.push({
    ...current,
    id: crypto.randomUUID(),
    number: current.number + 1,
    subject: message.subject,
    body: message.body,
    createdAt: new Date().toISOString(),
  });
  message.approvalStatus = "needs_review";
  revalidatePath(`/app/campaigns/${message.campaignId}`);
  return { ok: true, message: "A new grounded version was saved for review." };
}
export async function controlCampaignAction(
  campaignId: string,
  action: "launch" | "pause" | "resume" | "kill",
): Promise<CampaignActionResult> {
  const permission =
    action === "kill"
      ? "campaign:kill"
      : action === "launch"
        ? "campaign:launch"
        : "campaign:pause";
  const ctx = await context(permission);
  if (!ctx)
    return {
      ok: false,
      message: "You do not have permission to control this campaign.",
    };
  if (!ctx.demo) {
    const client = productionClient();
    const workspaceId = ctx.value.activeWorkspace.id;
    try {
      const { data: campaign } = await client
        .from("campaigns")
        .select(
          "id,updated_at,start_at,sending_days,send_window_start,send_window_end,daily_limit,min_interval_minutes,max_interval_minutes",
        )
        .eq("id", campaignId)
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (!campaign) return { ok: false, message: "Campaign not found." };
      let messageSchedule: Array<{ id: string; scheduledAt: string }> = [];
      if (action === "launch") {
        const { data: messages, error } = await client
          .from("messages")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("campaign_id", campaignId)
          .in("send_status", ["draft", "queued", "scheduled"])
          .order("created_at");
        if (error) throw new Error(error.message);
        if (!messages?.length)
          return {
            ok: false,
            message: "Generate and approve messages before launch.",
          };
        const times = scheduleMessages({
          startAt: new Date(campaign.start_at ?? Date.now()),
          count: messages.length,
          days: campaign.sending_days,
          windowStart: String(campaign.send_window_start).slice(0, 5),
          windowEnd: String(campaign.send_window_end).slice(0, 5),
          minInterval: campaign.min_interval_minutes,
          maxInterval: campaign.max_interval_minutes,
          dailyLimit: campaign.daily_limit,
          seed: campaignId,
        });
        messageSchedule = messages.map((message, index) => ({
          id: message.id,
          scheduledAt: times[index]!.toISOString(),
        }));
      }
      const { data, error } = await client
        .schema("private")
        .rpc("transition_campaign", {
          target_workspace_id: workspaceId,
          target_campaign_id: campaignId,
          target_actor_id: ctx.value.user.id,
          expected_updated_at: campaign.updated_at,
          target_action: action,
          message_schedule: messageSchedule,
        });
      if (error || data !== true)
        throw new Error(error?.message ?? "Campaign transition failed.");
      revalidatePath("/app/campaigns");
      revalidatePath(`/app/campaigns/${campaignId}`);
      revalidatePath("/app/queue");
      return { ok: true, message: `Campaign ${action} applied safely.` };
    } catch (error) {
      return actionError(error, "Campaign control failed. Refresh and retry.");
    }
  }
  const { store, campaign } = locate(campaignId);
  if (!campaign) return { ok: false, message: "Campaign not found." };
  const messages = store.messages.get(campaignId) ?? [];
  if (action === "launch") {
    if (
      !messages.length ||
      messages.some((m) => m.approvalStatus !== "approved")
    )
      return {
        ok: false,
        message: "Approve every grounded message before launch.",
      };
    const leads = demoPhase2Store().leads.get(campaign.workspaceId) ?? [];
    if (
      messages.some((m) => leads.find((l) => l.id === m.leadId)?.doNotContact)
    )
      return {
        ok: false,
        message: "Suppressed leads must be removed before launch.",
      };
    const integrations =
      demoPhase4Store().integrations.get(campaign.workspaceId) ?? [];
    const emailProviders = new Set([
      "gmail",
      "outlook",
      "smtp",
      "resend",
      "ses",
    ]);
    if (
      messages.some((m) => m.channel === "email") &&
      !integrations.some(
        (item) =>
          emailProviders.has(item.provider) &&
          item.status === "connected" &&
          !item.paused,
      )
    )
      return {
        ok: false,
        message: "Connect and validate an active email provider before launch.",
      };
    if (messages.some((m) => m.channel === "whatsapp")) {
      const whatsapp = integrations.find(
        (item) => item.provider === "whatsapp",
      );
      const approvedTemplate = (
        demoPhase4Store().templates.get(campaign.workspaceId) ?? []
      ).some((item) => item.status === "approved");
      if (!whatsapp || whatsapp.status !== "connected" || !approvedTemplate)
        return {
          ok: false,
          message:
            "WhatsApp requires a validated official Cloud API account and approved template.",
        };
      if (
        messages.some(
          (m) =>
            leads.find((lead) => lead.id === m.leadId)?.whatsappConsent !==
            "opted_in",
        )
      )
        return {
          ok: false,
          message: "WhatsApp consent is required for every queued recipient.",
        };
    }
    const usage = store.usage.get(campaign.workspaceId)!;
    if (usage.used + usage.reserved + messages.length > usage.limit)
      return { ok: false, message: "Monthly usage limit would be exceeded." };
    usage.reserved += messages.length;
    const times = scheduleMessages({
      startAt: new Date(campaign.startAt),
      count: messages.length,
      days: campaign.sendingDays,
      windowStart: campaign.sendWindowStart,
      windowEnd: campaign.sendWindowEnd,
      minInterval: campaign.minIntervalMinutes,
      maxInterval: campaign.maxIntervalMinutes,
      dailyLimit: campaign.dailyLimit,
      seed: campaign.id,
    });
    messages.forEach((m, i) => {
      m.sendStatus = "scheduled";
      m.scheduledAt = times[i]!.toISOString();
    });
    campaign.status = "running";
  }
  if (action === "pause") {
    campaign.status = "paused";
    campaign.pausedAt = new Date().toISOString();
    messages
      .filter((m) => ["queued", "scheduled"].includes(m.sendStatus))
      .forEach((m) => (m.sendStatus = "paused"));
  }
  if (action === "resume") {
    campaign.status = "running";
    campaign.pausedAt = null;
    messages
      .filter((m) => m.sendStatus === "paused")
      .forEach((m) => (m.sendStatus = "scheduled"));
  }
  if (action === "kill") {
    campaign.status = "killed";
    campaign.killedAt = new Date().toISOString();
    messages
      .filter(
        (m) => !["sent", "delivered", "read", "replied"].includes(m.sendStatus),
      )
      .forEach((m) => (m.sendStatus = "cancelled"));
  }
  campaign.updatedAt = new Date().toISOString();
  logDemoCampaign(
    campaignId,
    `Campaign ${action} applied`,
    `campaign.${action}`,
  );
  revalidatePath("/app/campaigns");
  revalidatePath(`/app/campaigns/${campaignId}`);
  revalidatePath("/app/queue");
  return { ok: true, message: `Campaign ${action} applied safely.` };
}
export async function dispatchDemoMessageAction(
  messageId: string,
): Promise<CampaignActionResult> {
  const ctx = await context("message:send");
  if (!ctx)
    return {
      ok: false,
      message: "You do not have permission to send messages.",
    };
  if (!ctx.demo) {
    const environment = getServerEnvironment();
    const client = productionClient();
    const workspaceId = ctx.value.activeWorkspace.id;
    try {
      const { data: message } = await client
        .from("messages")
        .select(
          "id,campaign_id,channel,approval_status,send_status,idempotency_key",
        )
        .eq("id", messageId)
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (!message) return { ok: false, message: "Message not found." };
      if (!["email", "whatsapp"].includes(message.channel))
        return {
          ok: false,
          message:
            "This channel uses the manual open, copy, and mark-sent workflow.",
        };
      if (
        environment.LIVE_DELIVERY_ENABLED !== "true" ||
        (message.channel === "email" &&
          environment.EMAIL_DELIVERY_MODE !== "live") ||
        (message.channel === "whatsapp" &&
          environment.WHATSAPP_DELIVERY_MODE !== "live")
      )
        return {
          ok: false,
          message:
            "Live delivery is disabled. A release-authorized provider is required.",
        };
      if (
        message.approval_status !== "approved" ||
        !["scheduled", "queued"].includes(message.send_status)
      )
        return {
          ok: false,
          message: "Approval and queue checks blocked dispatch.",
        };
      const idempotencyKey = `dispatch:${message.idempotency_key}`;
      const now = new Date().toISOString();
      const { error: scheduleError } = await client
        .from("messages")
        .update({ scheduled_at: now })
        .eq("id", messageId)
        .eq("workspace_id", workspaceId)
        .eq("approval_status", "approved")
        .in("send_status", ["scheduled", "queued"]);
      if (scheduleError) throw new Error(scheduleError.message);
      const { error: jobError } = await client.from("job_runs").upsert(
        {
          workspace_id: workspaceId,
          job_type: `send_${message.channel}_message`,
          entity_type: "message",
          entity_id: messageId,
          status: "pending",
          idempotency_key: idempotencyKey,
          scheduled_at: now,
          progress: { stage: "queued" },
          retryable: true,
          error_code: null,
          error_message: null,
        },
        { onConflict: "idempotency_key" },
      );
      if (jobError) throw new Error(jobError.message);
      await inngest.send({
        name:
          message.channel === "email"
            ? "orliqo/send-email-message.requested"
            : "orliqo/send-whatsapp-message.requested",
        data: {
          workspaceId,
          entityId: messageId,
          idempotencyKey,
          demo: false,
        },
      });
      await writeAuditLog({
        workspaceId,
        actorId: ctx.value.user.id,
        action: "message.dispatch_requested",
        entityType: "message",
        entityId: messageId,
        after: { channel: message.channel, idempotencyKey },
      });
      revalidatePath("/app/queue");
      revalidatePath(`/app/campaigns/${message.campaign_id}`);
      return { ok: true, message: "Provider dispatch queued safely." };
    } catch (error) {
      return actionError(
        error,
        "Provider dispatch could not be queued. Retry shortly.",
      );
    }
  }
  const store = demoPhase3Store();
  const message = [...store.messages.values()]
    .flat()
    .find((m) => m.id === messageId);
  if (!message) return { ok: false, message: "Message not found." };
  if (message.channel === "instagram" || message.channel === "linkedin")
    return {
      ok: false,
      message:
        "Instagram and LinkedIn require the manual open, copy, and mark-sent workflow.",
    };
  const campaign = [...store.campaigns.values()]
    .flat()
    .find((c) => c.id === message.campaignId);
  const lead = demoPhase2Store()
    .leads.get(campaign!.workspaceId)
    ?.find((l) => l.id === message.leadId);
  if (
    !campaign ||
    campaign.status !== "running" ||
    message.approvalStatus !== "approved"
  )
    return {
      ok: false,
      message: "Campaign and approval checks blocked dispatch.",
    };
  if (lead?.doNotContact) {
    message.sendStatus = "suppressed";
    return { ok: false, message: "Suppression blocked dispatch." };
  }
  if (message.channel === "whatsapp" && lead?.whatsappConsent !== "opted_in")
    return {
      ok: false,
      message: "WhatsApp consent is required before dispatch.",
    };
  if (
    store.claimed.has(message.idempotencyKey) ||
    message.sendStatus === "sent"
  )
    return {
      ok: true,
      message: "Duplicate dispatch ignored by idempotency key.",
    };
  store.claimed.add(message.idempotencyKey);
  message.sendStatus = "sent";
  message.attempts.push({
    number: message.attempts.length + 1,
    result: "simulated_no_send",
    at: new Date().toISOString(),
  });
  const usage = store.usage.get(campaign.workspaceId)!;
  usage.reserved = Math.max(0, usage.reserved - 1);
  usage.used += 1;
  logDemoCampaign(
    campaign.id,
    `${message.businessName}: deterministic no-send simulation completed`,
    "message.demo_sent",
  );
  revalidatePath("/app/queue");
  return {
    ok: true,
    message: "Demo dispatch completed. No network send occurred.",
  };
}
