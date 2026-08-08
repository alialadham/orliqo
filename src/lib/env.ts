import "server-only";

import { z } from "zod";

const optionalUrl = z.string().url().optional().or(z.literal(""));
const optionalSecret = z.string().min(1).optional().or(z.literal(""));
const optionalBoolean = z.enum(["true", "false"]).optional().or(z.literal(""));
const optionalPort = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.coerce.number().int().min(1).max(65_535).optional(),
);

const supabaseAuthEnvironmentSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    APP_URL: optionalUrl,
    NEXT_PUBLIC_APP_URL: optionalUrl,
    NEXT_PUBLIC_SUPABASE_URL: optionalUrl,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: optionalSecret,
  })
  .superRefine((environment, context) => {
    const requiredKeys = [
      "APP_URL",
      "NEXT_PUBLIC_APP_URL",
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    ] as const;

    for (const key of requiredKeys) {
      if (!environment[key]) {
        context.addIssue({
          code: "custom",
          message: `${key} is required for Supabase OAuth.`,
          path: [key],
        });
      }
    }

    if (
      environment.APP_URL &&
      environment.NEXT_PUBLIC_APP_URL &&
      environment.APP_URL !== environment.NEXT_PUBLIC_APP_URL
    ) {
      context.addIssue({
        code: "custom",
        message: "NEXT_PUBLIC_APP_URL must match APP_URL.",
        path: ["NEXT_PUBLIC_APP_URL"],
      });
    }

    if (environment.NODE_ENV === "production") {
      for (const key of [
        "APP_URL",
        "NEXT_PUBLIC_APP_URL",
        "NEXT_PUBLIC_SUPABASE_URL",
      ] as const) {
        const value = environment[key];
        if (value && new URL(value).protocol !== "https:") {
          context.addIssue({
            code: "custom",
            message: `${key} must use HTTPS in production.`,
            path: [key],
          });
        }
      }
    }
  });

const billingProductKeys = [
  "DODO_TEST_STARTER_MONTHLY_PRODUCT_ID",
  "DODO_TEST_STARTER_YEARLY_PRODUCT_ID",
  "DODO_TEST_GROWTH_MONTHLY_PRODUCT_ID",
  "DODO_TEST_GROWTH_YEARLY_PRODUCT_ID",
  "DODO_TEST_AGENCY_MONTHLY_PRODUCT_ID",
  "DODO_TEST_AGENCY_YEARLY_PRODUCT_ID",
  "DODO_LIVE_STARTER_MONTHLY_PRODUCT_ID",
  "DODO_LIVE_STARTER_YEARLY_PRODUCT_ID",
  "DODO_LIVE_GROWTH_MONTHLY_PRODUCT_ID",
  "DODO_LIVE_GROWTH_YEARLY_PRODUCT_ID",
  "DODO_LIVE_AGENCY_MONTHLY_PRODUCT_ID",
  "DODO_LIVE_AGENCY_YEARLY_PRODUCT_ID",
] as const;

const serverEnvironmentSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    APP_URL: optionalUrl,
    NEXT_PUBLIC_APP_URL: optionalUrl,
    DEMO_MODE: z.enum(["true", "false"]).default("true"),
    DEMO_SESSION_SECRET: optionalSecret,
    NEXT_PUBLIC_SUPABASE_URL: optionalUrl,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: optionalSecret,
    SUPABASE_SERVICE_ROLE_KEY: optionalSecret,
    SUPABASE_PROJECT_ID: optionalSecret,
    SUPABASE_DB_PASSWORD: optionalSecret,
    STORAGE_BUCKET: z.string().min(1).default("workspace-assets"),
    ENCRYPTION_KEY: optionalSecret,
    ENCRYPTION_KEY_VERSION: z.coerce.number().int().positive().default(1),
    OPENAI_API_KEY: optionalSecret,
    OPENAI_MODEL: optionalSecret,
    OPENAI_WEB_SEARCH_ENABLED: optionalBoolean,
    AI_FIXTURE_MODE: optionalBoolean,
    INNGEST_EVENT_KEY: optionalSecret,
    INNGEST_SIGNING_KEY: optionalSecret,
    INNGEST_DEV: optionalBoolean,
    GOOGLE_CLIENT_ID: optionalSecret,
    GOOGLE_CLIENT_SECRET: optionalSecret,
    GOOGLE_REDIRECT_URI: optionalUrl,
    GOOGLE_OAUTH_CLIENT_ID: optionalSecret,
    GOOGLE_OAUTH_CLIENT_SECRET: optionalSecret,
    GOOGLE_OAUTH_REDIRECT_URI: optionalUrl,
    GOOGLE_CALENDAR_OAUTH_CLIENT_ID: optionalSecret,
    GOOGLE_CALENDAR_OAUTH_CLIENT_SECRET: optionalSecret,
    GOOGLE_CALENDAR_OAUTH_REDIRECT_URI: optionalUrl,
    GMAIL_PUBSUB_VERIFICATION_TOKEN: optionalSecret,
    MICROSOFT_CLIENT_ID: optionalSecret,
    MICROSOFT_CLIENT_SECRET: optionalSecret,
    MICROSOFT_TENANT_ID: z.string().default("common"),
    MICROSOFT_REDIRECT_URI: optionalUrl,
    MICROSOFT_WEBHOOK_CLIENT_STATE_SECRET: optionalSecret,
    META_APP_SECRET: optionalSecret,
    META_APP_ID: optionalSecret,
    META_WHATSAPP_API_VERSION: z.string().default("v23.0"),
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: optionalSecret,
    WHATSAPP_ACCESS_TOKEN: optionalSecret,
    WHATSAPP_BUSINESS_ACCOUNT_ID: optionalSecret,
    WHATSAPP_PHONE_NUMBER_ID: optionalSecret,
    WHATSAPP_TEST_MODE: optionalBoolean,
    SMTP_HOST: optionalSecret,
    SMTP_PORT: optionalPort,
    SMTP_USERNAME: optionalSecret,
    SMTP_PASSWORD: optionalSecret,
    SMTP_FROM: z.string().email().optional().or(z.literal("")),
    RESEND_API_KEY: optionalSecret,
    RESEND_WEBHOOK_SECRET: optionalSecret,
    AWS_SES_REGION: optionalSecret,
    AWS_SES_ACCESS_KEY_ID: optionalSecret,
    AWS_SES_SECRET_ACCESS_KEY: optionalSecret,
    AWS_SES_SESSION_TOKEN: optionalSecret,
    EMAIL_DELIVERY_MODE: z
      .enum(["preview", "sandbox", "live"])
      .default("preview"),
    WHATSAPP_DELIVERY_MODE: z
      .enum(["no-send", "sandbox", "live"])
      .default("no-send"),
    LIVE_DELIVERY_ENABLED: z.enum(["true", "false"]).default("false"),
    INBOUND_REPLY_SIMULATOR: z.enum(["true", "false"]).default("true"),
    ANNUAL_DISCOUNT_PERCENT: z.coerce.number().min(0).max(50).default(0),
    BILLING_PROVIDER: z.literal("dodo").default("dodo"),
    BILLING_PROVIDER_MODE: z.enum(["test", "live"]).default("test"),
    BILLING_LIVE_ENABLED: z.enum(["true", "false"]).default("false"),
    DODO_TEST_API_KEY: optionalSecret,
    DODO_TEST_WEBHOOK_SECRET: optionalSecret,
    DODO_TEST_STARTER_MONTHLY_PRODUCT_ID: optionalSecret,
    DODO_TEST_STARTER_YEARLY_PRODUCT_ID: optionalSecret,
    DODO_TEST_GROWTH_MONTHLY_PRODUCT_ID: optionalSecret,
    DODO_TEST_GROWTH_YEARLY_PRODUCT_ID: optionalSecret,
    DODO_TEST_AGENCY_MONTHLY_PRODUCT_ID: optionalSecret,
    DODO_TEST_AGENCY_YEARLY_PRODUCT_ID: optionalSecret,
    DODO_LIVE_API_KEY: optionalSecret,
    DODO_LIVE_WEBHOOK_SECRET: optionalSecret,
    DODO_LIVE_STARTER_MONTHLY_PRODUCT_ID: optionalSecret,
    DODO_LIVE_STARTER_YEARLY_PRODUCT_ID: optionalSecret,
    DODO_LIVE_GROWTH_MONTHLY_PRODUCT_ID: optionalSecret,
    DODO_LIVE_GROWTH_YEARLY_PRODUCT_ID: optionalSecret,
    DODO_LIVE_AGENCY_MONTHLY_PRODUCT_ID: optionalSecret,
    DODO_LIVE_AGENCY_YEARLY_PRODUCT_ID: optionalSecret,
    AI_PRIMARY_PROVIDER: z
      .enum(["gemini", "groq", "openrouter", "mock"])
      .default("mock"),
    AI_FALLBACK_PROVIDERS: z.string().default("groq,openrouter,mock"),
    GEMINI_API_KEY: optionalSecret,
    GEMINI_MODEL: optionalSecret,
    GROQ_API_KEY: optionalSecret,
    GROQ_MODEL: optionalSecret,
    OPENROUTER_API_KEY: optionalSecret,
    OPENROUTER_MODEL: optionalSecret,
    AI_PROMPT_VERSION: z.string().default("phase2-v1"),
    NEXT_PUBLIC_POSTHOG_KEY: optionalSecret,
    NEXT_PUBLIC_POSTHOG_HOST: optionalUrl,
    SENTRY_AUTH_TOKEN: optionalSecret,
    SENTRY_ORG: optionalSecret,
    SENTRY_PROJECT: optionalSecret,
    SENTRY_DSN: optionalUrl,
    NEXT_PUBLIC_SENTRY_DSN: optionalUrl,
    RESEARCH_PROVIDER: optionalSecret,
    RESEARCH_PROVIDER_API_KEY: optionalSecret,
    RESEARCH_PROVIDER_BASE_URL: optionalUrl,
  })
  .superRefine((environment, context) => {
    const demoMode = environment.DEMO_MODE === "true";
    const production = environment.NODE_ENV === "production";
    const hasSupabase = Boolean(
      environment.NEXT_PUBLIC_SUPABASE_URL &&
      environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    );
    const requireValues = (
      keys: ReadonlyArray<keyof typeof environment>,
      reason: string,
    ) => {
      for (const key of keys) {
        if (!environment[key]) {
          context.addIssue({
            code: "custom",
            message: `${String(key)} is required ${reason}.`,
            path: [key],
          });
        }
      }
    };
    const requireCompleteGroup = (
      keys: ReadonlyArray<keyof typeof environment>,
      label: string,
    ) => {
      if (keys.some((key) => Boolean(environment[key]))) {
        requireValues(keys, `when ${label} is configured`);
      }
    };

    if (!demoMode && !hasSupabase) {
      context.addIssue({
        code: "custom",
        message:
          "Supabase URL and publishable key are required when DEMO_MODE=false.",
        path: ["NEXT_PUBLIC_SUPABASE_URL"],
      });
    }

    if (production && !environment.APP_URL) {
      context.addIssue({
        code: "custom",
        message: "APP_URL is required in production.",
        path: ["APP_URL"],
      });
    }

    if (
      production &&
      environment.APP_URL &&
      new URL(environment.APP_URL).protocol !== "https:"
    ) {
      context.addIssue({
        code: "custom",
        message: "APP_URL must use HTTPS in production.",
        path: ["APP_URL"],
      });
    }

    if (production) {
      const httpsVariables = [
        "NEXT_PUBLIC_APP_URL",
        "NEXT_PUBLIC_SUPABASE_URL",
        "GOOGLE_REDIRECT_URI",
        "GOOGLE_OAUTH_REDIRECT_URI",
        "GOOGLE_CALENDAR_OAUTH_REDIRECT_URI",
        "MICROSOFT_REDIRECT_URI",
        "NEXT_PUBLIC_POSTHOG_HOST",
        "SENTRY_DSN",
        "NEXT_PUBLIC_SENTRY_DSN",
        "RESEARCH_PROVIDER_BASE_URL",
      ] as const;
      for (const key of httpsVariables) {
        const value = environment[key];
        if (value && new URL(value).protocol !== "https:") {
          context.addIssue({
            code: "custom",
            message: `${key} must use HTTPS in production.`,
            path: [key],
          });
        }
      }
    }

    if (
      environment.APP_URL &&
      environment.NEXT_PUBLIC_APP_URL &&
      environment.APP_URL !== environment.NEXT_PUBLIC_APP_URL
    ) {
      context.addIssue({
        code: "custom",
        message: "NEXT_PUBLIC_APP_URL must match APP_URL.",
        path: ["NEXT_PUBLIC_APP_URL"],
      });
    }

    if (
      production &&
      demoMode &&
      (!environment.DEMO_SESSION_SECRET ||
        environment.DEMO_SESSION_SECRET.length < 32)
    ) {
      context.addIssue({
        code: "custom",
        message:
          "DEMO_SESSION_SECRET must contain at least 32 characters in production.",
        path: ["DEMO_SESSION_SECRET"],
      });
    }

    if (production && !demoMode) {
      requireValues(
        [
          "NEXT_PUBLIC_SUPABASE_URL",
          "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
          "SUPABASE_SERVICE_ROLE_KEY",
          "ENCRYPTION_KEY",
          "INNGEST_EVENT_KEY",
          "INNGEST_SIGNING_KEY",
        ],
        "when DEMO_MODE=false in production",
      );
      if (
        environment.ENCRYPTION_KEY &&
        environment.ENCRYPTION_KEY.length < 32
      ) {
        context.addIssue({
          code: "custom",
          message: "ENCRYPTION_KEY must contain at least 32 characters.",
          path: ["ENCRYPTION_KEY"],
        });
      }
      if (environment.AI_PRIMARY_PROVIDER === "mock") {
        context.addIssue({
          code: "custom",
          message: "AI_PRIMARY_PROVIDER cannot be mock in production.",
          path: ["AI_PRIMARY_PROVIDER"],
        });
      }
      if (
        environment.AI_FALLBACK_PROVIDERS.split(",")
          .map((value) => value.trim())
          .includes("mock")
      ) {
        context.addIssue({
          code: "custom",
          message:
            "AI_FALLBACK_PROVIDERS cannot include mock when DEMO_MODE=false in production.",
          path: ["AI_FALLBACK_PROVIDERS"],
        });
      }
      if (environment.AI_FIXTURE_MODE === "true") {
        context.addIssue({
          code: "custom",
          message: "AI_FIXTURE_MODE must be disabled in production.",
          path: ["AI_FIXTURE_MODE"],
        });
      }
      if (environment.INNGEST_DEV === "true") {
        context.addIssue({
          code: "custom",
          message: "INNGEST_DEV must be disabled in production.",
          path: ["INNGEST_DEV"],
        });
      }
      if (environment.INBOUND_REPLY_SIMULATOR !== "false") {
        context.addIssue({
          code: "custom",
          message: "INBOUND_REPLY_SIMULATOR must be false in production.",
          path: ["INBOUND_REPLY_SIMULATOR"],
        });
      }
      if (
        environment.EMAIL_DELIVERY_MODE === "live" &&
        environment.LIVE_DELIVERY_ENABLED !== "true"
      ) {
        context.addIssue({
          code: "custom",
          message:
            "LIVE_DELIVERY_ENABLED=true is required before selecting live email delivery.",
          path: ["LIVE_DELIVERY_ENABLED"],
        });
      }
      if (
        environment.WHATSAPP_DELIVERY_MODE === "live" &&
        environment.LIVE_DELIVERY_ENABLED !== "true"
      ) {
        context.addIssue({
          code: "custom",
          message:
            "LIVE_DELIVERY_ENABLED=true is required before selecting live WhatsApp delivery.",
          path: ["LIVE_DELIVERY_ENABLED"],
        });
      }
      if (
        environment.WHATSAPP_DELIVERY_MODE === "live" &&
        environment.WHATSAPP_TEST_MODE === "true"
      ) {
        context.addIssue({
          code: "custom",
          message: "WHATSAPP_TEST_MODE must be false for live delivery.",
          path: ["WHATSAPP_TEST_MODE"],
        });
      }
    }

    if (
      demoMode &&
      (environment.EMAIL_DELIVERY_MODE === "live" ||
        environment.WHATSAPP_DELIVERY_MODE === "live")
    ) {
      context.addIssue({
        code: "custom",
        message: "Live delivery cannot run while DEMO_MODE=true.",
        path: ["LIVE_DELIVERY_ENABLED"],
      });
    }

    const aiProviderKeys = {
      gemini: ["GEMINI_API_KEY", "GEMINI_MODEL"],
      groq: ["GROQ_API_KEY", "GROQ_MODEL"],
      openrouter: ["OPENROUTER_API_KEY", "OPENROUTER_MODEL"],
      mock: [],
    } as const;
    const fallbackProviders = environment.AI_FALLBACK_PROVIDERS.split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    for (const provider of fallbackProviders) {
      if (!(provider in aiProviderKeys)) {
        context.addIssue({
          code: "custom",
          message: `Unsupported AI fallback provider: ${provider}.`,
          path: ["AI_FALLBACK_PROVIDERS"],
        });
      }
    }
    if (!demoMode) {
      requireValues(
        aiProviderKeys[environment.AI_PRIMARY_PROVIDER],
        `for AI_PRIMARY_PROVIDER=${environment.AI_PRIMARY_PROVIDER}`,
      );
    }
    if (production && !demoMode) {
      for (const provider of fallbackProviders) {
        if (provider in aiProviderKeys) {
          requireValues(
            aiProviderKeys[provider as keyof typeof aiProviderKeys],
            `for AI fallback provider ${provider}`,
          );
        }
      }
    }

    if (!demoMode) {
      requireCompleteGroup(
        ["OPENAI_API_KEY", "OPENAI_MODEL"],
        "OpenAI compatibility",
      );
      requireCompleteGroup(
        ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI"],
        "Google authentication",
      );
      requireCompleteGroup(
        [
          "GOOGLE_OAUTH_CLIENT_ID",
          "GOOGLE_OAUTH_CLIENT_SECRET",
          "GOOGLE_OAUTH_REDIRECT_URI",
          "GMAIL_PUBSUB_VERIFICATION_TOKEN",
        ],
        "Gmail OAuth",
      );
      requireCompleteGroup(
        [
          "GOOGLE_CALENDAR_OAUTH_CLIENT_ID",
          "GOOGLE_CALENDAR_OAUTH_CLIENT_SECRET",
          "GOOGLE_CALENDAR_OAUTH_REDIRECT_URI",
        ],
        "Google Calendar OAuth",
      );
      requireCompleteGroup(
        [
          "MICROSOFT_CLIENT_ID",
          "MICROSOFT_CLIENT_SECRET",
          "MICROSOFT_REDIRECT_URI",
          "MICROSOFT_WEBHOOK_CLIENT_STATE_SECRET",
        ],
        "Microsoft OAuth",
      );
      requireCompleteGroup(
        [
          "SMTP_HOST",
          "SMTP_PORT",
          "SMTP_USERNAME",
          "SMTP_PASSWORD",
          "SMTP_FROM",
        ],
        "SMTP",
      );
      requireCompleteGroup(
        ["RESEND_API_KEY", "RESEND_WEBHOOK_SECRET"],
        "Resend",
      );
      requireCompleteGroup(
        [
          "AWS_SES_REGION",
          "AWS_SES_ACCESS_KEY_ID",
          "AWS_SES_SECRET_ACCESS_KEY",
        ],
        "Amazon SES",
      );
      requireCompleteGroup(
        [
          "WHATSAPP_ACCESS_TOKEN",
          "WHATSAPP_BUSINESS_ACCOUNT_ID",
          "WHATSAPP_PHONE_NUMBER_ID",
          "WHATSAPP_WEBHOOK_VERIFY_TOKEN",
          "META_APP_SECRET",
        ],
        "WhatsApp Cloud API",
      );
      requireCompleteGroup(
        ["NEXT_PUBLIC_POSTHOG_KEY", "NEXT_PUBLIC_POSTHOG_HOST"],
        "PostHog",
      );
      requireCompleteGroup(
        ["SENTRY_DSN", "NEXT_PUBLIC_SENTRY_DSN"],
        "Sentry runtime monitoring",
      );
      requireCompleteGroup(
        ["SENTRY_AUTH_TOKEN", "SENTRY_ORG", "SENTRY_PROJECT"],
        "Sentry source map upload",
      );
      requireCompleteGroup(
        [
          "RESEARCH_PROVIDER",
          "RESEARCH_PROVIDER_API_KEY",
          "RESEARCH_PROVIDER_BASE_URL",
        ],
        "a research provider",
      );
    }

    if (
      environment.BILLING_PROVIDER_MODE === "live" &&
      environment.BILLING_LIVE_ENABLED !== "true"
    ) {
      context.addIssue({
        code: "custom",
        message:
          "BILLING_LIVE_ENABLED=true is required before selecting live billing.",
        path: ["BILLING_LIVE_ENABLED"],
      });
    }

    if (demoMode && environment.BILLING_PROVIDER_MODE === "live") {
      context.addIssue({
        code: "custom",
        message: "Live billing cannot run while DEMO_MODE=true.",
        path: ["BILLING_PROVIDER_MODE"],
      });
    }

    if (production && !demoMode) {
      const prefix =
        environment.BILLING_PROVIDER_MODE === "test"
          ? "DODO_TEST"
          : "DODO_LIVE";
      requireValues(
        [
          `${prefix}_API_KEY`,
          `${prefix}_WEBHOOK_SECRET`,
          ...billingProductKeys.filter((key) => key.startsWith(prefix)),
        ] as Array<keyof typeof environment>,
        `for Dodo Payments ${environment.BILLING_PROVIDER_MODE} mode`,
      );
    }
  });

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema> & {
  demoMode: boolean;
  supabaseConfigured: boolean;
};

export type SupabaseAuthEnvironment = {
  NODE_ENV: "development" | "test" | "production";
  APP_URL: string;
  NEXT_PUBLIC_APP_URL: string;
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
  supabaseConfigured: true;
};

let cachedEnvironment: ServerEnvironment | undefined;

export class EnvironmentValidationError extends Error {
  constructor(issues: z.core.$ZodIssue[]) {
    super(
      `Invalid Orliqo environment:\n${issues
        .map(
          (issue) =>
            `- ${issue.path.map(String).join(".") || "environment"}: ${issue.message}`,
        )
        .join("\n")}`,
    );
    this.name = "EnvironmentValidationError";
  }
}

export function parseServerEnvironment(
  source: NodeJS.ProcessEnv,
): ServerEnvironment {
  const parsed = serverEnvironmentSchema.safeParse(source);
  if (!parsed.success)
    throw new EnvironmentValidationError(parsed.error.issues);
  return {
    ...parsed.data,
    demoMode: parsed.data.DEMO_MODE === "true",
    supabaseConfigured: Boolean(
      parsed.data.NEXT_PUBLIC_SUPABASE_URL &&
      parsed.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
  };
}

/**
 * Validates only the configuration needed by Supabase authentication.
 * Full production validation remains at feature boundaries via getServerEnvironment.
 */
export function parseSupabaseAuthEnvironment(
  source: NodeJS.ProcessEnv,
): SupabaseAuthEnvironment {
  const parsed = supabaseAuthEnvironmentSchema.safeParse(source);
  if (!parsed.success)
    throw new EnvironmentValidationError(parsed.error.issues);

  return {
    ...parsed.data,
    APP_URL: parsed.data.APP_URL!,
    NEXT_PUBLIC_APP_URL: parsed.data.NEXT_PUBLIC_APP_URL!,
    NEXT_PUBLIC_SUPABASE_URL: parsed.data.NEXT_PUBLIC_SUPABASE_URL!,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      parsed.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    supabaseConfigured: true,
  };
}

export function getSupabaseAuthEnvironment(): SupabaseAuthEnvironment {
  // Auth and ordinary database reads must not inherit unrelated provider
  // validation failures from the full production environment.
  return parseSupabaseAuthEnvironment(process.env);
}

export function getServerEnvironment(): ServerEnvironment {
  if (cachedEnvironment) return cachedEnvironment;

  cachedEnvironment = parseServerEnvironment(process.env);

  return cachedEnvironment;
}
