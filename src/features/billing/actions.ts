"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { readDemoSession } from "@/features/auth/demo-session";
import { requirePermission } from "@/features/permissions/server";
import { getServerEnvironment } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { billingConfiguration } from "./config";
import { createDodoAdapter } from "./dodo-adapter";
import { BILLING_PLANS } from "./plans";

const checkoutSchema = z.object({
  plan: z.enum(BILLING_PLANS),
  interval: z.enum(["month", "year"]),
});

async function billingContext() {
  const context = await requirePermission("billing:manage");
  if (!context) return null;
  const environment = getServerEnvironment();
  const configuration = billingConfiguration(environment);
  if (!configuration || configuration.mode !== "test") return null;
  return {
    context,
    environment,
    adapter: createDodoAdapter(configuration),
  };
}

export async function createCheckoutAction(formData: FormData): Promise<void> {
  const action = await billingContext();
  const input = checkoutSchema.safeParse({
    plan: formData.get("plan"),
    interval: formData.get("interval"),
  });
  if (!action || !input.success) redirect("/app/billing?error=unavailable");
  const demo = await readDemoSession();
  if (demo) redirect("/app/billing?notice=demo-no-provider-call");

  const result = await action.adapter.createCheckout({
    workspaceId: action.context.activeWorkspace.id,
    customerEmail: action.context.user.email,
    customerName: action.context.user.fullName,
    plan: input.data.plan,
    interval: input.data.interval,
    returnUrl: `${action.environment.APP_URL}/app/billing?checkout=returned`,
    idempotencyKey: [
      "checkout",
      action.context.activeWorkspace.id,
      input.data.plan,
      input.data.interval,
    ].join(":"),
  });
  if (!result.ok) redirect("/app/billing?error=checkout");
  redirect(result.data.url);
}

async function ownedSubscription() {
  const action = await billingContext();
  if (!action) return null;
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("subscriptions")
    .select(
      "id,workspace_id,billing_provider,provider_customer_id,provider_subscription_id",
    )
    .eq("workspace_id", action.context.activeWorkspace.id)
    .eq("billing_provider", "dodo")
    .maybeSingle();
  return data ? { ...action, subscription: data } : null;
}

export async function openBillingPortalAction(): Promise<void> {
  const action = await ownedSubscription();
  if (!action?.subscription.provider_customer_id)
    redirect("/app/billing?error=no-customer");
  const result = await action.adapter.createPortal({
    customerId: action.subscription.provider_customer_id,
    returnUrl: `${action.environment.APP_URL}/app/billing`,
    idempotencyKey: `portal:${action.context.activeWorkspace.id}`,
  });
  if (!result.ok) redirect("/app/billing?error=portal");
  redirect(result.data.url);
}

export async function cancelSubscriptionAction(): Promise<void> {
  const action = await ownedSubscription();
  if (!action?.subscription.provider_subscription_id)
    redirect("/app/billing?error=no-subscription");
  const result = await action.adapter.cancelSubscription(
    action.subscription.provider_subscription_id,
    `cancel:${action.context.activeWorkspace.id}:${action.subscription.provider_subscription_id}`,
  );
  if (!result.ok) redirect("/app/billing?error=cancel");
  redirect("/app/billing?notice=cancellation-scheduled");
}
