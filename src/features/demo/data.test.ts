import { describe, expect, it } from "vitest";

import { DEMO_LEADS, DEMO_WORKSPACES } from "@/features/demo/data";

describe("demo fixtures", () => {
  it("contains at least 30 synthetic leads with reserved domains", () => {
    expect(DEMO_LEADS).toHaveLength(30);
    expect(DEMO_LEADS.every((lead) => lead.email.endsWith("@example.invalid"))).toBe(true);
    expect(DEMO_LEADS.every((lead) => new URL(lead.website).hostname.endsWith(".example.test"))).toBe(true);
  });

  it("provides owner and viewer workspace contexts", () => {
    expect(DEMO_WORKSPACES.map((workspace) => workspace.role)).toEqual(["owner", "viewer"]);
  });
});
