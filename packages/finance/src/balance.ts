import { monthEndOf, monthKeyOf, monthStartOf } from "./periods.ts";
import type { Baseline, Category, FinanceState, IsoDate, Money, Operation, Snapshot } from "./types.ts";

export type CategoryMap = ReadonlyMap<string, Category>;

export function categoryMap(state: FinanceState): CategoryMap {
  return new Map(state.categories.map((category) => [category.id, category]));
}

export function categoryDirection(categories: CategoryMap, categoryId: string): 1 | -1 {
  const category = categories.get(categoryId);
  return category?.kind === "income" ? 1 : -1;
}

export function activeBaseline(baselines: readonly Baseline[], date: IsoDate): Baseline | null {
  let best: Baseline | null = null;
  for (const baseline of baselines) {
    if (baseline.effectiveDate > date) continue;
    if (best === null || baseline.effectiveDate > best.effectiveDate) best = baseline;
  }
  return best;
}

interface Totals {
  target: Money;
  fact: Money;
}

function sums(
  state: FinanceState,
  categories: CategoryMap,
  from: IsoDate,
  to: IsoDate,
  inclusiveTo: boolean,
): Totals {
  const totals: Totals = { target: 0, fact: 0 };
  for (const operation of state.operations) {
    if (operation.onDate < from) continue;
    if (inclusiveTo ? operation.onDate > to : operation.onDate >= to) continue;
    const direction = categoryDirection(categories, operation.categoryId);
    if (operation.entryType === "actual") {
      totals.fact += direction * operation.amountMinor;
    } else if (operation.status !== "skipped") {
      totals.target += direction * operation.amountMinor;
    }
  }
  return totals;
}

export interface BasePoint {
  readonly amountMinor: Money;
  readonly from: IsoDate;
}

export function basePoint(state: FinanceState, date: IsoDate): BasePoint {
  const baseline = activeBaseline(state.baselines, date);
  if (baseline !== null) return { amountMinor: baseline.amountMinor, from: baseline.effectiveDate };
  const first = state.operations.map((operation) => operation.onDate).sort()[0];
  return { amountMinor: 0, from: first ?? date };
}

export function targetBalance(state: FinanceState, date: IsoDate): Money {
  const base = basePoint(state, date);
  return base.amountMinor + sums(state, categoryMap(state), base.from, date, true).target;
}

export function actualBalance(state: FinanceState, date: IsoDate): Money {
  const base = basePoint(state, date);
  return base.amountMinor + sums(state, categoryMap(state), base.from, date, true).fact;
}

export function deviationAt(state: FinanceState, date: IsoDate): Money {
  return actualBalance(state, date) - targetBalance(state, date);
}

export function snapshotMonth(state: FinanceState, monthKey: string): Snapshot | null {
  const monthStart = `${monthKey}-01`;
  return state.snapshots.find((snapshot) => snapshot.monthStart === monthStart) ?? null;
}

export function accumulatedDeviation(state: FinanceState, today: IsoDate): Money {
  const baseline = activeBaseline(state.baselines, today);
  const from = baseline === null ? "0000-01-01" : monthStartOf(baseline.effectiveDate);
  let total = 0;
  for (const snapshot of state.snapshots) {
    if (snapshot.monthStart >= from) total += snapshot.deviationMinor;
  }
  const currentMonth = monthKeyOf(today);
  if (snapshotMonth(state, currentMonth) === null) total += deviationAt(state, today);
  return total;
}

export interface MonthComparisonRow {
  readonly category: Category;
  readonly planMinor: Money;
  readonly factMinor: Money;
  readonly deviationMinor: Money;
  readonly hasPlan: boolean;
}

export function monthComparison(state: FinanceState, monthKey: string): MonthComparisonRow[] {
  const categories = categoryMap(state);
  const start = `${monthKey}-01`;
  const end = monthEndOf(start);
  const plan = new Map<string, Money>();
  const fact = new Map<string, Money>();
  for (const operation of state.operations) {
    if (operation.onDate < start || operation.onDate > end) continue;
    if (operation.entryType === "planned") {
      if (operation.status === "skipped") continue;
      plan.set(operation.categoryId, (plan.get(operation.categoryId) ?? 0) + operation.amountMinor);
    } else {
      fact.set(operation.categoryId, (fact.get(operation.categoryId) ?? 0) + operation.amountMinor);
    }
  }
  const ids = new Set<string>([...plan.keys(), ...fact.keys()]);
  const rows: MonthComparisonRow[] = [];
  for (const id of ids) {
    const category = categories.get(id);
    if (category === undefined) continue;
    const planMinor = plan.get(id) ?? 0;
    const factMinor = fact.get(id) ?? 0;
    rows.push({
      category,
      planMinor,
      factMinor,
      deviationMinor: factMinor - planMinor,
      hasPlan: planMinor > 0,
    });
  }
  rows.sort((left, right) => {
    if (left.category.kind !== right.category.kind) return left.category.kind === "expense" ? -1 : 1;
    return right.deviationMinor - left.deviationMinor;
  });
  return rows;
}

export interface CashflowPoint {
  readonly date: IsoDate;
  readonly target: Money;
  readonly fact: Money;
}

export function cashflow(
  state: FinanceState,
  from: IsoDate,
  to: IsoDate,
): CashflowPoint[] {
  const categories = categoryMap(state);
  const base = basePoint(state, from);
  const before = sums(state, categories, base.from, from, false);
  let target = base.amountMinor + before.target;
  let fact = base.amountMinor + before.fact;

  const byDate = new Map<IsoDate, Operation[]>();
  for (const operation of state.operations) {
    if (operation.onDate < from || operation.onDate > to) continue;
    const bucket = byDate.get(operation.onDate);
    if (bucket === undefined) byDate.set(operation.onDate, [operation]);
    else bucket.push(operation);
  }

  const points: CashflowPoint[] = [];
  let cursor = from;
  let guard = 0;
  while (cursor <= to && guard < 4000) {
    for (const operation of byDate.get(cursor) ?? []) {
      const direction = categoryDirection(categories, operation.categoryId);
      if (operation.entryType === "actual") fact += direction * operation.amountMinor;
      else if (operation.status !== "skipped") target += direction * operation.amountMinor;
    }
    points.push({ date: cursor, target, fact });
    cursor = addOneDay(cursor);
    guard += 1;
  }
  return points;
}

export function addOneDay(date: IsoDate): IsoDate {
  const parts = date.split("-");
  const year = Number(parts[0] ?? "1970");
  const month = Number(parts[1] ?? "1");
  const day = Number(parts[2] ?? "1");
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return `${String(next.getUTCFullYear()).padStart(4, "0")}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
}

export interface ShortageForecast {
  readonly date: IsoDate;
  readonly amountMinor: Money;
}

export function firstShortage(state: FinanceState, from: IsoDate, to: IsoDate): ShortageForecast | null {
  let cursor = from;
  let guard = 0;
  while (cursor <= to && guard < 4000) {
    const target = targetBalance(state, cursor);
    if (target < 0) return { date: cursor, amountMinor: target };
    cursor = addOneDay(cursor);
    guard += 1;
  }
  return null;
}

export function operationsOfDay(operations: readonly Operation[], date: IsoDate): Operation[] {
  return operations
    .filter((operation) => operation.onDate === date)
    .sort((left, right) => {
      if (left.entryType !== right.entryType) return left.entryType === "actual" ? -1 : 1;
      return left.amountMinor - right.amountMinor;
    });
}

export { monthStartOf, monthEndOf, monthKeyOf };
