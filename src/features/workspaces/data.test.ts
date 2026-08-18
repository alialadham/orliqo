import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerSupabaseClient: vi.fn(),
  getCurrentUser: vi.fn(),
  readDemoSession: vi.fn(),
  cookieGet: vi.fn(),
}));

vi.mock("react", () => ({ cache: (fn: unknown) => fn }));
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ get: mocks.cookieGet, set: vi.fn() }),
}));
vi.mock("@/features/auth/session", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("@/features/auth/demo-session", () => ({
  readDemoSession: mocks.readDemoSession,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));

import { getWorkspaceContext } from "@/features/workspaces/data";

const userId = "00000000-0000-4000-8000-000000000001";
const workspaceId = "10000000-0000-4000-8000-000000000001";

function supabaseForWorkspace(onboardingComplete = false) {
  return {
    from: vi.fn((table: string) => {
      if (table === "profiles")
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: userId, full_name: "Google User" },
                error: null,
              }),
            }),
          }),
        };
      if (table === "workspace_members")
        return {
          select: () => ({
            eq: () => ({
              eq: async () => ({
                data: [
                  {
                    workspace_id: workspaceId,
                    role: "owner",
                    status: "active",
                  },
                ],
                error: null,
              }),
            }),
          }),
        };
      if (table === "workspaces")
        return {
          select: () => ({
            in: () => ({
              eq: async () => ({
                data: [
                  {
                    id: workspaceId,
                    name: "Google User Workspace",
                    slug: "google-user-workspace",
                    status: "active",
                  },
                ],
                error: null,
              }),
            }),
          }),
        };
      if (table === "subscriptions")
        return {
          select: () => ({
            in: async () => ({
              data: [
                {
                  workspace_id: workspaceId,
                  plan: "trial",
                  status: "trialing",
                },
              ],
              error: null,
            }),
          }),
        };
      if (table === "usage_counters")
        return {
          select: () => ({
            in: () => ({
              eq: async () => ({
                data: [
                  {
                    workspace_id: workspaceId,
                    metric: "ai_messages",
                    used: 10,
                    reserved: 5,
                    limit_value: 100,
                  },
                ],
                error: null,
              }),
            }),
          }),
        };
      if (table === "business_profiles")
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { onboarding_completed: onboardingComplete },
                error: null,
              }),
            }),
          }),
        };
      throw new Error(`Unexpected table: ${table}`);
    }),
  };
}

describe("getWorkspaceContext environment isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEMO_MODE", "false");
    vi.stubEnv("APP_URL", "https://orliqo.example");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://orliqo.example");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable");
    vi.stubEnv("DODO_TEST_API_KEY", "");
    vi.stubEnv("INNGEST_EVENT_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", "");
    mocks.getCurrentUser.mockResolvedValue({
      id: userId,
      email: "google.user@example.com",
      fullName: "Google User",
      provider: "supabase",
    });
    mocks.createServerSupabaseClient.mockResolvedValue(supabaseForWorkspace());
    mocks.cookieGet.mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("loads a bootstrapped Google workspace with minimal Supabase configuration", async () => {
    await expect(getWorkspaceContext()).resolves.toMatchObject({
      user: {
        id: userId,
        email: "google.user@example.com",
        fullName: "Google User",
      },
      activeWorkspace: {
        id: workspaceId,
        role: "owner",
        plan: "trial",
        credits: 85,
      },
      isDemo: false,
      onboardingComplete: false,
    });
    expect(mocks.readDemoSession).not.toHaveBeenCalled();
    expect(mocks.createServerSupabaseClient).toHaveBeenCalledOnce();
  });
});
