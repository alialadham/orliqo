import "server-only";

import { cache } from "react";

import { readDemoSession } from "@/features/auth/demo-session";
import {
  EnvironmentValidationError,
  getSupabaseAuthEnvironment,
  type SupabaseAuthEnvironment,
} from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string;
  provider: "demo" | "supabase";
  fullName?: string;
  demoKind?: "workspace" | "onboarding";
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  if (process.env.DEMO_MODE !== "false") {
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

  let environment: SupabaseAuthEnvironment;
  try {
    environment = getSupabaseAuthEnvironment();
  } catch (error) {
    if (error instanceof EnvironmentValidationError) return null;
    throw error;
  }

  const supabase = await createServerSupabaseClient(environment);
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user?.email) return null;

  return {
    id: data.user.id,
    email: data.user.email,
    provider: "supabase",
    fullName:
      typeof data.user.user_metadata.full_name === "string"
        ? data.user.user_metadata.full_name
        : undefined,
  };
});
