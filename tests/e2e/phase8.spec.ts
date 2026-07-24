import { expect, test, type Page } from "@playwright/test";

async function enterDemo(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Use demo workspace" }).click();
  await expect(page).toHaveURL(/\/app\/dashboard$/);
  await expect(page.locator("#main-content")).toBeVisible();
}

test("security headers and unknown-route handling are release safe", async ({
  page,
}) => {
  const response = await page.goto("/");
  expect(response?.headers()["content-security-policy"]).toContain(
    "default-src 'self'",
  );
  expect(response?.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response?.headers()["x-frame-options"]).toBe("DENY");
  await page.goto("/not-a-real-route");
  await expect(
    page.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible();
});

test("campaign draft, generation, approval, and launch gates work", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Desktop workflow");
  await enterDemo(page);
  await page.goto("/app/campaigns/new");
  for (let step = 0; step < 5; step += 1)
    await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Save campaign draft" }).click();
  await expect(page).toHaveURL(/\/app\/campaigns\/[^/]+$/);
  await page
    .getByRole("button", { name: "Generate grounded messages" })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Generated 8 grounded messages",
  );
  for (let remaining = 8; remaining > 0; remaining -= 1) {
    const approveButtons = page.getByRole("button", { name: "Approve" });
    await expect(approveButtons).toHaveCount(remaining);
    await approveButtons.first().click();
  }
  await page.getByRole("button", { name: "Launch campaign" }).click();
  await expect(page.getByText("Campaign launch applied safely.")).toBeVisible();
});

test("keyboard skip link reaches the application content", async ({ page }) => {
  await enterDemo(page);
  await page.goto("/app/dashboard");
  await expect(
    page.getByRole("heading", { name: "Good afternoon, Ali" }),
  ).toBeVisible();
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to main content" });
  await expect(skip).toBeFocused();
  await skip.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
});

test("dashboard has no horizontal overflow at supported breakpoints", async ({
  page,
}) => {
  await enterDemo(page);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    ),
  ).toBe(false);
});
