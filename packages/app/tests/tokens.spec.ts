import { test, expect } from "@playwright/test";

test("токены и шрифты применились", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });

  await page.goto("/");

  const bodyBg = await page.evaluate(() =>
    getComputedStyle(document.body).backgroundColor,
  );
  expect(bodyBg).toBe("rgb(3, 0, 20)");

  await page.getByRole("heading", { name: "Раздел в разработке" }).waitFor();
  await page.evaluate(() => document.fonts.ready);

  const loaded = await page.evaluate(() => document.fonts.check("14px 'Inter Variable'"));
  expect(loaded).toBe(true);

  const mono = await page.evaluate(() => document.fonts.check("12px 'JetBrains Mono'"));
  expect(mono).toBe(true);

  expect(errors).toEqual([]);
});
