import { test } from "node:test";
import assert from "node:assert/strict";
import { formatRub, parseRub, parseRubSigned, formatRubCompact } from "../src/money.ts";

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

test("parseRubSigned принимает отрицательный остаток", () => {
  assert.equal(parseRubSigned("-2500"), -250000);
  assert.equal(parseRubSigned("−2 500"), -250000);
  assert.equal(parseRubSigned("-1234,56"), -123456);
});

test("parseRubSigned принимает обычные суммы как положительные", () => {
  assert.equal(parseRubSigned("12 500"), 1250000);
  assert.equal(parseRubSigned("+500"), 50000);
});

test("parseRubSigned различает нулевой и пустой ввод", () => {
  assert.equal(parseRubSigned("0"), 0);
  assert.equal(parseRubSigned("-"), null);
  assert.equal(parseRubSigned(""), null);
});

test("parseRubSigned отвергает мусор и лишние знаки", () => {
  assert.equal(parseRubSigned("--100"), null);
  assert.equal(parseRubSigned("-1,234"), null);
  assert.equal(parseRubSigned("abc"), null);
  assert.equal(parseRubSigned("1-"), null);
});

test("Сумма операции по-прежнему не может быть отрицательной", () => {
  assert.equal(parseRub("-2500"), null);
  assert.equal(parseRub("−2 500"), null);
});
