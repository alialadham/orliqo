import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getWorkspaceContext: vi.fn(),
  getWorkspaceSearchRecords: vi.fn(),
  getUnreadNotifications: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/features/auth/session", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("@/features/workspaces/data", () => ({
  getWorkspaceContext: mocks.getWorkspaceContext,
}));
vi.mock("@/features/navigation/search", () => ({
  getWorkspaceSearchRecords: mocks.getWorkspaceSearchRecords,
}));
vi.mock("@/features/notifications/data", () => ({
  getUnreadNotifications: mocks.getUnreadNotifications,
}));
vi.mock("@/components/app/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-shell">{children}</div>
  ),
}));

import ProtectedAppLayout from "@/app/app/layout";

const context = {
  user: {
    id: "00000000-0000-4000-8000-000000000001",
    email: "google.user@example.com",
    fullName: "Google User",
    initials: "GU",
  },
  activeWorkspace: {
    id: "10000000-0000-4000-8000-000000000001",
    name: "Google User Workspace",
    slug: "google-user-workspace",
    role: "owner",
    plan: "trial",
    credits: 100,
  },
  workspaces: [],
  isDemo: false,
};

describe("authenticated app routing after Google OAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({
      id: context.user.id,
      email: context.user.email,
      provider: "supabase",
    });
    mocks.getWorkspaceSearchRecords.mockResolvedValue([]);
    mocks.getUnreadNotifications.mockResolvedValue([]);
  });

  it("sends a new Google user with incomplete onboarding to onboarding", async () => {
    mocks.getWorkspaceContext.mockResolvedValue({
      ...context,
      onboardingComplete: false,
    });

    await expect(
      ProtectedAppLayout({ children: <div>Dashboard</div> }),
    ).rejects.toThrow("REDIRECT:/onboarding");
    expect(mocks.redirect).toHaveBeenCalledWith("/onboarding");
  });

  it("renders the dashboard shell for an existing completed Google user", async () => {
    const completeContext = { ...context, onboardingComplete: true };
    mocks.getWorkspaceContext.mockResolvedValue(completeContext);

    const view = await ProtectedAppLayout({
      children: <div>Dashboard</div>,
    });
    render(view);

    expect(screen.getByTestId("app-shell")).toHaveTextContent("Dashboard");
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(mocks.getWorkspaceSearchRecords).toHaveBeenCalledWith(
      completeContext,
    );
    expect(mocks.getUnreadNotifications).toHaveBeenCalledWith(completeContext);
  });
});
