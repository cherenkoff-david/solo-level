import { test } from "node:test";
import assert from "node:assert/strict";
import { seriesOccurrences } from "../src/series.ts";
import type { Series } from "../src/types.ts";

function series(partial: Partial<Series> & Pick<Series, "recurrence" | "startDate">): Series {
  return {
    id: "s1",
    title: "Зарплата",
    categoryId: "income",
    amountMinor: 100000,
    dayOfMonth: null,
    weekday: null,
    occurrencesCount: null,
    endsOn: null,
    archivedAt: null,
    sortOrder: 0,
    ...partial,
  };
}

test("Серия по числу повторов даёт ровно N вхождений", () => {
  const monthly = series({ recurrence: "monthly", startDate: "2026-01-05", dayOfMonth: 5, occurrencesCount: 12 });
  const dates = seriesOccurrences(monthly);
  assert.equal(dates.length, 12);
  assert.equal(dates[0], "2026-01-05");
  assert.equal(dates[11], "2026-12-05");
});

test("Серия до даты включительно", () => {
  const monthly = series({ recurrence: "monthly", startDate: "2026-01-01", dayOfMonth: 1, endsOn: "2026-03-01" });
  assert.deepEqual(seriesOccurrences(monthly), ["2026-01-01", "2026-02-01", "2026-03-01"]);
});

test("31-е число прижимается к концу короткого месяца", () => {
  const monthly = series({ recurrence: "monthly", startDate: "2026-01-31", dayOfMonth: 31, occurrencesCount: 3 });
  assert.deepEqual(seriesOccurrences(monthly), ["2026-01-31", "2026-02-28", "2026-03-31"]);
});

test("Високосный год: 31-е прижимается к 29 февраля", () => {
  const monthly = series({ recurrence: "monthly", startDate: "2028-01-31", dayOfMonth: 31, occurrencesCount: 2 });
  assert.deepEqual(seriesOccurrences(monthly), ["2028-01-31", "2028-02-29"]);
});

test("Недельная серия шагает по 7 дней", () => {
  const weekly = series({ recurrence: "weekly", startDate: "2026-01-05", occurrencesCount: 3 });
  assert.deepEqual(seriesOccurrences(weekly), ["2026-01-05", "2026-01-12", "2026-01-19"]);
});

test("Дневная серия ограничена границей", () => {
  const daily = series({ recurrence: "daily", startDate: "2026-01-01", endsOn: "2026-01-03" });
  assert.deepEqual(seriesOccurrences(daily), ["2026-01-01", "2026-01-02", "2026-01-03"]);
});

test("Параметр until обрезает серию для прогноза", () => {
  const monthly = series({ recurrence: "monthly", startDate: "2026-01-05", dayOfMonth: 5, occurrencesCount: 12 });
  assert.equal(seriesOccurrences(monthly, "2026-03-31").length, 3);
});
