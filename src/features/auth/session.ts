import "server-only";

import { cache } from "react";

import { readDemoSession } from "@/features/auth/demo-session";
import { getServerEnvironment } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string;
  provider: "demo" | "supabase";
  fullName?: string;
  demoKind?: "workspace" | "onboarding";
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const environment = getServerEnvironment();

  if (environment.demoMode) {
    const demoSession = await readDemoSession();
    if (demoSession) {
      return {
        id: demoSession.userId,
        email: demoSession.email,
        provider: "demo",
        fullName: demoSession.fullName,
        demoKind: demoSession.kind,
      };
    }
  }

  if (!environment.supabaseConfigured) return null;

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user?.email) return null;

  return {
    id: data.user.id,
    email: data.user.email,
    provider: "supabase",
    fullName: typeof data.user.user_metadata.full_name === "string" ? data.user.user_metadata.full_name : undefined,
  };
});
