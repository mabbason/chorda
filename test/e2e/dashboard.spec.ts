import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:5173";

test.describe("Progress Dashboard", () => {
  test("dashboard button is visible on home screen", async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator("text=Dashboard")).toBeVisible();
    await page.screenshot({ path: "test/screenshots/dashboard-01-button.png" });
  });

  test("opens dashboard and shows empty state", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click("text=Dashboard");

    await expect(page.locator("text=Progress Dashboard")).toBeVisible();
    await expect(page.locator("text=+ New")).toBeVisible();
    await page.screenshot({ path: "test/screenshots/dashboard-02-empty.png" });
  });

  test("create a profile", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click("text=Dashboard");

    await page.click("text=+ New");
    await page.fill('input[placeholder="Name..."]', "Test Kid");
    await page.click("text=Create");

    await expect(page.locator("text=Test Kid")).toBeVisible();
    await expect(page.locator("text=Total Practice")).toBeVisible();

    await page.screenshot({ path: "test/screenshots/dashboard-03-profile.png" });
  });

  test("close dashboard returns to home", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click("text=Dashboard");
    await page.click("text=× Close");

    await expect(page.locator("text=Chorda")).toBeVisible();
  });
});
