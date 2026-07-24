import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const actions = readFileSync(
  join(process.cwd(), "src/features/billing/actions.ts"),
  "utf8",
);

describe("Phase 6 billing authorization", () => {
  it("requires billing management permission for provider mutations", () => {
    expect(actions).toContain('requirePermission("billing:manage")');
    expect(actions).toContain("createCheckoutAction");
    expect(actions).toContain("openBillingPortalAction");
    expect(actions).toContain("cancelSubscriptionAction");
  });

  it("scopes subscription access to the active workspace and provider", () => {
    expect(actions).toContain(
      '.eq("workspace_id", action.context.activeWorkspace.id)',
    );
    expect(actions).toContain('.eq("billing_provider", "dodo")');
    expect(actions).not.toContain("createAdminSupabaseClient");
  });

  it("blocks provider calls for deterministic demo sessions", () => {
    expect(actions).toContain(
      'redirect("/app/billing?notice=demo-no-provider-call")',
    );
  });
});
