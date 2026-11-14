import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSnapshot, monthsToClose } from "../src/snapshots.ts";
import { emptyFinanceState } from "../src/types.ts";
import type { Category, FinanceState, Operation } from "../src/types.ts";

const categories: Category[] = [
  { id: "income", name: "Зарплата", kind: "income", isEssential: false, icon: "in", archivedAt: null, sortOrder: 0 },
  { id: "fun", name: "Кафе", kind: "expense", isEssential: false, icon: "cup", archivedAt: null, sortOrder: 0 },
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

function baseState(operations: Operation[]): FinanceState {
  return {
    ...emptyFinanceState(),
    categories,
    operations,
    baselines: [
      {
        id: "b1",
        effectiveDate: "2026-09-01",
        amountMinor: 0,
        reason: "start",
        createdAt: "2026-09-01T00:00:00.000Z",
      },
    ],
  };
}

test("Снимок месяца фиксирует цель, факт и отклонение", () => {
  const state = baseState([
    op({ id: "p1", entryType: "planned", categoryId: "income", onDate: "2026-10-10", amountMinor: 10000, status: "done" }),
    op({ id: "p2", entryType: "planned", categoryId: "fun", onDate: "2026-10-20", amountMinor: 3000, status: "done" }),
    op({ id: "f1", entryType: "actual", categoryId: "income", onDate: "2026-10-10", amountMinor: 10000 }),
    op({ id: "f2", entryType: "actual", categoryId: "fun", onDate: "2026-10-20", amountMinor: 4000 }),
  ]);

  const snapshot = buildSnapshot(state, "2026-10", "auto");
  assert.equal(snapshot.monthStart, "2026-10-01");
  assert.equal(snapshot.targetMinor, 7000);
  assert.equal(snapshot.factMinor, 6000);
  assert.equal(snapshot.deviationMinor, -1000);
});

test("Догоняющее закрытие: три пропущенных месяца подряд", () => {
  const state = baseState([
    op({ id: "f1", entryType: "actual", categoryId: "income", onDate: "2026-09-05", amountMinor: 5000 }),
    op({ id: "f2", entryType: "actual", categoryId: "fun", onDate: "2026-10-05", amountMinor: 1000 }),
    op({ id: "f3", entryType: "actual", categoryId: "fun", onDate: "2026-11-05", amountMinor: 1000 }),
  ]);

  const closing = monthsToClose(state, "2026-12-15");
  assert.deepEqual(
    closing.map((item) => item.monthKey),
    ["2026-09", "2026-10", "2026-11"],
  );
  assert.equal(closing[0]?.snapshot.factMinor, 5000);
  assert.equal(closing[2]?.snapshot.factMinor, 3000);
});

test("Уже закрытые месяцы повторно не закрываются", () => {
  const state: FinanceState = {
    ...baseState([]),
    snapshots: [
      { monthStart: "2026-09-01", targetMinor: 0, factMinor: 0, deviationMinor: 0, closeMode: "auto" },
      { monthStart: "2026-10-01", targetMinor: 0, factMinor: 0, deviationMinor: 0, closeMode: "manual" },
    ],
  };

  assert.deepEqual(
    monthsToClose(state, "2026-12-01").map((item) => item.monthKey),
    ["2026-11"],
  );
});

test("Ручное закрытие считает на дату закрытия, а не на конец месяца", () => {
  const state = baseState([
    op({ id: "f1", entryType: "actual", categoryId: "income", onDate: "2026-10-02", amountMinor: 10000 }),
    op({ id: "p1", entryType: "planned", categoryId: "fun", onDate: "2026-10-25", amountMinor: 3000 }),
  ]);

  const early = buildSnapshot(state, "2026-10", "manual", "2026-10-10");
  const atEnd = buildSnapshot(state, "2026-10", "auto");

  assert.equal(early.factMinor, 10000);
  assert.equal(early.targetMinor, 0);
  assert.equal(atEnd.targetMinor, -3000);
});
