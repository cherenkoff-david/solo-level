export type IsoDate = string;
export type Money = number;

export type CategoryKind = "income" | "expense";

export type PlanStatus = "pending" | "due" | "overdue" | "partial" | "done" | "skipped";
export type OperationStatus = PlanStatus | "actual";
export type EntryType = "planned" | "actual";
export type Recurrence = "daily" | "weekly" | "monthly";

export interface Category {
  readonly id: string;
  readonly name: string;
  readonly kind: CategoryKind;
  readonly isEssential: boolean;
  readonly icon: string;
  readonly archivedAt: IsoDate | null;
  /**
   * Порядок отображения в списках. Влияет только на восприятие:
   * ни баланс, ни отклонение, ни отчёты от него не зависят.
   */
  readonly sortOrder: number;
}

export interface Operation {
  readonly id: string;
  readonly entryType: EntryType;
  readonly status: OperationStatus;
  readonly categoryId: string;
  readonly onDate: IsoDate;
  readonly amountMinor: Money;
  readonly planId: string | null;
  readonly seriesId: string | null;
  readonly seriesOccurrenceDate: IsoDate | null;
  readonly note: string | null;
  readonly createdAt: string;
}

export interface Series {
  readonly id: string;
  readonly title: string;
  readonly categoryId: string;
  readonly amountMinor: Money;
  readonly recurrence: Recurrence;
  readonly startDate: IsoDate;
  readonly dayOfMonth: number | null;
  readonly weekday: number | null;
  readonly occurrencesCount: number | null;
  readonly endsOn: IsoDate | null;
  readonly archivedAt: IsoDate | null;
}

export interface Baseline {
  readonly id: string;
  readonly effectiveDate: IsoDate;
  readonly amountMinor: Money;
  readonly reason: "start" | "accept_reality";
  readonly createdAt: string;
}

export interface Snapshot {
  readonly monthStart: IsoDate;
  readonly targetMinor: Money;
  readonly factMinor: Money;
  readonly deviationMinor: Money;
  readonly closeMode: "auto" | "manual";
}

export interface FinanceSettings {
  readonly hideDeviation: boolean;
}

export interface FinanceState {
  readonly version: number;
  readonly categories: readonly Category[];
  readonly operations: readonly Operation[];
  readonly series: readonly Series[];
  readonly baselines: readonly Baseline[];
  readonly snapshots: readonly Snapshot[];
  readonly settings: FinanceSettings;
}

export const FINANCE_STATE_VERSION = 1;

export function emptyFinanceState(): FinanceState {
  return {
    version: FINANCE_STATE_VERSION,
    categories: [],
    operations: [],
    series: [],
    baselines: [],
    snapshots: [],
    settings: { hideDeviation: false },
  };
}
