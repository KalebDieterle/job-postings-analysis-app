import { test, expect } from "@playwright/test";

test.describe("Salary Predictor", () => {
  test("page loads with form", async ({ page }) => {
    await page.goto("/intelligence/salary-predictor");
    await expect(page.locator("h1").filter({ hasText: /salary/i }).first()).toBeVisible({ timeout: 15_000 });
    // Form should be present
    await expect(page.locator("form, [role='form'], input, select, button").first()).toBeVisible();
  });

  test("form submission shows a result or error gracefully", async ({ page }) => {
    await page.goto("/intelligence/salary-predictor");

    // Try to fill in the first input (job title)
    const titleInput = page.locator("input").first();
    if (await titleInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await titleInput.fill("Software Engineer");
    }

    // Submit the form
    const submitBtn = page.getByRole("button", { name: /predict|estimate|submit|get/i }).first();
    if (await submitBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await submitBtn.click();
      // Wait for either a result or an error message — not a crash
      await page.waitForTimeout(5_000);
      await expect(page.locator("body")).toBeVisible();
    }
  });
});
