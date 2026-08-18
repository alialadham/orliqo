import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/features/auth/actions", () => ({
  loginAction: vi.fn(),
  oauthLoginAction: vi.fn(),
  useDemoWorkspaceAction: vi.fn(),
}));

import { LoginForm } from "@/components/auth/login-form";
import { loginAction } from "@/features/auth/actions";

describe("LoginForm Google OAuth", () => {
  it("submits Google sign-in to the dedicated initiation route", () => {
    render(<LoginForm />);
    const button = screen.getByRole("button", {
      name: "Continue with Google",
    });
    const form = button.closest("form");

    expect(form).toHaveAttribute("action", "/auth/google");
    expect(form).toHaveAttribute("method", "get");
    expect(
      screen.queryByText("Orliqo could not load this view"),
    ).not.toBeInTheDocument();
  });

  it("explains that Google also creates first-time accounts", () => {
    render(<LoginForm next="/app/leads" />);

    expect(
      screen.getByText(
        "No account yet? Google will create one securely and continue setup.",
      ),
    ).toBeInTheDocument();
    expect(
      screen
        .getByRole("button", { name: "Continue with Google" })
        .closest("form")
        ?.querySelector('input[name="next"]'),
    ).toHaveValue("/app/leads");
  });

  it("recovers when email sign-in unexpectedly fails", async () => {
    vi.mocked(loginAction).mockRejectedValueOnce(new Error("network failed"));
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(
      screen.getByRole("textbox", { name: "Work email" }),
      "user@example.com",
    );
    await user.type(screen.getByLabelText("Password"), "password");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(
      await screen.findByText(
        "We could not sign you in right now. Check your connection and try again.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
  });
});
