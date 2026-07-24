import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260723200000_phase7_analytics_and_replenishment.sql",
  ),
  "utf8",
);

describe("Phase 7 analytics and replenishment safety", () => {
  it("rebuilds each workspace day idempotently from authoritative records", () => {
    expect(migration).toContain("delete from public.daily_analytics");
    expect(migration).toContain("workspace_id = target_workspace_id");
    expect(migration).toContain("metric_date = target_date");
    expect(migration).toContain("on conflict (");
    expect(migration).toContain("do update set");
    expect(migration).toContain(
      "when (m.provider_metadata->>'template_id') ~*",
    );
  });

  it("keeps aggregation and replenishment service-role only", () => {
    expect(migration).toContain(
      "revoke all on function private.aggregate_daily_analytics",
    );
    expect(migration).toContain(
      "revoke all on function private.replenish_campaign_bounded",
    );
    expect(
      migration.match(/grant execute on function private\./g),
    ).toHaveLength(2);
    expect(migration).toContain("to service_role");
  });

  it("bounds, deduplicates, and suppression-gates replenishment", () => {
    expect(migration).toContain("least(100");
    expect(migration).toContain("not l.do_not_contact");
    expect(migration).toContain("campaign_replenishment_once_daily_idx");
    expect(migration).toContain("'duplicate_ignored'");
    expect(migration).toContain("target.replenish_minimum_score");
    expect(migration).toContain("target.replenish_require_approval");
  });
});
