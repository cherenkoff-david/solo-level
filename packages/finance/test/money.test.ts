import { test } from "node:test";
import assert from "node:assert/strict";
import { formatRub, parseRub, formatRubCompact } from "../src/money.ts";

test("formatRub скрывает нулевые копейки", () => {
  assert.equal(formatRub(7000), "70\u00a0₽");
  assert.equal(formatRub(0), "0\u00a0₽");
});

test("formatRub показывает копейки, когда они есть", () => {
  assert.equal(formatRub(123455), "1\u2009234,55\u00a0₽");
});

test("formatRub форматирует отрицательные суммы знаком минус", () => {
  assert.equal(formatRub(-1000), "−10\u00a0₽");
});

test("formatRubCompact не добавляет валюту", () => {
  assert.equal(formatRubCompact(-1000), "−10");
  assert.equal(formatRubCompact(123405), "1\u2009234,05");
});

test("parseRub принимает копейки, запятую и пробелы", () => {
  assert.equal(parseRub("1 234,50"), 123450);
  assert.equal(parseRub("1234.5"), 123450);
  assert.equal(parseRub("1\u2009234"), 123400);
  assert.equal(parseRub("0,01"), 1);
});

test("parseRub отвергает мусор и отрицательные значения", () => {
  assert.equal(parseRub(""), null);
  assert.equal(parseRub("abc"), null);
  assert.equal(parseRub("-100"), null);
  assert.equal(parseRub("1,234"), null);
});
