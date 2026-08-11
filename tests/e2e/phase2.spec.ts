import { expect, test } from "@playwright/test";

test("registration is short, accessible, and supports Google", async ({ page }) => {
  await page.goto("/register");
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await expect(page.getByLabel("Full name")).toBeVisible();
  await expect(page.getByLabel("Work email")).toBeVisible();
  await expect(page.getByText("At least 15 characters")).toBeVisible();
  await expect(page.getByLabel(/Business name/i)).toHaveCount(0);
  await expect(page.getByText(/demo/i)).toHaveCount(0);
});

test("password guidance updates without requiring composition rules", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Password", { exact: true }).fill("a long memorable passphrase");
  await expect(page.getByRole("progressbar", { name: /Password strength/ })).toHaveAttribute("aria-valuenow", /[3-4]/);
  await expect(page.getByText("At least 15 characters")).toHaveClass(/text-success/);
});
