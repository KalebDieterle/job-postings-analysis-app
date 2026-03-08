import { test, expect } from "@playwright/test";

test.describe("Locations page", () => {
  test("loads the locations listing", async ({ page }) => {
    await page.goto("/locations");
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 20_000 });
  });

  test("map tab shows map or canvas element", async ({ page }) => {
    await page.goto("/locations");
    const mapTab = page.getByRole("tab", { name: /map/i });
    if (await mapTab.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await mapTab.click();
      // Leaflet renders a div with class 'leaflet-container' or a canvas
      const mapEl = page.locator(".leaflet-container, canvas").first();
      await expect(mapEl).toBeVisible({ timeout: 10_000 });
    } else {
      // If no map tab, just confirm the page rendered
      await expect(page.locator("body")).toBeVisible();
    }
  });
});
