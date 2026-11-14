import { useState } from "react";

import {
  addMonths,
  confirmationQueue,
  effectiveStatus,
  formatDayLabel,
  isWithin,
  monthEndOf,
  monthKeyOf,
  monthRangeBounds,
  planRemaining,
} from "@solo/finance";
import type { IsoDate, Operation } from "@solo/finance";

import { ConfirmPlanDialog } from "./ConfirmPlanDialog";
import { OperationDialog } from "./OperationDialog";
import { SeriesDialog } from "./SeriesDialog";
import { Button, Card, Chip, EmptyState, Money, Select, SignedMoney, TextInput } from "./components/ui";
import { deleteOperation, findCategory, getCategoriesInUse } from "./store";
import { useFinanceState, useToday } from "./useFinance";

type TypeFilter = "all" | "planned" | "actual";
type PeriodMode = "month" | "range";

const STATUS_LABEL: Record<string, string> = {
  pending: "план",
  due: "пора платить",
  overdue: "требует решения",
  partial: "частично",
  done: "исполнено",
  skipped: "не было",
  actual: "факт",
};

export function OperationsScreen() {
  const state = useFinanceState();
  const today = useToday();
  const [period, setPeriod] = useState<PeriodMode>("month");
  const [month, setMonth] = useState(monthKeyOf(today));
  const [fromMonth, setFromMonth] = useState(monthKeyOf(today));
  const [toMonth, setToMonth] = useState(addMonths(monthKeyOf(today), 2));
  const [type, setType] = useState<TypeFilter>("all");
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Operation | undefined>(undefined);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [seriesOpen, setSeriesOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");

  const queue = confirmationQueue(state, today);
  const queueIds = new Set(queue.map((item) => item.plan.id));

  const bounds =
    period === "month"
      ? month === "all"
        ? null
        : { from: `${month}-01`, to: monthEndOf(`${month}-01`) }
      : monthRangeBounds(fromMonth, toMonth);

  const operations = state.operations
    .filter((operation) => {
      if (bounds !== null && !isWithin(operation.onDate, bounds.from, bounds.to)) return false;
      if (type !== "all" && operation.entryType !== type) return false;
      if (categoryFilter !== "all" && operation.categoryId !== categoryFilter) return false;
      if (query.trim() !== "") {
        const haystack = [
          findCategory(operation.categoryId, state)?.name ?? "",
          operation.note ?? "",
          operation.onDate,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query.trim().toLowerCase())) return false;
      }
      return true;
    })
    .sort((left, right) => {
      if (left.onDate !== right.onDate) return right.onDate.localeCompare(left.onDate);
      return right.createdAt.localeCompare(left.createdAt);
    });

  const grouped = new Map<IsoDate, Operation[]>();
  for (const operation of operations) {
    const bucket = grouped.get(operation.onDate);
    if (bucket === undefined) grouped.set(operation.onDate, [operation]);
    else bucket.push(operation);
  }

  const summary = operations.reduce(
    (acc, operation) => {
      const kind = findCategory(operation.categoryId, state)?.kind ?? "expense";
      const isActual = operation.entryType === "actual";
      const isCountedPlan = operation.entryType === "planned" && operation.status !== "skipped";
      if (kind === "income") {
        if (isActual) acc.income += operation.amountMinor;
        else if (isCountedPlan) acc.incomePlan += operation.amountMinor;
      } else {
        if (isActual) acc.expense += operation.amountMinor;
        else if (isCountedPlan) acc.expensePlan += operation.amountMinor;
      }
      return acc;
    },
    { income: 0, expense: 0, incomePlan: 0, expensePlan: 0 },
  );

  const planToConfirm = confirming === null ? null : state.operations.find((operation) => operation.id === confirming) ?? null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-3" data-tour="operations">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-[0.08em] text-text-faint">Период</span>
          <div className="flex h-9 items-center gap-1 rounded-md border border-border bg-bg/40 p-1">
            {(["month", "range"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setPeriod(mode)}
                aria-pressed={period === mode}
                className={`h-7 rounded px-2.5 text-xs transition-colors ${
                  period === mode ? "bg-surface-raised text-text" : "text-text-muted hover:text-text"
                }`}
              >
                {mode === "month" ? "Месяц" : "Диапазон"}
              </button>
            ))}
          </div>
        </div>

        {period === "month" ? (
          <label className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-[0.08em] text-text-faint">Месяц</span>
            <div className="flex items-center gap-1">
              <TextInput
                type="month"
                value={month === "all" ? "" : month}
                onChange={(event) => setMonth(event.target.value || "all")}
                className="w-40"
              />
              {month === "all" ? null : (
                <Button size="sm" variant="ghost" onClick={() => setMonth("all")}>
                  все
                </Button>
              )}
            </div>
          </label>
        ) : (
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs uppercase tracking-[0.08em] text-text-faint">С месяца</span>
              <TextInput
                type="month"
                value={fromMonth}
                onChange={(event) => setFromMonth(event.target.value || monthKeyOf(today))}
                className="w-40"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs uppercase tracking-[0.08em] text-text-faint">По месяц</span>
              <TextInput
                type="month"
                value={toMonth}
                onChange={(event) => setToMonth(event.target.value || monthKeyOf(today))}
                className="w-40"
              />
            </label>
            {fromMonth > toMonth ? (
              <span className="pb-2.5 text-xs text-text-faint">границы меняются местами</span>
            ) : null}
          </div>
        )}
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-[0.08em] text-text-faint">Тип</span>
          <Select value={type} onChange={(event) => setType(event.target.value as TypeFilter)} className="w-36">
            <option value="all">Все</option>
            <option value="planned">Планы</option>
            <option value="actual">Факты</option>
          </Select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-[0.08em] text-text-faint">Категория</span>
          <Select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="w-48">
            <option value="all">Все категории</option>
            {getCategoriesInUse(state).map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex min-w-48 flex-1 flex-col gap-1.5">
          <span className="text-xs uppercase tracking-[0.08em] text-text-faint">Поиск</span>
          <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="заметка, категория, дата" />
        </label>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setSeriesOpen(true)} data-tour="series">
            Серия
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setEditing(undefined);
              setFormOpen(true);
            }}
          >
            Новая операция
          </Button>
        </div>
      </div>

      {queue.length === 0 ? null : (
        <p className="text-sm text-text-muted">
          Ждут подтверждения: {queue.length}. Они помечены в списке как «требует решения».
        </p>
      )}

      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-xs text-text-faint">
        <span>
          {operations.length === 0 ? "ничего не найдено" : `найдено операций: ${operations.length}`}
        </span>
        <span>
          доходы{" "}
          <Money amountMinor={summary.income} compact className="text-income" />
          <span className="ml-1">· план</span>{" "}
          <Money amountMinor={summary.incomePlan} compact />
        </span>
        <span>
          расходы{" "}
          <Money amountMinor={summary.expense} compact className="text-expense" />
          <span className="ml-1">· план</span>{" "}
          <Money amountMinor={summary.expensePlan} compact />
        </span>
      </div>

      {operations.length === 0 ? (
        <EmptyState
          title="Операций нет"
          hint="Измените фильтры или добавьте операцию. План — намерение, факт — то, что уже произошло."
          action={
            <Button variant="primary" size="sm" onClick={() => setFormOpen(true)}>
              Новая операция
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {[...grouped.entries()].map(([date, items]) => {
            const dayFact = items
              .filter((operation) => operation.entryType === "actual")
              .reduce((sum, operation) => {
                const category = findCategory(operation.categoryId, state);
                return sum + (category?.kind === "income" ? operation.amountMinor : -operation.amountMinor);
              }, 0);
            return (
              <Card key={date}>
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-5 py-2.5">
                  <h2 className="text-sm text-text">{formatDayLabel(date)}</h2>
                  <span className="text-xs text-text-faint">
                    {dayFact === 0 ? (
                      "нет фактов в этот день"
                    ) : (
                      <>
                        факт за день{" "}
                        <SignedMoney
                          amountMinor={dayFact}
                          compact
                          className={dayFact > 0 ? "text-income" : "text-expense"}
                        />
                      </>
                    )}
                  </span>
                </div>
                <ul className="divide-y divide-border">
                  {items.map((operation) => {
                    const category = findCategory(operation.categoryId, state);
                    const isPlan = operation.entryType === "planned";
                    const status = isPlan ? effectiveStatus(operation, state.operations, today) : "actual";
                    const remaining = isPlan ? planRemaining(operation, state.operations) : 0;
                    const needsDecision = queueIds.has(operation.id);
                    return (
                      <li key={operation.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5">
                        <span className="flex min-w-0 flex-wrap items-baseline gap-2">
                          <span className="flex size-5 shrink-0 items-center justify-center rounded border border-border text-[10px] text-text-muted">
                            {category?.icon ?? "?"}
                          </span>
                          <span className="truncate text-sm text-text">{category?.name ?? "Без категории"}</span>
                          {operation.note === null ? null : (
                            <span className="truncate text-xs text-text-faint">{operation.note}</span>
                          )}
                          <Chip tone={needsDecision ? "outline" : "neutral"}>{STATUS_LABEL[status] ?? status}</Chip>
                          {isPlan && remaining > 0 && (status === "partial" || status === "overdue") ? (
                            <span className="text-xs text-text-faint">
                              остаток <Money amountMinor={remaining} />
                            </span>
                          ) : null}
                        </span>
                        <span className="flex items-center gap-3">
                          <span
                            className={`text-sm ${category?.kind === "income" ? "text-income" : "text-expense"}`}
                          >
                            {category?.kind === "income" ? "+" : "−"}
                            <Money amountMinor={operation.amountMinor} />
                          </span>
                          {needsDecision ? (
                            <Button size="sm" variant="secondary" onClick={() => setConfirming(operation.id)}>
                              Подтвердить
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditing(operation);
                              setFormOpen(true);
                            }}
                          >
                            изменить
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteOperation(operation.id)}>
                            удалить
                          </Button>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            );
          })}
        </div>
      )}

      {formOpen ? (
        <OperationDialog
          today={today}
          {...(editing === undefined ? {} : { operation: editing })}
          onClose={() => setFormOpen(false)}
        />
      ) : null}

      {seriesOpen ? <SeriesDialog today={today} onClose={() => setSeriesOpen(false)} /> : null}

      {planToConfirm === null ? null : (
        <ConfirmPlanDialog plan={planToConfirm} state={state} today={today} onClose={() => setConfirming(null)} />
      )}
    </div>
  );
}
