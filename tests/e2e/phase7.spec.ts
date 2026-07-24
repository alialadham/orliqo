import { expect, test, type Page } from "@playwright/test";

async function demo(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Use demo workspace" }).click();
  await expect(page).toHaveURL(/\/app\/dashboard$/);
}

test("dashboard renders record-backed Phase 7 analytics", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Desktop workflow");
  await demo(page);
  await expect(
    page.getByRole("region", { name: "Outreach summary" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Outreach performance" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "AI Recommendations" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "30D" }).click();
  await expect(page.getByRole("button", { name: "30D" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("analytics route shows funnel, dimensions, and evidence", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Desktop workflow");
  await demo(page);
  await page.goto("/app/analytics?range=30");
  await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Full outreach funnel" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Performance dimensions" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "90D" }).click();
  await expect(page).toHaveURL(/range=90/);
});

test("analytics remains responsive on mobile", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "Mobile workflow");
  await demo(page);
  await page.goto("/app/analytics");
  await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    ),
  ).toBe(false);
});
