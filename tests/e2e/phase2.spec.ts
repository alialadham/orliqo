import { expect, test, type Page } from "@playwright/test";

async function demo(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Use demo workspace" }).click();
  await expect(page).toHaveURL(/\/app\/dashboard$/);
}

test("demo onboarding imports website context and completes all six steps", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Phase Two User");
  await page.getByLabel("Work email").fill("phase2@example.invalid");
  await page.getByRole("textbox", { name: "Password", exact: true }).fill("demo-password-2026");
  await page.getByLabel("Company name").fill("Phase Two Workspace");
  await page.getByRole("combobox", { name: "Country" }).click(); await page.getByRole("option", { name: "Jordan" }).click();
  await page.getByRole("combobox", { name: "Team size" }).click(); await page.getByRole("option", { name: "Just me" }).click();
  await page.getByRole("checkbox", { name: "I agree to the Terms and Privacy Policy." }).click();
  await page.getByRole("button", { name: "Create My Workspace" }).click();
  await page.getByRole("button", { name: "Import from website" }).click();
  await expect(page.getByText("Review website suggestions")).toBeVisible();
  await page.getByRole("button", { name: "Accept all" }).click();
  for (let step = 1; step <= 5; step += 1) await page.getByRole("button", { name: "Save & continue" }).click();
  await expect(page.getByRole("heading", { name: "Review your workspace setup" })).toBeVisible();
  await page.getByRole("button", { name: "Complete onboarding" }).click();
  await expect(page).toHaveURL(/\/app\/dashboard\?onboarding=complete$/);
});

test("lead list filters, creates a lead, opens detail, adds a note, and suppresses", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Desktop CRM workflow");
  await demo(page); await page.goto("/app/leads");
  await expect(page.getByRole("heading", { name: "Leads" })).toBeVisible();
  await page.getByPlaceholder("Industry").fill("Photography"); await page.getByRole("button", { name: "Filter" }).click();
  await expect(page).toHaveURL(/industry=Photography/);
  await page.getByRole("button", { name: "Create lead" }).click();
  await page.getByTestId("lead-business-name").fill("Phase Two New Lead");
  await page.getByTestId("save-lead").click();
  await expect(page.getByRole("dialog", { name: "Create lead" })).toHaveCount(0);
  await page.goto("/app/leads?q=Phase%20Two%20New%20Lead");
  const createdLead = page.getByTestId("leads-scroll").getByRole("link", { name: "Phase Two New Lead", exact: true });
  await expect(createdLead).toBeVisible();
  await createdLead.click();
  await expect(page.getByRole("heading", { name: "Phase Two New Lead" })).toBeVisible();
  await page.getByRole("button", { name: "Notes" }).click();
  await page.getByTestId("lead-note").fill("Phase 2 browser note"); await page.getByTestId("add-note").click();
  await expect(page.getByText("Phase 2 browser note")).toBeVisible();
  await page.getByRole("button", { name: "Overview" }).click();
  page.on("dialog", (dialog) => dialog.accept("Opted out during QA"));
  await page.getByRole("button", { name: "Mark do not contact" }).click();
  await expect(page.getByText("Future campaign addition is blocked.")).toBeVisible();
});

test("CSV preview maps fields and imports a valid demo row", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Desktop import workflow");
  await demo(page); await page.goto("/app/leads/import");
  await page.getByTestId("lead-import-file").setInputFiles({ name: "phase2.csv", mimeType: "text/csv", buffer: Buffer.from("Business Name,Industry,Country,City,Email\nImported QA Lead,Consulting,Jordan,Amman,imported-qa@example.invalid") });
  await page.getByTestId("preview-import").click();
  await expect(page.getByRole("heading", { name: "Map spreadsheet columns" })).toBeVisible();
  await expect(page.getByText("Imported QA Lead")).toBeVisible();
  await page.getByTestId("confirm-import").click();
  await expect(page.getByRole("heading", { name: "Import complete" })).toBeVisible();
  await expect(page.getByText("1", { exact: true }).first()).toBeVisible();
});

test("viewer can read leads but cannot edit them", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Desktop role workflow");
  await demo(page);
  await page.getByRole("button", { name: "Orliqo Demo", exact: true }).click(); await page.getByRole("button", { name: "Northstar Demo Viewer starter" }).click();
  await expect(page.getByRole("button", { name: "Northstar Demo", exact: true })).toBeVisible();
  await page.goto("/app/leads");
  await expect(page.getByRole("heading", { name: "Leads" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create lead" })).toHaveCount(0);
  await page.locator("tbody a").first().click();
  await expect(page.getByRole("button", { name: "Edit" })).toHaveCount(0);
  await page.getByRole("button", { name: "Notes" }).click();
  await expect(page.getByTestId("lead-note")).toBeDisabled();
});

test("mobile onboarding and lead detail have no horizontal page overflow", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "Mobile responsive workflow");
  await demo(page); await page.goto("/app/leads");
  await expect(page.getByRole("heading", { name: "Leads" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
  await page.getByTestId("mobile-lead-link").first().click();
  await expect(page.getByText("Back to leads")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
});
