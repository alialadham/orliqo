import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("authenticated Supabase environment isolation", () => {
  it("keeps auth and initial dashboard reads out of global validation", () => {
    const serverClient = read("src/lib/supabase/server.ts");
    const session = read("src/features/auth/session.ts");
    const workspaces = read("src/features/workspaces/data.ts");
    const inbox = read("src/features/inbox/data.ts");

    expect(serverClient).toContain("getSupabaseAuthEnvironment");
    expect(serverClient).not.toContain("getServerEnvironment");
    expect(session).not.toContain("getServerEnvironment");
    expect(workspaces).not.toContain("getServerEnvironment");
    expect(inbox).toContain("if (context?.isDemo)");
  });

  it("keeps strict validation at provider operation boundaries", () => {
    expect(read("src/features/billing/actions.ts")).toContain(
      "getServerEnvironment()",
    );
    expect(read("src/features/ai/providers/index.ts")).toContain(
      "getServerEnvironment()",
    );
    expect(read("src/lib/inngest/functions/phase3.ts")).toContain(
      "getServerEnvironment()",
    );
  });

  it("keeps Google bootstrap transactional and onboarding incomplete", () => {
    const migration = read(
      "supabase/migrations/20260716233311_seed_reference_data.sql",
    );

    expect(migration).toContain("create trigger on_auth_user_created");
    expect(migration).toContain("insert into public.profiles");
    expect(migration).toContain("insert into public.workspaces");
    expect(migration).toContain("insert into public.workspace_members");
    expect(migration).toContain(
      "values (workspace_id, new.id, 'owner', 'active', now())",
    );
    expect(migration).toContain("onboarding_completed, onboarding_step");
    expect(migration).toContain("false, 1");
  });
});
