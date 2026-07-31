import { readFileSync } from "node:fs";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));

import { GET } from "@/app/auth/google/route";

const providerUrl =
  "https://project.supabase.co/auth/v1/authorize?provider=google";

describe("Google OAuth initiation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_URL", "https://orliqo.example");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://orliqo.example");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable");
    vi.stubEnv("DODO_TEST_API_KEY", "");
    vi.stubEnv("INNGEST_EVENT_KEY", "");
    vi.stubEnv("AI_PRIMARY_PROVIDER", "");
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("creates a Google PKCE request using only scoped auth variables", async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue({
      data: { url: providerUrl },
      error: null,
    });
    mocks.createServerSupabaseClient.mockResolvedValue({
      auth: { signInWithOAuth },
    });

    const response = await GET(
      new Request("https://orliqo.example/auth/google"),
    );

    expect(mocks.createServerSupabaseClient).toHaveBeenCalledWith(
      expect.objectContaining({
        APP_URL: "https://orliqo.example",
        NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable",
      }),
      { requireCookieWrites: true },
    );
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo:
          "https://orliqo.example/auth/callback?next=%2Fapp%2Fdashboard",
      },
    });
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(providerUrl);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.text()).not.toContain(
      "Orliqo could not load this view",
    );
  });

  it("preserves a safe destination through the OAuth callback", async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue({
      data: { url: providerUrl },
      error: null,
    });
    mocks.createServerSupabaseClient.mockResolvedValue({
      auth: { signInWithOAuth },
    });

    await GET(
      new Request(
        "https://orliqo.example/auth/google?next=%2Fapp%2Fleads",
      ),
    );

    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo:
          "https://orliqo.example/auth/callback?next=%2Fapp%2Fleads",
      },
    });
  });

  it("fails safely before creating a client when Supabase variables are missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");

    const response = await GET(
      new Request("https://orliqo.example/auth/google"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://orliqo.example/login?error=provider_not_configured",
    );
    expect(mocks.createServerSupabaseClient).not.toHaveBeenCalled();
  });

  it("logs every safe stage without logging the provider URL", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue({
      auth: {
        signInWithOAuth: vi.fn().mockResolvedValue({
          data: { url: providerUrl },
          error: null,
        }),
      },
    });

    await GET(new Request("https://orliqo.example/auth/google"));

    const logs = vi.mocked(console.info).mock.calls.flat().join("\n");
    expect(logs).toContain('"stage":"google_signin_started"');
    expect(logs).toContain('"stage":"auth_environment_validated"');
    expect(logs).toContain('"stage":"supabase_client_created"');
    expect(logs).toContain('"stage":"oauth_request_created"');
    expect(logs).toContain('"stage":"oauth_redirect_returned"');
    expect(logs).not.toContain(providerUrl);
  });

  it("does not run full feature validation during runtime startup", () => {
    const instrumentation = readFileSync("src/instrumentation.ts", "utf8");

    expect(instrumentation).not.toContain("validateRuntimeEnvironment");
    expect(instrumentation).not.toContain("getServerEnvironment");
  });
});
