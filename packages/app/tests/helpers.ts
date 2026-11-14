import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

export const TEST_EMAIL = process.env.SOLO_TEST_EMAIL ?? "test@solo.local";
export const TEST_PASSWORD = process.env.SOLO_TEST_PASSWORD ?? "solo-test-password";

export async function signIn(page: Page): Promise<void> {
  await page.goto("/finance");

  const email = page.getByLabel("Почта");
  const financeHeading = page.getByRole("heading", { name: "Финансы" });

  await email.or(financeHeading).first().waitFor({ timeout: 20_000 });

  if (await email.isVisible().catch(() => false)) {
    await email.fill(TEST_EMAIL);
    await page.getByLabel("Пароль").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Войти", exact: true }).click();
  }

  await expect(financeHeading).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("Продукты").first()).toBeVisible({ timeout: 20_000 });
}
