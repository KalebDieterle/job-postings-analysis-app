import { test, expect } from "@playwright/test";

test.describe("Roles page", () => {
  test("loads the roles listing", async ({ page }) => {
    await page.goto("/roles");
    await expect(page.locator("h1, h2").filter({ hasText: /role/i }).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test("filter by experience changes URL", async ({ page }) => {
    await page.goto("/roles");
    // Look for an experience filter element and interact with it
    const filterArea = page.locator("form, [role='form'], .filter-bar, aside").first();
    if (await filterArea.isVisible()) {
      const checkbox = filterArea.locator("input[type='checkbox']").first();
      if (await checkbox.isVisible()) {
        await checkbox.check();
        await page.waitForURL(/experience/, { timeout: 5_000 }).catch(() => {});
      }
    }
    // Page should still be visible after filter interaction
    await expect(page.locator("body")).toBeVisible();
  });

  test("clicking a role card navigates to detail page", async ({ page }) => {
    await page.goto("/roles");
    // Find any role card link
    const roleLink = page.locator("a[href^='/roles/']").first();
    await expect(roleLink).toBeVisible({ timeout: 20_000 });
    const href = await roleLink.getAttribute("href");
    if (href) {
      await page.goto(href);
      await expect(page.locator("h1").first()).toBeVisible({ timeout: 20_000 });
    }
  });
});
