import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const signInWithOAuth = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/features/auth/actions", () => ({
  loginAction: vi.fn(),
  oauthLoginAction: vi.fn(),
  useDemoWorkspaceAction: vi.fn(),
}));

vi.mock("@/lib/supabase/browser", () => ({
  createBrowserSupabaseClient: () => ({ auth: { signInWithOAuth } }),
}));

import { LoginForm } from "@/components/auth/login-form";

describe("LoginForm Google OAuth", () => {
  beforeEach(() => {
    signInWithOAuth.mockReset();
    vi.spyOn(window.location, "assign").mockImplementation(() => undefined);
  });

  it("starts Google OAuth with the browser callback and redirects to Supabase", async () => {
    signInWithOAuth.mockResolvedValue({
      data: { url: "https://supabase.test/auth/v1/authorize?provider=google" },
      error: null,
    });
    const user = userEvent.setup();

    render(<LoginForm />);
    await user.click(
      screen.getByRole("button", { name: "Continue with Google" }),
    );

    await waitFor(() =>
      expect(signInWithOAuth).toHaveBeenCalledWith({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      }),
    );
    expect(window.location.assign).toHaveBeenCalledWith(
      "https://supabase.test/auth/v1/authorize?provider=google",
    );
  });

  it("shows a visible error when Google OAuth cannot start", async () => {
    signInWithOAuth.mockResolvedValue({
      data: { url: null },
      error: new Error("Google provider unavailable"),
    });
    const user = userEvent.setup();

    render(<LoginForm />);
    await user.click(
      screen.getByRole("button", { name: "Continue with Google" }),
    );

    expect(
      await screen.findByText("Google provider unavailable"),
    ).toBeInTheDocument();
  });
});
