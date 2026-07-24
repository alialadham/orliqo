import { describe, expect, it } from "vitest";

import { PLAN_CATALOG, planPrice, usageState } from "./plans";

describe("billing plan catalog", () => {
  it("keeps the exact authoritative monthly prices and limits", () => {
    expect(PLAN_CATALOG.starter).toMatchObject({
      monthlyPriceUsd: 39,
      limits: { monthlyLeads: 100, aiMessages: 200, members: 1 },
    });
    expect(PLAN_CATALOG.growth).toMatchObject({
      monthlyPriceUsd: 119,
      limits: { monthlyLeads: 500, aiMessages: 1000, members: 5 },
    });
    expect(PLAN_CATALOG.agency).toMatchObject({
      monthlyPriceUsd: 349,
      limits: { monthlyLeads: 2000, aiMessages: 5000, members: 20 },
    });
  });

  it("uses only the configured annual discount", () => {
    expect(planPrice("starter", "year", 0).totalUsd).toBe(468);
    expect(planPrice("starter", "year", 20).totalUsd).toBe(374);
    expect(planPrice("starter", "year", 80).totalUsd).toBe(234);
  });

  it("warns at 80 percent including reservations", () => {
    expect(usageState(70, 10, 100)).toMatchObject({
      consumed: 80,
      warning: true,
      exhausted: false,
    });
  });
});
