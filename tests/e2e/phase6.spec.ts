import { expect, test } from "@playwright/test";

test("security headers are present without blocking hydration", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  const response = await page.goto("/login");
  expect(response?.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response?.headers()["x-frame-options"]).toBe("DENY");
  expect(response?.headers()["content-security-policy"]).toContain("strict-dynamic");
  await page.getByLabel("Work email").fill("person@example.com");
  await expect(page.getByLabel("Work email")).toHaveValue("person@example.com");
  expect(errors.filter((message) => /hydration|content security policy/i.test(message))).toEqual([]);
});
