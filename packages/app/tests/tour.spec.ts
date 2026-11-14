import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

import { signIn } from "./helpers";

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

async function startTour(page: Page): Promise<void> {
  await signIn(page);
  await page.evaluate(() => localStorage.setItem("solo.finance.tour.seen.v1", "1"));
  await page.reload();
  await expect(page.getByText("Продукты").first()).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: /Обучение/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

async function readGeometry(page: Page) {
  return page.evaluate(() => {
    const card = document.querySelector('[role="dialog"]');
    const ring = document.querySelectorAll("[data-tour-overlay] > div")[1];
    const toBox = (node: Element | null) => {
      if (node === null) return null;
      const box = node.getBoundingClientRect();
      return { top: box.top, left: box.left, width: box.width, height: box.height };
    };
    return {
      card: toBox(card),
      ring: toBox(ring),
      ringVisible: ring === null ? false : Number(getComputedStyle(ring).opacity) > 0.5,
      step: card?.getAttribute("data-side") ?? null,
      title: card?.querySelector("h2")?.textContent ?? "",
    };
  });
}

function overlapPercent(a: Box, b: Box): number {
  const width = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
  const height = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
  if (width <= 0 || height <= 0) return 0;
  return ((width * height) / (b.width * b.height)) * 100;
}

async function waitForStableLayout(page: Page): Promise<void> {
  let previous = "";
  let stable = 0;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const geometry = await readGeometry(page);
    const key = JSON.stringify(geometry);
    stable = key === previous ? stable + 1 : 0;
    previous = key;
    if (stable >= 4) return;
    await page.waitForTimeout(120);
  }
}

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
]) {
  test(`обучение: карточка не перекрывает подсветку ${viewport.width}×${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await startTour(page);

    for (let step = 0; step < 13; step += 1) {
      await expect.poll(async () => (await readGeometry(page)).step).not.toBeNull();
      await waitForStableLayout(page);

      const { card, ring, ringVisible, title } = await readGeometry(page);
      expect(card, `шаг «${title}»: карточка есть`).not.toBeNull();
      expect(card!.width).toBeGreaterThan(0);
      expect(card!.top).toBeGreaterThanOrEqual(0);
      expect(card!.left).toBeGreaterThanOrEqual(0);
      expect(card!.top + card!.height).toBeLessThanOrEqual(viewport.height + 1);
      expect(card!.left + card!.width).toBeLessThanOrEqual(viewport.width + 1);

      if (ringVisible && ring !== null) {
        const overlap = overlapPercent(card!, ring);
        expect(overlap, `шаг «${title}»: перекрытие подсветки`).toBeLessThan(1);
      }

      if (step < 12) {
        await page.getByRole("button", { name: /Далее|Начать/ }).click();
      }
    }
  });
}
