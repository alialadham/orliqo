import { describe, expect, it } from "vitest";

import { DEMO_WORKSPACE_ID } from "@/features/demo/data";
import { demoAnalyticsRows } from "./demo";

describe("demo analytics", () => {
  it("keeps attributed outcomes within their parent funnel stages", () => {
    for (const row of demoAnalyticsRows(DEMO_WORKSPACE_ID)) {
      expect(row.positive).toBeLessThanOrEqual(row.replied);
      expect(row.replied).toBeLessThanOrEqual(row.sent);
      expect(row.sent).toBeLessThanOrEqual(row.contacted);
    }
  });
});
