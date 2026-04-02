import { test, expect } from "@playwright/test";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MIDI_FILE = join(__dirname, "../fixtures/bellas-lullaby.mid");

const playBtn = '[aria-label="Play"]';
const pauseBtn = '[aria-label="Pause"]';

test.describe("Bella's Lullaby - Real Song Test", () => {
  test("load and visual progression", async ({ page }) => {
    await page.goto("http://localhost:5173");
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(MIDI_FILE);
    await expect(page.locator("canvas")).toBeVisible();

    // Title should show filename, not "Untitled"
    await expect(page.locator("text=bellas-lullaby")).toBeVisible();

    await page.screenshot({ path: "test/screenshots/bella-00-loaded.png" });

    await page.click(playBtn);
    await expect(page.locator(pauseBtn)).toBeVisible();

    // t=3s
    await page.waitForTimeout(3000);
    await page.screenshot({ path: "test/screenshots/bella-01-t3.png" });

    // t=8s
    await page.waitForTimeout(5000);
    await page.screenshot({ path: "test/screenshots/bella-02-t8.png" });

    // Pause
    await page.click(pauseBtn);
    await page.screenshot({ path: "test/screenshots/bella-03-paused.png" });

    // Hand separation: hide left hand
    await page.click('button[title="Hide left hand"]');
    await page.screenshot({ path: "test/screenshots/bella-04-right-only.png" });

    // Show left, hide right
    await page.click('button[title="Show left hand"]');
    await page.click('button[title="Hide right hand"]');
    await page.screenshot({ path: "test/screenshots/bella-05-left-only.png" });

    // Restore both
    await page.click('button[title="Show right hand"]');

    // Test slow speed
    await page.click("text=0.5x");
    await page.click(playBtn);
    await page.waitForTimeout(3000);
    await page.screenshot({ path: "test/screenshots/bella-06-slow.png" });

    await page.click(pauseBtn);
  });
});
