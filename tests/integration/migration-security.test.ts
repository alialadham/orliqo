import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationsDirectory = join(process.cwd(), "supabase", "migrations");
const migrationSql = readdirSync(migrationsDirectory)
  .filter((file) => file.endsWith(".sql"))
  .sort()
  .map((file) => readFileSync(join(migrationsDirectory, file), "utf8"))
  .join("\n");

describe("migration security baseline", () => {
  it("includes every public table in the RLS enablement migration", () => {
    const createdTables = [
      ...migrationSql.matchAll(/create table public\.([a-z_]+)/g),
    ].map((match) => match[1]);
    const rlsStatementIndex = migrationSql.indexOf(
      "alter table public.%I enable row level security",
    );
    const rlsBlockStart = migrationSql.lastIndexOf(
      "foreach table_name in array array[",
      rlsStatementIndex,
    );
    const rlsBlock = migrationSql.slice(rlsBlockStart, rlsStatementIndex);

    expect(rlsStatementIndex).toBeGreaterThan(0);
    expect(rlsBlockStart).toBeGreaterThan(0);
    const missing = createdTables.filter(
      (table) =>
        !rlsBlock.includes(`'${table}'`) &&
        !migrationSql.includes(
          `alter table public.${table} enable row level security`,
        ),
    );
    expect(createdTables.length).toBeGreaterThan(50);
    expect(missing).toEqual([]);
  });

  it("keeps credential and provider internals out of client grants", () => {
    expect(migrationSql).toContain(
      "revoke all on private.integration_credentials from public, anon, authenticated",
    );
    expect(migrationSql).not.toMatch(
      /grant .*private\.integration_credentials to authenticated/i,
    );
    expect(migrationSql).not.toMatch(
      /grant .*public\.billing_events.* to authenticated/i,
    );
    expect(migrationSql).not.toMatch(
      /grant .*public\.provider_webhook_events.* to authenticated/i,
    );
  });

  it("defines explicit private storage and the required plan limits", () => {
    expect(migrationSql).toContain("'workspace-assets'");
    expect(migrationSql).toContain("('starter', 'monthly_leads', 100");
    expect(migrationSql).toContain("('growth', 'ai_messages', 1000");
    expect(migrationSql).toContain("('agency', 'members', 20");
  });
});
