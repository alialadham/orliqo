import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  EnvironmentValidationError,
  parseServerEnvironment,
  parseSupabaseAuthEnvironment,
} from "@/lib/env";

describe("runtime environment validation", () => {
  it("uses no-send defaults in demo development", () => {
    const environment = parseServerEnvironment({
      NODE_ENV: "development",
      DEMO_MODE: "true",
    });

    expect(environment.demoMode).toBe(true);
    expect(environment.EMAIL_DELIVERY_MODE).toBe("preview");
    expect(environment.WHATSAPP_DELIVERY_MODE).toBe("no-send");
    expect(environment.STORAGE_BUCKET).toBe("workspace-assets");
  });

  it("fails closed when a production demo secret is missing", () => {
    expect(() =>
      parseServerEnvironment({
        NODE_ENV: "production",
        APP_URL: "https://orliqo.example",
        DEMO_MODE: "true",
      }),
    ).toThrow(/DEMO_SESSION_SECRET/);
  });

  it("rejects production mock AI and live delivery", () => {
    expect(() =>
      parseServerEnvironment({
        NODE_ENV: "production",
        APP_URL: "https://orliqo.example",
        DEMO_MODE: "false",
        NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable",
        SUPABASE_SERVICE_ROLE_KEY: "service-role",
        ENCRYPTION_KEY: "x".repeat(32),
        INNGEST_EVENT_KEY: "event-key",
        INNGEST_SIGNING_KEY: "signing-key",
        AI_PRIMARY_PROVIDER: "mock",
        AI_FALLBACK_PROVIDERS: "mock",
        EMAIL_DELIVERY_MODE: "live",
      }),
    ).toThrow(EnvironmentValidationError);
  });

  it("reports every incomplete provider group by variable name", () => {
    expect(() =>
      parseServerEnvironment({
        NODE_ENV: "development",
        DEMO_MODE: "false",
        NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable",
        GOOGLE_OAUTH_REDIRECT_URI:
          "https://orliqo.example/api/integrations/google/callback",
      }),
    ).toThrow(/GOOGLE_OAUTH_CLIENT_ID/);
  });

  it("requires provider webhook verification material", () => {
    expect(() =>
      parseServerEnvironment({
        NODE_ENV: "development",
        DEMO_MODE: "false",
        NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable",
        GOOGLE_OAUTH_CLIENT_ID: "client",
        GOOGLE_OAUTH_CLIENT_SECRET: "secret",
        GOOGLE_OAUTH_REDIRECT_URI:
          "https://orliqo.example/api/integrations/google/callback",
      }),
    ).toThrow(/GMAIL_PUBSUB_VERIFICATION_TOKEN/);
  });

  it("rejects unsupported fallback providers and insecure production URLs", () => {
    expect(() =>
      parseServerEnvironment({
        NODE_ENV: "development",
        DEMO_MODE: "true",
        AI_FALLBACK_PROVIDERS: "groq,unknown",
      }),
    ).toThrow(/Unsupported AI fallback provider: unknown/);
    expect(() =>
      parseServerEnvironment({
        NODE_ENV: "production",
        APP_URL: "https://orliqo.example",
        DEMO_MODE: "true",
        DEMO_SESSION_SECRET: "x".repeat(32),
        NEXT_PUBLIC_SUPABASE_URL: "http://project.supabase.co",
      }),
    ).toThrow(/NEXT_PUBLIC_SUPABASE_URL must use HTTPS/);
  });

  it("allows Supabase auth with only its required production variables", () => {
    expect(
      parseSupabaseAuthEnvironment({
        NODE_ENV: "production",
        APP_URL: "https://orliqo.example",
        NEXT_PUBLIC_APP_URL: "https://orliqo.example",
        NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable",
      }),
    ).toMatchObject({
      supabaseConfigured: true,
      APP_URL: "https://orliqo.example",
    });
  });

  it("fails safely when Supabase OAuth configuration is incomplete", () => {
    expect(() =>
      parseSupabaseAuthEnvironment({
        NODE_ENV: "production",
        APP_URL: "https://orliqo.example",
        NEXT_PUBLIC_APP_URL: "https://orliqo.example",
        NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      }),
    ).toThrow(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  });

  it("keeps unrelated production providers fail-closed", () => {
    const requiredBase = {
      NODE_ENV: "production",
      APP_URL: "https://orliqo.example",
      NEXT_PUBLIC_APP_URL: "https://orliqo.example",
      DEMO_MODE: "false",
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable",
      SUPABASE_SERVICE_ROLE_KEY: "service-role",
      ENCRYPTION_KEY: "x".repeat(32),
      AI_PRIMARY_PROVIDER: "gemini",
      AI_FALLBACK_PROVIDERS: "",
      AI_FIXTURE_MODE: "false",
      GEMINI_API_KEY: "gemini-key",
      GEMINI_MODEL: "gemini-model",
      INNGEST_EVENT_KEY: "event-key",
      INNGEST_SIGNING_KEY: "signing-key",
      INNGEST_DEV: "false",
      INBOUND_REPLY_SIMULATOR: "false",
    } as const;

    expect(() =>
      parseServerEnvironment({
        ...requiredBase,
        GEMINI_API_KEY: "",
      }),
    ).toThrow(/GEMINI_API_KEY/);
    expect(() =>
      parseServerEnvironment({
        ...requiredBase,
        INNGEST_SIGNING_KEY: "",
      }),
    ).toThrow(/INNGEST_SIGNING_KEY/);
    expect(() =>
      parseServerEnvironment({
        ...requiredBase,
        BILLING_LIVE_ENABLED: "true",
        BILLING_PROVIDER_MODE: "live",
      }),
    ).toThrow(/DODO_LIVE_API_KEY/);
  });
});
