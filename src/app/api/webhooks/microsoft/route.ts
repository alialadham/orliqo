import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { persistInboundMessage } from "@/features/inbox/inbound";
import { normalizeGraphInbound } from "@/features/inbox/provider-inbound";
import { getServerEnvironment } from "@/lib/env";
import { bodyWithinLimit } from "@/lib/security/csrf";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { inngest } from "@/lib/inngest/client";

export async function POST(request: Request) {
  if (!bodyWithinLimit(request, 1024 * 1024))
    return NextResponse.json(
      { error: "Webhook payload is too large." },
      { status: 413 },
    );
  const environment = getServerEnvironment();
  const validationToken = new URL(request.url).searchParams.get(
    "validationToken",
  );
  if (validationToken)
    return new Response(validationToken, {
      status: 200,
      headers: { "content-type": "text/plain" },
    });
  if (!environment.MICROSOFT_WEBHOOK_CLIENT_STATE_SECRET)
    return NextResponse.json(
      { error: "Microsoft webhook validation is not configured." },
      { status: 503 },
    );
  const rawBody = await request.text();
  const payload = (() => {
    try {
      return JSON.parse(rawBody) as {
        value?: Array<{
          clientState?: string;
          subscriptionId?: string;
          changeType?: string;
          resource?: string;
          resourceData?: unknown;
        }>;
      };
    } catch {
      return null;
    }
  })();
  const notifications = payload?.value ?? [];
  if (
    !notifications.length ||
    notifications.some(
      (item) =>
        item.clientState !== environment.MICROSOFT_WEBHOOK_CLIENT_STATE_SECRET,
    )
  )
    return NextResponse.json(
      { error: "Microsoft webhook client state rejected." },
      { status: 401 },
    );
  if (environment.demoMode)
    return NextResponse.json(
      { accepted: notifications.length, simulated: true },
      { status: 202 },
    );
  const admin = createAdminSupabaseClient();
  const payloadHash = createHash("sha256").update(rawBody).digest("hex");
  let accepted = 0;
  let duplicates = 0;
  for (const notification of notifications) {
    if (!notification.subscriptionId) continue;
    const { data: integration } = await admin
      .from("integrations")
      .select("id,workspace_id")
      .eq("provider", "outlook")
      .eq("status", "connected")
      .contains("configuration", {
        graphSubscriptionId: notification.subscriptionId,
      })
      .maybeSingle();
    if (!integration) continue;
    const inbound = normalizeGraphInbound(notification);
    const externalEventId =
      inbound?.providerEventId ??
      `${notification.subscriptionId}:${notification.changeType ?? "updated"}:${createHash(
        "sha256",
      )
        .update(String(notification.resource ?? ""))
        .digest("hex")}`;
    const { data: stored, error } = await admin
      .from("provider_webhook_events")
      .insert({
        provider: "outlook",
        external_event_id: externalEventId,
        workspace_id: integration.workspace_id,
        integration_id: integration.id,
        signature_verified: true,
        payload_hash: payloadHash,
        processing_status: inbound ? "processing" : "ignored",
        metadata: {
          change_type: notification.changeType ?? null,
          resource: notification.resource ?? null,
          has_resource_data: Boolean(notification.resourceData),
        },
      })
      .select("id")
      .single();
    if (error?.code === "23505") {
      duplicates += 1;
      continue;
    }
    if (error || !stored)
      return NextResponse.json(
        { error: "Microsoft webhook event could not be stored." },
        { status: 503 },
      );
    if (inbound) {
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
          { error: "Microsoft inbound message could not be persisted." },
          { status: 503 },
        );
      }
    } else {
      if (String(notification.resource ?? "").includes("/messages")) {
        try {
          await inngest.send({
            name: "orliqo/sync-email-replies.requested",
            data: {
              workspaceId: integration.workspace_id,
              entityId: integration.id,
              idempotencyKey: `graph-sync:${externalEventId}`,
              demo: false,
            },
          });
          await admin
            .from("provider_webhook_events")
            .update({ processing_status: "processing" })
            .eq("id", stored.id);
        } catch {
          await admin
            .from("provider_webhook_events")
            .update({
              processing_status: "failed",
              processed_at: new Date().toISOString(),
              error_code: "SYNC_ENQUEUE_FAILED",
            })
            .eq("id", stored.id);
          return NextResponse.json(
            { error: "Microsoft reply sync could not be queued." },
            { status: 503 },
          );
        }
      } else
        await admin
          .from("provider_webhook_events")
          .update({ processed_at: new Date().toISOString() })
          .eq("id", stored.id);
    }
    accepted += 1;
  }
  return NextResponse.json({ accepted, duplicates }, { status: 202 });
}
