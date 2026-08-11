import { expect, test } from "@playwright/test";

test("forgot-password response resists account enumeration", async ({ page }) => {
  await page.goto("/forgot-password");
  await expect(page.locator('meta[name="referrer"]')).toHaveAttribute("content", "no-referrer");
  await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
});

test("auth callback failures return to a useful sign-in message", async ({ page }) => {
  await page.goto("/auth/callback");
  await expect(page).toHaveURL(/\/login\?error=oauth_callback_failed/);
  await expect(page.getByText("We couldn't complete Google sign-in. Please try again.")).toBeVisible();
});
