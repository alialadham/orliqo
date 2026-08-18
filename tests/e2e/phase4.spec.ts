import { expect, test } from "@playwright/test";

test("privacy policy describes actual processing and rights", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /AI processing/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Your rights/ })).toBeVisible();
  await expect(page.getByText(/Demo data/i)).toHaveCount(0);
});

test("terms cover responsible outreach and AI review", async ({ page }) => {
  await page.goto("/terms");
  await expect(page.getByRole("heading", { name: "Terms of Service" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Responsible outreach/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /AI-generated content/ })).toBeVisible();
});
