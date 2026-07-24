import { describe, expect, it, vi } from "vitest";

import type { BillingConfiguration } from "./config";
import { createDodoAdapter } from "./dodo-adapter";

const products = {
  starter: { month: "pdt_starter_month", year: "pdt_starter_year" },
  growth: { month: "pdt_growth_month", year: "pdt_growth_year" },
  agency: { month: "pdt_agency_month", year: "pdt_agency_year" },
};

describe("Dodo Payments adapter", () => {
  it("creates test checkout sessions with workspace metadata", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          session_id: "cks_test",
          checkout_url:
            "https://test.checkout.dodopayments.com/session/cks_test",
        }),
        { status: 200 },
      ),
    );
    const adapter = createDodoAdapter(
      {
        provider: "dodo",
        mode: "test",
        apiKey: "test-api-key",
        webhookSecret: "whsec_dGVzdA==",
        products,
      },
      fetcher,
    );
    const result = await adapter.createCheckout({
      workspaceId: "workspace-test",
      customerEmail: "owner@example.test",
      plan: "growth",
      interval: "month",
      returnUrl: "https://app.example.test/app/billing",
      idempotencyKey: "checkout-workspace-test-growth",
    });
    expect(result).toMatchObject({
      ok: true,
      mode: "test",
      data: { id: "cks_test", mode: "test" },
    });
    expect(fetcher).toHaveBeenCalledWith(
      "https://test.dodopayments.com/checkouts",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "idempotency-key": "checkout-workspace-test-growth",
        }),
      }),
    );
    const body = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body)) as Record<
      string,
      unknown
    >;
    expect(body).toMatchObject({
      product_cart: [{ product_id: "pdt_growth_month", quantity: 1 }],
      metadata: { workspace_id: "workspace-test" },
    });
  });

  it("hard-disables live operations", async () => {
    const configuration: BillingConfiguration = {
      provider: "dodo",
      mode: "live",
      apiKey: "live-api-key",
      webhookSecret: "whsec_bGl2ZQ==",
      products,
    };
    const adapter = createDodoAdapter(configuration);
    expect(await adapter.retrieveSubscription("sub_live")).toMatchObject({
      ok: false,
      mode: "live",
      error: { code: "live_mode_disabled" },
    });
  });
});
