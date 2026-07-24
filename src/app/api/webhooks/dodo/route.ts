import { createHash } from "node:crypto";

import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { billingConfiguration } from "@/features/billing/config";
import {
  mapDodoPaymentEvent,
  mapDodoSubscriptionStatus,
  verifyDodoWebhook,
} from "@/features/billing/dodo-webhooks";
import { getServerEnvironment } from "@/lib/env";
import { bodyWithinLimit } from "@/lib/security/csrf";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const eventSchema = z.object({
  type: z.string().min(1),
  data: z
    .object({
      subscription_id: z.string().optional(),
      payment_id: z.string().optional(),
      product_id: z.string().optional(),
      status: z.string().optional(),
      cancel_at_next_billing_date: z.boolean().optional(),
      previous_billing_date: z.string().datetime().nullable().optional(),
      next_billing_date: z.string().datetime().nullable().optional(),
      trial_period_days: z.number().int().nonnegative().optional(),
      created_at: z.string().datetime().optional(),
      customer: z
        .object({ customer_id: z.string().optional() })
        .passthrough()
        .optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
      payment_frequency_interval: z.string().optional(),
    })
    .passthrough(),
});

export async function POST(request: Request) {
  if (!bodyWithinLimit(request, 1024 * 1024))
    return NextResponse.json(
      { error: "Webhook payload is too large." },
      { status: 413 },
    );
  const environment = getServerEnvironment();
  const configuration = billingConfiguration(environment);
  if (!configuration || configuration.mode !== "test")
    return NextResponse.json(
      { error: "Dodo Payments test configuration is incomplete." },
      { status: 503 },
    );

  const rawBody = await request.text();
  const webhookId = request.headers.get("webhook-id") ?? "";
  const verified = verifyDodoWebhook(
    rawBody,
    {
      id: webhookId,
      signature: request.headers.get("webhook-signature") ?? "",
      timestamp: request.headers.get("webhook-timestamp") ?? "",
    },
    configuration.webhookSecret,
  );
  if (!verified)
    return NextResponse.json(
      { error: "Invalid webhook signature." },
      { status: 401 },
    );

  const parsed = eventSchema.safeParse(
    (() => {
      try {
        return JSON.parse(rawBody) as unknown;
      } catch {
        return null;
      }
    })(),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: "Webhook payload is invalid." },
      { status: 400 },
    );

  if (environment.demoMode)
    return NextResponse.json(
      { accepted: true, duplicate: false, eventId: webhookId, simulated: true },
      { status: 202 },
    );

  const event = parsed.data;
  const privateApi = createAdminSupabaseClient() as unknown as SupabaseClient;
  const { data: accepted, error: acceptError } = await privateApi
    .schema("private")
    .rpc("accept_billing_event", {
      target_provider: "dodo",
      target_event_id: webhookId,
      target_type: event.type,
      target_mode: "test",
      target_payload_hash: createHash("sha256").update(rawBody).digest("hex"),
      target_metadata: {
        object_id: event.data.subscription_id ?? null,
        payload_bytes: Buffer.byteLength(rawBody),
      },
    });
  if (acceptError)
    return NextResponse.json(
      { error: "Billing event could not be persisted." },
      { status: 503 },
    );
  if (!accepted)
    return NextResponse.json({
      accepted: true,
      duplicate: true,
      eventId: webhookId,
    });

  const status = event.data.status
    ? mapDodoSubscriptionStatus(event.data.status)
    : null;
  const paymentStatus = mapDodoPaymentEvent(event.type);
  if (
    event.type.startsWith("payment.") &&
    event.data.subscription_id &&
    paymentStatus
  ) {
    const { data: reconciled, error } = await privateApi
      .schema("private")
      .rpc("reconcile_billing_payment", {
        target_event_id: webhookId,
        target_provider: "dodo",
        target_subscription_id: event.data.subscription_id,
        target_status: paymentStatus,
        target_grace_end:
          paymentStatus === "past_due"
            ? new Date(Date.now() + 7 * 86_400_000).toISOString()
            : null,
      });
    if (error || !reconciled)
      return NextResponse.json(
        { error: "Payment reconciliation failed.", eventId: webhookId },
        { status: 503 },
      );
    return NextResponse.json(
      { accepted: true, duplicate: false, eventId: webhookId },
      { status: 202 },
    );
  }
  const plan = event.data.product_id
    ? Object.entries(configuration.products).find(([, products]) =>
        Object.values(products).includes(event.data.product_id ?? ""),
      )?.[0]
    : null;
  if (
    !event.type.startsWith("subscription.") ||
    !event.data.subscription_id ||
    !event.data.product_id ||
    !status ||
    !plan
  ) {
    await privateApi
      .from("billing_events")
      .update({
        processing_status: "ignored",
        processed_at: new Date().toISOString(),
      })
      .eq("provider_event_id", webhookId);
    return NextResponse.json(
      { accepted: true, duplicate: false, eventId: webhookId, ignored: true },
      { status: 202 },
    );
  }

  const trialEnd =
    event.data.trial_period_days && event.data.created_at
      ? new Date(
          new Date(event.data.created_at).getTime() +
            event.data.trial_period_days * 86_400_000,
        ).toISOString()
      : null;
  const interval =
    event.data.payment_frequency_interval?.toLowerCase() === "year"
      ? "year"
      : "month";
  const { data: reconciled, error: reconcileError } = await privateApi
    .schema("private")
    .rpc("reconcile_billing_subscription", {
      target_event_id: webhookId,
      target_provider: "dodo",
      target_workspace_id: event.data.metadata?.workspace_id ?? null,
      target_customer_id: event.data.customer?.customer_id ?? null,
      target_subscription_id: event.data.subscription_id,
      target_product_id: event.data.product_id,
      target_plan: plan,
      target_status: status,
      target_interval: interval,
      target_period_start: event.data.previous_billing_date ?? null,
      target_period_end: event.data.next_billing_date ?? null,
      target_cancel_at_period_end:
        event.data.cancel_at_next_billing_date ?? false,
      target_trial_end: trialEnd,
      target_grace_end:
        status === "past_due"
          ? new Date(Date.now() + 7 * 86_400_000).toISOString()
          : null,
    });
  if (reconcileError || !reconciled)
    return NextResponse.json(
      { error: "Billing event reconciliation failed.", eventId: webhookId },
      { status: 503 },
    );
  return NextResponse.json(
    { accepted: true, duplicate: false, eventId: webhookId },
    { status: 202 },
  );
}
