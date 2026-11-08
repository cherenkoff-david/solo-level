import { useState } from "react";

import {
  addMonths,
  cashflow,
  formatDayLabel,
  monthEndOf,
  monthKeyOf,
  monthNameNominative,
  operationsOfDay,
  weekdayIndex,
} from "@solo/finance";
import type { IsoDate, Operation } from "@solo/finance";

import { OperationDialog } from "./OperationDialog";
import { ConfirmPlanDialog } from "./ConfirmPlanDialog";
import { Button, Card, Chip, EmptyState, Money, SignedMoney } from "./components/ui";
import { deleteOperation, findCategory } from "./store";
import { useFinanceState, useToday } from "./useFinance";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export function CalendarScreen() {
  const state = useFinanceState();
  const today = useToday();
  const [monthKey, setMonthKey] = useState(monthKeyOf(today));
  const [selected, setSelected] = useState<IsoDate>(today);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Operation | undefined>(undefined);
  const [confirming, setConfirming] = useState<string | null>(null);

  const start = `${monthKey}-01`;
  const end = monthEndOf(start);
  const points = cashflow(state, start, end);
  const balances = new Map(points.map((point) => [point.date, point]));

  const offset = weekdayIndex(start) - 1;
  const cells: (IsoDate | null)[] = [];
  for (let index = 0; index < offset; index += 1) cells.push(null);
  for (const point of points) cells.push(point.date);
  while (cells.length % 7 !== 0) cells.push(null);

  const dayOperations = operationsOfDay(state.operations, selected);
  const selectedPoint = balances.get(selected);
  const planToConfirm = confirming === null ? null : state.operations.find((operation) => operation.id === confirming) ?? null;

  const sumOfDay = (date: IsoDate): number => {
    let total = 0;
    for (const operation of operationsOfDay(state.operations, date)) {
      const category = findCategory(operation.categoryId, state);
      if (category === undefined) continue;
      if (operation.entryType !== "actual") continue;
      total += category.kind === "income" ? operation.amountMinor : -operation.amountMinor;
    }
    return total;
  };

  const plannedSumOfDay = (date: IsoDate): number => {
    let total = 0;
    for (const operation of operationsOfDay(state.operations, date)) {
      const category = findCategory(operation.categoryId, state);
      if (category === undefined || operation.entryType !== "planned") continue;
      if (operation.status === "skipped") continue;
      total += category.kind === "income" ? operation.amountMinor : -operation.amountMinor;
    }
    return total;
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => setMonthKey(addMonths(monthKey, -1))} aria-label="Предыдущий месяц">
            ←
          </Button>
          <span className="min-w-36 text-center text-base text-text">
            {monthNameNominative(monthKey)} {monthKey.slice(0, 4)}
          </span>
          <Button size="sm" variant="secondary" onClick={() => setMonthKey(addMonths(monthKey, 1))} aria-label="Следующий месяц">
            →
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setMonthKey(monthKeyOf(today));
              setSelected(today);
            }}
          >
            сегодня
          </Button>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
        >
          Новая операция
        </Button>
      </div>

      <Card dataTour="calendar">
        <div className="grid grid-cols-7 border-b border-border">
          {WEEKDAYS.map((day) => (
            <div key={day} className="px-2 py-2 text-center text-xs uppercase tracking-[0.08em] text-text-faint">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((date, index) => {
            if (date === null) {
              return <div key={`empty-${index}`} className="min-h-24 border-b border-r border-border/60 bg-bg/20" />;
            }
            const point = balances.get(date);
            const isToday = date === today;
            const isSelected = date === selected;
            const actual = sumOfDay(date);
            const planned = plannedSumOfDay(date);
            const isFuture = date > today;
            return (
              <button
                key={date}
                type="button"
                onClick={() => setSelected(date)}
                aria-pressed={isSelected}
                className={`flex min-h-24 flex-col gap-1 border-b border-r border-border/60 px-2 py-1.5 text-left transition-colors ${
                  isSelected ? "bg-surface-raised" : "hover:bg-surface"
                } ${date > today ? "bg-bg/30" : ""}`}
              >
                <span className="flex items-center justify-between">
                  <span
                    className={`nums text-xs ${
                      isToday ? "rounded-full bg-text px-1.5 py-0.5 text-bg" : "text-text-muted"
                    }`}
                  >
                    {Number(date.slice(8, 10))}
                  </span>
                  {isFuture && planned !== 0 ? (
                    <Money amountMinor={planned} compact className="text-[10px] text-text-faint" />
                  ) : null}
                </span>
                {isFuture ? (
                  <span className="nums text-[11px] text-text-faint">
                    {point === undefined || point.target === 0 ? "" : <Money amountMinor={point.target} compact />}
                  </span>
                ) : (
                  <>
                    <span className="nums text-[11px] text-text">
                      {actual === 0 ? "" : <SignedMoney amountMinor={actual} compact />}
                    </span>
                    <span className="nums mt-auto text-[11px] text-text-faint">
                      {point === undefined || point.fact === 0 ? "" : <Money amountMinor={point.fact} compact />}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      <Card dataTour="calendar-day">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-5 py-3">
          <div className="flex items-baseline gap-3">
            <h2 className="text-base text-text">{formatDayLabel(selected)}</h2>
            {selectedPoint === undefined ? null : (
              <span className="text-xs text-text-muted">
                {selected > today ? "по плану" : "факт"} на конец дня{" "}
                <Money
                  amountMinor={selected > today ? selectedPoint.target : selectedPoint.fact}
                  className="text-text"
                />
              </span>
            )}
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setEditing(undefined);
              setFormOpen(true);
            }}
          >
            Добавить в этот день
          </Button>
        </div>
        {dayOperations.length === 0 ? (
          <div className="px-5 py-5">
            <EmptyState title="В этот день операций нет" hint="Добавьте план или факт — они появятся здесь и в календаре." />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {dayOperations.map((operation) => {
              const category = findCategory(operation.categoryId, state);
              const isPlan = operation.entryType === "planned";
              return (
                <li key={operation.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5">
                  <span className="flex min-w-0 items-baseline gap-2">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded border border-border text-[10px] text-text-muted">
                      {category?.icon ?? "?"}
                    </span>
                    <span className="truncate text-sm text-text">{category?.name ?? "Без категории"}</span>
                    {operation.note === null ? null : (
                      <span className="truncate text-xs text-text-faint">{operation.note}</span>
                    )}
                    {isPlan ? (
                      <Chip>{operation.status === "skipped" ? "не было" : operation.status === "done" ? "исполнено" : "план"}</Chip>
                    ) : (
                      <Chip tone="outline">факт</Chip>
                    )}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className={`text-sm ${category?.kind === "income" ? "text-text" : "text-text-muted"}`}>
                      {category?.kind === "income" ? "+" : "−"}
                      <Money amountMinor={operation.amountMinor} />
                    </span>
                    {isPlan && (operation.status === "pending" || operation.status === "partial") ? (
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
        )}
      </Card>

      <p className="text-xs text-text-faint">
        В ячейке: сумма операций дня и остаток на конец дня. Прошедшие дни — по факту, будущие — по плану.
      </p>

      {formOpen ? (
        <OperationDialog
          today={today}
          {...(editing === undefined ? {} : { operation: editing })}
          presetDate={selected}
          onClose={() => setFormOpen(false)}
        />
      ) : null}

      {planToConfirm === null ? null : (
        <ConfirmPlanDialog plan={planToConfirm} state={state} today={today} onClose={() => setConfirming(null)} />
      )}
    </div>
  );
}
