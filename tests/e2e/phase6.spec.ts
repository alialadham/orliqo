import { expect, test, type Page } from "@playwright/test";

async function demo(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Use demo workspace" }).click();
  await expect(page).toHaveURL(/\/app\/dashboard$/);
}

test("shows authoritative monthly and annual plan pricing", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-chromium",
    "Desktop pricing workflow",
  );
  await page.goto("/pricing");
  await expect(page.getByRole("heading", { name: "Starter" })).toBeVisible();
  await expect(page.getByText("$39/month")).toBeVisible();
  await page.getByRole("link", { name: "Yearly" }).click();
  await expect(page).toHaveURL(/interval=year/);
  await expect(page.getByText("$468/year")).toBeVisible();
  await expect(page.getByText("No annual discount configured")).toBeVisible();
});

test("billing plan catalog remains responsive and test-only", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "mobile-chromium",
    "Mobile billing workflow",
  );
  await demo(page);
  await page.goto("/app/billing");
  await expect(
    page.getByRole("heading", { name: "Billing and plans" }),
  ).toBeVisible();
  await expect(
    page.getByText("Dodo Payments test mode", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    ),
  ).toBe(false);
});
