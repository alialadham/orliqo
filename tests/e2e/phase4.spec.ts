import { expect, test, type Page } from "@playwright/test";

async function demo(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Use demo workspace" }).click();
  await expect(page).toHaveURL(/\/app\/dashboard$/);
}

test("validates provider health and a deterministic email preview", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-chromium",
    "Desktop provider workflow",
  );
  await demo(page);
  await page.goto("/app/integrations");
  await expect(
    page.getByRole("heading", { name: "Integrations" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Test connection" }).first().click();
  await expect(
    page.getByText(/passed its deterministic sandbox health check/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Validate test email" }).click();
  await expect(page.getByText(/Deterministic no-send completed/)).toBeVisible();
});

test("syncs official WhatsApp templates and exposes rejection state", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-chromium",
    "Desktop WhatsApp workflow",
  );
  await demo(page);
  await page.goto("/app/integrations/whatsapp/templates");
  await expect(
    page.getByRole("heading", { name: "WhatsApp templates" }),
  ).toBeVisible();
  await expect(
    page.getByText("Unsupported or misleading claims"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sync templates" }).click();
  await expect(
    page.getByText(/official Cloud API template fixtures reconciled/),
  ).toBeVisible();
});

test("tracks manual social outreach without automated send claims", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-chromium",
    "Desktop manual workflow",
  );
  await demo(page);
  await page.goto("/app/integrations/manual-social");
  await expect(
    page.getByRole("heading", { name: "Manual social outreach" }),
  ).toBeVisible();
  await expect(page.getByText("No auto-DM")).toBeVisible();
  const mark = page.getByRole("button", { name: "Mark sent" }).first();
  await mark.click();
  await expect(
    page.getByText(/activity marked as manually sent/),
  ).toBeVisible();
});

test("creates owned calendar events and leaves external events read-only", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-chromium",
    "Desktop calendar workflow",
  );
  await demo(page);
  await page.goto("/app/calendar");
  await expect(page.getByRole("heading", { name: "Calendar" })).toBeVisible();
  await expect(page.getByText("External · read-only")).toBeVisible();
  await page.getByRole("button", { name: "Schedule in sandbox" }).click();
  await expect(
    page.getByText("Orliqo-owned calendar event scheduled in sandbox mode."),
  ).toBeVisible();
});

test("Phase 4 routes remain responsive on mobile", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "mobile-chromium",
    "Mobile Phase 4 workflow",
  );
  await demo(page);
  for (const path of [
    "/app/integrations",
    "/app/integrations/manual-social",
    "/app/calendar",
  ]) {
    await page.goto(path);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      ),
    ).toBe(false);
  }
});
