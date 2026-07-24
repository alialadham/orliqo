import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MetricRail } from "@/components/dashboard/metric-rail";

describe("MetricRail", () => {
  it("renders the six locked dashboard metrics in one summary region", () => {
    const metrics = {
      discovered: 0,
      qualified: 2,
      approved: 0,
      contacted: 0,
      sent: 1,
      delivered: 1,
      opened: 0,
      read: 0,
      replied: 0,
      positive: 0,
      meetings: 0,
      conversions: 0,
    };
    render(
      <MetricRail
        current={{ ...metrics, revenue: 0 }}
        previous={metrics}
        rows={[]}
      />,
    );
    expect(
      screen.getByRole("region", { name: "Outreach summary" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Qualified leads")).toBeInTheDocument();
    expect(screen.getByText("Estimated pipeline")).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(6);
  });
});
