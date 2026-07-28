import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookieStore: {
    getAll: vi.fn(),
    set: vi.fn(),
  },
  createServerClient: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue(mocks.cookieStore),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: mocks.createServerClient,
}));

import { createServerSupabaseClient } from "@/lib/supabase/server";

describe("server Supabase client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createServerClient.mockReturnValue({ auth: {} });
  });

  it("writes PKCE and session cookies through the route handler cookie store", async () => {
    await createServerSupabaseClient({
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable",
    });

    const options = mocks.createServerClient.mock.calls[0]?.[2];
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
});
