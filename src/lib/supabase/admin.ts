import "server-only";

import { createClient } from "@supabase/supabase-js";

import {
  getSupabaseAdminEnvironment,
  type SupabaseAdminEnvironment,
} from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

export function createAdminSupabaseClient(
  configuredEnvironment?: SupabaseAdminEnvironment,
) {
  const environment = configuredEnvironment ?? getSupabaseAdminEnvironment();

  return createClient<Database>(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
