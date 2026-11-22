import type { Money } from "./types.ts";

const THIN_SPACE = "\u2009";
const NBSP = "\u00a0";

function groupThousands(value: number): string {
  const digits = String(value);
  let out = "";
  for (let i = 0; i < digits.length; i += 1) {
    const rest = digits.length - i;
    out += digits[i];
    if (rest > 1 && rest % 3 === 1) out += THIN_SPACE;
  }
  return out;
}

export function formatRub(amountMinor: Money): string {
  const rounded = Math.round(amountMinor);
  const sign = rounded < 0 ? "−" : "";
  const abs = Math.abs(rounded);
  const rub = Math.trunc(abs / 100);
  const kop = abs % 100;
  const rubStr = groupThousands(rub);
  if (kop === 0) return `${sign}${rubStr}${NBSP}₽`;
  return `${sign}${rubStr},${String(kop).padStart(2, "0")}${NBSP}₽`;
}

export function formatRubCompact(amountMinor: Money): string {
  const rounded = Math.round(amountMinor);
  const sign = rounded < 0 ? "−" : "";
  const abs = Math.abs(rounded);
  const rub = Math.trunc(abs / 100);
  const kop = abs % 100;
  if (kop === 0) return `${sign}${groupThousands(rub)}`;
  return `${sign}${groupThousands(rub)},${String(kop).padStart(2, "0")}`;
}

function parseMinor(input: string, allowNegative: boolean): Money | null {
  const cleaned = input
    .replace(/\u00a0|\u2009|\s/g, "")
    .replace(/[\u2212\u2013\u2014]/g, "-")
    .replace(",", ".");
  if (cleaned === "" || cleaned === "-" || cleaned === "." || cleaned === "-.") return null;
  const match = /^([+-]?)(\d+)(?:\.(\d{0,2}))?$/.exec(cleaned);
  if (match === null) return null;
  const sign = match[1] === "-" ? -1 : 1;
  if (sign < 0 && !allowNegative) return null;
  const rub = Number(match[2]);
  const fraction = (match[3] ?? "").padEnd(2, "0");
  const minor = rub * 100 + Number(fraction || "0");
  if (!Number.isFinite(minor)) return null;
  return sign * Math.round(minor);
}

/** Сумма операции: только положительная, направление задаёт категория. */
export function parseRub(input: string): Money | null {
  return parseMinor(input, false);
}

/**
 * Баланс на руках: допускает отрицательное значение.
 *
 * Остаток — не сумма операции: отрицательный остаток означает долг, и это
 * нормальное стартовое состояние («на руках минус», кредитка в минусе).
 * У операции такого смысла нет, поэтому для неё остаётся `parseRub`.
 */
export function parseRubSigned(input: string): Money | null {
  return parseMinor(input, true);
}
