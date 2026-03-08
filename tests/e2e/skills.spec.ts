import { test, expect } from "@playwright/test";

test.describe("Skills page", () => {
  test("loads skills grid", async ({ page }) => {
    await page.goto("/skills");
    await expect(page.locator("h1, h2").filter({ hasText: /skill/i }).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test("view toggle changes display", async ({ page }) => {
    await page.goto("/skills?view=table");
    await expect(page.locator("table").first()).toBeVisible({ timeout: 15_000 });
    // Page should still be visible
    await expect(page.locator("body")).toBeVisible();
  });

  test("export data button is present", async ({ page }) => {
    await page.goto("/skills");
    const exportBtn = page.getByRole("button", { name: /export/i });
    await expect(exportBtn).toBeVisible({ timeout: 20_000 });
  });
});
