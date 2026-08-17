import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("authenticated Supabase environment isolation", () => {
  it("keeps auth and initial dashboard reads out of global validation", () => {
    const serverClient = read("src/lib/supabase/server.ts");
    const session = read("src/features/auth/session.ts");
    const workspaces = read("src/features/workspaces/data.ts");
    const inbox = read("src/features/inbox/data.ts");

    expect(serverClient).toContain("getSupabaseEnvironment");
    expect(serverClient).not.toContain("getServerEnvironment");
    expect(session).not.toContain("getServerEnvironment");
    expect(workspaces).not.toContain("getServerEnvironment");
    expect(inbox).not.toContain("getServerEnvironment");
  });

  it("keeps strict validation at provider operation boundaries", () => {
    expect(read("src/features/billing/actions.ts")).toContain(
      "getRuntimeEnvironment()",
    );
    expect(read("src/features/ai/providers/index.ts")).toContain(
      "getRuntimeEnvironment()",
    );
    expect(read("src/lib/inngest/functions/phase3.ts")).toContain(
      "getRuntimeEnvironment()",
    );
  });

  it("keeps Google bootstrap transactional and onboarding incomplete", () => {
    const migration = read("supabase/migrations/20260811110333_auth_bootstrap_repair.sql");
    const serviceBoundary = read("supabase/migrations/20260811143500_auth_service_rpc_boundary.sql");

    expect(migration).toContain("create or replace function private.handle_new_auth_user");
    expect(migration).toContain("insert into public.profiles");
    expect(migration).toContain("insert into public.workspaces");
    expect(migration).toContain("insert into public.workspace_members");
    expect(migration).toContain(
      "values (target_workspace_id, auth_user.id, 'owner', 'active', now())",
    );
    expect(migration).toContain("onboarding_completed, onboarding_step");
    expect(migration).toMatch(/false,\s+1/);
    expect(serviceBoundary).toContain("ensure_auth_user_workspace_service");
    expect(serviceBoundary).toContain("consume_rate_limit_service");
    expect(serviceBoundary).toContain("security invoker");
    expect(serviceBoundary).not.toContain("security definer");
    expect(serviceBoundary).toContain("from public, anon, authenticated");
    expect(serviceBoundary).toContain("to service_role");
  });

  it("does not log server-action arguments that can contain passwords", () => {
    expect(read("next.config.ts")).toContain("serverFunctions: false");
  });

  it("logs safe provider codes and explains confirmation email throttling", () => {
    const actions = read("src/features/auth/actions.ts");
    expect(actions).toContain("errorCode:");
    expect(actions).toContain("over_email_send_rate_limit");
    expect(actions).toContain("Confirmation email limit reached");
  });
});
