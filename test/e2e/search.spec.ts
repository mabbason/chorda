import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:5173";

// These tests require the song API running on port 3001
// Run: cd ~/projects/piano-trainer-api && npm run dev

test.describe("Song Search", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    // Wait for API check to complete
    await page.waitForTimeout(1000);
  });

  test("search bar is visible when API is running", async ({ page }) => {
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
    await page.screenshot({ path: "test/screenshots/search-01-home.png" });
  });

  test("searching shows results", async ({ page }) => {
    const searchBar = page.locator('input[placeholder*="Search"]');
    await searchBar.fill("disney");
    await page.waitForTimeout(500);

    // Should show results
    await expect(page.locator("text=Soundtracks").first()).toBeVisible();
    await page.screenshot({ path: "test/screenshots/search-02-results.png" });
  });

  test("clicking a search result loads the song", async ({ page }) => {
    const searchBar = page.locator('input[placeholder*="Search"]');
    await searchBar.fill("beethoven");
    await page.waitForTimeout(500);

    // Wait for results to appear
    await page.waitForTimeout(500);

    // Click the first search result (has genre text)
    const results = page.locator("text=Classical").first();
    await results.click();

    // Should load waterfall
    await expect(page.locator("canvas").first()).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: "test/screenshots/search-03-loaded.png" });
  });

  test("empty search shows no results message", async ({ page }) => {
    const searchBar = page.locator('input[placeholder*="Search"]');
    await searchBar.fill("xyznonexistent123");
    await page.waitForTimeout(500);

    await expect(page.locator("text=No songs found")).toBeVisible();
  });

  test("clearing search shows starter songs again", async ({ page }) => {
    const searchBar = page.locator('input[placeholder*="Search"]');
    await searchBar.fill("disney");
    await page.waitForTimeout(500);

    await searchBar.clear();
    await expect(page.locator("text=Starter songs")).toBeVisible();
  });
});
