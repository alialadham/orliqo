import "server-only";

import type { BillingProviderAdapter, BillingProviderResult } from "./provider";
import { liveModeDisabled } from "./provider";
import { billingProductId, type BillingConfiguration } from "./config";
import { fetchWithTimeout } from "@/lib/http";

type Fetcher = typeof fetch;

function failure<T>(status: number, message: string): BillingProviderResult<T> {
  return {
    ok: false,
    mode: "test",
    error: {
      code:
        status === 400 || status === 404 || status === 422
          ? "invalid_request"
          : "provider_unavailable",
      message,
      retryable: status === 429 || status >= 500,
    },
  };
}

export function createDodoAdapter(
  configuration: BillingConfiguration,
  fetcher: Fetcher = fetch,
): BillingProviderAdapter {
  if (configuration.mode === "live")
    return {
      provider: "dodo",
      mode: "live",
      createCheckout: async () => liveModeDisabled(),
      createPortal: async () => liveModeDisabled(),
      retrieveSubscription: async () => liveModeDisabled(),
      cancelSubscription: async () => liveModeDisabled(),
      listInvoices: async () => liveModeDisabled(),
    };

  const request = async <T>(
    path: string,
    init: RequestInit = {},
  ): Promise<BillingProviderResult<T>> => {
    let response: Response;
    try {
      response = await fetchWithTimeout(
        fetcher,
        `https://test.dodopayments.com/${path}`,
        {
          ...init,
          headers: {
            authorization: `Bearer ${configuration.apiKey}`,
            "content-type": "application/json",
            ...init.headers,
          },
          cache: "no-store",
        },
        12_000,
      );
    } catch {
      return failure(503, "Dodo Payments request timed out.");
    }
    const data = (await response.json().catch(() => null)) as
      (T & { message?: string }) | null;
    if (!response.ok || !data)
      return failure(
        response.status,
        data?.message ?? "Dodo Payments request failed.",
      );
    return { ok: true, mode: "test", data };
  };

  return {
    provider: "dodo",
    mode: "test",
    async createCheckout(input) {
      const result = await request<{
        session_id: string;
        checkout_url: string;
      }>("checkouts", {
        method: "POST",
        headers: { "idempotency-key": input.idempotencyKey },
        body: JSON.stringify({
          product_cart: [
            {
              product_id: billingProductId(
                configuration,
                input.plan,
                input.interval,
              ),
              quantity: 1,
            },
          ],
          customer: input.customerId
            ? { customer_id: input.customerId }
            : {
                email: input.customerEmail,
                name: input.customerName ?? input.customerEmail,
              },
          metadata: { workspace_id: input.workspaceId },
          return_url: input.returnUrl,
          ...(input.trialDays
            ? { subscription_data: { trial_period_days: input.trialDays } }
            : {}),
        }),
      });
      return result.ok
        ? {
            ok: true,
            mode: "test",
            data: {
              id: result.data.session_id,
              url: result.data.checkout_url,
              customerId: input.customerId ?? null,
              subscriptionId: null,
              mode: "test",
            },
          }
        : result;
    },
    async createPortal(input) {
      const result = await request<{ link: string }>(
        `customers/${encodeURIComponent(input.customerId)}/customer-portal/session?send_email=false&return_url=${encodeURIComponent(input.returnUrl)}`,
        {
          method: "POST",
          headers: { "idempotency-key": input.idempotencyKey },
        },
      );
      return result.ok
        ? {
            ok: true,
            mode: "test",
            data: { url: result.data.link, mode: "test" },
          }
        : result;
    },
    retrieveSubscription(subscriptionId) {
      return request(`subscriptions/${encodeURIComponent(subscriptionId)}`);
    },
    async cancelSubscription(subscriptionId, idempotencyKey) {
      const result = await request<{
        subscription_id: string;
        status: string;
        cancel_at_next_billing_date: boolean;
      }>(`subscriptions/${encodeURIComponent(subscriptionId)}`, {
        method: "PATCH",
        headers: { "idempotency-key": idempotencyKey },
        body: JSON.stringify({
          cancel_at_next_billing_date: true,
          cancel_reason: "cancelled_by_customer",
        }),
      });
      return result.ok
        ? {
            ok: true,
            mode: "test",
            data: {
              subscriptionId: result.data.subscription_id,
              status: "active",
              cancelAtPeriodEnd: result.data.cancel_at_next_billing_date,
            },
          }
        : result;
    },
    async listInvoices(customerId) {
      const result = await request<{ items: readonly unknown[] }>(
        `payments?customer_id=${encodeURIComponent(customerId)}`,
      );
      return result.ok
        ? { ok: true, mode: "test", data: result.data.items }
        : result;
    },
  };
}
