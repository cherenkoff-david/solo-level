import { useState } from "react";

import {
  confirmationQueue,
  effectiveStatus,
  formatDayLabel,
  monthKeyOf,
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
  const [month, setMonth] = useState(monthKeyOf(today));
  const [type, setType] = useState<TypeFilter>("all");
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Operation | undefined>(undefined);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [seriesOpen, setSeriesOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");

  const queue = confirmationQueue(state, today);
  const queueIds = new Set(queue.map((item) => item.plan.id));

  const operations = state.operations
    .filter((operation) => {
      if (month !== "all" && monthKeyOf(operation.onDate) !== month) return false;
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

  const planToConfirm = confirming === null ? null : state.operations.find((operation) => operation.id === confirming) ?? null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-3" data-tour="operations">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-[0.08em] text-text-faint">Месяц</span>
          <TextInput type="month" value={month === "all" ? "" : month} onChange={(event) => setMonth(event.target.value || "all")} className="w-40" />
        </label>
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
                        факт за день <SignedMoney amountMinor={dayFact} compact />
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
                          <span className="text-sm text-text">
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
