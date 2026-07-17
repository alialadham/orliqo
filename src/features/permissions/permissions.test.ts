import { describe, expect, it } from "vitest";

import { hasPermission, permissionsForRole } from "@/features/permissions/permissions";

describe("permission matrix", () => {
  it("gives owners every required permission", () => {
    expect(permissionsForRole("owner")).toHaveLength(32);
    expect(hasPermission("owner", "workspace:delete")).toBe(true);
  });

  it("keeps destructive workspace actions owner-only", () => {
    expect(hasPermission("administrator", "workspace:delete")).toBe(false);
    expect(hasPermission("administrator", "workspace:transfer_ownership")).toBe(false);
    expect(hasPermission("administrator", "billing:manage")).toBe(true);
  });

  it("blocks viewers from billing, integrations, and mutations", () => {
    expect(hasPermission("viewer", "lead:view")).toBe(true);
    expect(hasPermission("viewer", "lead:update")).toBe(false);
    expect(hasPermission("viewer", "billing:view")).toBe(false);
    expect(hasPermission("viewer", "integrations:view")).toBe(false);
  });
});
