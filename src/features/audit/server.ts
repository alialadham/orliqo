import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getServerEnvironment } from "@/lib/env";

export async function writeAuditLog(input: {
  workspaceId: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}): Promise<void> {
  const environment = getServerEnvironment();
  if (environment.demoMode || !environment.SUPABASE_SERVICE_ROLE_KEY) return;
  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("audit_logs").insert({
    workspace_id: input.workspaceId,
    actor_id: input.actorId,
    actor_type: input.actorId ? "user" : "system",
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    before_state: (input.before ?? {}) as never,
    after_state: (input.after ?? {}) as never,
  });
  if (error) throw new Error("The change was saved, but its audit record could not be written.");
}
