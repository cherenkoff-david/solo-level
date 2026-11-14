import type { IsoDate } from "./types.ts";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function parseIso(date: IsoDate): Date {
  const parts = date.split("-");
  const year = Number(parts[0] ?? "0");
  const month = Number(parts[1] ?? "1");
  const day = Number(parts[2] ?? "1");
  return new Date(Date.UTC(year, month - 1, day));
}

export function toIso(date: Date): IsoDate {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayIso(now: Date = new Date()): IsoDate {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return toIso(new Date(parseIso(date).getTime() + days * MS_PER_DAY));
}

export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((parseIso(to).getTime() - parseIso(from).getTime()) / MS_PER_DAY);
}

export function monthKeyOf(date: IsoDate): string {
  return date.slice(0, 7);
}

export function monthStartOf(date: IsoDate): IsoDate {
  return `${monthKeyOf(date)}-01`;
}

export function monthEndOf(date: IsoDate): IsoDate {
  const key = monthKeyOf(date);
  return `${key}-${String(daysInMonth(key)).padStart(2, "0")}`;
}

export function daysInMonth(monthKey: string): number {
  const parts = monthKey.split("-");
  const year = Number(parts[0] ?? "1970");
  const month = Number(parts[1] ?? "1");
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function addMonths(monthKey: string, delta: number): string {
  const parts = monthKey.split("-");
  const year = Number(parts[0] ?? "1970");
  const month = Number(parts[1] ?? "1");
  const total = year * 12 + (month - 1) + delta;
  const nextYear = Math.floor(total / 12);
  const nextMonth = (total % 12) + 1;
  return `${String(nextYear).padStart(4, "0")}-${String(nextMonth).padStart(2, "0")}`;
}

export function clampDay(monthKey: string, day: number): number {
  const limit = daysInMonth(monthKey);
  return Math.min(Math.max(day, 1), limit);
}

export function rangeDays(from: IsoDate, to: IsoDate): IsoDate[] {
  const out: IsoDate[] = [];
  let cursor = from;
  let guard = 0;
  while (cursor <= to && guard < 4000) {
    out.push(cursor);
    cursor = addDays(cursor, 1);
    guard += 1;
  }
  return out;
}

export function isWithin(date: IsoDate, from: IsoDate, to: IsoDate): boolean {
  return date >= from && date <= to;
}

/** Границы диапазона по месяцам: ноябрь 2026 → январь 2027 даёт 2026-11-01 … 2027-01-31. */
export function monthRangeBounds(
  fromMonth: string,
  toMonth: string,
): { from: IsoDate; to: IsoDate } {
  const start = fromMonth <= toMonth ? fromMonth : toMonth;
  const end = fromMonth <= toMonth ? toMonth : fromMonth;
  return { from: `${start}-01`, to: monthEndOf(`${end}-01`) };
}

const MONTH_NAMES = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

const MONTH_NOMINATIVE = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

export function monthNameNominative(monthKey: string): string {
  const month = Number(monthKey.split("-")[1] ?? "1");
  return MONTH_NOMINATIVE[month - 1] ?? "";
}

export function formatDayLabel(date: IsoDate): string {
  const parts = date.split("-");
  const day = Number(parts[2] ?? "1");
  const month = Number(parts[1] ?? "1");
  return `${day} ${MONTH_NAMES[month - 1] ?? ""}`;
}

export function formatDayWithYear(date: IsoDate): string {
  const year = date.slice(0, 4);
  return `${formatDayLabel(date)} ${year}`;
}

export function weekdayIndex(date: IsoDate): number {
  const jsDay = parseIso(date).getUTCDay();
  return jsDay === 0 ? 7 : jsDay;
}
