import { actualBalance, activeBaseline, targetBalance } from "./balance.ts";
import { monthEndOf } from "./periods.ts";
import type { FinanceState, IsoDate, Snapshot } from "./types.ts";

export function buildSnapshot(
  state: FinanceState,
  monthKey: string,
  closeMode: "auto" | "manual",
  asOf?: IsoDate,
): Snapshot {
  const monthStart = `${monthKey}-01`;
  const at = asOf ?? monthEndOf(monthStart);
  const targetMinor = targetBalance(state, at);
  const factMinor = actualBalance(state, at);
  return {
    monthStart,
    targetMinor,
    factMinor,
    deviationMinor: factMinor - targetMinor,
    closeMode,
  };
}

export interface MonthToClose {
  readonly monthKey: string;
  readonly snapshot: Snapshot;
}

export function monthsToClose(state: FinanceState, today: IsoDate): MonthToClose[] {
  const baseline = activeBaseline(state.baselines, today);
  if (baseline === null) return [];
  const currentMonth = today.slice(0, 7);
  const existing = new Set(state.snapshots.map((snapshot) => snapshot.monthStart));
  const out: MonthToClose[] = [];
  let cursor = baseline.effectiveDate.slice(0, 7);
  let guard = 0;
  while (cursor < currentMonth && guard < 240) {
    const monthStart = `${cursor}-01`;
    if (!existing.has(monthStart)) {
      out.push({ monthKey: cursor, snapshot: buildSnapshot(state, cursor, "auto") });
    }
    cursor = nextMonthKey(cursor);
    guard += 1;
  }
  return out;
}

function nextMonthKey(monthKey: string): string {
  const parts = monthKey.split("-");
  const year = Number(parts[0] ?? "1970");
  const month = Number(parts[1] ?? "1");
  const total = year * 12 + month;
  return `${String(Math.floor(total / 12)).padStart(4, "0")}-${String((total % 12) + 1).padStart(2, "0")}`;
}

export function baselineAfterAcceptReality(
  state: FinanceState,
  date: IsoDate,
  id: string,
  createdAt: string,
) {
  return {
    id,
    effectiveDate: date,
    amountMinor: actualBalance(state, date),
    reason: "accept_reality" as const,
    createdAt,
  };
}
