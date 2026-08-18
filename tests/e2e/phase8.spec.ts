import { expect, test } from "@playwright/test";

test("keyboard focus and password visibility controls are usable", async ({ page }) => {
  await page.goto("/register");
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toBeVisible();
  const password = page.getByLabel("Password", { exact: true });
  await password.fill("a long memorable passphrase");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(password).toHaveAttribute("type", "text");
});

test("reduced motion leaves auth controls functional", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/login");
  await page.getByLabel("Work email").fill("person@example.com");
  await expect(page.getByLabel("Work email")).toHaveValue("person@example.com");
});
