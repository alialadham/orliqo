import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MetricRail } from "@/components/dashboard/metric-rail";

describe("MetricRail", () => {
  it("renders the six locked dashboard metrics in one summary region", () => {
    render(<MetricRail />);
    expect(screen.getByRole("region", { name: "Outreach summary" })).toBeInTheDocument();
    expect(screen.getByText("Qualified leads")).toBeInTheDocument();
    expect(screen.getByText("Estimated pipeline")).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(6);
  });
});
