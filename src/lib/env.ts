import "server-only";

import { z } from "zod";

const optionalUrl = z.string().url().optional().or(z.literal(""));
const optionalSecret = z.string().min(1).optional().or(z.literal(""));

const serverEnvironmentSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_URL: optionalUrl,
    DEMO_MODE: z.enum(["true", "false"]).default("true"),
    DEMO_SESSION_SECRET: optionalSecret,
    NEXT_PUBLIC_SUPABASE_URL: optionalUrl,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: optionalSecret,
    SUPABASE_SERVICE_ROLE_KEY: optionalSecret,
    ENCRYPTION_KEY: optionalSecret,
  })
  .superRefine((environment, context) => {
    const demoMode = environment.DEMO_MODE === "true";
    const hasSupabase = Boolean(
      environment.NEXT_PUBLIC_SUPABASE_URL &&
        environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    );

    if (!demoMode && !hasSupabase) {
      context.addIssue({
        code: "custom",
        message: "Supabase URL and publishable key are required when DEMO_MODE=false.",
        path: ["NEXT_PUBLIC_SUPABASE_URL"],
      });
    }

    if (
      environment.NODE_ENV === "production" &&
      demoMode &&
      (!environment.DEMO_SESSION_SECRET || environment.DEMO_SESSION_SECRET.length < 32)
    ) {
      context.addIssue({
        code: "custom",
        message: "DEMO_SESSION_SECRET must contain at least 32 characters in production.",
        path: ["DEMO_SESSION_SECRET"],
      });
    }
  });

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema> & {
  demoMode: boolean;
  supabaseConfigured: boolean;
};

let cachedEnvironment: ServerEnvironment | undefined;

export function getServerEnvironment(): ServerEnvironment {
  if (cachedEnvironment) return cachedEnvironment;

  const parsed = serverEnvironmentSchema.parse(process.env);
  cachedEnvironment = {
    ...parsed,
    demoMode: parsed.DEMO_MODE === "true",
    supabaseConfigured: Boolean(
      parsed.NEXT_PUBLIC_SUPABASE_URL &&
        parsed.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
  };

  return cachedEnvironment;
}

export function validateRuntimeEnvironment(): void {
  getServerEnvironment();
}
