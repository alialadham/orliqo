import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260723170000_phase6_billing_events.sql",
  ),
  "utf8",
);

describe("Phase 6 billing event security", () => {
  it("deduplicates event intake at the database boundary", () => {
    expect(migration).toContain(
      "on conflict (billing_provider, provider_event_id) do nothing",
    );
    expect(migration).toContain("target_provider <> 'dodo'");
    expect(migration).toContain("target_mode <> 'test'");
    expect(migration).toContain("return found");
  });

  it("resolves subscriptions from trusted provider identifiers", () => {
    expect(migration).toContain("provider_customer_id = target_customer_id");
    expect(migration).toContain(
      "provider_subscription_id = target_subscription_id",
    );
    expect(migration).toContain("processing_status = 'succeeded'");
  });

  it("keeps billing mutations service-role only", () => {
    expect(migration).toContain(
      "revoke all on function private.accept_billing_event",
    );
    expect(migration).toContain(
      "revoke all on function private.reconcile_billing_subscription",
    );
    expect(migration).toContain(
      "revoke all on function private.reconcile_billing_payment",
    );
    expect(
      migration.match(/grant execute on function private\./g),
    ).toHaveLength(6);
    expect(migration).toContain("to service_role");
  });

  it("atomically reserves, commits, and releases usage", () => {
    expect(migration).toContain("for update");
    expect(migration).toContain("IDEMPOTENCY_KEY_REUSED");
    expect(migration).toContain("SUBSCRIPTION_NOT_ENTITLED");
    expect(migration).toContain("USAGE_LIMIT_EXCEEDED");
    expect(migration).toContain("used = used + reservation.amount");
    expect(migration).toContain("reserved = reserved - reservation.amount");
    expect(migration).toContain("revoke all on function private.commit_usage");
    expect(migration).toContain("revoke all on function private.release_usage");
  });
});
