import {
  actualBalance,
  addDays,
  activeCategories,
  archivedCategories,
  emptyFinanceState,
  FINANCE_STATE_VERSION,
  monthKeyOf,
  monthsToClose,
  moveCategoryBefore,
  nextSortOrder,
  normalizeCategoryOrder,
  planRemaining,
  seriesOccurrences,
  sortCategories,
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
} from "@solo/finance";

import {
  archiveCategory as archiveCategoryDb,
  closeMonth,
  confirmPlan as confirmPlanDb,
  deleteOperation as deleteOperationDb,
  deleteSeries as deleteSeriesDb,
  fetchFinanceState,
  insertBaseline,
  insertCategories,
  insertOperations,
  insertSeries as insertSeriesDb,
  replaceFinanceState,
  resetFinance as resetFinanceDb,
  restoreCategory as restoreCategoryDb,
  updateCategory,
  updateCategoryOrder,
  updateOperation as updateOperationDb,
  updateSeriesAmount as updateSeriesAmountDb,
  upsertSettings,
} from "./data/financeApi";

export type FinanceStatus = "idle" | "loading" | "ready" | "error";

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

function isoWeekday(date: IsoDate): number {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Неизвестная ошибка";
}

function createCategory(seed: SeedCategory, sortOrder: number): Category {
  return {
    id: newId(),
    name: seed.name,
    kind: seed.kind,
    isEssential: seed.kind === "expense" ? seed.isEssential : false,
    icon: seed.name.slice(0, 1).toUpperCase(),
    archivedAt: null,
    sortOrder,
  };
}

export function seedCategories(): Category[] {
  return SEED_CATEGORIES.map((seed, index) => createCategory(seed, index));
}

let state: FinanceState = emptyFinanceState();
let status: FinanceStatus = "idle";
let lastError: string | null = null;
let mutationSeq = 0;
let writeQueue: Promise<void> = Promise.resolve();
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

function commit(next: FinanceState): void {
  state = next;
  notify();
}

function persist(optimistic: FinanceState, write: () => Promise<void>): void {
  const previous = state;
  commit(optimistic);
  const seq = ++mutationSeq;
  const run = async (): Promise<void> => {
    try {
      await write();
      const next = await fetchFinanceState();
      if (seq !== mutationSeq) return;
      state = next;
      status = "ready";
      lastError = null;
    } catch (error) {
      if (seq !== mutationSeq) return;
      try {
        state = await fetchFinanceState();
      } catch {
        state = previous;
      }
      status = "error";
      lastError = errorMessage(error);
    }
    notify();
  };
  writeQueue = writeQueue.then(run, run);
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getFinanceState(): FinanceState {
  return state;
}

export function getFinanceStatus(): FinanceStatus {
  return status;
}

export function getFinanceError(): string | null {
  return lastError;
}

export async function loadFinance(): Promise<void> {
  status = "loading";
  lastError = null;
  notify();
  try {
    state = await fetchFinanceState();
    status = "ready";
  } catch (error) {
    status = "error";
    lastError = errorMessage(error);
  }
  notify();
}

export function clearFinance(): void {
  state = emptyFinanceState();
  status = "idle";
  lastError = null;
  notify();
}

export function clearFinanceError(): void {
  lastError = null;
  if (status === "error") status = "ready";
  notify();
}

export function isConfigured(current: FinanceState = state): boolean {
  return current.baselines.length > 0;
}

export function getCategoriesInUse(current: FinanceState = state): Category[] {
  return activeCategories(current.categories);
}

export function getArchivedCategories(current: FinanceState = state): Category[] {
  return archivedCategories(current.categories);
}

export function getAllCategories(current: FinanceState = state): Category[] {
  return sortCategories(current.categories);
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
  const hadCategories = state.categories.length > 0;
  const categories = hadCategories ? state.categories : seedCategories();
  const hideDeviation = state.settings.hideDeviation;
  const optimistic: FinanceState = {
    ...state,
    categories,
    baselines: [baseline],
    settings: { hideDeviation },
  };
  persist(optimistic, async () => {
    if (!hadCategories) await insertCategories(categories);
    await insertBaseline(baseline);
    await upsertSettings(hideDeviation);
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
    sortOrder: nextSortOrder(state.categories),
  };
  persist({ ...state, categories: [...state.categories, category] }, async () => {
    await insertCategories([category]);
  });
}

export function renameCategory(id: string, name: string): void {
  const trimmed = name.trim();
  if (trimmed === "") return;
  const categories = state.categories.map((category) =>
    category.id === id
      ? { ...category, name: trimmed, icon: trimmed.slice(0, 1).toUpperCase() }
      : category,
  );
  persist({ ...state, categories }, async () => {
    await updateCategory(id, { name: trimmed, icon: trimmed.slice(0, 1).toUpperCase() });
  });
}

export function toggleCategoryEssential(id: string): void {
  const target = state.categories.find((category) => category.id === id);
  if (target === undefined) return;
  const nextEssential = !target.isEssential;
  const categories = state.categories.map((category) =>
    category.id === id ? { ...category, isEssential: nextEssential } : category,
  );
  persist({ ...state, categories }, async () => {
    await updateCategory(id, { isEssential: nextEssential });
  });
}

export function archiveCategory(id: string): void {
  const today = todayIso();
  const categories = state.categories.map((category) =>
    category.id === id ? { ...category, archivedAt: today } : category,
  );
  persist({ ...state, categories }, async () => {
    await archiveCategoryDb(id, today);
  });
}

export function restoreCategory(id: string): void {
  const categories = normalizeCategoryOrder(
    state.categories.map((category) => (category.id === id ? { ...category, archivedAt: null } : category)),
  );
  persist({ ...state, categories }, async () => {
    await restoreCategoryDb(id);
    await updateCategoryOrder(categories);
  });
}

/** Перетаскивание: категория встаёт на место целевой. Логику прогресса не затрагивает. */
export function moveCategory(draggedId: string, targetId: string): void {
  const categories = moveCategoryBefore(state.categories, draggedId, targetId);
  persist({ ...state, categories }, async () => {
    await updateCategoryOrder(categories);
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
  persist({ ...state, operations: [...state.operations, operation] }, async () => {
    await insertOperations([operation]);
  });
  return id;
}

export function updateOperation(
  id: string,
  patch: Partial<Pick<Operation, "categoryId" | "onDate" | "amountMinor" | "note">>,
): void {
  const operations = state.operations.map((operation) =>
    operation.id === id
      ? {
          ...operation,
          ...patch,
          note: patch.note === undefined ? operation.note : patch.note,
        }
      : operation,
  );
  persist({ ...state, operations }, async () => {
    await updateOperationDb(id, patch);
  });
}

export function deleteOperation(id: string): void {
  const operations = state.operations
    .filter((operation) => operation.id !== id)
    .map((operation) => (operation.planId === id ? { ...operation, planId: null } : operation));
  persist({ ...state, operations }, async () => {
    await deleteOperationDb(id);
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
  const planStatus: PlanStatus = input.keepOpen && remainingAfter > 0 ? "partial" : "done";
  const operations = [
    ...state.operations.map((operation) =>
      operation.id === plan.id ? { ...operation, status: planStatus } : operation,
    ),
    fact,
  ];
  persist({ ...state, operations }, async () => {
    await confirmPlanDb({
      planId: input.planId,
      factId: fact.id,
      amountMinor: input.amountMinor,
      onDate: input.onDate,
      keepOpen: input.keepOpen,
      note: input.note ?? null,
    });
  });
}

export function skipPlan(planId: string): void {
  const operations = state.operations.map((operation) =>
    operation.id === planId ? { ...operation, status: "skipped" as const } : operation,
  );
  persist({ ...state, operations }, async () => {
    await updateOperationDb(planId, { status: "skipped" });
  });
}

export function reopenPlan(planId: string): void {
  const operations = state.operations.map((operation) =>
    operation.id === planId ? { ...operation, status: "pending" as const } : operation,
  );
  persist({ ...state, operations }, async () => {
    await updateOperationDb(planId, { status: "pending" });
  });
}

export function linkFactToPlan(factId: string, planId: string | null): void {
  const operations = state.operations.map((operation) =>
    operation.id === factId ? { ...operation, planId } : operation,
  );
  persist({ ...state, operations }, async () => {
    await updateOperationDb(factId, { planId });
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
    weekday: input.recurrence === "weekly" ? isoWeekday(input.startDate) : null,
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
  persist({ ...state, series: [...state.series, series], operations: [...state.operations, ...created] }, async () => {
    await insertSeriesDb(series, created);
  });
}

export function deleteSeries(seriesId: string): void {
  const today = todayIso();
  const series = state.series.filter((item) => item.id !== seriesId);
  const operations = state.operations
    .filter((operation) => {
      if (operation.seriesId !== seriesId) return true;
      if (operation.entryType === "actual") return true;
      if (operation.status === "done" || operation.status === "skipped") return true;
      return operation.onDate < today;
    })
    .map((operation) =>
      operation.seriesId === seriesId
        ? { ...operation, seriesId: null, seriesOccurrenceDate: null }
        : operation,
    );
  persist({ ...state, series, operations }, async () => {
    await deleteSeriesDb(seriesId);
  });
}

export function updateSeriesAmount(seriesId: string, amountMinor: number): void {
  const today = todayIso();
  const series = state.series.find((item) => item.id === seriesId);
  if (series === undefined) return;
  const dates = seriesOccurrences({ ...series, amountMinor }, today);
  const futureDates = new Set(dates);
  const nextSeries = state.series.map((item) => (item.id === seriesId ? { ...item, amountMinor } : item));
  const operations = state.operations.map((operation) => {
    if (operation.seriesId !== seriesId) return operation;
    if (operation.entryType !== "planned") return operation;
    if (operation.status === "done" || operation.status === "skipped") return operation;
    if (operation.onDate < today) return operation;
    if (operation.seriesOccurrenceDate === null || !futureDates.has(operation.seriesOccurrenceDate)) {
      return operation;
    }
    return { ...operation, amountMinor };
  });
  persist({ ...state, series: nextSeries, operations }, async () => {
    await updateSeriesAmountDb(seriesId, amountMinor, today);
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
  persist({ ...state, baselines: [...state.baselines, baseline] }, async () => {
    await insertBaseline(baseline);
  });
}

let snapshotsRunning = false;

export function ensureSnapshots(today: IsoDate = todayIso()): void {
  if (snapshotsRunning || status !== "ready") return;
  const pending = monthsToClose(state, today);
  if (pending.length === 0) return;
  snapshotsRunning = true;
  const seq = ++mutationSeq;
  const run = async (): Promise<void> => {
    try {
      for (const item of pending) {
        await closeMonth(`${item.monthKey}-01`, "auto");
      }
      const next = await fetchFinanceState();
      if (seq === mutationSeq) {
        state = next;
        status = "ready";
        lastError = null;
      }
    } catch (error) {
      if (seq === mutationSeq) {
        status = "error";
        lastError = errorMessage(error);
      }
    } finally {
      snapshotsRunning = false;
      notify();
    }
  };
  writeQueue = writeQueue.then(run, run);
}

export function closeCurrentMonth(today: IsoDate = todayIso()): void {
  const monthKey = monthKeyOf(today);
  if (state.snapshots.some((snapshot) => snapshot.monthStart === `${monthKey}-01`)) return;
  const seq = ++mutationSeq;
  const run = async (): Promise<void> => {
    try {
      await closeMonth(`${monthKey}-01`, "manual");
      const next = await fetchFinanceState();
      if (seq === mutationSeq) {
        state = next;
        status = "ready";
        lastError = null;
      }
    } catch (error) {
      if (seq === mutationSeq) {
        status = "error";
        lastError = errorMessage(error);
      }
    }
    notify();
  };
  writeQueue = writeQueue.then(run, run);
}

export function toggleHideDeviation(): void {
  const next = !state.settings.hideDeviation;
  persist({ ...state, settings: { ...state.settings, hideDeviation: next } }, async () => {
    await upsertSettings(next);
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
  persist(emptyFinanceState(), async () => {
    await resetFinanceDb();
  });
}

export function addSampleData(today: IsoDate = todayIso()): void {
  const sample = sampleFinanceState(today);
  if (sample === null) return;
  persist(sample, async () => {
    await replaceFinanceState(sample);
  });
}

function sampleFinanceState(today: IsoDate): FinanceState | null {
  const monthKey = monthKeyOf(today);
  const categories = seedCategories();
  const pick = (name: string) => categories.find((category) => category.name === name)?.id;
  const salary = pick("Зарплата");
  const rent = pick("Аренда");
  const food = pick("Продукты");
  const cafe = pick("Кафе");
  const credit = pick("Кредит");
  const phone = pick("Связь");
  if (salary === undefined || rent === undefined || food === undefined || cafe === undefined) return null;

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
    planStatus?: PlanStatus,
  ): Operation => ({
    id: newId(),
    entryType,
    status: entryType === "actual" ? "actual" : planStatus ?? "pending",
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

  return {
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
  };
}

export function planRemainingOf(plan: Operation): number {
  return planRemaining(plan, state.operations);
}
