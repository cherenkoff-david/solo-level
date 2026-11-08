import { test, expect } from "@playwright/test";

test("финансы: суммы маскируются после 30 секунд бездействия", async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.clock.install();
  await page.goto("/finance");
  await page.getByRole("button", { name: "Сначала посмотреть на примере" }).click();

  await expect(page.getByRole("heading", { name: "Финансы" })).toBeVisible();
  await expect(page.getByRole("status")).toHaveCount(0);
  await expect(page.locator(".nums").filter({ hasText: "₽" }).first()).toBeVisible();

  await page.clock.fastForward(31_000);

  await expect(page.getByRole("status")).toBeVisible();
  await expect(page.locator(".nums").filter({ hasText: "••• ₽" }).first()).toBeVisible();

  await page.mouse.move(20, 20);

  await expect(page.getByRole("status")).toHaveCount(0);
  await expect(page.locator(".nums").filter({ hasText: "••• ₽" })).toHaveCount(0);
});
