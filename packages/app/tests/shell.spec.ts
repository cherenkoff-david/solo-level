import { test, expect } from "@playwright/test";

const SHOTS_DIR = "../../design/screenshots";

test("каркас: скриншот раздела «Сегодня»", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Сегодня" })).toBeVisible();
  await page.screenshot({ path: `${SHOTS_DIR}/shell-today.png`, fullPage: true });
});

test("каркас: навигация между разделами", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Прогресс" }).click();
  await expect(page.getByRole("heading", { name: "Прогресс" })).toBeVisible();
  await page.screenshot({ path: `${SHOTS_DIR}/shell-progress.png`, fullPage: true });
});
