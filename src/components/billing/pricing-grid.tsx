import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BILLING_PLANS,
  PLAN_CATALOG,
  planPrice,
} from "@/features/billing/plans";
import { createCheckoutAction } from "@/features/billing/actions";

export function PricingGrid({
  interval,
  annualDiscountPercent,
  app,
  canManage = false,
}: {
  interval: "month" | "year";
  annualDiscountPercent: number;
  app?: boolean;
  canManage?: boolean;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant={interval === "month" ? "default" : "outline"}>
          <Link
            href={
              app ? "/app/billing?interval=month" : "/pricing?interval=month"
            }
          >
            Monthly
          </Link>
        </Button>
        <Button asChild variant={interval === "year" ? "default" : "outline"}>
          <Link
            href={app ? "/app/billing?interval=year" : "/pricing?interval=year"}
          >
            Yearly
          </Link>
        </Button>
        {annualDiscountPercent > 0 ? (
          <Badge variant="secondary">
            {annualDiscountPercent}% configured annual discount
          </Badge>
        ) : (
          <Badge variant="outline">No annual discount configured</Badge>
        )}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {BILLING_PLANS.map((planId) => {
          const plan = PLAN_CATALOG[planId];
          const price = planPrice(planId, interval, annualDiscountPercent);
          return (
            <article key={plan.id} className="bg-card rounded-xl border p-5">
              <h2 className="text-xl font-bold">{plan.name}</h2>
              <p className="mt-3 text-3xl font-bold">
                ${price.totalUsd}
                <span className="text-muted-foreground text-sm font-medium">
                  /{interval}
                </span>
              </p>
              {interval === "year" ? (
                <p className="text-muted-foreground mt-1 text-xs">
                  ${price.monthlyEquivalentUsd}/month equivalent
                </p>
              ) : null}
              <ul className="mt-5 space-y-2 text-sm">
                <li>{plan.limits.monthlyLeads} leads/month</li>
                <li>{plan.limits.aiMessages} AI messages/month</li>
                <li>{plan.limits.campaigns} campaigns</li>
                <li>{plan.limits.inboxes} connected inboxes</li>
                <li>{plan.limits.members} workspace members</li>
                <li className="capitalize">{plan.research} research</li>
                <li className="capitalize">{plan.analytics} analytics</li>
                <li className="capitalize">{plan.support} support</li>
              </ul>
              {app && canManage ? (
                <form action={createCheckoutAction}>
                  <input type="hidden" name="plan" value={plan.id} />
                  <input type="hidden" name="interval" value={interval} />
                  <Button className="mt-5 w-full" type="submit">
                    Choose {plan.name}
                  </Button>
                </form>
              ) : (
                <Button className="mt-5 w-full" disabled={app}>
                  {app ? "Billing management unavailable" : "Sign in to choose"}
                </Button>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
