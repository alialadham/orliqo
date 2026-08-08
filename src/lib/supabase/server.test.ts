import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookieStore: {
    getAll: vi.fn(),
    set: vi.fn(),
  },
  createServerClient: vi.fn(),
  getSupabaseAuthEnvironment: vi.fn(),
  getServerEnvironment: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue(mocks.cookieStore),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: mocks.createServerClient,
}));

vi.mock("@/lib/env", () => ({
  getSupabaseAuthEnvironment: mocks.getSupabaseAuthEnvironment,
  getServerEnvironment: mocks.getServerEnvironment,
}));

import { createServerSupabaseClient } from "@/lib/supabase/server";

describe("server Supabase client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createServerClient.mockReturnValue({ auth: {} });
    mocks.getSupabaseAuthEnvironment.mockReturnValue({
      APP_URL: "https://orliqo.example",
      NEXT_PUBLIC_APP_URL: "https://orliqo.example",
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable",
      supabaseConfigured: true,
    });
  });

  it("writes PKCE and session cookies through the route handler cookie store", async () => {
    await createServerSupabaseClient({
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable",
    });

    const options = mocks.createServerClient.mock.calls[0]?.[2];
    expect(options.global.fetch).toBeTypeOf("function");
    options.cookies.setAll([
      {
        name: "sb-project-auth-token-code-verifier",
        value: "pkce-value",
        options: { httpOnly: true, sameSite: "lax", path: "/" },
      },
    ]);

    expect(mocks.cookieStore.set).toHaveBeenCalledWith(
      "sb-project-auth-token-code-verifier",
      "pkce-value",
      expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/" }),
    );
  });

  it("uses scoped Supabase validation by default", async () => {
    await createServerSupabaseClient();

    expect(mocks.getSupabaseAuthEnvironment).toHaveBeenCalledOnce();
    expect(mocks.getServerEnvironment).not.toHaveBeenCalled();
    expect(mocks.createServerClient).toHaveBeenCalledWith(
      "https://project.supabase.co",
      "publishable",
      expect.any(Object),
    );
  });

  it("continues to support an explicitly passed environment", async () => {
    await createServerSupabaseClient({
      NEXT_PUBLIC_SUPABASE_URL: "https://explicit.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "explicit-key",
    });

    expect(mocks.getSupabaseAuthEnvironment).not.toHaveBeenCalled();
    expect(mocks.createServerClient).toHaveBeenCalledWith(
      "https://explicit.supabase.co",
      "explicit-key",
      expect.any(Object),
    );
  });
});
