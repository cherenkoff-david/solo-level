import { test } from "node:test";
import assert from "node:assert/strict";
import { confirmationQueue, effectiveStatus, planRemaining, planSummary } from "../src/plan.ts";
import type { Operation } from "../src/types.ts";

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

const plan = op({
  id: "p1",
  entryType: "planned",
  categoryId: "rent",
  onDate: "2026-10-20",
  amountMinor: 1000,
});

test("Остаток плана: 10 − 4 = 6 при частичном исполнении", () => {
  const facts = [op({ id: "f1", entryType: "actual", categoryId: "rent", onDate: "2026-10-20", amountMinor: 400, planId: "p1" })];
  assert.equal(planRemaining(plan, facts), 600);
});

test("Полная оплата закрывает план", () => {
  const facts = [op({ id: "f1", entryType: "actual", categoryId: "rent", onDate: "2026-10-20", amountMinor: 1000, planId: "p1" })];
  assert.equal(planRemaining(plan, facts), 0);
  assert.equal(effectiveStatus(plan, facts, "2026-10-20"), "done");
});

test("Переплата не создаёт отрицательный остаток", () => {
  const facts = [op({ id: "f1", entryType: "actual", categoryId: "rent", onDate: "2026-10-20", amountMinor: 1500, planId: "p1" })];
  assert.equal(planRemaining(plan, facts), 0);
});

test("Статусы по дате: будущее — pending, день — due, позже трёх дней — overdue", () => {
  assert.equal(effectiveStatus(plan, [], "2026-10-19"), "pending");
  assert.equal(effectiveStatus(plan, [], "2026-10-20"), "due");
  assert.equal(effectiveStatus(plan, [], "2026-10-23"), "due");
  assert.equal(effectiveStatus(plan, [], "2026-10-24"), "overdue");
});

test("Частичная оплата держит план открытым, даже после срока", () => {
  const facts = [op({ id: "f1", entryType: "actual", categoryId: "rent", onDate: "2026-10-20", amountMinor: 400, planId: "p1" })];
  assert.equal(effectiveStatus(plan, facts, "2026-10-30"), "partial");
});

test("Skipped-план не попадает в очередь подтверждений", () => {
  const skipped = { ...plan, status: "skipped" as const };
  assert.equal(confirmationQueue({ operations: [skipped] }, "2026-10-25").length, 0);
});

test("Очередь подтверждений сортируется по дате и содержит остаток", () => {
  const late = op({ id: "p2", entryType: "planned", categoryId: "rent", onDate: "2026-10-10", amountMinor: 2000 });
  const queue = confirmationQueue({ operations: [plan, late] }, "2026-10-25");
  assert.equal(queue.length, 2);
  assert.equal(queue[0]?.plan.id, "p2");
  assert.equal(queue[0]?.status, "overdue");
  assert.equal(queue[1]?.remainingMinor, 1000);
});

test("Сводка плана считает исполненные и открытые", () => {
  const done = op({ id: "p3", entryType: "planned", categoryId: "fun", onDate: "2026-10-01", amountMinor: 500, status: "done" });
  const summary = planSummary({ operations: [plan, done] });
  assert.equal(summary.plannedMinor, 1500);
  assert.equal(summary.openCount, 1);
  assert.equal(summary.doneCount, 1);
  assert.equal(summary.remainingMinor, 1000);
});
