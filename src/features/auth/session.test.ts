import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerSupabaseClient: vi.fn(),
  readDemoSession: vi.fn(),
}));

vi.mock("react", () => ({ cache: (fn: unknown) => fn }));
vi.mock("@/features/auth/demo-session", () => ({
  readDemoSession: mocks.readDemoSession,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));

import { getCurrentUser } from "@/features/auth/session";

describe("getCurrentUser environment isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEMO_MODE", "false");
    vi.stubEnv("APP_URL", "https://orliqo.example");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://orliqo.example");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable");
    vi.stubEnv("DODO_TEST_API_KEY", "");
    vi.stubEnv("DODO_LIVE_API_KEY", "");
    vi.stubEnv("INNGEST_EVENT_KEY", "");
    vi.stubEnv("INNGEST_SIGNING_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("GROQ_API_KEY", "");
    vi.stubEnv("OPENROUTER_API_KEY", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns a Supabase user with no unrelated provider configuration", async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: {
        user: {
          id: "00000000-0000-4000-8000-000000000001",
          email: "google.user@example.com",
          user_metadata: { full_name: "Google User" },
        },
      },
      error: null,
    });
    mocks.createServerSupabaseClient.mockResolvedValue({ auth: { getUser } });

    await expect(getCurrentUser()).resolves.toEqual({
      id: "00000000-0000-4000-8000-000000000001",
      email: "google.user@example.com",
      provider: "supabase",
      fullName: "Google User",
    });
    expect(mocks.readDemoSession).not.toHaveBeenCalled();
    expect(mocks.createServerSupabaseClient).toHaveBeenCalledWith(
      expect.objectContaining({
        APP_URL: "https://orliqo.example",
        NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable",
      }),
    );
  });

  it("preserves demo sessions without creating a Supabase client", async () => {
    vi.stubEnv("DEMO_MODE", "true");
    mocks.readDemoSession.mockResolvedValue({
      kind: "workspace",
      userId: "00000000-0000-4000-8000-000000000002",
      email: "demo@example.com",
      fullName: "Demo User",
    });

    await expect(getCurrentUser()).resolves.toMatchObject({
      provider: "demo",
      email: "demo@example.com",
      demoKind: "workspace",
    });
    expect(mocks.createServerSupabaseClient).not.toHaveBeenCalled();
  });

  it("returns null safely when scoped Supabase configuration is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");

    await expect(getCurrentUser()).resolves.toBeNull();
    expect(mocks.createServerSupabaseClient).not.toHaveBeenCalled();
  });
});
