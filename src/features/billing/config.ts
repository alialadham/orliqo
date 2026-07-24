import "server-only";

import { z } from "zod";

import type { ServerEnvironment } from "@/lib/env";
import { BILLING_PLANS, type BillingPlan } from "./plans";
import type { BillingInterval, BillingMode, BillingProvider } from "./provider";

type ProductCatalog = Record<BillingPlan, Record<BillingInterval, string>>;

export type BillingConfiguration = {
  provider: BillingProvider;
  mode: BillingMode;
  apiKey: string;
  webhookSecret: string;
  products: ProductCatalog;
};

function value(
  environment: ServerEnvironment,
  key: keyof ServerEnvironment,
): string {
  const result = environment[key];
  return typeof result === "string" ? result : "";
}

export function billingConfiguration(
  environment: ServerEnvironment,
): BillingConfiguration | null {
  const mode = environment.BILLING_PROVIDER_MODE;
  const prefix = mode === "test" ? "DODO_TEST" : "DODO_LIVE";
  const apiKey = value(environment, `${prefix}_API_KEY`);
  const webhookSecret = value(environment, `${prefix}_WEBHOOK_SECRET`);
  const products = Object.fromEntries(
    BILLING_PLANS.map((plan) => [
      plan,
      {
        month: value(
          environment,
          `${prefix}_${plan.toUpperCase()}_MONTHLY_PRODUCT_ID` as keyof ServerEnvironment,
        ),
        year: value(
          environment,
          `${prefix}_${plan.toUpperCase()}_YEARLY_PRODUCT_ID` as keyof ServerEnvironment,
        ),
      },
    ]),
  ) as ProductCatalog;
  if (
    !apiKey ||
    !webhookSecret ||
    BILLING_PLANS.some((plan) => !products[plan].month || !products[plan].year)
  )
    return null;

  z.string().min(8).parse(apiKey);
  z.string().min(8).parse(webhookSecret);
  for (const plan of BILLING_PLANS) {
    z.string().startsWith("pdt_").parse(products[plan].month);
    z.string().startsWith("pdt_").parse(products[plan].year);
  }
  return { provider: "dodo", mode, apiKey, webhookSecret, products };
}

export function billingProductId(
  configuration: BillingConfiguration,
  plan: BillingPlan,
  interval: BillingInterval,
): string {
  return configuration.products[plan][interval];
}
