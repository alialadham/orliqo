import { expect, test, type Page } from "@playwright/test";

async function demo(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Use demo workspace" }).click();
  await expect(page).toHaveURL(/\/app\/dashboard$/);
}

test("reviews inbox suggestions without a live send", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-chromium",
    "Desktop inbox workflow",
  );
  await demo(page);
  await page.goto("/app/inbox");
  await expect(
    page.getByRole("heading", { name: "Unified inbox" }),
  ).toBeVisible();
  await expect(page.getByText("Synthetic inbox")).toBeVisible();
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(page.getByText("accepted", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Send approved reply" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "friendlier" }).click();
  await expect(page.getByText("pending", { exact: true })).toBeVisible();
});

test("filters WhatsApp and applies deterministic stop-contact", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-chromium",
    "Desktop inbox workflow",
  );
  await demo(page);
  await page.goto(
    "/app/inbox?folder=all&channel=whatsapp&conversation=phase5-conversation-7",
  );
  await expect(page.getByText("Petra Kitchens").first()).toBeVisible();
  await page.getByRole("button", { name: "Confirm stop contact" }).click();
  await expect(page.getByText("Do not contact", { exact: true })).toBeVisible();
});

test("Phase 5 inbox remains responsive on mobile", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "mobile-chromium",
    "Mobile inbox workflow",
  );
  await demo(page);
  await page.goto("/app/inbox?channel=whatsapp");
  await expect(
    page.getByRole("heading", { name: "Unified inbox" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    ),
  ).toBe(false);
});
