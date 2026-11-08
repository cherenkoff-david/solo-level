import {
  actualBalance,
  addDays,
  buildSnapshot,
  emptyFinanceState,
  FINANCE_STATE_VERSION,
  monthKeyOf,
  monthsToClose,
  planRemaining,
  seriesOccurrences,
  todayIso,
} from "@solo/finance";
import type {
  Baseline,
  Category,
  CategoryKind,
  EntryType,
  FinanceState,
  IsoDate,
  Operation,
  PlanStatus,
  Recurrence,
  Series,
  Snapshot,
} from "@solo/finance";

const STORAGE_KEY = "solo.finance.state.v1";

export interface SeedCategory {
  readonly name: string;
  readonly kind: CategoryKind;
  readonly isEssential: boolean;
}

export const SEED_CATEGORIES: readonly SeedCategory[] = [
  { name: "Зарплата", kind: "income", isEssential: false },
  { name: "Аванс", kind: "income", isEssential: false },
  { name: "Другие поступления", kind: "income", isEssential: false },
  { name: "Аренда", kind: "expense", isEssential: true },
  { name: "Кредит", kind: "expense", isEssential: true },
  { name: "Продукты", kind: "expense", isEssential: true },
  { name: "Транспорт", kind: "expense", isEssential: true },
  { name: "Связь", kind: "expense", isEssential: true },
  { name: "Кафе", kind: "expense", isEssential: false },
  { name: "Развлечения", kind: "expense", isEssential: false },
  { name: "Одежда", kind: "expense", isEssential: false },
  { name: "Прочее", kind: "expense", isEssential: false },
];

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function createCategory(seed: SeedCategory): Category {
  return {
    id: newId(),
    name: seed.name,
    kind: seed.kind,
    isEssential: seed.kind === "expense" ? seed.isEssential : false,
    icon: seed.name.slice(0, 1).toUpperCase(),
    archivedAt: null,
  };
}

export function seedCategories(): Category[] {
  return SEED_CATEGORIES.map(createCategory);
}

function parse(raw: string | null): FinanceState | null {
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<FinanceState>;
    if (parsed.version !== FINANCE_STATE_VERSION) return null;
    if (!Array.isArray(parsed.categories) || !Array.isArray(parsed.operations)) return null;
    return {
      version: parsed.version,
      categories: parsed.categories,
      operations: parsed.operations,
      series: parsed.series ?? [],
      baselines: parsed.baselines ?? [],
      snapshots: parsed.snapshots ?? [],
      settings: { hideDeviation: parsed.settings?.hideDeviation ?? false },
    };
  } catch {
    return null;
  }
}

function load(): FinanceState {
  if (typeof localStorage === "undefined") return emptyFinanceState();
  return parse(localStorage.getItem(STORAGE_KEY)) ?? emptyFinanceState();
}

let state: FinanceState = load();
const listeners = new Set<() => void>();

function persist(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // хранилище может быть переполнено или недоступно: состояние остаётся в памяти
  }
}

function commit(next: FinanceState): void {
  state = next;
  persist();
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getFinanceState(): FinanceState {
  return state;
}

export function isConfigured(current: FinanceState = state): boolean {
  return current.baselines.length > 0;
}

export function getCategoriesInUse(current: FinanceState = state): Category[] {
  return current.categories.filter((category) => category.archivedAt === null);
}

export function findCategory(categoryId: string, current: FinanceState = state): Category | undefined {
  return current.categories.find((category) => category.id === categoryId);
}

// ---------------------------------------------------------------------------
// Настройка раздела
// ---------------------------------------------------------------------------

export function setupFinance(input: { startAmountMinor: number; startDate: IsoDate }): void {
  const baseline: Baseline = {
    id: newId(),
    effectiveDate: input.startDate,
    amountMinor: input.startAmountMinor,
    reason: "start",
    createdAt: nowIso(),
  };
  commit({
    ...state,
    categories: state.categories.length > 0 ? state.categories : seedCategories(),
    baselines: [baseline],
  });
}

// ---------------------------------------------------------------------------
// Категории
// ---------------------------------------------------------------------------

export function addCategory(input: {
  name: string;
  kind: CategoryKind;
  isEssential: boolean;
}): void {
  const name = input.name.trim();
  if (name === "") return;
  const exists = state.categories.some(
    (category) =>
      category.archivedAt === null &&
      category.kind === input.kind &&
      category.name.toLowerCase() === name.toLowerCase(),
  );
  if (exists) return;
  const category: Category = {
    id: newId(),
    name,
    kind: input.kind,
    isEssential: input.kind === "expense" ? input.isEssential : false,
    icon: name.slice(0, 1).toUpperCase(),
    archivedAt: null,
  };
  commit({ ...state, categories: [...state.categories, category] });
}

export function renameCategory(id: string, name: string): void {
  const trimmed = name.trim();
  if (trimmed === "") return;
  commit({
    ...state,
    categories: state.categories.map((category) =>
      category.id === id
        ? { ...category, name: trimmed, icon: trimmed.slice(0, 1).toUpperCase() }
        : category,
    ),
  });
}

export function toggleCategoryEssential(id: string): void {
  commit({
    ...state,
    categories: state.categories.map((category) =>
      category.id === id ? { ...category, isEssential: !category.isEssential } : category,
    ),
  });
}

export function archiveCategory(id: string): void {
  const today = todayIso();
  commit({
    ...state,
    categories: state.categories.map((category) =>
      category.id === id ? { ...category, archivedAt: today } : category,
    ),
  });
}

export function restoreCategory(id: string): void {
  commit({
    ...state,
    categories: state.categories.map((category) =>
      category.id === id ? { ...category, archivedAt: null } : category,
    ),
  });
}

// ---------------------------------------------------------------------------
// Операции
// ---------------------------------------------------------------------------

export interface NewOperationInput {
  readonly entryType: EntryType;
  readonly categoryId: string;
  readonly onDate: IsoDate;
  readonly amountMinor: number;
  readonly note?: string | null | undefined;
  readonly planId?: string | null;
}

export function addOperation(input: NewOperationInput): string {
  const id = newId();
  const operation: Operation = {
    id,
    entryType: input.entryType,
    status: input.entryType === "actual" ? "actual" : "pending",
    categoryId: input.categoryId,
    onDate: input.onDate,
    amountMinor: input.amountMinor,
    planId: input.planId ?? null,
    seriesId: null,
    seriesOccurrenceDate: null,
    note: input.note ?? null,
    createdAt: nowIso(),
  };
  commit({ ...state, operations: [...state.operations, operation] });
  return id;
}

export function updateOperation(
  id: string,
  patch: Partial<Pick<Operation, "categoryId" | "onDate" | "amountMinor" | "note">>,
): void {
  commit({
    ...state,
    operations: state.operations.map((operation) =>
      operation.id === id
        ? {
            ...operation,
            ...patch,
            note: patch.note === undefined ? operation.note : patch.note,
          }
        : operation,
    ),
  });
}

export function deleteOperation(id: string): void {
  commit({
    ...state,
    operations: state.operations
      .filter((operation) => operation.id !== id)
      .map((operation) => (operation.planId === id ? { ...operation, planId: null } : operation)),
  });
}

export interface ConfirmPlanInput {
  readonly planId: string;
  readonly amountMinor: number;
  readonly onDate: IsoDate;
  readonly keepOpen: boolean;
  readonly note?: string | null | undefined;
}

export function confirmPlan(input: ConfirmPlanInput): void {
  const plan = state.operations.find((operation) => operation.id === input.planId);
  if (plan === undefined) return;
  const fact: Operation = {
    id: newId(),
    entryType: "actual",
    status: "actual",
    categoryId: plan.categoryId,
    onDate: input.onDate,
    amountMinor: input.amountMinor,
    planId: plan.id,
    seriesId: plan.seriesId,
    seriesOccurrenceDate: plan.seriesOccurrenceDate,
    note: input.note ?? null,
    createdAt: nowIso(),
  };
  const remainingAfter = plan.amountMinor - input.amountMinor;
  const planStatus: PlanStatus =
    input.keepOpen && remainingAfter > 0 ? "partial" : "done";
  commit({
    ...state,
    operations: [
      ...state.operations.map((operation) =>
        operation.id === plan.id ? { ...operation, status: planStatus } : operation,
      ),
      fact,
    ],
  });
}

export function skipPlan(planId: string): void {
  commit({
    ...state,
    operations: state.operations.map((operation) =>
      operation.id === planId ? { ...operation, status: "skipped" } : operation,
    ),
  });
}

export function reopenPlan(planId: string): void {
  commit({
    ...state,
    operations: state.operations.map((operation) =>
      operation.id === planId ? { ...operation, status: "pending" } : operation,
    ),
  });
}

export function linkFactToPlan(factId: string, planId: string | null): void {
  commit({
    ...state,
    operations: state.operations.map((operation) =>
      operation.id === factId ? { ...operation, planId } : operation,
    ),
  });
}

// ---------------------------------------------------------------------------
// Серии
// ---------------------------------------------------------------------------

export interface NewSeriesInput {
  readonly title: string;
  readonly categoryId: string;
  readonly amountMinor: number;
  readonly recurrence: Recurrence;
  readonly startDate: IsoDate;
  readonly occurrencesCount: number | null;
  readonly endsOn: IsoDate | null;
}

export function addSeries(input: NewSeriesInput): void {
  const dayOfMonth = input.recurrence === "monthly" ? Number(input.startDate.slice(8, 10)) : null;
  const series: Series = {
    id: newId(),
    title: input.title.trim() === "" ? "Серия" : input.title.trim(),
    categoryId: input.categoryId,
    amountMinor: input.amountMinor,
    recurrence: input.recurrence,
    startDate: input.startDate,
    dayOfMonth,
    weekday: input.recurrence === "weekly" ? new Date(`${input.startDate}T00:00:00Z`).getUTCDay() : null,
    occurrencesCount: input.occurrencesCount,
    endsOn: input.endsOn,
    archivedAt: null,
  };
  const dates = seriesOccurrences(series);
  const existing = new Set(
    state.operations
      .filter((operation) => operation.seriesId === series.id)
      .map((operation) => operation.seriesOccurrenceDate),
  );
  const created: Operation[] = dates
    .filter((date) => !existing.has(date))
    .map((date) => ({
      id: newId(),
      entryType: "planned",
      status: "pending",
      categoryId: series.categoryId,
      onDate: date,
      amountMinor: series.amountMinor,
      planId: null,
      seriesId: series.id,
      seriesOccurrenceDate: date,
      note: series.title,
      createdAt: nowIso(),
    }));
  commit({
    ...state,
    series: [...state.series, series],
    operations: [...state.operations, ...created],
  });
}

export function deleteSeries(seriesId: string): void {
  const today = todayIso();
  commit({
    ...state,
    series: state.series.filter((series) => series.id !== seriesId),
    operations: state.operations
      .filter((operation) => {
        if (operation.seriesId !== seriesId) return true;
        if (operation.entryType === "actual") return true;
        if (operation.status === "done" || operation.status === "skipped") return true;
        return operation.onDate < today;
      })
      .map((operation) =>
        operation.seriesId === seriesId ? { ...operation, seriesId: null } : operation,
      ),
  });
}

export function updateSeriesAmount(seriesId: string, amountMinor: number): void {
  const today = todayIso();
  const series = state.series.find((item) => item.id === seriesId);
  if (series === undefined) return;
  const dates = seriesOccurrences({ ...series, amountMinor }, today);
  const futureDates = new Set(dates);
  commit({
    ...state,
    series: state.series.map((item) => (item.id === seriesId ? { ...item, amountMinor } : item)),
    operations: state.operations.map((operation) => {
      if (operation.seriesId !== seriesId) return operation;
      if (operation.entryType !== "planned") return operation;
      if (operation.status === "done" || operation.status === "skipped") return operation;
      if (operation.onDate < today) return operation;
      if (operation.seriesOccurrenceDate === null || !futureDates.has(operation.seriesOccurrenceDate)) {
        return operation;
      }
      return { ...operation, amountMinor };
    }),
  });
}

// ---------------------------------------------------------------------------
// Базовая линия и снимки
// ---------------------------------------------------------------------------

export function acceptReality(date: IsoDate = todayIso()): void {
  const baseline: Baseline = {
    id: newId(),
    effectiveDate: date,
    amountMinor: actualBalance(state, date),
    reason: "accept_reality",
    createdAt: nowIso(),
  };
  commit({ ...state, baselines: [...state.baselines, baseline] });
}

export function ensureSnapshots(today: IsoDate = todayIso()): void {
  const pending = monthsToClose(state, today);
  if (pending.length === 0) return;
  const snapshots: Snapshot[] = pending.map((item) => item.snapshot);
  commit({ ...state, snapshots: [...state.snapshots, ...snapshots] });
}

export function closeCurrentMonth(today: IsoDate = todayIso()): void {
  const monthKey = monthKeyOf(today);
  if (state.snapshots.some((snapshot) => snapshot.monthStart === `${monthKey}-01`)) return;
  const snapshot = buildSnapshot(state, monthKey, "manual", today);
  commit({ ...state, snapshots: [...state.snapshots, snapshot] });
}

export function toggleHideDeviation(): void {
  commit({
    ...state,
    settings: { ...state.settings, hideDeviation: !state.settings.hideDeviation },
  });
}

// ---------------------------------------------------------------------------
// Экспорт и сброс
// ---------------------------------------------------------------------------

export function exportJson(): string {
  return JSON.stringify(
    { exportedAt: nowIso(), app: "solo-finance", schemaVersion: FINANCE_STATE_VERSION, state },
    null,
    2,
  );
}

export function resetFinance(): void {
  commit(emptyFinanceState());
}

export function addSampleData(today: IsoDate = todayIso()): void {
  const monthKey = monthKeyOf(today);
  const categories = seedCategories();
  const pick = (name: string) => categories.find((category) => category.name === name)?.id;
  const salary = pick("Зарплата");
  const rent = pick("Аренда");
  const food = pick("Продукты");
  const cafe = pick("Кафе");
  const credit = pick("Кредит");
  const phone = pick("Связь");
  if (salary === undefined || rent === undefined || food === undefined || cafe === undefined) return;

  const daysInMonth = Number(new Date(Number(monthKey.slice(0, 4)), Number(monthKey.slice(5, 7)), 0).getDate());
  const on = (day: number): IsoDate => `${monthKey}-${String(Math.min(day, daysInMonth)).padStart(2, "0")}`;
  const past = (date: IsoDate): IsoDate => (date > today ? today : date);

  const make = (
    entryType: EntryType,
    categoryId: string,
    onDate: IsoDate,
    amountMinor: number,
    note: string,
    planId: string | null = null,
    status?: PlanStatus,
  ): Operation => ({
    id: newId(),
    entryType,
    status: entryType === "actual" ? "actual" : status ?? "pending",
    categoryId,
    onDate,
    amountMinor,
    planId,
    seriesId: null,
    seriesOccurrenceDate: null,
    note,
    createdAt: nowIso(),
  });

  const rentDate = on(5);
  const salaryDate = on(10);
  const rentPaid = rentDate <= today;
  const salaryPaid = salaryDate <= today;
  const rentPlan = make("planned", rent, rentDate, 3500000, "Аренда", null, rentPaid ? "done" : "pending");
  const salaryPlan = make("planned", salary, salaryDate, 12000000, "Зарплата", null, salaryPaid ? "done" : "pending");

  const operations: Operation[] = [rentPlan, salaryPlan];
  if (rentPaid) operations.push(make("actual", rent, rentDate, 3500000, "Аренда", rentPlan.id));
  if (salaryPaid) operations.push(make("actual", salary, salaryDate, 12000000, "Зарплата", salaryPlan.id));
  operations.push(make("actual", food, past(on(4)), 650000, "Продукты"));
  operations.push(make("actual", cafe, past(on(6)), 180000, "Кафе"));
  operations.push(make("planned", food, addDays(today, 5), 700000, "Продукты"));
  if (credit !== undefined) operations.push(make("planned", credit, on(20), 1500000, "Платёж по кредиту"));
  if (phone !== undefined) operations.push(make("planned", phone, addDays(today, -1), 60000, "Связь"));

  commit({
    ...emptyFinanceState(),
    categories,
    operations,
    baselines: [
      {
        id: newId(),
        effectiveDate: `${monthKey}-01`,
        amountMinor: 4500000,
        reason: "start",
        createdAt: nowIso(),
      },
    ],
  });
}

export function planRemainingOf(plan: Operation): number {
  return planRemaining(plan, state.operations);
}
