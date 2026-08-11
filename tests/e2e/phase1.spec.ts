import { expect, test } from "@playwright/test";

test("sign-in offers email and Google without prototype controls", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await expect(page.getByText(/demo workspace/i)).toHaveCount(0);
  await expect(page.getByText(/microsoft/i)).toHaveCount(0);
});

test("protected routes return to sign-in with a useful session message", async ({ page }) => {
  await page.goto("/app/dashboard");
  await expect(page).toHaveURL(/\/login\?.*error=session_expired/);
  await expect(page.getByText("Your session expired. Sign in again to continue.")).toBeVisible();
});
