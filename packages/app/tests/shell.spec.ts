import { test, expect } from "@playwright/test";

const SHOTS_DIR = "../../design/screenshots";

test("каркас: скриншот общего экрана-заглушки", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Раздел в разработке" })).toBeVisible();
  await page.screenshot({ path: `${SHOTS_DIR}/shell-today.png`, fullPage: true });
});

test("заглушка: один и тот же экран для всех разделов Solo", async ({ page }) => {
  for (const path of ["/", "/progress", "/spheres", "/settings"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: "Раздел в разработке" })).toBeVisible();
    await expect(page.getByText("Данный раздел ещё в разработке")).toBeVisible();
  }
});

test("заглушка: переход по навигации не меняет экран", async ({ page }) => {
  await page.goto("/");
  const first = await page.locator("main section").innerHTML();
  await page.getByRole("link", { name: "Прогресс" }).click();
  await expect(page).toHaveURL(/\/progress$/);
  const second = await page.locator("main section").innerHTML();
  expect(second).toBe(first);
});

test("логотип: анимируется, скрыт от скринридера и обесцвечивается в «Финансах»", async ({
  page,
}) => {
  await page.goto("/");
  const logo = page.locator("header svg").first();
  await expect(logo).toHaveAttribute("aria-hidden", "true");

  const accentAnimation = await logo.evaluate((node) => {
    const spark = node.querySelector(".logo-spark");
    const host = node as unknown as HTMLElement;
    return {
      spark: spark ? getComputedStyle(spark).animationName : "",
      color: getComputedStyle(host).color,
    };
  });
  expect(accentAnimation.spark).toBe("logo-spark");
  expect(accentAnimation.color).toBe("rgb(186, 156, 255)");

  await page.goto("/finance");
  const financeColor = await page
    .locator("header svg")
    .first()
    .evaluate((node) => getComputedStyle(node as unknown as HTMLElement).color);
  expect(financeColor).toBe("rgb(244, 240, 255)");
});

test("логотип: при reduced motion движение отключено, знак виден", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const spark = page.locator("header svg .logo-spark");
  await expect(spark).toBeVisible();
  const styles = await spark.evaluate((node) => {
    const computed = getComputedStyle(node);
    return { animationName: computed.animationName, dasharray: computed.strokeDasharray };
  });
  expect(styles.animationName).toBe("none");
  expect(styles.dasharray).toBe("none");
});
