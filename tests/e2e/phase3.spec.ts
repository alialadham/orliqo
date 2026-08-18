import { expect, test } from "@playwright/test";

test("home page presents broad business outreach positioning", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Find the right businesses/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Create your workspace/ })).toBeVisible();
  await expect(page.getByText(/demo mode|research fixtures|signed demo/i)).toHaveCount(0);
});

test("Orliqo brand metadata replaces framework defaults", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Orliqo/);
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", /orliqo-mark/);
  await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute("content", "Orliqo");
});
