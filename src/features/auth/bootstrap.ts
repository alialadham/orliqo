import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { CurrentUser } from "@/features/auth/session";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function ensureAuthenticatedUserWorkspace(
  user: Pick<CurrentUser, "id">,
): Promise<boolean> {
  try {
    const admin = createAdminSupabaseClient() as unknown as SupabaseClient;
    const { error } = await admin.rpc(
      "ensure_auth_user_workspace_service",
      { target_user_id: user.id },
    );

    if (error) {
      console.error(
        JSON.stringify({
          event: "auth_bootstrap",
          stage: "ensure_workspace",
          status: "failed",
          errorCode: error.code,
        }),
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "auth_bootstrap",
        stage: "ensure_workspace",
        status: "exception",
        errorName: error instanceof Error ? error.name : typeof error,
      }),
    );
    return false;
  }
}
