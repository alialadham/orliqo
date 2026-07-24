import { createHash, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { getServerEnvironment } from "@/lib/env";
import { inngest } from "@/lib/inngest/client";
import { bodyWithinLimit } from "@/lib/security/csrf";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!bodyWithinLimit(request, 256 * 1024))
    return NextResponse.json(
      { error: "Webhook payload is too large." },
      { status: 413 },
    );
  const environment = getServerEnvironment();
  const suppliedToken =
    new URL(request.url).searchParams.get("token") ??
    request.headers.get("x-orliqo-webhook-token") ??
    "";
  if (
    !environment.GMAIL_PUBSUB_VERIFICATION_TOKEN ||
    !safeEqual(suppliedToken, environment.GMAIL_PUBSUB_VERIFICATION_TOKEN)
  )
    return NextResponse.json(
      { error: "Gmail Pub/Sub verification failed." },
      { status: 401 },
    );
  const rawBody = await request.text();
  const envelope = (() => {
    try {
      return JSON.parse(rawBody) as {
        message?: { messageId?: string; publishTime?: string; data?: string };
        subscription?: string;
      };
    } catch {
      return null;
    }
  })();
  if (!envelope?.message?.messageId || !envelope.message.data)
    return NextResponse.json(
      { error: "Gmail Pub/Sub envelope is invalid." },
      { status: 400 },
    );
  const signal = (() => {
    try {
      return JSON.parse(
        Buffer.from(envelope.message!.data!, "base64").toString("utf8"),
      ) as { emailAddress?: string; historyId?: string };
    } catch {
      return null;
    }
  })();
  if (!signal?.emailAddress || !signal.historyId)
    return NextResponse.json(
      { error: "Gmail history signal is invalid." },
      { status: 400 },
    );
  if (environment.demoMode)
    return NextResponse.json(
      { accepted: true, simulated: true },
      { status: 202 },
    );
  const admin = createAdminSupabaseClient();
  const { data: account } = await admin
    .from("email_accounts")
    .select("workspace_id,integration_id")
    .eq("email_address", signal.emailAddress)
    .maybeSingle();
  if (!account) return NextResponse.json({ accepted: true, ignored: true });
  const { data: integration } = await admin
    .from("integrations")
    .select("id,workspace_id")
    .eq("id", account.integration_id)
    .eq("workspace_id", account.workspace_id)
    .eq("provider", "gmail")
    .eq("status", "connected")
    .maybeSingle();
  if (!integration) return NextResponse.json({ accepted: true, ignored: true });
  const { data: stored, error } = await admin
    .from("provider_webhook_events")
    .insert({
      provider: "gmail",
      external_event_id: envelope.message.messageId,
      workspace_id: integration.workspace_id,
      integration_id: integration.id,
      signature_verified: true,
      payload_hash: createHash("sha256").update(rawBody).digest("hex"),
      processing_status: "processing",
      metadata: {
        history_id: signal.historyId,
        subscription: envelope.subscription ?? null,
      },
    })
    .select("id")
    .single();
  if (error?.code === "23505")
    return NextResponse.json({ accepted: true, duplicate: true });
  if (error || !stored)
    return NextResponse.json(
      { error: "Gmail webhook event could not be stored." },
      { status: 503 },
    );
  try {
    await inngest.send({
      name: "orliqo/sync-email-replies.requested",
      data: {
        workspaceId: integration.workspace_id,
        entityId: integration.id,
        idempotencyKey: `gmail-sync:${envelope.message.messageId}`,
        demo: false,
      },
    });
    return NextResponse.json({ accepted: true }, { status: 202 });
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
      { error: "Gmail reply sync could not be queued." },
      { status: 503 },
    );
  }
}
