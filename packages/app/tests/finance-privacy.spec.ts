import { test, expect } from "@playwright/test";

import { signIn } from "./helpers";

test("финансы: суммы маскируются после 30 секунд бездействия", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("solo.finance.tour.seen.v1", "1"));
  await page.clock.install();
  await signIn(page);

  await expect(page.getByRole("status")).toHaveCount(0);
  await expect(page.locator(".nums").filter({ hasText: "₽" }).first()).toBeVisible();

  await page.clock.fastForward(31_000);

  await expect(page.getByRole("status")).toBeVisible();
  await expect(page.locator(".nums").filter({ hasText: "••• ₽" }).first()).toBeVisible();

  await page.mouse.move(20, 20);

  await expect(page.getByRole("status")).toHaveCount(0);
  await expect(page.locator(".nums").filter({ hasText: "••• ₽" })).toHaveCount(0);
});
