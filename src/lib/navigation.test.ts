import { describe, expect, it } from "vitest";

import { safeRedirectPath } from "@/lib/navigation";

describe("safe redirects", () => {
  it("allows protected local routes", () => {
    expect(safeRedirectPath("/app/leads?view=high-fit")).toBe("/app/leads?view=high-fit");
    expect(safeRedirectPath("/onboarding")).toBe("/onboarding");
  });

  it("blocks external and protocol-relative redirects", () => {
    expect(safeRedirectPath("https://attacker.example")).toBe("/app/dashboard");
    expect(safeRedirectPath("//attacker.example/app")).toBe("/app/dashboard");
  });
});
