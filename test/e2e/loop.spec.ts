import { test, expect } from "@playwright/test";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MIDI_FILE = join(__dirname, "../fixtures/test-c-major-scale.mid");
const BASE_URL = "http://localhost:5173";

const playBtn = '[aria-label="Play"]';
const pauseBtn = '[aria-label="Pause"]';

async function loadSong(page: import("@playwright/test").Page) {
  await page.goto(BASE_URL);
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(MIDI_FILE);
  await expect(page.locator("canvas")).toBeVisible();
}

test.describe("Practice Loop", () => {
  test("A and B buttons are visible after loading song", async ({ page }) => {
    await loadSong(page);
    await expect(page.locator("button", { hasText: "A" })).toBeVisible();
    await expect(page.locator("button", { hasText: "B" })).toBeVisible();
    await page.screenshot({ path: "test/screenshots/loop-01-buttons.png" });
  });

  test("B button is disabled before setting A", async ({ page }) => {
    await loadSong(page);
    const bButton = page.locator("button", { hasText: "B" });
    await expect(bButton).toBeDisabled();
  });

  test("setting A highlights the A button", async ({ page }) => {
    await loadSong(page);
    const aButton = page.locator("button", { hasText: "A" });
    await aButton.click();
    // A button should now have amber styling (active state)
    await expect(aButton).toHaveClass(/bg-amber/);
    await page.screenshot({ path: "test/screenshots/loop-02-a-set.png" });
  });

  test("setting A then B creates a loop with measure labels", async ({ page }) => {
    await loadSong(page);

    // Play for 1 second to advance position
    await page.click(playBtn);
    await page.waitForTimeout(1000);
    await page.click(pauseBtn);

    // Set A
    await page.locator("button", { hasText: "A" }).click();

    // Play a bit more
    await page.click(playBtn);
    await page.waitForTimeout(1500);
    await page.click(pauseBtn);

    // Set B
    await page.locator("button", { hasText: "B" }).click();

    // Should show measure range label (e.g. "m1-3")
    await expect(page.locator("text=/m\\d+-\\d+/")).toBeVisible();

    // Clear button should appear
    await expect(page.locator("button", { hasText: "×" })).toBeVisible();

    await page.screenshot({ path: "test/screenshots/loop-03-ab-set.png" });
  });

  test("clearing loop removes markers", async ({ page }) => {
    await loadSong(page);

    // Set A at start
    await page.locator("button", { hasText: "A" }).click();
    // Set B at start (single measure loop)
    await page.locator("button", { hasText: "B" }).click();

    // Clear
    await page.locator("button", { hasText: "×" }).click();

    // Measure label should disappear
    await expect(page.locator("text=/m\\d+-\\d+/")).not.toBeVisible();
    await page.screenshot({ path: "test/screenshots/loop-04-cleared.png" });
  });

  test("loop auto-seeks back to start", async ({ page }) => {
    await loadSong(page);

    // Set A at position 0
    await page.locator("button", { hasText: "A" }).click();
    // Set B at position 0 (creates smallest possible loop - one measure)
    await page.locator("button", { hasText: "B" }).click();

    // Play and wait for loop to cycle
    await page.click(playBtn);
    await page.waitForTimeout(3000);

    // Should still be playing (not finished, because loop keeps it going)
    await expect(page.locator(pauseBtn)).toBeVisible();

    await page.screenshot({ path: "test/screenshots/loop-05-auto-loop.png" });
  });

  test("loop region is visible on waterfall", async ({ page }) => {
    await loadSong(page);

    // Set A/B loop
    await page.locator("button", { hasText: "A" }).click();

    await page.click(playBtn);
    await page.waitForTimeout(1500);
    await page.click(pauseBtn);

    await page.locator("button", { hasText: "B" }).click();

    // Take screenshot to verify loop region overlay is drawn
    await page.screenshot({ path: "test/screenshots/loop-06-waterfall-overlay.png" });
  });
});
