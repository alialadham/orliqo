import { createHash } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import {
  normalizeResendWebhook,
  normalizeSesWebhook,
  verifyResendWebhook,
  verifySesSnsWebhook,
  type SnsNotification,
} from "@/features/integrations/email-webhooks";
import { persistInboundMessage } from "@/features/inbox/inbound";
import {
  normalizeResendInbound,
  normalizeSesInbound,
} from "@/features/inbox/provider-inbound";
import { getServerEnvironment } from "@/lib/env";
import { bodyWithinLimit } from "@/lib/security/csrf";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  if (!bodyWithinLimit(request, 1024 * 1024))
    return NextResponse.json(
      { error: "Webhook payload is too large." },
      { status: 413 },
    );
  const { provider } = await params;
  if (provider !== "resend" && provider !== "ses")
    return NextResponse.json(
      { error: "Unsupported email webhook provider." },
      { status: 404 },
    );
  const rawBody = await request.text();
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json(
      { error: "Webhook payload is not valid JSON." },
      { status: 400 },
    );
  }
  const environment = getServerEnvironment();
  const verified =
    provider === "resend"
      ? Boolean(
          environment.RESEND_WEBHOOK_SECRET &&
          verifyResendWebhook(
            rawBody,
            request.headers,
            environment.RESEND_WEBHOOK_SECRET,
          ),
        )
      : await verifySesSnsWebhook(payload as SnsNotification).catch(
          () => false,
        );
  if (!verified)
    return NextResponse.json(
      { error: "Invalid email webhook signature." },
      { status: 401 },
    );
  const inbound =
    provider === "resend"
      ? normalizeResendInbound(payload)
      : normalizeSesInbound(payload);
  if (inbound) {
    const admin = createAdminSupabaseClient();
    const elevated = admin as unknown as SupabaseClient;
    const { data: account } = await elevated
      .from("email_accounts")
      .select("workspace_id,integration_id")
      .eq("email_address", inbound.recipientAddress ?? "")
      .maybeSingle();
    if (!account) return NextResponse.json({ accepted: true, ignored: true });
    const { data: integration } = await elevated
      .from("integrations")
      .select("id,workspace_id,provider")
      .eq("id", account.integration_id)
      .eq("workspace_id", account.workspace_id)
      .eq("provider", provider)
      .eq("status", "connected")
      .maybeSingle();
    if (!integration)
      return NextResponse.json({ accepted: true, ignored: true });
    const payloadHash = createHash("sha256").update(rawBody).digest("hex");
    const { data: stored, error } = await admin
      .from("provider_webhook_events")
      .insert({
        provider,
        external_event_id: inbound.providerEventId,
        workspace_id: integration.workspace_id,
        integration_id: integration.id,
        signature_verified: true,
        payload_hash: payloadHash,
        processing_status: "processing",
        metadata: { event_type: "inbound_received" },
      })
      .select("id")
      .single();
    if (error?.code === "23505")
      return NextResponse.json({ accepted: true, duplicate: true });
    if (error || !stored)
      return NextResponse.json(
        { error: "Webhook event could not be stored." },
        { status: 503 },
      );
    try {
      const result = await persistInboundMessage({
        ...inbound,
        workspaceId: integration.workspace_id,
        integrationId: integration.id,
      });
      await admin
        .from("provider_webhook_events")
        .update({
          processing_status: result.duplicate ? "ignored" : "succeeded",
          processed_at: new Date().toISOString(),
        })
        .eq("id", stored.id);
      return NextResponse.json(
        { accepted: true, duplicate: result.duplicate },
        { status: result.duplicate ? 200 : 202 },
      );
    } catch {
      await admin
        .from("provider_webhook_events")
        .update({
          processing_status: "failed",
          processed_at: new Date().toISOString(),
          error_code: "INBOUND_PERSIST_FAILED",
        })
        .eq("id", stored.id);
      return NextResponse.json(
        { error: "Inbound email could not be persisted." },
        { status: 503 },
      );
    }
  }
  const normalized =
    provider === "resend"
      ? normalizeResendWebhook(payload)
      : normalizeSesWebhook(payload as SnsNotification);
  if (!normalized) return NextResponse.json({ accepted: true, ignored: true });
  const event =
    provider === "resend"
      ? {
          ...normalized,
          providerEventId:
            request.headers.get("svix-id") ?? normalized.providerEventId,
        }
      : normalized;
  const admin = createAdminSupabaseClient();
  const elevated = admin as unknown as SupabaseClient;
  const { data: message } = await elevated
    .from("messages")
    .select("id,workspace_id,campaign_id")
    .eq("provider_message_id", event.providerMessageId)
    .maybeSingle();
  if (!message) return NextResponse.json({ accepted: true, ignored: true });
  const { data: channel } = await elevated
    .from("campaign_channels")
    .select("integration_id")
    .eq("workspace_id", message.workspace_id)
    .eq("campaign_id", message.campaign_id)
    .eq("channel", "email")
    .not("integration_id", "is", null)
    .maybeSingle();
  if (!channel?.integration_id)
    return NextResponse.json({ accepted: true, ignored: true });
  const { data: integration } = await admin
    .from("integrations")
    .select("id,provider")
    .eq("id", channel.integration_id)
    .eq("workspace_id", message.workspace_id)
    .eq("provider", provider)
    .maybeSingle();
  if (!integration) return NextResponse.json({ accepted: true, ignored: true });
  const payloadHash = createHash("sha256").update(rawBody).digest("hex");
  const { data: stored, error } = await admin
    .from("provider_webhook_events")
    .insert({
      provider,
      external_event_id: event.providerEventId,
      workspace_id: message.workspace_id,
      integration_id: integration.id,
      signature_verified: true,
      payload_hash: payloadHash,
      processing_status: "processing",
      metadata: {
        event_type: event.type,
        provider_message_id: event.providerMessageId,
      },
    })
    .select("id")
    .single();
  if (error?.code === "23505")
    return NextResponse.json({ accepted: true, duplicate: true });
  if (error || !stored)
    return NextResponse.json(
      { error: "Webhook event could not be stored." },
      { status: 503 },
    );
  const { data: applied, error: applyError } = await elevated
    .schema("private")
    .rpc("apply_email_delivery_event", {
      target_message_id: message.id,
      target_integration_id: integration.id,
      provider_event_id: event.providerEventId,
      delivery_event: event.type,
      occurred_at: event.occurredAt,
      redacted_metadata: { source: provider },
    });
  await admin
    .from("provider_webhook_events")
    .update({
      processing_status: applyError
        ? "failed"
        : applied
          ? "succeeded"
          : "ignored",
      processed_at: new Date().toISOString(),
      error_code: applyError ? "EVENT_APPLY_FAILED" : null,
    })
    .eq("id", stored.id);
  return NextResponse.json(
    { accepted: true, applied: Boolean(applied) },
    { status: 202 },
  );
}
