import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const sql = readdirSync(join(process.cwd(), "supabase", "migrations")).filter((file) => file.endsWith(".sql")).sort().map((file) => readFileSync(join(process.cwd(), "supabase", "migrations", file), "utf8")).join("\n");

describe("Phase 2 database security", () => {
  it("enforces evidence workspace scope and lead mutation policies", () => {
    expect(sql).toContain("create trigger lead_field_evidence_validate_scope");
    expect(sql).toContain("'leads', 'lead_sources', 'lead_field_evidence'");
    expect(sql).toContain("table_name || '_insert'");
    expect(sql).toContain("create policy lead_notes_update");
  });

  it("provides private workspace storage and atomic suppression", () => {
    expect(sql).toContain("'workspace-assets'");
    expect(sql).toContain("create or replace function public.suppress_lead");
    expect(sql).toContain("create or replace function public.restore_suppressed_lead");
    expect(sql).toContain("update public.messages");
  });
});
