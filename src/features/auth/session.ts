import "server-only";

import { cache } from "react";

import {
  EnvironmentValidationError,
  getSupabaseEnvironment,
  type SupabaseEnvironment,
} from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string;
  provider: "supabase" | "demo";
  fullName?: string;
  demoKind?: "workspace" | "onboarding";
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  let environment: SupabaseEnvironment;
  try {
    environment = getSupabaseEnvironment();
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
