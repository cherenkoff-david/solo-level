import { daysBetween } from "./periods.ts";
import type { IsoDate, Money, Operation, PlanStatus } from "./types.ts";

export const DECISION_GRACE_DAYS = 3;

export function linkedFacts(
  operations: readonly Operation[],
  planId: string,
): Operation[] {
  return operations.filter(
    (operation) => operation.entryType === "actual" && operation.planId === planId,
  );
}

export function planRemaining(plan: Operation, operations: readonly Operation[]): Money {
  let paid = 0;
  for (const fact of linkedFacts(operations, plan.id)) paid += fact.amountMinor;
  return Math.max(plan.amountMinor - paid, 0);
}

export function planPaid(plan: Operation, operations: readonly Operation[]): Money {
  let paid = 0;
  for (const fact of linkedFacts(operations, plan.id)) paid += fact.amountMinor;
  return paid;
}

export function effectiveStatus(
  plan: Operation,
  operations: readonly Operation[],
  today: IsoDate,
): PlanStatus {
  if (plan.entryType !== "planned") return "done";
  if (plan.status === "skipped" || plan.status === "done") return plan.status;
  const remaining = planRemaining(plan, operations);
  if (remaining <= 0) return "done";
  if (plan.onDate > today) return "pending";
  if (planPaid(plan, operations) > 0) return "partial";
  const late = daysBetween(plan.onDate, today);
  return late > DECISION_GRACE_DAYS ? "overdue" : "due";
}

export interface ConfirmationItem {
  readonly plan: Operation;
  readonly status: PlanStatus;
  readonly remainingMinor: Money;
}

export function confirmationQueue(
  state: { readonly operations: readonly Operation[] },
  today: IsoDate,
): ConfirmationItem[] {
  const items: ConfirmationItem[] = [];
  for (const plan of state.operations) {
    if (plan.entryType !== "planned") continue;
    const status = effectiveStatus(plan, state.operations, today);
    if (status !== "due" && status !== "overdue" && status !== "partial") continue;
    items.push({ plan, status, remainingMinor: planRemaining(plan, state.operations) });
  }
  return items.sort((left, right) => left.plan.onDate.localeCompare(right.plan.onDate));
}

export interface PlanFactSummary {
  readonly plannedMinor: Money;
  readonly actualMinor: Money;
  readonly remainingMinor: Money;
  readonly pendingMinor: Money;
  readonly doneCount: number;
  readonly openCount: number;
}

export function planSummary(state: { readonly operations: readonly Operation[] }): PlanFactSummary {
  let plannedMinor = 0;
  let actualMinor = 0;
  let remainingMinor = 0;
  let doneCount = 0;
  let openCount = 0;
  for (const operation of state.operations) {
    if (operation.entryType === "actual") {
      actualMinor += operation.amountMinor;
      continue;
    }
    if (operation.status === "skipped") continue;
    plannedMinor += operation.amountMinor;
    if (operation.status === "done") {
      doneCount += 1;
      continue;
    }
    const remaining = planRemaining(operation, state.operations);
    remainingMinor += remaining;
    if (remaining > 0) openCount += 1;
    else doneCount += 1;
  }
  return {
    plannedMinor,
    actualMinor,
    remainingMinor,
    pendingMinor: remainingMinor,
    doneCount,
    openCount,
  };
}
