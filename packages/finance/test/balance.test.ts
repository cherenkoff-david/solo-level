import { test } from "node:test";
import assert from "node:assert/strict";
import {
  accumulatedDeviation,
  actualBalance,
  deviationAt,
  targetBalance,
} from "../src/balance.ts";
import { emptyFinanceState } from "../src/types.ts";
import type { Category, FinanceState, Operation } from "../src/types.ts";

const categories: Category[] = [
  { id: "income", name: "Зарплата", kind: "income", isEssential: false, icon: "arrow-down", archivedAt: null },
  { id: "food", name: "Продукты", kind: "expense", isEssential: true, icon: "basket", archivedAt: null },
  { id: "fun", name: "Кафе", kind: "expense", isEssential: false, icon: "cup", archivedAt: null },
];

function op(partial: Partial<Operation> & Pick<Operation, "id" | "entryType" | "categoryId" | "onDate" | "amountMinor">): Operation {
  return {
    status: partial.entryType === "actual" ? "actual" : "pending",
    planId: null,
    seriesId: null,
    seriesOccurrenceDate: null,
    note: null,
    createdAt: "2026-10-01T00:00:00.000Z",
    ...partial,
  };
}

function stateWith(operations: Operation[]): FinanceState {
  return {
    ...emptyFinanceState(),
    categories,
    operations,
    baselines: [
      {
        id: "b1",
        effectiveDate: "2026-10-01",
        amountMinor: 0,
        reason: "start",
        createdAt: "2026-10-01T00:00:00.000Z",
      },
    ],
  };
}

test("Пример из документации: план 100/30, факт 40 → 60 против 70", () => {
  const state = stateWith([
    op({ id: "p1", entryType: "planned", categoryId: "income", onDate: "2026-10-10", amountMinor: 10000, status: "done" }),
    op({ id: "p2", entryType: "planned", categoryId: "fun", onDate: "2026-10-20", amountMinor: 3000, status: "done" }),
    op({ id: "f1", entryType: "actual", categoryId: "income", onDate: "2026-10-10", amountMinor: 10000 }),
    op({ id: "f2", entryType: "actual", categoryId: "fun", onDate: "2026-10-20", amountMinor: 4000 }),
  ]);

  assert.equal(targetBalance(state, "2026-10-31"), 7000);
  assert.equal(actualBalance(state, "2026-10-31"), 6000);
  assert.equal(deviationAt(state, "2026-10-31"), -1000);
});

test("Экономия остаётся в фактическом балансе и не требует переноса", () => {
  const state = stateWith([
    op({ id: "p1", entryType: "planned", categoryId: "income", onDate: "2026-10-10", amountMinor: 10000, status: "done" }),
    op({ id: "p2", entryType: "planned", categoryId: "fun", onDate: "2026-10-20", amountMinor: 3000, status: "done" }),
    op({ id: "f1", entryType: "actual", categoryId: "income", onDate: "2026-10-10", amountMinor: 10000 }),
    op({ id: "f2", entryType: "actual", categoryId: "fun", onDate: "2026-10-20", amountMinor: 2500 }),
  ]);

  assert.equal(actualBalance(state, "2026-10-31"), 7500);
  assert.equal(targetBalance(state, "2026-10-31"), 7000);
  assert.equal(deviationAt(state, "2026-10-31"), 500);
});

test("Баланс на дату включает операции этого дня и не включает будущие", () => {
  const state = stateWith([
    op({ id: "f1", entryType: "actual", categoryId: "income", onDate: "2026-10-15", amountMinor: 5000 }),
    op({ id: "p1", entryType: "planned", categoryId: "food", onDate: "2026-10-16", amountMinor: 3000 }),
  ]);

  assert.equal(actualBalance(state, "2026-10-15"), 5000);
  assert.equal(actualBalance(state, "2026-10-14"), 0);
  assert.equal(targetBalance(state, "2026-10-15"), 0);
  assert.equal(targetBalance(state, "2026-10-16"), -3000);
});

test("Skipped-план исключается из целевой линии, остальные статусы входят", () => {
  const base = stateWith([
    op({ id: "p1", entryType: "planned", categoryId: "fun", onDate: "2026-10-05", amountMinor: 2000, status: "skipped" }),
    op({ id: "p2", entryType: "planned", categoryId: "food", onDate: "2026-10-06", amountMinor: 1000, status: "overdue" }),
    op({ id: "p3", entryType: "planned", categoryId: "fun", onDate: "2026-10-07", amountMinor: 500, status: "done" }),
  ]);

  assert.equal(targetBalance(base, "2026-10-31"), -1500);
});

test("Накопленное отклонение складывает снимки и живое отклонение месяца", () => {
  const state: FinanceState = {
    ...stateWith([
      op({ id: "f1", entryType: "actual", categoryId: "income", onDate: "2026-10-02", amountMinor: 10000 }),
      op({ id: "f2", entryType: "actual", categoryId: "fun", onDate: "2026-10-03", amountMinor: 2000 }),
    ]),
    baselines: [
      {
        id: "b0",
        effectiveDate: "2026-08-01",
        amountMinor: 0,
        reason: "start",
        createdAt: "2026-08-01T00:00:00.000Z",
      },
    ],
    snapshots: [
      { monthStart: "2026-09-01", targetMinor: 0, factMinor: -500, deviationMinor: -500, closeMode: "auto" },
    ],
  };

  assert.equal(accumulatedDeviation(state, "2026-10-05"), -500 + 8000);
});

test("Базовая линия убирает прошлое из расчёта: сумма берётся из новой точки", () => {
  const state: FinanceState = {
    ...stateWith([
      op({ id: "f1", entryType: "actual", categoryId: "fun", onDate: "2026-10-05", amountMinor: 1000 }),
    ]),
    baselines: [
      {
        id: "b1",
        effectiveDate: "2026-10-01",
        amountMinor: 0,
        reason: "start",
        createdAt: "2026-10-01T00:00:00.000Z",
      },
      {
        id: "b2",
        effectiveDate: "2026-10-10",
        amountMinor: 9000,
        reason: "accept_reality",
        createdAt: "2026-10-10T00:00:00.000Z",
      },
    ],
  };

  assert.equal(actualBalance(state, "2026-10-09"), -1000);
  assert.equal(actualBalance(state, "2026-10-10"), 9000);
});
