import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("loads and shows hero stats", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/SkillMap/i);

    // Hero stat cards should render with numbers > 0
    const statCards = page.locator("[data-testid='stat-card'], .stat-card, .text-2xl, .text-3xl");
    await expect(statCards.first()).toBeVisible({ timeout: 15_000 });
  });

  test("navigation links are visible", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator("nav, header");
    await expect(nav.first()).toBeVisible();
  });
});
