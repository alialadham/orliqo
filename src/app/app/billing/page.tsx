import { PricingGrid } from "@/components/billing/pricing-grid";
import { StatePanel } from "@/components/feedback/state-panel";
import { Badge } from "@/components/ui/badge";
import { hasPermission } from "@/features/permissions/permissions";
import { getWorkspaceContext } from "@/features/workspaces/data";
import { getServerEnvironment } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  cancelSubscriptionAction,
  openBillingPortalAction,
} from "@/features/billing/actions";
import { Button } from "@/components/ui/button";
import { demoPhase3Store } from "@/features/demo/phase3-store";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ interval?: string }>;
}) {
  const context = await getWorkspaceContext();
  if (!context) return null;
  if (!hasPermission(context.activeWorkspace.role, "billing:view"))
    return (
      <StatePanel
        variant="permission"
        title="Permission required"
        description="Your viewer role cannot access billing in this workspace."
        action={{ label: "Go to dashboard", href: "/app/dashboard" }}
      />
    );
  const query = await searchParams;
  const interval = query.interval === "year" ? "year" : "month";
  const environment = getServerEnvironment();
  const billingState = context.isDemo
    ? (() => {
        const demoUsage = demoPhase3Store().usage.get(
          context.activeWorkspace.id,
        );
        return {
          subscription: {
            status: "active",
            current_period_end: null,
            cancel_at_period_end: false,
          },
          usage: demoUsage
            ? [
                {
                  metric: "ai_messages",
                  used: demoUsage.used,
                  reserved: demoUsage.reserved,
                  limit_value: demoUsage.limit,
                },
              ]
            : [],
        };
      })()
    : await (async () => {
        const supabase = await createServerSupabaseClient();
        const [subscription, usage] = await Promise.all([
          supabase
            .from("subscriptions")
            .select(
              "status,current_period_end,cancel_at_period_end,grace_ends_at",
            )
            .eq("workspace_id", context.activeWorkspace.id)
            .maybeSingle(),
          supabase
            .from("usage_counters")
            .select("metric,used,reserved,limit_value,period_end")
            .eq("workspace_id", context.activeWorkspace.id)
            .gte("period_end", new Date().toISOString()),
        ]);
        return {
          subscription: subscription.data,
          usage: usage.data ?? [],
        };
      })();
  const paymentRestricted = ["past_due", "unpaid", "restricted"].includes(
    billingState.subscription?.status ?? "",
  );
  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div>
        <div className="mb-2 flex flex-wrap gap-2">
          <Badge variant="secondary">
            Current plan: {context.activeWorkspace.plan}
          </Badge>
          <Badge variant="outline">
            Dodo Payments {environment.BILLING_PROVIDER_MODE} mode
          </Badge>
        </div>
        <h1 className="text-3xl font-bold">Billing and plans</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
          Review authoritative limits and configured annual pricing. Purchases
          and account management use the configured Dodo Payments environment.
        </p>
      </div>
      {paymentRestricted ? (
        <StatePanel
          variant="plan"
          title="Billing action required"
          description="The subscription has a payment issue. Use the Dodo Payments portal to update the payment method before the grace period ends."
        />
      ) : null}
      {billingState.usage.length ? (
        <section className="bg-card rounded-xl border p-5">
          <h2 className="text-lg font-bold">Current usage</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {billingState.usage.map((item) => {
              const consumed = item.used + item.reserved;
              const percentage = item.limit_value
                ? Math.min(100, (consumed / item.limit_value) * 100)
                : 0;
              return (
                <div key={item.metric}>
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="font-medium capitalize">
                      {item.metric.replaceAll("_", " ")}
                    </span>
                    <span className="text-muted-foreground">
                      {consumed}/{item.limit_value ?? "Unlimited"}
                    </span>
                  </div>
                  <div className="bg-muted mt-2 h-2 overflow-hidden rounded-full">
                    <div
                      className={
                        percentage >= 80
                          ? "h-full bg-amber-500"
                          : "bg-primary h-full"
                      }
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  {percentage >= 80 ? (
                    <p className="mt-1 text-xs text-amber-700">
                      More than 80% of this allowance is reserved or used.
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
      <PricingGrid
        interval={interval}
        annualDiscountPercent={environment.ANNUAL_DISCOUNT_PERCENT}
        app
        canManage={hasPermission(
          context.activeWorkspace.role,
          "billing:manage",
        )}
      />
      {hasPermission(context.activeWorkspace.role, "billing:manage") ? (
        <section className="bg-card rounded-xl border p-5">
          <h2 className="text-lg font-bold">Manage billing</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Open the hosted billing portal or schedule cancellation at the end
            of the current billing period.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <form action={openBillingPortalAction}>
              <Button type="submit" variant="outline">
                Open billing portal
              </Button>
            </form>
            <form action={cancelSubscriptionAction}>
              <Button type="submit" variant="destructive">
                Cancel at period end
              </Button>
            </form>
          </div>
        </section>
      ) : null}
    </div>
  );
}
