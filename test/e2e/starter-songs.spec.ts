import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:5173";

test.describe("Starter Songs", () => {
  test("shows song catalog on file loader screen", async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator("text=Chorda")).toBeVisible();
    await expect(page.locator("text=Choose a song to start learning")).toBeVisible();

    // Check all level labels exist
    await expect(page.locator("text=Beginner").first()).toBeVisible();
    await expect(page.locator("text=Easy").first()).toBeVisible();
    await expect(page.locator("text=Intermediate").first()).toBeVisible();
    await expect(page.locator("text=Advanced").first()).toBeVisible();

    // Check some song titles
    await expect(page.locator("text=Twinkle Twinkle Little Star")).toBeVisible();
    await expect(page.locator("text=Ode to Joy")).toBeVisible();
    await expect(page.locator("text=Fur Elise")).toBeVisible();

    await page.screenshot({ path: "test/screenshots/starter-01-catalog.png" });
  });

  test("clicking a starter song loads it", async ({ page }) => {
    await page.goto(BASE_URL);

    await page.click("text=Mary Had a Little Lamb");

    // Should load the waterfall view
    await expect(page.locator("canvas")).toBeVisible();
    await expect(page.locator("text=Mary Had a Little Lamb")).toBeVisible();

    await page.screenshot({ path: "test/screenshots/starter-02-loaded.png" });
  });

  test("can go back to catalog and pick another song", async ({ page }) => {
    await page.goto(BASE_URL);

    await page.click("text=Twinkle Twinkle Little Star");
    await expect(page.locator("canvas")).toBeVisible();

    // Go back
    await page.click("text=\u2190");
    await expect(page.locator("text=Choose a song to start learning")).toBeVisible();

    // Pick a different song
    await page.click("text=Ode to Joy");
    await expect(page.locator("canvas")).toBeVisible();
    await expect(page.locator("text=Ode to Joy")).toBeVisible();
  });

  test("upload still works alongside starter songs", async ({ page }) => {
    await page.goto(BASE_URL);

    // The upload area should still be visible
    await expect(page.locator("text=Drop a MIDI file or click to browse")).toBeVisible();
  });
});
