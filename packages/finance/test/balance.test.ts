import { test } from "node:test";
import assert from "node:assert/strict";
import {
  accumulatedDeviation,
  actualBalance,
  cashflow,
  dayFlow,
  describeDeviation,
  deviationFacts,
  deviationAt,
  targetBalance,
} from "../src/balance.ts";
import { emptyFinanceState } from "../src/types.ts";
import type { MonthComparisonRow } from "../src/balance.ts";
import type { Category, FinanceState, Operation } from "../src/types.ts";

const categories: Category[] = [
  { id: "income", name: "Зарплата", kind: "income", isEssential: false, icon: "arrow-down", archivedAt: null, sortOrder: 0 },
  { id: "food", name: "Продукты", kind: "expense", isEssential: true, icon: "basket", archivedAt: null, sortOrder: 0 },
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

// ---------------------------------------------------------------------------
// Денежный поток: точки графика должны совпадать с балансом на каждый день
// ---------------------------------------------------------------------------

function withBaseline(
  operations: Operation[],
  baselines: FinanceState["baselines"],
): FinanceState {
  return { ...emptyFinanceState(), categories, operations, baselines };
}

test("График учитывает базовую линию, начавшуюся внутри диапазона", () => {
  const state = withBaseline(
    [
      op({ id: "f1", entryType: "actual", categoryId: "food", onDate: "2026-11-10", amountMinor: 300000 }),
      op({ id: "i1", entryType: "actual", categoryId: "income", onDate: "2026-11-12", amountMinor: 200000 }),
    ],
    [
      {
        id: "b2",
        effectiveDate: "2026-11-14",
        amountMinor: 5184984,
        reason: "start",
        createdAt: "2026-11-14T00:00:00.000Z",
      },
    ],
  );

  const points = cashflow(state, "2026-11-01", "2026-11-30");
  const on14 = points.find((point) => point.date === "2026-11-14");
  const on13 = points.find((point) => point.date === "2026-11-13");

  assert.equal(actualBalance(state, "2026-11-14"), 5184984);
  assert.equal(on14?.fact, 5184984, "точка графика на дату отсчёта равна сумме на руках");
  assert.equal(on14?.target, 5184984);
  assert.notEqual(on13?.fact, 5184984, "до даты отсчёта старое значение не подменяется");
  assert.ok((on13?.fact ?? 0) < 100000, "до отсчёта график не показывает новую сумму");
});

test("График начинается с даты начала учёта, а не с начала месяца", () => {
  const state = withBaseline([], [
    {
      id: "b1",
      effectiveDate: "2026-11-14",
      amountMinor: 5184984,
      reason: "start",
      createdAt: "2026-11-14T00:00:00.000Z",
    },
  ]);
  const points = cashflow(state, "2026-11-01", "2026-11-30");
  assert.equal(points[0]?.date, "2026-11-14", "лишние дни до начала учёта не рисуются");
  assert.equal(points[0]?.fact, 5184984);
});

test("График не уходит в ноль, когда отсчёт начат серединой месяца", () => {
  const state = withBaseline([], [
    {
      id: "b1",
      effectiveDate: "2026-11-14",
      amountMinor: 5184984,
      reason: "start",
      createdAt: "2026-11-14T00:00:00.000Z",
    },
  ]);
  const points = cashflow(state, "2026-11-01", "2026-11-30");
  assert.equal(Math.max(...points.map((point) => point.fact)), 5184984);
});

test("Несколько базовых линий внутри диапазона применяются по порядку", () => {
  const state = withBaseline(
    [
      op({ id: "f1", entryType: "actual", categoryId: "food", onDate: "2026-11-16", amountMinor: 100000 }),
    ],
    [
      { id: "b1", effectiveDate: "2026-11-05", amountMinor: 1000000, reason: "start", createdAt: "2026-11-05T00:00:00.000Z" },
      { id: "b2", effectiveDate: "2026-11-15", amountMinor: 2500000, reason: "accept_reality", createdAt: "2026-11-15T00:00:00.000Z" },
    ],
  );
  const points = cashflow(state, "2026-11-01", "2026-11-30");
  const byDate = new Map(points.map((point) => [point.date, point]));

  assert.equal(byDate.get("2026-11-05")?.fact, 1000000);
  assert.equal(byDate.get("2026-11-14")?.fact, 1000000);
  assert.equal(byDate.get("2026-11-15")?.fact, 2500000);
  assert.equal(byDate.get("2026-11-16")?.fact, 2400000, "после отсчёта трата уменьшает баланс");
});

test("Каждая точка графика совпадает с фактическим балансом на эту дату", () => {
  const state = withBaseline(
    [
      op({ id: "f1", entryType: "actual", categoryId: "food", onDate: "2026-10-28", amountMinor: 150000 }),
      op({ id: "i1", entryType: "actual", categoryId: "income", onDate: "2026-11-03", amountMinor: 3000000 }),
      op({ id: "f2", entryType: "actual", categoryId: "fun", onDate: "2026-11-09", amountMinor: 250000 }),
      op({ id: "p1", entryType: "planned", categoryId: "food", onDate: "2026-11-20", amountMinor: 400000 }),
    ],
    [
      { id: "b1", effectiveDate: "2026-11-05", amountMinor: 1000000, reason: "start", createdAt: "2026-11-05T00:00:00.000Z" },
    ],
  );

  for (const point of cashflow(state, "2026-11-01", "2026-12-10")) {
    assert.equal(
      point.fact,
      actualBalance(state, point.date),
      `факт на ${point.date} расходится с actualBalance`,
    );
    assert.equal(
      point.target,
      targetBalance(state, point.date),
      `план на ${point.date} расходится с targetBalance`,
    );
  }
});

// ---------------------------------------------------------------------------
// Изменение баланса за день: план и факт раздельно
// ---------------------------------------------------------------------------

test("Плановая аренда не считается фактическим изменением дня", () => {
  const state = withBaseline(
    [op({ id: "p1", entryType: "planned", categoryId: "food", onDate: "2026-11-17", amountMinor: 4500000 })],
    [],
  );
  const flow = dayFlow(state, "2026-11-17");
  assert.equal(flow.plannedMinor, -4500000);
  assert.equal(flow.actualMinor, 0, "план не уменьшает деньги на руках, пока не проведён");
});

test("Фактическая аренда уменьшает баланс дня", () => {
  const state = withBaseline(
    [op({ id: "f1", entryType: "actual", categoryId: "food", onDate: "2026-11-17", amountMinor: 4500000 })],
    [],
  );
  const flow = dayFlow(state, "2026-11-17");
  assert.equal(flow.actualMinor, -4500000);
  assert.equal(flow.plannedMinor, 0);
});

test("Доход входит в день со знаком плюс", () => {
  const state = withBaseline(
    [op({ id: "i1", entryType: "actual", categoryId: "income", onDate: "2026-11-05", amountMinor: 3000000 })],
    [],
  );
  assert.equal(dayFlow(state, "2026-11-05").actualMinor, 3000000);
});

test("Пропущенный план не считается изменением дня", () => {
  const state = withBaseline(
    [op({ id: "p1", entryType: "planned", categoryId: "food", onDate: "2026-11-17", amountMinor: 100000, status: "skipped" })],
    [],
  );
  assert.equal(dayFlow(state, "2026-11-17").plannedMinor, 0);
});

test("День без операций даёт нулевое изменение", () => {
  const state = withBaseline(
    [op({ id: "f1", entryType: "actual", categoryId: "food", onDate: "2026-11-17", amountMinor: 100000 })],
    [],
  );
  const flow = dayFlow(state, "2026-11-18");
  assert.equal(flow.actualMinor, 0);
  assert.equal(flow.plannedMinor, 0);
});

test("Отклонение на будущую дату показывает ещё не проведённый план, а не прибыль", () => {
  const state = withBaseline(
    [op({ id: "p1", entryType: "planned", categoryId: "food", onDate: "2026-11-17", amountMinor: 4500000 })],
    [
      {
        id: "b1",
        effectiveDate: "2026-11-14",
        amountMinor: 5184984,
        reason: "start",
        createdAt: "2026-11-14T00:00:00.000Z",
      },
    ],
  );
  const flow = dayFlow(state, "2026-11-17");
  const target = targetBalance(state, "2026-11-17");
  const fact = actualBalance(state, "2026-11-17");

  assert.equal(fact - target, 4500000, "разница равна сумме плана: деньги ещё не ушли");
  assert.equal(fact - target, -flow.plannedMinor, "отклонение объясняется планом дня, а не доходом");
});

// ---------------------------------------------------------------------------
// Расхождение: направление словом, число без знака
// ---------------------------------------------------------------------------

function row(overrides: Partial<MonthComparisonRow> & Pick<MonthComparisonRow, "planMinor" | "factMinor">): MonthComparisonRow {
  return {
    category: categories[1]!,
    deviationMinor: overrides.factMinor - overrides.planMinor,
    hasPlan: overrides.planMinor > 0,
    ...overrides,
  };
}

test("Перерасход по расходу — «сверх плана», число положительное", () => {
  const facts = deviationFacts(row({ planMinor: 500000, factMinor: 1000000 }));
  assert.equal(facts.direction, "over");
  assert.equal(facts.amountMinor, 500000);
});

test("Недотрата по расходу — «ниже плана», число положительное", () => {
  const facts = deviationFacts(row({ planMinor: 500000, factMinor: 200000 }));
  assert.equal(facts.direction, "under");
  assert.equal(facts.amountMinor, 300000);
});

test("Точное совпадение с планом не показывает число", () => {
  const facts = deviationFacts(row({ planMinor: 500000, factMinor: 500000 }));
  assert.equal(facts.direction, "exact");
  assert.equal(facts.amountMinor, 0);
});

test("Факт без плана помечается отдельно, а не как перерасход", () => {
  const facts = deviationFacts(row({ planMinor: 0, factMinor: 1000000 }));
  assert.equal(facts.direction, "no_plan");
  assert.equal(facts.amountMinor, 1000000);
});

test("Знак перерасхода больше не выводится: величина всегда неотрицательная", () => {
  for (const r of [
    row({ planMinor: 500000, factMinor: 1000000 }),
    row({ planMinor: 500000, factMinor: 200000 }),
    row({ planMinor: 0, factMinor: 1000000 }),
  ]) {
    assert.ok(deviationFacts(r).amountMinor >= 0);
  }
});

test("Перерасход в списке и в балансе описывают одно явление одним словом", () => {
  const comparison = deviationFacts(row({ planMinor: 500000, factMinor: 1000000 }));
  const state = withBaseline(
    [
      op({ id: "p1", entryType: "planned", categoryId: "food", onDate: "2026-11-20", amountMinor: 500000 }),
      op({ id: "f1", entryType: "actual", categoryId: "food", onDate: "2026-11-25", amountMinor: 1000000 }),
    ],
    [
      { id: "b1", effectiveDate: "2026-11-14", amountMinor: 5184984, reason: "start", createdAt: "2026-11-14T00:00:00.000Z" },
    ],
  );
  const balanceDeviation = deviationAt(state, "2026-11-25");

  assert.equal(comparison.direction, "over", "в списке — сверх плана");
  assert.ok(balanceDeviation < 0, "в балансе — меньше денег, чем планировалось");
  assert.equal(
    comparison.amountMinor,
    -balanceDeviation,
    "это одна и та же величина, только описанная по-разному",
  );
});

test("describeDeviation: положительное отклонение — выше плана, величина без знака", () => {
  const facts = describeDeviation(7700);
  assert.equal(facts.direction, "over");
  assert.equal(facts.amountMinor, 7700);
});

test("describeDeviation: отрицательное отклонение — ниже плана, величина без знака", () => {
  const facts = describeDeviation(-7700);
  assert.equal(facts.direction, "under");
  assert.equal(facts.amountMinor, 7700);
});

test("describeDeviation: ноль — совпадение с планом", () => {
  const facts = describeDeviation(0);
  assert.equal(facts.direction, "exact");
  assert.equal(facts.amountMinor, 0);
});

test("Накопленное отклонение описывается тем же правилом, что и месячное", () => {
  const state = withBaseline(
    [
      op({ id: "f1", entryType: "actual", categoryId: "food", onDate: "2026-11-16", amountMinor: 500000 }),
    ],
    [
      { id: "b1", effectiveDate: "2026-11-14", amountMinor: 1000000, reason: "start", createdAt: "2026-11-14T00:00:00.000Z" },
    ],
  );
  const accumulated = deviationAt(state, "2026-11-16");
  const facts = describeDeviation(accumulated);
  assert.equal(facts.direction, "under");
  assert.equal(facts.amountMinor, 500000, "потратили 5 000 — значит ниже плана на 5 000");
});
