import { expect, test, type Page } from "@playwright/test";

function collectClientFailures(page: Page) {
  const failures: string[] = [];

  page.on("pageerror", (error) => failures.push(error.message));
  page.on("console", (message) => {
    if (["error", "warning", "warn"].includes(message.type())) failures.push(message.text());
  });

  return failures;
}

async function useDemoWorkspace(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Use demo workspace" }).click();
  await expect(page).toHaveURL(/\/app\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Good afternoon, Ali" })).toBeVisible();
}

test("protected redirect, demo controls, responsive navigation, and logout", async ({ page }, testInfo) => {
  const failures = collectClientFailures(page);

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Find the right businesses. Reach them personally." })).toBeVisible();

  await page.goto("/app/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Fdashboard$/);
  await page.getByRole("button", { name: "Use demo workspace" }).click();
  await expect(page).toHaveURL(/\/app\/dashboard$/);

  await page.getByRole("button", { name: "30D" }).click();
  await expect(page.getByRole("button", { name: "30D" })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "Pause" }).click();
  await expect(page.getByRole("button", { name: "Resume" })).toBeVisible();
  await page.getByRole("button", { name: "Resume" }).click();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();

  await page.getByRole("button", { name: "Dismiss" }).click();
  await expect(page.getByRole("button", { name: "Undo" })).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();

  if (testInfo.project.name === "mobile-chromium") {
    await page.getByRole("button", { name: "More" }).click();
    const moreDialog = page.getByRole("dialog", { name: "More" });
    await expect(moreDialog).toBeVisible();
    const dialogBox = await moreDialog.boundingBox();
    const viewport = page.viewportSize();
    expect(dialogBox).not.toBeNull();
    expect(viewport).not.toBeNull();
    expect(Math.abs((dialogBox?.width ?? 0) - (viewport?.width ?? 0))).toBeLessThanOrEqual(1);
    await moreDialog.getByRole("button", { name: "Logout" }).click();
  } else {
    await page.getByRole("button", { name: "Logout" }).click();
  }

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  expect(failures).toEqual([]);
});

test("registration validates and creates a demo onboarding session", async ({ page }) => {
  const failures = collectClientFailures(page);

  await page.goto("/register");
  await page.getByRole("button", { name: "Create My Workspace" }).click();
  await expect(page.getByText("Enter your full name.")).toBeVisible();
  await expect(page.getByText("You must agree to the Terms and Privacy Policy.")).toBeVisible();

  await page.getByLabel("Full name").fill("Demo User");
  await page.getByLabel("Work email").fill("demo-register@example.invalid");
  await page.getByRole("textbox", { name: "Password", exact: true }).fill("demo-password-2026");
  await page.getByLabel("Company name").fill("Orliqo Test Workspace");

  await page.getByRole("combobox", { name: "Country" }).click();
  await page.getByRole("option", { name: "Jordan" }).click();
  await page.getByRole("combobox", { name: "Team size" }).click();
  await page.getByRole("option", { name: "Just me" }).click();
  await page.getByRole("checkbox", { name: "I agree to the Terms and Privacy Policy." }).click();
  await page.getByRole("button", { name: "Create My Workspace" }).click();

  await expect(page).toHaveURL(/\/onboarding\?registered=1$/);
  await expect(page.getByRole("heading", { name: "Tell us about your company" })).toBeVisible();
  await expect(page.getByTestId("company-name")).toHaveValue("Orliqo Test Workspace");
  expect(failures).toEqual([]);
});

test("workspace switching enforces viewer billing restrictions", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Desktop workspace switcher workflow");
  const failures = collectClientFailures(page);

  await useDemoWorkspace(page);
  await page.getByRole("button", { name: "Orliqo Demo", exact: true }).click();
  await page.getByRole("button", { name: "Northstar Demo Viewer starter" }).click();
  await expect(page.getByRole("button", { name: "Northstar Demo", exact: true })).toBeVisible();

  await page.goto("/app/billing");
  await expect(page.getByRole("heading", { name: "Permission required" })).toBeVisible();
  await expect(page.getByText("Your viewer role cannot access billing in this workspace.")).toBeVisible();

  await page.getByRole("button", { name: "Northstar Demo", exact: true }).click();
  await page.getByRole("button", { name: "Orliqo Demo Owner growth" }).click();
  await expect(page.getByRole("button", { name: "Orliqo Demo", exact: true })).toBeVisible();
  await page.goto("/app/billing");
  await expect(page.getByRole("heading", { name: "Billing" })).toBeVisible();
  expect(failures).toEqual([]);
});
