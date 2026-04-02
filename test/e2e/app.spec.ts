import { test, expect } from "@playwright/test";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MIDI_FILE = join(__dirname, "../fixtures/test-c-major-scale.mid");
const BASE_URL = "http://localhost:5173";

const playBtn = '[aria-label="Play"]';
const pauseBtn = '[aria-label="Pause"]';
const stopBtn = '[aria-label="Stop"]';

test.describe("Piano Trainer App", () => {
  test("shows file loader on initial load", async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator("text=Piano Trainer")).toBeVisible();
    await expect(page.locator("text=Drop a MIDI file")).toBeVisible();
    await page.screenshot({ path: "test/screenshots/01-file-loader.png" });
  });

  test("loads MIDI file and shows waterfall", async ({ page }) => {
    await page.goto(BASE_URL);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(MIDI_FILE);
    await expect(page.locator("canvas")).toBeVisible();

    await expect(page.locator(playBtn)).toBeVisible();
    await expect(page.locator(stopBtn)).toBeVisible();
    await expect(page.locator("text=Test - C Major Scale")).toBeVisible();

    await page.screenshot({ path: "test/screenshots/02-waterfall-loaded.png" });
  });

  test("play button starts playback", async ({ page }) => {
    await page.goto(BASE_URL);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(MIDI_FILE);
    await expect(page.locator("canvas")).toBeVisible();

    await page.click(playBtn);
    await expect(page.locator(pauseBtn)).toBeVisible();

    await page.waitForTimeout(500);
    await page.screenshot({ path: "test/screenshots/03-playing.png" });

    await page.waitForTimeout(1500);
    await page.screenshot({ path: "test/screenshots/04-playing-2sec.png" });
  });

  test("pause and stop work", async ({ page }) => {
    await page.goto(BASE_URL);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(MIDI_FILE);
    await expect(page.locator("canvas")).toBeVisible();

    await page.click(playBtn);
    await page.waitForTimeout(1000);

    await page.click(pauseBtn);
    await expect(page.locator(playBtn)).toBeVisible();
    await page.screenshot({ path: "test/screenshots/05-paused.png" });

    await page.click(stopBtn);
    await page.screenshot({ path: "test/screenshots/06-stopped.png" });
  });

  test("speed control changes playback rate", async ({ page }) => {
    await page.goto(BASE_URL);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(MIDI_FILE);
    await expect(page.locator("canvas")).toBeVisible();

    await page.click("text=0.5x");
    await page.screenshot({ path: "test/screenshots/07-half-speed.png" });
  });

  test("back button returns to file loader", async ({ page }) => {
    await page.goto(BASE_URL);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(MIDI_FILE);
    await expect(page.locator("canvas")).toBeVisible();

    await page.click("text=\u2190");
    await expect(page.locator("text=Piano Trainer")).toBeVisible();
    await expect(page.locator("text=Drop a MIDI file")).toBeVisible();
  });

  test("space bar toggles play/pause", async ({ page }) => {
    await page.goto(BASE_URL);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(MIDI_FILE);
    await expect(page.locator("canvas")).toBeVisible();

    await page.keyboard.press("Space");
    await expect(page.locator(pauseBtn)).toBeVisible();

    await page.keyboard.press("Space");
    await expect(page.locator(playBtn)).toBeVisible();
  });

  test("full playback visual progression", async ({ page }) => {
    await page.goto(BASE_URL);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(MIDI_FILE);
    await expect(page.locator("canvas")).toBeVisible();

    await page.screenshot({ path: "test/screenshots/10-t0-before-play.png" });

    await page.click(playBtn);

    for (let i = 1; i <= 4; i++) {
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `test/screenshots/10-t${i}-playing.png` });
    }

    await page.waitForTimeout(1000);
    await page.screenshot({ path: "test/screenshots/10-t5-after-end.png" });
  });
});
