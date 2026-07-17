import { describe, expect, it } from "vitest";

import { DEMO_WORKSPACES } from "@/features/demo/data";
import { hasPermission } from "@/features/permissions/permissions";
import { simulateEmailPreview, simulateWhatsAppNoSend } from "@/features/providers/demo-simulators";

describe("Phase 1 foundation integration", () => {
  it("changes effective permissions with the active workspace role", () => {
    const ownerWorkspace = DEMO_WORKSPACES[0];
    const viewerWorkspace = DEMO_WORKSPACES[1];
    expect(ownerWorkspace && hasPermission(ownerWorkspace.role, "billing:view")).toBe(true);
    expect(viewerWorkspace && hasPermission(viewerWorkspace.role, "billing:view")).toBe(false);
  });

  it("keeps delivery blocked for every demo channel", () => {
    expect(simulateEmailPreview({ to: "lead@example.invalid", subject: "Test", body: "Preview" }).delivered).toBe(false);
    expect(simulateWhatsAppNoSend({ template: "demo", consent: "opted_in" }).delivered).toBe(false);
  });
});
