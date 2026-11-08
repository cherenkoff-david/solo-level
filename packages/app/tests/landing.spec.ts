import { test, expect } from "@playwright/test";

test("лендинг: заголовок и переход к приложению", async ({ page }) => {
  await page.goto("/welcome");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Расти");
  await page.getByRole("link", { name: "Открыть Solo" }).first().click();
  await expect(page).toHaveURL(/\/$/);
});

test("лендинг: отметка дела растит уровень", async ({ page }) => {
  await page.goto("/welcome");
  const demo = page.locator(".landing-demo");
  await expect(demo.getByText("ур. 1 · 0 XP")).toBeVisible();
  await demo.getByRole("button", { name: /Тренировка/ }).click();
  await expect(demo.getByText("ур. 1 · 60 XP")).toBeVisible();
  await expect(demo.getByText("60 / 100 XP до уровня 2")).toBeVisible();
  await demo.getByRole("button", { name: /20 минут английского/ }).click();
  await expect(demo.getByText(/XP до уровня/)).toBeVisible();
});

test("лендинг: пропуск не отнимает опыт", async ({ page }) => {
  await page.goto("/welcome");
  const demo = page.locator(".landing-demo");
  await demo.getByRole("button", { name: /Тренировка/ }).click();
  const before = await demo.locator("p.nums").first().innerText();
  await demo.getByRole("button", { name: "Пропустить неделю" }).click();
  await expect(demo.getByText(/−0 XP/)).toBeVisible();
  await expect(demo.locator("p.nums").first()).toHaveText(before);
});

test("лендинг: этапы меняют уровень персонажа", async ({ page }) => {
  await page.goto("/welcome");
  const stage = page.locator(".landing-split__side--stage");
  await expect(stage.getByText("уровень 1 · 0 XP")).toBeVisible();
  await page.locator("#stage-range").fill("3");
  await expect(stage.getByText("уровень 10 · 1104 XP")).toBeVisible();
});

test("лендинг: отклонение в финансах считается", async ({ page }) => {
  await page.goto("/welcome");
  const demo = page.locator(".finance-demo");
  await expect(demo.getByText("Факт совпадает с планом.")).toBeVisible();
  await demo.getByRole("button", { name: /Поступление 12 000/ }).click();
  await expect(demo.getByText(/Отклонение \+12\s?000/u)).toBeVisible();
  await expect(demo.getByText("Выше плана")).toBeVisible();
});

test("лендинг: контент виден после прокрутки", async ({ page }) => {
  await page.goto("/welcome");
  for (let y = 0; y < 8000; y += 500) {
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(800);
  const hidden = await page.evaluate(
    () =>
      Array.from(document.querySelectorAll(".reveal-child")).filter(
        (el) => Number(getComputedStyle(el).opacity) < 0.9,
      ).length,
  );
  expect(hidden).toBe(0);
});
