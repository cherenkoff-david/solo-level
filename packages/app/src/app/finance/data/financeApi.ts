import type {
  Baseline,
  Category,
  CategoryKind,
  FinanceState,
  IsoDate,
  Operation,
  OperationStatus,
  PlanStatus,
  Recurrence,
  Series,
  Snapshot,
} from "@solo/finance";

import { requireSupabase } from "../../../lib/supabase";

interface CategoryRow {
  id: string;
  name: string;
  kind: CategoryKind;
  is_essential: boolean;
  icon: string | null;
  archived_at: string | null;
  sort_order: number;
}

interface OperationRow {
  id: string;
  entry_type: "planned" | "actual";
  status: OperationStatus;
  category_id: string;
  on_date: IsoDate;
  amount_minor: number | string;
  plan_id: string | null;
  series_id: string | null;
  series_occurrence_date: IsoDate | null;
  note: string | null;
  created_at: string;
}

interface SeriesRow {
  id: string;
  title: string;
  category_id: string;
  amount_minor: number | string;
  recurrence: Recurrence;
  start_date: IsoDate;
  day_of_month: number | null;
  weekday: number | null;
  occurrences_count: number | null;
  ends_on: IsoDate | null;
  archived_at: string | null;
}

interface BaselineRow {
  id: string;
  effective_date: IsoDate;
  amount_minor: number | string;
  reason: "start" | "accept_reality";
  created_at: string;
}

interface SnapshotRow {
  month_start: IsoDate;
  target_minor: number | string;
  fact_minor: number | string;
  deviation_minor: number | string;
  close_mode: "auto" | "manual";
}

interface SettingsRow {
  hide_deviation: boolean;
}

function fail(error: { message: string } | null, fallback: string): never {
  throw new Error(error?.message ?? fallback);
}

function numberFrom(value: number | string): number {
  return typeof value === "number" ? value : Number(value);
}

function dateFromTimestamp(value: string | null): IsoDate | null {
  return value === null ? null : value.slice(0, 10);
}

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    isEssential: row.is_essential,
    icon: row.icon ?? row.name.slice(0, 1).toUpperCase(),
    archivedAt: dateFromTimestamp(row.archived_at),
    sortOrder: row.sort_order,
  };
}

function mapOperation(row: OperationRow): Operation {
  return {
    id: row.id,
    entryType: row.entry_type,
    status: row.status as PlanStatus | "actual",
    categoryId: row.category_id,
    onDate: row.on_date,
    amountMinor: numberFrom(row.amount_minor),
    planId: row.plan_id,
    seriesId: row.series_id,
    seriesOccurrenceDate: row.series_occurrence_date,
    note: row.note,
    createdAt: row.created_at,
  };
}

function mapSeries(row: SeriesRow): Series {
  return {
    id: row.id,
    title: row.title,
    categoryId: row.category_id,
    amountMinor: numberFrom(row.amount_minor),
    recurrence: row.recurrence,
    startDate: row.start_date,
    dayOfMonth: row.day_of_month,
    weekday: row.weekday,
    occurrencesCount: row.occurrences_count,
    endsOn: row.ends_on,
    archivedAt: dateFromTimestamp(row.archived_at),
  };
}

function mapBaseline(row: BaselineRow): Baseline {
  return {
    id: row.id,
    effectiveDate: row.effective_date,
    amountMinor: numberFrom(row.amount_minor),
    reason: row.reason,
    createdAt: row.created_at,
  };
}

function mapSnapshot(row: SnapshotRow): Snapshot {
  return {
    monthStart: row.month_start,
    targetMinor: numberFrom(row.target_minor),
    factMinor: numberFrom(row.fact_minor),
    deviationMinor: numberFrom(row.deviation_minor),
    closeMode: row.close_mode,
  };
}

function categoryRow(category: Category, userId: string) {
  return {
    id: category.id,
    user_id: userId,
    name: category.name,
    kind: category.kind,
    is_essential: category.isEssential,
    icon: category.icon,
    archived_at: category.archivedAt,
    sort_order: category.sortOrder,
  };
}

function operationRow(operation: Operation, userId: string) {
  return {
    id: operation.id,
    user_id: userId,
    entry_type: operation.entryType,
    status: operation.status,
    category_id: operation.categoryId,
    on_date: operation.onDate,
    amount_minor: operation.amountMinor,
    plan_id: operation.planId,
    series_id: operation.seriesId,
    series_occurrence_date: operation.seriesOccurrenceDate,
    note: operation.note,
  };
}

function seriesRow(series: Series, userId: string) {
  return {
    id: series.id,
    user_id: userId,
    title: series.title,
    category_id: series.categoryId,
    amount_minor: series.amountMinor,
    recurrence: series.recurrence,
    start_date: series.startDate,
    day_of_month: series.dayOfMonth,
    weekday: series.weekday,
    occurrences_count: series.occurrencesCount,
    ends_on: series.endsOn,
    archived_at: series.archivedAt,
  };
}

function baselineRow(baseline: Baseline, userId: string) {
  return {
    id: baseline.id,
    user_id: userId,
    effective_date: baseline.effectiveDate,
    amount_minor: baseline.amountMinor,
    reason: baseline.reason,
  };
}

function snapshotRow(snapshot: Snapshot, userId: string) {
  return {
    user_id: userId,
    month_start: snapshot.monthStart,
    target_minor: snapshot.targetMinor,
    fact_minor: snapshot.factMinor,
    close_mode: snapshot.closeMode,
  };
}

async function currentUserId(): Promise<string> {
  const client = requireSupabase();
  const { data, error } = await client.auth.getSession();
  if (error !== null) fail(error, "Не удалось прочитать сессию");
  const userId = data.session?.user.id;
  if (userId === undefined) throw new Error("Требуется вход");
  return userId;
}

export async function fetchFinanceState(): Promise<FinanceState> {
  const client = requireSupabase();
  const userId = await currentUserId();

  const [categories, operations, series, baselines, snapshots, settings] = await Promise.all([
    client.from("finance_categories").select("*").eq("user_id", userId).order("sort_order"),
    client.from("finance_operations").select("*").eq("user_id", userId).order("on_date"),
    client.from("finance_series").select("*").eq("user_id", userId).order("start_date"),
    client.from("finance_baselines").select("*").eq("user_id", userId).order("effective_date"),
    client.from("finance_snapshots").select("*").eq("user_id", userId).order("month_start"),
    client.from("finance_settings").select("*").eq("user_id", userId).maybeSingle(),
  ]);

  if (categories.error !== null) fail(categories.error, "Не удалось загрузить категории");
  if (operations.error !== null) fail(operations.error, "Не удалось загрузить операции");
  if (series.error !== null) fail(series.error, "Не удалось загрузить серии");
  if (baselines.error !== null) fail(baselines.error, "Не удалось загрузить базовые линии");
  if (snapshots.error !== null) fail(snapshots.error, "Не удалось загрузить снимки месяцев");
  if (settings.error !== null) fail(settings.error, "Не удалось загрузить настройки");

  const settingsRow = settings.data as SettingsRow | null;

  return {
    version: 1,
    categories: (categories.data as CategoryRow[]).map(mapCategory),
    operations: (operations.data as OperationRow[]).map(mapOperation),
    series: (series.data as SeriesRow[]).map(mapSeries),
    baselines: (baselines.data as BaselineRow[]).map(mapBaseline),
    snapshots: (snapshots.data as SnapshotRow[]).map(mapSnapshot),
    settings: { hideDeviation: settingsRow?.hide_deviation ?? false },
  };
}

export async function insertCategories(categories: readonly Category[]): Promise<void> {
  if (categories.length === 0) return;
  const client = requireSupabase();
  const userId = await currentUserId();
  const { error } = await client
    .from("finance_categories")
    .insert(categories.map((category) => categoryRow(category, userId)));
  if (error !== null) fail(error, "Не удалось создать категории");
}

export async function updateCategory(
  id: string,
  patch: Partial<Pick<Category, "name" | "isEssential" | "icon">>,
): Promise<void> {
  const client = requireSupabase();
  const userId = await currentUserId();
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.isEssential !== undefined) row.is_essential = patch.isEssential;
  if (patch.icon !== undefined) row.icon = patch.icon;
  const { error } = await client
    .from("finance_categories")
    .update(row)
    .eq("id", id)
    .eq("user_id", userId);
  if (error !== null) fail(error, "Не удалось изменить категорию");
}

export async function archiveCategory(id: string, archivedAt: IsoDate): Promise<void> {
  const client = requireSupabase();
  const userId = await currentUserId();
  const { error } = await client
    .from("finance_categories")
    .update({ archived_at: archivedAt })
    .eq("id", id)
    .eq("user_id", userId);
  if (error !== null) fail(error, "Не удалось архивировать категорию");
}

export async function restoreCategory(id: string): Promise<void> {
  const client = requireSupabase();
  const userId = await currentUserId();
  const { error } = await client
    .from("finance_categories")
    .update({ archived_at: null })
    .eq("id", id)
    .eq("user_id", userId);
  if (error !== null) fail(error, "Не удалось вернуть категорию");
}

export async function updateCategoryOrder(categories: readonly Category[]): Promise<void> {
  const client = requireSupabase();
  const userId = await currentUserId();
  const results = await Promise.all(
    categories.map((category) =>
      client
        .from("finance_categories")
        .update({ sort_order: category.sortOrder })
        .eq("id", category.id)
        .eq("user_id", userId),
    ),
  );
  for (const result of results) {
    if (result.error !== null) fail(result.error, "Не удалось сохранить порядок категорий");
  }
}

export async function insertOperations(operations: readonly Operation[]): Promise<void> {
  if (operations.length === 0) return;
  const client = requireSupabase();
  const userId = await currentUserId();
  const { error } = await client
    .from("finance_operations")
    .insert(operations.map((operation) => operationRow(operation, userId)));
  if (error !== null) fail(error, "Не удалось создать операции");
}

export async function updateOperation(
  id: string,
  patch: Partial<Pick<Operation, "categoryId" | "onDate" | "amountMinor" | "note" | "planId" | "status">>,
): Promise<void> {
  const client = requireSupabase();
  const userId = await currentUserId();
  const row: Record<string, unknown> = {};
  if (patch.categoryId !== undefined) row.category_id = patch.categoryId;
  if (patch.onDate !== undefined) row.on_date = patch.onDate;
  if (patch.amountMinor !== undefined) row.amount_minor = patch.amountMinor;
  if (patch.note !== undefined) row.note = patch.note;
  if (patch.planId !== undefined) row.plan_id = patch.planId;
  if (patch.status !== undefined) row.status = patch.status;
  const { error } = await client
    .from("finance_operations")
    .update(row)
    .eq("id", id)
    .eq("user_id", userId);
  if (error !== null) fail(error, "Не удалось изменить операцию");
}

export async function deleteOperation(id: string): Promise<void> {
  const client = requireSupabase();
  const userId = await currentUserId();
  const { error } = await client
    .from("finance_operations")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error !== null) fail(error, "Не удалось удалить операцию");
}

export async function confirmPlan(input: {
  planId: string;
  factId: string;
  amountMinor: number;
  onDate: IsoDate;
  keepOpen: boolean;
  note: string | null;
}): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc("finance_confirm_plan", {
    p_plan_id: input.planId,
    p_fact_id: input.factId,
    p_amount_minor: input.amountMinor,
    p_on_date: input.onDate,
    p_keep_open: input.keepOpen,
    p_note: input.note,
  });
  if (error !== null) fail(error, "Не удалось подтвердить план");
}

export async function insertSeries(series: Series, operations: readonly Operation[]): Promise<void> {
  const client = requireSupabase();
  const userId = await currentUserId();
  const created = await client.from("finance_series").insert(seriesRow(series, userId));
  if (created.error !== null) fail(created.error, "Не удалось создать серию");
  await insertOperations(operations);
}

export async function deleteSeries(seriesId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc("finance_delete_series", { p_series_id: seriesId });
  if (error !== null) fail(error, "Не удалось удалить серию");
}

export async function updateSeriesAmount(seriesId: string, amountMinor: number, today: IsoDate): Promise<void> {
  const client = requireSupabase();
  const userId = await currentUserId();

  const seriesResult = await client
    .from("finance_series")
    .update({ amount_minor: amountMinor })
    .eq("id", seriesId)
    .eq("user_id", userId);
  if (seriesResult.error !== null) fail(seriesResult.error, "Не удалось изменить серию");

  const operationsResult = await client
    .from("finance_operations")
    .update({ amount_minor: amountMinor })
    .eq("user_id", userId)
    .eq("series_id", seriesId)
    .eq("entry_type", "planned")
    .gte("on_date", today)
    .not("status", "in", '("done","skipped")');
  if (operationsResult.error !== null) fail(operationsResult.error, "Не удалось изменить будущие вхождения");
}

export async function insertBaseline(baseline: Baseline): Promise<void> {
  const client = requireSupabase();
  const userId = await currentUserId();
  const { error } = await client.from("finance_baselines").insert(baselineRow(baseline, userId));
  if (error !== null) fail(error, "Не удалось сохранить базовую линию");
}

export async function closeMonth(monthStart: IsoDate, closeMode: "auto" | "manual"): Promise<Snapshot> {
  const client = requireSupabase();
  const { data, error } = await client.rpc("finance_close_month", {
    p_month_start: monthStart,
    p_close_mode: closeMode,
  });
  if (error !== null) fail(error, "Не удалось закрыть месяц");
  const row = (Array.isArray(data) ? data[0] : data) as SnapshotRow | undefined;
  if (row === undefined) throw new Error("Функция закрытия месяца не вернула снимок");
  return mapSnapshot(row);
}

export async function upsertSettings(hideDeviation: boolean): Promise<void> {
  const client = requireSupabase();
  const userId = await currentUserId();
  const { error } = await client
    .from("finance_settings")
    .upsert({ user_id: userId, hide_deviation: hideDeviation }, { onConflict: "user_id" });
  if (error !== null) fail(error, "Не удалось сохранить настройки");
}

export async function resetFinance(): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc("finance_reset");
  if (error !== null) fail(error, "Не удалось сбросить раздел");
}

export async function replaceFinanceState(state: FinanceState): Promise<void> {
  const client = requireSupabase();
  const userId = await currentUserId();

  await resetFinance();

  if (state.categories.length > 0) {
    const { error } = await client
      .from("finance_categories")
      .insert(state.categories.map((category) => categoryRow(category, userId)));
    if (error !== null) fail(error, "Не удалось записать категории");
  }

  if (state.series.length > 0) {
    const { error } = await client
      .from("finance_series")
      .insert(state.series.map((series) => seriesRow(series, userId)));
    if (error !== null) fail(error, "Не удалось записать серии");
  }

  if (state.operations.length > 0) {
    const { error } = await client
      .from("finance_operations")
      .insert(state.operations.map((operation) => operationRow(operation, userId)));
    if (error !== null) fail(error, "Не удалось записать операции");
  }

  if (state.baselines.length > 0) {
    const { error } = await client
      .from("finance_baselines")
      .insert(state.baselines.map((baseline) => baselineRow(baseline, userId)));
    if (error !== null) fail(error, "Не удалось записать базовые линии");
  }

  if (state.snapshots.length > 0) {
    const { error } = await client
      .from("finance_snapshots")
      .insert(state.snapshots.map((snapshot) => snapshotRow(snapshot, userId)));
    if (error !== null) fail(error, "Не удалось записать снимки месяцев");
  }

  const settingsResult = await client
    .from("finance_settings")
    .upsert({ user_id: userId, hide_deviation: state.settings.hideDeviation }, { onConflict: "user_id" });
  if (settingsResult.error !== null) fail(settingsResult.error, "Не удалось записать настройки");
}
