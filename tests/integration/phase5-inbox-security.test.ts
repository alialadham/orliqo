import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260723140000_phase5_unified_inbox.sql",
  ),
  "utf8",
);

describe("Phase 5 inbox migration security", () => {
  it.each([
    "conversation_participants",
    "inbox_labels",
    "conversation_labels",
    "conversation_notes",
  ])("enables RLS and workspace policies for %s", (table) => {
    expect(migration).toContain(
      `alter table public.${table} enable row level security`,
    );
    expect(migration).toMatch(
      new RegExp(`create policy [\\s\\S]+ on public\\.${table}`),
    );
  });

  it("keeps trusted workflows private and service-role only", () => {
    for (const routine of [
      "process_inbound_message",
      "stop_contact_from_conversation",
      "record_meeting_outcome",
    ]) {
      expect(migration).toContain(`revoke all on function private.${routine}`);
      expect(migration).toMatch(
        new RegExp(
          `grant execute on function private\\.${routine}[\\s\\S]+ to service_role`,
        ),
      );
    }
  });

  it("deduplicates provider messages and audits inbound persistence", () => {
    expect(migration).toContain(
      "messages_workspace_provider_message_unique_idx",
    );
    expect(migration).toContain("inbox.inbound.persisted");
    expect(migration).toContain("inbox.stop_contact");
    expect(migration).toContain("inbox.meeting.booked");
  });

  it("atomically applies suppression and queued cancellation", () => {
    expect(migration).toContain("insert into public.suppression_entries");
    expect(migration).toContain("failure_code='STOP_CONTACT'");
    expect(migration).toContain("sequence_stop_reason");
    expect(migration).toContain("insert into public.notifications");
    expect(migration).toContain("from public.workspace_members wm");
    expect(migration).not.toContain("workspace_memberships");
    expect(migration).not.toContain("has_workspace_role");
  });
});
