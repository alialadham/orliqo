import { createHash } from "node:crypto";

import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { recordWebhookEvent } from "@/features/demo/phase4-store";
import {
  projectWhatsAppWebhook,
  verifyWhatsAppSignature,
  whatsappWebhookEventId,
} from "@/features/integrations/whatsapp";
import { getServerEnvironment } from "@/lib/env";
import { bodyWithinLimit } from "@/lib/security/csrf";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { persistInboundMessage } from "@/features/inbox/inbound";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const environment = getServerEnvironment();
  const query = new URL(request.url).searchParams;
  const mode = query.get("hub.mode");
  const token = query.get("hub.verify_token");
  const challenge = query.get("hub.challenge");
  if (!environment.WHATSAPP_WEBHOOK_VERIFY_TOKEN)
    return NextResponse.json(
      { error: "WhatsApp webhook verification is not configured." },
      { status: 503 },
    );
  if (
    mode !== "subscribe" ||
    token !== environment.WHATSAPP_WEBHOOK_VERIFY_TOKEN ||
    !challenge
  )
    return NextResponse.json(
      { error: "Webhook challenge rejected." },
      { status: 403 },
    );
  return new Response(challenge, {
    status: 200,
    headers: { "content-type": "text/plain" },
  });
}

export async function POST(request: Request) {
  if (!bodyWithinLimit(request, 2 * 1024 * 1024))
    return NextResponse.json(
      { error: "Webhook payload is too large." },
      { status: 413 },
    );
  const environment = getServerEnvironment();
  if (!environment.META_APP_SECRET)
    return NextResponse.json(
      { error: "WhatsApp webhook signatures are not configured." },
      { status: 503 },
    );
  const rawBody = await request.text();
  const verified = verifyWhatsAppSignature(
    rawBody,
    request.headers.get("x-hub-signature-256"),
    environment.META_APP_SECRET,
  );
  if (!verified)
    return NextResponse.json(
      { error: "Invalid webhook signature." },
      { status: 401 },
    );
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json(
      { error: "Webhook payload is not valid JSON." },
      { status: 400 },
    );
  }
  const eventId =
    whatsappWebhookEventId(payload) ??
    `payload-${createHash("sha256").update(rawBody).digest("hex")}`;
  const projection = projectWhatsAppWebhook(payload);
  if (environment.demoMode) {
    const result = recordWebhookEvent(eventId, true);
    return NextResponse.json(
      { accepted: true, duplicate: result === "duplicate", eventId },
      { status: result === "duplicate" ? 200 : 202 },
    );
  }
  const payloadHash = createHash("sha256").update(rawBody).digest("hex");
  const admin = createAdminSupabaseClient();
  const { data: stored, error } = await admin
    .from("provider_webhook_events")
    .insert({
      provider: "whatsapp",
      external_event_id: eventId,
      signature_verified: true,
      payload_hash: payloadHash,
      processing_status: "processing",
      metadata: {
        source: "meta_cloud_api",
        payload_bytes: Buffer.byteLength(rawBody),
        kind: projection.kind,
        ...(projection.inbound ? { inbound: projection.inbound } : {}),
      },
    })
    .select("id")
    .single();
  if (error?.code === "23505")
    return NextResponse.json({ accepted: true, duplicate: true, eventId });
  if (error)
    return NextResponse.json(
      { error: "Webhook event could not be stored." },
      { status: 503 },
    );
  if (projection.phoneNumberId || projection.businessAccountId) {
    let integrationQuery = admin
      .from("integrations")
      .select("id,workspace_id,configuration")
      .eq("provider", "whatsapp");
    integrationQuery = projection.phoneNumberId
      ? integrationQuery.contains("configuration", {
          phoneNumberId: projection.phoneNumberId,
        })
      : integrationQuery.contains("configuration", {
          wabaId: projection.businessAccountId,
        });
    const { data: integration } = await integrationQuery.maybeSingle();
    if (integration) {
      const privateApi = admin as unknown as SupabaseClient;
      for (const status of projection.statuses) {
        await privateApi.schema("private").rpc("apply_whatsapp_status_event", {
          target_integration_id: integration.id,
          target_provider_message_id: status.providerMessageId,
          provider_event_id: status.providerEventId,
          delivery_status: status.status,
          occurred_at: status.occurredAt,
          redacted_metadata: { source: "meta_cloud_api" },
        });
      }
      if (projection.inbound) {
        await persistInboundMessage({
          workspaceId: integration.workspace_id,
          integrationId: integration.id,
          provider: "whatsapp",
          providerEventId: eventId,
          providerMessageId: projection.inbound.id,
          providerThreadId: projection.inbound.from,
          channel: "whatsapp",
          senderAddress: projection.inbound.from,
          body: projection.inbound.body,
          occurredAt: projection.inbound.occurredAt,
          metadata: {
            source: "meta_cloud_api",
            type: projection.inbound.type,
            hasMedia: Boolean(projection.inbound.mediaId),
          },
        });
      }
      if (projection.templateUpdate)
        await admin
          .from("whatsapp_templates")
          .update({
            status: projection.templateUpdate.status,
            rejection_reason: projection.templateUpdate.rejectionReason,
            last_synced_at: new Date().toISOString(),
          })
          .eq("integration_id", integration.id)
          .eq("provider_template_id", projection.templateUpdate.id)
          .eq("workspace_id", integration.workspace_id);
      if (Object.keys(projection.accountUpdate).length) {
        const current =
          integration.configuration &&
          typeof integration.configuration === "object" &&
          !Array.isArray(integration.configuration)
            ? integration.configuration
            : {};
        await admin
          .from("integrations")
          .update({
            configuration: { ...current, ...projection.accountUpdate },
            last_synced_at: new Date().toISOString(),
          })
          .eq("id", integration.id)
          .eq("workspace_id", integration.workspace_id);
      }
      await admin
        .from("provider_webhook_events")
        .update({
          workspace_id: integration.workspace_id,
          integration_id: integration.id,
          processing_status: "succeeded",
          processed_at: new Date().toISOString(),
        })
        .eq("id", stored.id);
    } else
      await admin
        .from("provider_webhook_events")
        .update({
          processing_status: "ignored",
          processed_at: new Date().toISOString(),
          error_code: "INTEGRATION_NOT_FOUND",
        })
        .eq("id", stored.id);
  } else
    await admin
      .from("provider_webhook_events")
      .update({
        processing_status: "succeeded",
        processed_at: new Date().toISOString(),
      })
      .eq("id", stored.id);
  return NextResponse.json(
    { accepted: true, duplicate: false, eventId },
    { status: 202 },
  );
}
