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

export function parseRub(input: string): Money | null {
  const cleaned = input.replace(/\u00a0|\u2009|\s/g, "").replace(",", ".");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  const parts = cleaned.split(".");
  const rub = Number(parts[0] ?? "0");
  const fraction = (parts[1] ?? "").padEnd(2, "0");
  const minor = rub * 100 + Number(fraction || "0");
  if (!Number.isFinite(minor) || minor < 0) return null;
  return Math.round(minor);
}
