export const BILLING_PLANS = ["starter", "growth", "agency"] as const;
export type BillingPlan = (typeof BILLING_PLANS)[number];

export type PlanDefinition = {
  id: BillingPlan;
  name: string;
  monthlyPriceUsd: number;
  limits: {
    monthlyLeads: number;
    aiMessages: number;
    campaigns: number | "unlimited";
    inboxes: number;
    members: number;
  };
  research: "basic" | "advanced";
  analytics: "basic" | "full";
  support: "email" | "priority" | "dedicated";
};

export const PLAN_CATALOG: Record<BillingPlan, PlanDefinition> = {
  starter: {
    id: "starter",
    name: "Starter",
    monthlyPriceUsd: 39,
    limits: {
      monthlyLeads: 100,
      aiMessages: 200,
      campaigns: 3,
      inboxes: 1,
      members: 1,
    },
    research: "basic",
    analytics: "basic",
    support: "email",
  },
  growth: {
    id: "growth",
    name: "Growth",
    monthlyPriceUsd: 119,
    limits: {
      monthlyLeads: 500,
      aiMessages: 1000,
      campaigns: "unlimited",
      inboxes: 3,
      members: 5,
    },
    research: "advanced",
    analytics: "full",
    support: "priority",
  },
  agency: {
    id: "agency",
    name: "Agency",
    monthlyPriceUsd: 349,
    limits: {
      monthlyLeads: 2000,
      aiMessages: 5000,
      campaigns: "unlimited",
      inboxes: 10,
      members: 20,
    },
    research: "advanced",
    analytics: "full",
    support: "dedicated",
  },
};

export function planPrice(
  plan: BillingPlan,
  interval: "month" | "year",
  annualDiscountPercent: number,
) {
  const monthly = PLAN_CATALOG[plan].monthlyPriceUsd;
  if (interval === "month")
    return { totalUsd: monthly, monthlyEquivalentUsd: monthly };
  const discount = Math.min(50, Math.max(0, annualDiscountPercent));
  const totalUsd = Math.round(monthly * 12 * (1 - discount / 100));
  return {
    totalUsd,
    monthlyEquivalentUsd: Math.round((totalUsd / 12) * 100) / 100,
  };
}

export function usageState(
  used: number,
  reserved: number,
  limit: number | null,
) {
  const consumed = used + reserved;
  const percentage = limit && limit > 0 ? (consumed / limit) * 100 : 0;
  return {
    consumed,
    percentage,
    warning: limit !== null && percentage >= 80,
    exhausted: limit !== null && consumed >= limit,
  };
}
