import "server-only";

import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import {
  configuredEmailAdapter,
  configuredWhatsAppAdapter,
  integrationHealth,
} from "@/features/integrations/provider-runtime";
import { persistInboundMessage } from "@/features/inbox/inbound";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getServerEnvironment } from "@/lib/env";
import { inngest } from "../client";

const jobData = z.object({
  workspaceId: z.string().uuid(),
  entityId: z.string().uuid(),
  idempotencyKey: z.string().min(8).max(240),
  demo: z.boolean().default(false),
});
type JobData = z.infer<typeof jobData>;
const scheduledReplyData = jobData.extend({
  scheduledAt: z.iso.datetime(),
  channel: z.enum(["email", "whatsapp"]),
});

type MessageRow = {
  id: string;
  workspace_id: string;
  campaign_id: string | null;
  lead_id: string;
  channel: "email" | "whatsapp";
  subject: string | null;
  body: string;
  idempotency_key: string;
  provider_metadata: Record<string, unknown>;
  send_status: string;
};
type IntegrationRow = {
  id: string;
  workspace_id: string;
  provider: "gmail" | "outlook" | "smtp" | "resend" | "ses" | "whatsapp";
  configuration: Record<string, unknown>;
  status: string;
};

function admin(): SupabaseClient {
  return createAdminSupabaseClient() as unknown as SupabaseClient;
}

async function markJob(
  data: JobData,
  status: "succeeded" | "failed",
  progress: Record<string, unknown>,
  errorCode?: string,
) {
  await admin()
    .from("job_runs")
    .update({
      status,
      completed_at: new Date().toISOString(),
      progress,
      ...(errorCode ? { error_code: errorCode } : {}),
    })
    .eq("workspace_id", data.workspaceId)
    .eq("idempotency_key", data.idempotencyKey);
}

async function onFailure({
  event,
  error,
}: {
  event: { data: { event: { data: unknown } } };
  error: Error;
}) {
  const parsed = jobData.safeParse(event.data.event.data);
  if (
    !parsed.success ||
    parsed.data.demo ||
    !getServerEnvironment().SUPABASE_SERVICE_ROLE_KEY
  )
    return;
  const client = admin();
  const failedAt = new Date().toISOString();
  await Promise.all([
    client
      .from("job_runs")
      .update({
        status: "dead_lettered",
        retryable: false,
        dead_lettered_at: failedAt,
        error_code: "PHASE4_PROVIDER_JOB_FAILED",
        error_message: error.message.slice(0, 500),
      })
      .eq("workspace_id", parsed.data.workspaceId)
      .eq("idempotency_key", parsed.data.idempotencyKey),
    client
      .from("messages")
      .update({
        send_status: "failed",
        failure_code: "PROVIDER_RETRIES_EXHAUSTED",
        failure_message: error.message.slice(0, 500),
      })
      .eq("workspace_id", parsed.data.workspaceId)
      .eq("id", parsed.data.entityId)
      .eq("send_status", "sending"),
  ]);
}

async function messageAndIntegration(
  data: JobData,
  channel: "email" | "whatsapp",
) {
  const client = admin();
  const { data: message } = await client
    .from("messages")
    .select(
      "id,workspace_id,campaign_id,lead_id,channel,subject,body,idempotency_key,provider_metadata,send_status",
    )
    .eq("id", data.entityId)
    .eq("workspace_id", data.workspaceId)
    .eq("channel", channel)
    .maybeSingle();
  const typedMessage = message as MessageRow | null;
  if (!typedMessage) throw new Error("Provider message was not found.");
  const directIntegrationId =
    typeof typedMessage.provider_metadata.integration_id === "string"
      ? typedMessage.provider_metadata.integration_id
      : null;
  const { data: campaignChannel } = directIntegrationId
    ? { data: { integration_id: directIntegrationId } }
    : typedMessage.campaign_id
      ? await client
          .from("campaign_channels")
          .select("integration_id")
          .eq("campaign_id", typedMessage.campaign_id)
          .eq("workspace_id", data.workspaceId)
          .eq("channel", channel)
          .eq("enabled", true)
          .not("integration_id", "is", null)
          .maybeSingle()
      : { data: null };
  if (!campaignChannel?.integration_id)
    throw new Error("Campaign provider integration is not configured.");
  const { data: integration } = await client
    .from("integrations")
    .select("id,workspace_id,provider,configuration,status")
    .eq("id", campaignChannel.integration_id)
    .eq("workspace_id", data.workspaceId)
    .eq("status", "connected")
    .maybeSingle();
  if (!integration) throw new Error("Provider integration is not ready.");
  return {
    client,
    message: typedMessage,
    integration: integration as IntegrationRow,
  };
}

async function claim(
  client: SupabaseClient,
  data: JobData,
): Promise<MessageRow> {
  const { data: claimed, error } = await client
    .schema("private")
    .rpc("claim_due_message", {
      target_message_id: data.entityId,
      worker_key: data.idempotencyKey,
    });
  if (error || !claimed)
    throw new Error("Message could not be claimed atomically.");
  return claimed as MessageRow;
}

async function attemptNumber(
  client: SupabaseClient,
  messageId: string,
): Promise<number> {
  const { count } = await client
    .from("message_attempts")
    .select("id", { count: "exact", head: true })
    .eq("message_id", messageId);
  return (count ?? 0) + 1;
}

export const sendEmailMessageFunction = inngest.createFunction(
  {
    id: "phase4-send-email-message",
    triggers: [{ event: "orliqo/send-email-message.requested" }],
    retries: 4,
    concurrency: [{ limit: 4, key: "event.data.workspaceId" }],
    onFailure,
  },
  async ({ event, step }) => {
    const data = jobData.parse(event.data);
    if (data.demo)
      return {
        status: "simulated_no_send",
        idempotencyKey: data.idempotencyKey,
      };
    const environment = getServerEnvironment();
    if (
      environment.LIVE_DELIVERY_ENABLED !== "true" ||
      environment.EMAIL_DELIVERY_MODE !== "live"
    )
      throw new Error("Live email delivery is not enabled.");
    return step.run("claim-validate-and-send-email", async () => {
      const prepared = await messageAndIntegration(data, "email");
      const message = await claim(prepared.client, data);
      const [{ data: lead }, { data: account }] = await Promise.all([
        prepared.client
          .from("leads")
          .select("email,do_not_contact")
          .eq("id", message.lead_id)
          .eq("workspace_id", data.workspaceId)
          .maybeSingle(),
        prepared.client
          .from("email_accounts")
          .select(
            "email_address,sender_name,signature_html,daily_limit,sent_today,paused",
          )
          .eq("integration_id", prepared.integration.id)
          .eq("workspace_id", data.workspaceId)
          .maybeSingle(),
      ]);
      if (
        !lead?.email ||
        lead.do_not_contact ||
        !account ||
        account.paused ||
        account.sent_today >= account.daily_limit
      )
        throw new Error(
          "Recipient or email account failed the immediate pre-send gate.",
        );
      const adapter = await configuredEmailAdapter({
        id: prepared.integration.id,
        workspaceId: data.workspaceId,
        provider: prepared.integration.provider,
        configuration: prepared.integration.configuration,
      });
      if (!adapter) throw new Error("Configured email adapter is unavailable.");
      const number = await attemptNumber(prepared.client, message.id);
      const correlationId = randomUUID();
      await prepared.client.from("message_attempts").insert({
        workspace_id: data.workspaceId,
        message_id: message.id,
        attempt_number: number,
        correlation_id: correlationId,
      });
      const escaped = message.body
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("\n", "<br>");
      const result = await adapter.send({
        provider: adapter.provider,
        from: account.email_address,
        to: lead.email,
        subject: message.subject ?? "",
        text: message.body,
        html: `<p>${escaped}</p>`,
        signature: account.signature_html ?? account.sender_name,
        scheduledAt: null,
        followUpDays: null,
        threadId:
          typeof message.provider_metadata.thread_id === "string"
            ? message.provider_metadata.thread_id
            : null,
        idempotencyKey: message.idempotency_key,
        trackingEnabled: false,
        bcc: [],
      });
      if (!result.ok) {
        await Promise.all([
          prepared.client
            .from("message_attempts")
            .update({
              completed_at: new Date().toISOString(),
              result: result.error.retryable
                ? "retryable_failure"
                : "terminal_failure",
              error_code: result.error.code,
              error_message: result.error.message.slice(0, 500),
            })
            .eq("message_id", message.id)
            .eq("attempt_number", number),
          prepared.client
            .from("messages")
            .update({
              send_status: result.error.retryable ? "scheduled" : "failed",
              failure_code: result.error.code,
              failure_message: result.error.message.slice(0, 500),
            })
            .eq("id", message.id)
            .eq("workspace_id", data.workspaceId),
        ]);
        if (result.error.retryable) throw new Error(result.error.message);
        await markJob(
          data,
          "failed",
          { stage: "terminal_provider_failure" },
          result.error.code,
        );
        return { status: "failed", errorCode: result.error.code };
      }
      const completedAt = new Date().toISOString();
      await Promise.all([
        prepared.client
          .from("message_attempts")
          .update({
            completed_at: completedAt,
            result: "succeeded",
            response_metadata: {
              provider_message_id: result.providerMessageId,
            },
            provider_status_code: "accepted",
          })
          .eq("message_id", message.id)
          .eq("attempt_number", number),
        prepared.client
          .from("messages")
          .update({
            send_status: "sent",
            sent_at: completedAt,
            provider_message_id: result.providerMessageId,
            provider_thread_id: result.threadId,
            failure_code: null,
            failure_message: null,
          })
          .eq("id", message.id)
          .eq("workspace_id", data.workspaceId),
        prepared.client
          .from("email_accounts")
          .update({ sent_today: account.sent_today + 1 })
          .eq("integration_id", prepared.integration.id)
          .eq("sent_today", account.sent_today),
      ]);
      await markJob(data, "succeeded", {
        stage: "provider_accepted",
        provider: adapter.provider,
      });
      return {
        status: "succeeded",
        providerMessageId: result.providerMessageId,
      };
    });
  },
);

export const sendWhatsAppMessageFunction = inngest.createFunction(
  {
    id: "phase4-send-whatsapp-message",
    triggers: [{ event: "orliqo/send-whatsapp-message.requested" }],
    retries: 4,
    concurrency: [{ limit: 4, key: "event.data.workspaceId" }],
    onFailure,
  },
  async ({ event, step }) => {
    const data = jobData.parse(event.data);
    if (data.demo)
      return {
        status: "simulated_no_send",
        idempotencyKey: data.idempotencyKey,
      };
    const environment = getServerEnvironment();
    if (
      environment.LIVE_DELIVERY_ENABLED !== "true" ||
      environment.WHATSAPP_DELIVERY_MODE !== "live"
    )
      throw new Error("Live WhatsApp delivery is not enabled.");
    return step.run("claim-validate-and-send-whatsapp", async () => {
      const prepared = await messageAndIntegration(data, "whatsapp");
      const message = await claim(prepared.client, data);
      const templateName =
        typeof message.provider_metadata.template_name === "string"
          ? message.provider_metadata.template_name
          : null;
      let templateQuery = prepared.client
        .from("whatsapp_templates")
        .select("name,status,components")
        .eq("integration_id", prepared.integration.id)
        .eq("workspace_id", data.workspaceId)
        .eq("status", "approved");
      if (templateName) templateQuery = templateQuery.eq("name", templateName);
      const [{ data: lead }, { data: template }] = await Promise.all([
        prepared.client
          .from("leads")
          .select("phone,whatsapp_consent_status,do_not_contact")
          .eq("id", message.lead_id)
          .eq("workspace_id", data.workspaceId)
          .maybeSingle(),
        templateQuery.limit(1).maybeSingle(),
      ]);
      if (
        !lead?.phone ||
        lead.do_not_contact ||
        lead.whatsapp_consent_status !== "opted_in"
      )
        throw new Error("WhatsApp consent or recipient validation failed.");
      const adapter = await configuredWhatsAppAdapter({
        id: prepared.integration.id,
        workspaceId: data.workspaceId,
        provider: prepared.integration.provider,
        configuration: prepared.integration.configuration,
      });
      if (!adapter)
        throw new Error("Official WhatsApp Cloud API adapter is unavailable.");
      const sessionOpen = message.provider_metadata.session_open === true;
      if (!sessionOpen && !template)
        throw new Error("An approved WhatsApp template is required.");
      const number = await attemptNumber(prepared.client, message.id);
      await prepared.client.from("message_attempts").insert({
        workspace_id: data.workspaceId,
        message_id: message.id,
        attempt_number: number,
        correlation_id: randomUUID(),
      });
      const templateText = JSON.stringify(template?.components ?? []);
      const requiredVariables = [
        ...new Set(
          [...templateText.matchAll(/{{\s*(\d+)\s*}}/g)]
            .map((match) => match[1])
            .filter((value): value is string => Boolean(value)),
        ),
      ];
      const variables =
        message.provider_metadata.template_variables &&
        typeof message.provider_metadata.template_variables === "object" &&
        !Array.isArray(message.provider_metadata.template_variables)
          ? Object.fromEntries(
              Object.entries(
                message.provider_metadata.template_variables,
              ).filter(
                (entry): entry is [string, string] =>
                  typeof entry[1] === "string",
              ),
            )
          : {};
      const result = await adapter.send({
        to: lead.phone,
        body: message.body,
        consent: "granted",
        doNotContact: false,
        sessionOpen,
        templateName: template?.name ?? null,
        templateStatus: template ? "approved" : null,
        variables,
        requiredVariables,
        idempotencyKey: message.idempotency_key,
      });
      const completedAt = new Date().toISOString();
      if (!result.ok || !result.providerMessageId) {
        await Promise.all([
          prepared.client
            .from("message_attempts")
            .update({
              completed_at: completedAt,
              result: "retryable_failure",
              error_code: "WHATSAPP_PROVIDER_FAILED",
              error_message: result.error?.slice(0, 500),
            })
            .eq("message_id", message.id)
            .eq("attempt_number", number),
          prepared.client
            .from("messages")
            .update({
              send_status: "scheduled",
              failure_code: "WHATSAPP_PROVIDER_FAILED",
              failure_message: result.error?.slice(0, 500),
            })
            .eq("id", message.id)
            .eq("workspace_id", data.workspaceId),
        ]);
        throw new Error(result.error ?? "WhatsApp Cloud API delivery failed.");
      }
      await Promise.all([
        prepared.client
          .from("message_attempts")
          .update({
            completed_at: completedAt,
            result: "succeeded",
            response_metadata: {
              provider_message_id: result.providerMessageId,
            },
            provider_status_code: "accepted",
          })
          .eq("message_id", message.id)
          .eq("attempt_number", number),
        prepared.client
          .from("messages")
          .update({
            send_status: "sent",
            sent_at: completedAt,
            provider_message_id: result.providerMessageId,
            failure_code: null,
            failure_message: null,
          })
          .eq("id", message.id)
          .eq("workspace_id", data.workspaceId),
      ]);
      await markJob(data, "succeeded", {
        stage: "provider_accepted",
        provider: "whatsapp",
      });
      return {
        status: "succeeded",
        providerMessageId: result.providerMessageId,
      };
    });
  },
);

function maintenanceFunction(
  id: string,
  eventName: string,
  operation: "sync" | "refresh" | "health",
) {
  return inngest.createFunction(
    {
      id,
      triggers: [{ event: eventName }],
      retries: 4,
      concurrency: [{ limit: 2, key: "event.data.workspaceId" }],
      onFailure,
    },
    async ({ event, step }) => {
      const data = jobData.parse(event.data);
      if (data.demo)
        return { status: "simulated", idempotencyKey: data.idempotencyKey };
      return step.run(operation, async () => {
        const client = admin();
        const { data: row } = await client
          .from("integrations")
          .select("id,workspace_id,provider,configuration,status")
          .eq("id", data.entityId)
          .eq("workspace_id", data.workspaceId)
          .maybeSingle();
        if (!row) throw new Error("Integration was not found.");
        const integration = {
          id: row.id as string,
          workspaceId: row.workspace_id as string,
          provider: row.provider,
          configuration: row.configuration as Record<string, unknown>,
        };
        if (operation === "health") {
          const result = await integrationHealth(integration);
          await client
            .from("integrations")
            .update({
              status: result.ok ? "connected" : "error",
              last_synced_at: result.checkedAt,
              last_error_code: result.errorCode ?? null,
            })
            .eq("id", row.id);
          return result;
        }
        const adapter = await configuredEmailAdapter(integration);
        if (!adapter)
          throw new Error("Email integration adapter is unavailable.");
        if (operation === "refresh") return adapter.refresh();
        const { data: syncState } = await client
          .from("provider_sync_states")
          .select("cursor_metadata")
          .eq("workspace_id", data.workspaceId)
          .eq("integration_id", data.entityId)
          .eq("sync_type", "email_replies")
          .maybeSingle();
        const cursorMetadata = syncState?.cursor_metadata as
          Record<string, unknown> | undefined;
        const cursor =
          typeof cursorMetadata?.cursor === "string"
            ? cursorMetadata.cursor
            : undefined;
        const result = await adapter.sync(cursor);
        if (
          result.ok &&
          (row.provider === "gmail" || row.provider === "outlook")
        )
          for (const message of result.messages ?? [])
            await persistInboundMessage({
              workspaceId: data.workspaceId,
              integrationId: data.entityId,
              provider: row.provider,
              providerEventId: `sync:${row.provider}:${message.providerMessageId}`,
              providerMessageId: message.providerMessageId,
              providerThreadId: message.providerThreadId,
              channel: "email",
              senderAddress: message.senderAddress,
              senderName: message.senderName,
              recipientAddress: message.recipientAddress,
              subject: message.subject,
              body: message.body,
              occurredAt: message.occurredAt,
              metadata: { source: `${row.provider}_sync` },
            });
        if (result.ok)
          await client.from("provider_sync_states").upsert(
            {
              workspace_id: data.workspaceId,
              integration_id: data.entityId,
              sync_type: "email_replies",
              cursor_metadata: { cursor: result.cursor },
              last_attempt_at: new Date().toISOString(),
              last_success_at: new Date().toISOString(),
              lag_seconds: 0,
            },
            { onConflict: "integration_id,sync_type" },
          );
        await client
          .from("provider_webhook_events")
          .update({
            processing_status: result.ok ? "succeeded" : "failed",
            processed_at: new Date().toISOString(),
            error_code: result.ok ? null : "EMAIL_SYNC_FAILED",
          })
          .eq("workspace_id", data.workspaceId)
          .eq("integration_id", data.entityId)
          .eq("processing_status", "processing");
        return result;
      });
    },
  );
}

export const syncEmailRepliesFunction = maintenanceFunction(
  "phase4-sync-email-replies",
  "orliqo/sync-email-replies.requested",
  "sync",
);
export const refreshProviderTokensFunction = maintenanceFunction(
  "phase4-refresh-provider-tokens",
  "orliqo/refresh-provider-tokens.requested",
  "refresh",
);
export const reconcileProviderStatusesFunction = maintenanceFunction(
  "phase4-reconcile-provider-statuses",
  "orliqo/reconcile-provider-statuses.requested",
  "health",
);

export const processWhatsAppWebhookFunction = inngest.createFunction(
  {
    id: "phase4-process-whatsapp-webhook",
    triggers: [{ event: "orliqo/process-whatsapp-webhook.requested" }],
    retries: 4,
    concurrency: [{ limit: 2, key: "event.data.workspaceId" }],
    onFailure,
  },
  async ({ event }) => {
    const data = jobData.parse(event.data);
    if (data.demo) return { status: "simulated" };
    const client = admin();
    const { data: webhook } = await client
      .from("provider_webhook_events")
      .select("id,signature_verified,processing_status")
      .eq("id", data.entityId)
      .eq("workspace_id", data.workspaceId)
      .maybeSingle();
    if (!webhook?.signature_verified)
      throw new Error("Unsigned WhatsApp webhook cannot be processed.");
    return { status: webhook.processing_status };
  },
);

export const scheduleInboxReplyFunction = inngest.createFunction(
  {
    id: "phase5-schedule-inbox-reply",
    triggers: [{ event: "orliqo/send-inbox-reply.scheduled" }],
    retries: 4,
    concurrency: [{ limit: 4, key: "event.data.workspaceId" }],
    onFailure,
  },
  async ({ event, step }) => {
    const data = scheduledReplyData.parse(event.data);
    if (data.demo) return { status: "simulated_no_send" };
    await step.sleepUntil("wait-for-approved-send-time", data.scheduledAt);
    await step.sendEvent("dispatch-provider-send", {
      name:
        data.channel === "email"
          ? "orliqo/send-email-message.requested"
          : "orliqo/send-whatsapp-message.requested",
      data: {
        workspaceId: data.workspaceId,
        entityId: data.entityId,
        idempotencyKey: data.idempotencyKey,
        demo: false,
      },
    });
    return { status: "dispatched" };
  },
);

export const phase4Functions = [
  sendEmailMessageFunction,
  sendWhatsAppMessageFunction,
  syncEmailRepliesFunction,
  processWhatsAppWebhookFunction,
  refreshProviderTokensFunction,
  reconcileProviderStatusesFunction,
  scheduleInboxReplyFunction,
];
