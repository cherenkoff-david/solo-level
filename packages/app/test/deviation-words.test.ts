import { test } from "node:test";
import assert from "node:assert/strict";

import { deviationWords, deviationWordsWithPreposition } from "../src/app/finance/deviationWords.ts";

test("Слова для направления расхождения совпадают на всех экранах", () => {
  assert.equal(deviationWords("over"), "сверх плана");
  assert.equal(deviationWords("under"), "ниже плана");
  assert.equal(deviationWords("exact"), "по плану");
  assert.equal(deviationWords("no_plan"), "без плана");
});

test("Форма с предлогом для чипа баланса", () => {
  assert.equal(deviationWordsWithPreposition("over"), "выше плана на");
  assert.equal(deviationWordsWithPreposition("under"), "ниже плана на");
  assert.equal(deviationWordsWithPreposition("exact"), "ровно по плану");
});

test("В формулировках нет знаков и оценки", () => {
  for (const direction of ["over", "under", "exact", "no_plan"] as const) {
    const words = deviationWords(direction);
    assert.ok(!/[+\-−]/.test(words), `«${words}» не должно содержать знака`);
    assert.ok(!/перерасход|провал|плохо/i.test(words), `«${words}» не должно быть оценкой`);
  }
});
