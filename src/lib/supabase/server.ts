import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import {
  getServerEnvironment,
  type SupabaseOAuthEnvironment,
} from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

type SupabaseClientEnvironment = Pick<
  SupabaseOAuthEnvironment,
  "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
>;

export async function createServerSupabaseClient(
  configuredEnvironment?: SupabaseClientEnvironment,
) {
  const environment = configuredEnvironment ?? getServerEnvironment();

  if (
    !environment.NEXT_PUBLIC_SUPABASE_URL ||
    !environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    throw new Error("Supabase is not configured for this environment.");
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Session refresh cookies are written by proxy when rendering is read-only.
          }
        },
      },
    },
  );
}
