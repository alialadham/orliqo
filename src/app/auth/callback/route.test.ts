import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerSupabaseClient: vi.fn(),
  getSupabaseAuthEnvironment: vi.fn(),
}));

vi.mock("@/lib/env", () => {
  class EnvironmentValidationError extends Error {}

  return {
    EnvironmentValidationError,
    getSupabaseAuthEnvironment: mocks.getSupabaseAuthEnvironment,
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));

import { GET } from "@/app/auth/callback/route";

const oauthEnvironment = {
  APP_URL: "https://orliqo.example",
  NEXT_PUBLIC_APP_URL: "https://orliqo.example",
  NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable",
  supabaseConfigured: true,
};

describe("Supabase OAuth callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.getSupabaseAuthEnvironment.mockReturnValue(oauthEnvironment);
  });

  it("exchanges the code and redirects to the intended app route", async () => {
    const exchangeCodeForSession = vi.fn().mockResolvedValue({ error: null });
    mocks.createServerSupabaseClient.mockResolvedValue({
      auth: { exchangeCodeForSession },
    });

    const response = await GET(
      new Request(
        "https://orliqo.example/auth/callback?code=redacted&next=/app/leads",
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://orliqo.example/app/leads",
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.createServerSupabaseClient).toHaveBeenCalledWith(
      oauthEnvironment,
      { requireCookieWrites: true },
    );
    expect(exchangeCodeForSession).toHaveBeenCalledWith("redacted");
  });

  it("redirects to login when the code exchange fails", async () => {
    mocks.createServerSupabaseClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({
          error: { name: "AuthApiError", code: "bad_code", status: 400 },
        }),
      },
    });

    const response = await GET(
      new Request("https://orliqo.example/auth/callback?code=redacted"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://orliqo.example/login?error=oauth_callback_failed",
    );
  });

  it("redirects to login instead of returning HTTP 500 when OAuth config is missing", async () => {
    mocks.getSupabaseAuthEnvironment.mockImplementation(() => {
      throw new Error("missing Supabase configuration");
    });

    const response = await GET(
      new Request("https://orliqo.example/auth/callback?code=redacted"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://orliqo.example/login?error=oauth_callback_failed",
    );
    expect(mocks.createServerSupabaseClient).not.toHaveBeenCalled();
  });
});
