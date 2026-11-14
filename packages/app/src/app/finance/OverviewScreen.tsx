import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  accumulatedDeviation,
  accountingStart,
  activeBaseline,
  actualBalance,
  addMonths,
  cashflow,
  confirmationQueue,
  deviationAt,
  firstShortage,
  formatDayLabel,
  monthComparison,
  monthEndOf,
  monthKeyOf,
  monthNameNominative,
  monthStartOf,
  targetBalance,
} from "@solo/finance";
import type { FinanceState } from "@solo/finance";

import { CashflowChart } from "./CashflowChart";
import { Button, Card, CardHeader, Chip, DeviationText, Dialog, EmptyState, Field, Money, TextInput } from "./components/ui";
import { ConfirmPlanDialog } from "./ConfirmPlanDialog";
import { acceptReality, findCategory, getCategoriesInUse } from "./store";
import { useFinanceState, useToday } from "./useFinance";

type Range = "month" | "three" | "six";

const RANGE_LABEL: Record<Range, string> = {
  month: "месяц",
  three: "3 месяца",
  six: "6 месяцев",
};

function monthTotals(state: FinanceState, monthKey: string) {
  const start = `${monthKey}-01`;
  const end = monthEndOf(start);
  let incomeFact = 0;
  let expenseFact = 0;
  let incomePlan = 0;
  let expensePlan = 0;
  for (const operation of state.operations) {
    if (operation.onDate < start || operation.onDate > end) continue;
    const category = findCategory(operation.categoryId, state);
    if (category === undefined) continue;
    const isIncome = category.kind === "income";
    if (operation.entryType === "actual") {
      if (isIncome) incomeFact += operation.amountMinor;
      else expenseFact += operation.amountMinor;
    } else if (operation.status !== "skipped") {
      if (isIncome) incomePlan += operation.amountMinor;
      else expensePlan += operation.amountMinor;
    }
  }
  return { incomeFact, expenseFact, incomePlan, expensePlan };
}

export function OverviewScreen() {
  const state = useFinanceState();
  const today = useToday();
  const [range, setRange] = useState<Range>("month");
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [acceptDate, setAcceptDate] = useState(today);
  const [confirmPlanId, setConfirmPlanId] = useState<string | null>(null);

  const monthKey = monthKeyOf(today);
  const fact = actualBalance(state, today);
  const target = targetBalance(state, today);
  const deviation = deviationAt(state, today);
  const accumulated = accumulatedDeviation(state, today);
  const baseline = activeBaseline(state.baselines, today);
  const rows = monthComparison(state, monthKey);
  const totals = monthTotals(state, monthKey);
  const queue = confirmationQueue(state, today);

  const rangeFrom = monthStartOf(today);
  const rangeTo = monthEndOf(addMonths(monthKey, range === "month" ? 0 : range === "three" ? 2 : 5));
  const points = useMemo(() => cashflow(state, rangeFrom, rangeTo), [state, rangeFrom, rangeTo, today]);
  const accountingFrom = accountingStart(state);
  const chartStartsLate =
    accountingFrom !== null && points.length > 0 && points[0]?.date === accountingFrom && accountingFrom > rangeFrom;
  const shortage = useMemo(() => firstShortage(state, today, rangeTo), [state, today, rangeTo]);

  const plan = confirmPlanId === null ? null : state.operations.find((operation) => operation.id === confirmPlanId) ?? null;

  const topOverrun = rows
    .filter((row) => row.category.kind === "expense" && row.hasPlan && row.deviationMinor > 0)
    .sort((left, right) => right.deviationMinor - left.deviationMinor)[0];

  return (
    <div className="flex flex-col gap-5">
      {shortage === null ? null : (
        <div className="flex items-start gap-3 rounded-lg border border-text px-5 py-4">
          <span aria-hidden="true" className="mt-0.5 text-base">!</span>
          <div>
            <p className="text-base text-text">
              {shortage.date === today
                ? "Денег не хватает уже сегодня"
                : `Денег не хватит на ${formatDayLabel(shortage.date)}`}
            </p>
            <p className="mt-0.5 text-sm text-text-muted">
              По плану в этот день баланс станет <Money amountMinor={shortage.amountMinor} />. Это прогноз, а не приговор:
              можно перенести платёж или запланировать поступление.
            </p>
          </div>
        </div>
      )}

      {queue.length === 0 ? null : (
        <div className="rounded-lg border border-dashed border-border-strong px-5 py-4" data-tour="queue">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-base text-text">
              {queue.length === 1 ? "Одна операция ждёт подтверждения" : `${queue.length} операции ждут подтверждения`}
            </p>
            <Link to="/finance/operations" className="text-xs text-text-muted underline-offset-4 hover:text-text hover:underline">
              Все операции
            </Link>
          </div>
          <ul className="mt-3 flex flex-col gap-2">
            {queue.slice(0, 3).map((item) => (
              <li key={item.plan.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-2 first:border-0 first:pt-0">
                <span className="flex items-baseline gap-2 text-sm">
                  <span className="text-text-muted">{formatDayLabel(item.plan.onDate)}</span>
                  <span className="text-text">{findCategory(item.plan.categoryId, state)?.name ?? "Операция"}</span>
                  <Money amountMinor={item.plan.amountMinor} className="text-text-muted" />
                </span>
                <span className="flex items-center gap-2">
                  {item.status === "overdue" ? <Chip>требует решения</Chip> : null}
                  {item.status === "partial" ? <Chip>частично</Chip> : null}
                  <Button size="sm" variant="secondary" onClick={() => setConfirmPlanId(item.plan.id)}>
                    Подтвердить
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <Card className="p-6" dataTour="balance">
          <p className="text-xs uppercase tracking-[0.1em] text-text-faint">Сейчас на руках</p>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <Money amountMinor={fact} className="text-3xl leading-none text-text" />
            <span className="text-sm text-text-muted">
              по плану на сегодня <Money amountMinor={target} />
            </span>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {state.settings.hideDeviation ? (
              <span className="text-xs text-text-faint">отклонение скрыто в настройках</span>
            ) : (
              <>
                <Chip tone="outline">
                  <DeviationText
                    deviationMinor={deviation}
                    className="whitespace-nowrap"
                    withPreposition
                  />
                </Chip>
                {topOverrun === undefined ? null : (
                  <span className="text-xs text-text-muted">
                    больше всего сверх плана: {topOverrun.category.name} на{" "}
                    <Money amountMinor={topOverrun.deviationMinor} />
                  </span>
                )}
              </>
            )}
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4 text-sm">
            <div>
              <dt className="text-xs text-text-faint">Доходы за месяц, факт</dt>
              <dd className="mt-0.5 text-text">
                <Money amountMinor={totals.incomeFact} />
                <span className="ml-1 text-xs text-text-faint">план <Money amountMinor={totals.incomePlan} /></span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-text-faint">Расходы за месяц, факт</dt>
              <dd className="mt-0.5 text-text">
                <Money amountMinor={totals.expenseFact} />
                <span className="ml-1 text-xs text-text-faint">план <Money amountMinor={totals.expensePlan} /></span>
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="p-6" dataTour="deviation">
          <p className="text-xs uppercase tracking-[0.1em] text-text-faint">Накопленное отклонение</p>
          <div className="mt-2 flex items-baseline gap-3">
            {state.settings.hideDeviation ? (
              <span className="text-2xl text-text-faint">скрыто</span>
            ) : (
              <DeviationText
                deviationMinor={accumulated}
                className="text-xl text-text"
                label="за всё время"
              />
            )}
          </div>
          <p className="mt-2 text-sm text-text-muted">
            {baseline === null ? (
              "Базовая линия не задана"
            ) : (
              <>
                отсчёт с {formatDayLabel(baseline.effectiveDate)}, стартовый баланс{" "}
                <Money amountMinor={baseline.amountMinor} />
              </>
            )}
          </p>
          <p className="mt-3 text-xs text-text-faint">
            Отклонение живёт внутри месяца и становится историей 1-го числа. «Принять реальность» переносит
            точку отсчёта на фактический баланс, история остаётся.
          </p>
          <div className="mt-4">
            <Button variant="secondary" size="sm" onClick={() => setAcceptOpen(true)}>
              Принять реальность
            </Button>
          </div>
        </Card>
      </div>

      <Card dataTour="chart">
        <CardHeader
          title="Денежный поток"
          hint="Факт до сегодня, план на всём диапазоне. Наведите или кликните по дню — ниже появятся накопления и операции"
          actions={
            <div className="flex items-center gap-1">
              {(Object.keys(RANGE_LABEL) as Range[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setRange(item)}
                  className={`h-7 rounded-md px-2.5 text-xs transition-colors ${
                    range === item ? "bg-surface-raised text-text" : "text-text-muted hover:text-text"
                  }`}
                >
                  {RANGE_LABEL[item]}
                </button>
              ))}
            </div>
          }
        />
        <div className="px-5 py-4">
          {chartStartsLate ? (
            <p className="mb-3 text-xs text-text-faint">
              График начинается с {formatDayLabel(accountingFrom ?? "")}: раньше этой даты учёт не вёлся,
              и дорисовывать нули было бы выдумкой.
            </p>
          ) : null}
          <CashflowChart
            points={points}
            operations={state.operations}
            categories={state.categories}
            today={today}
          />
        </div>
      </Card>

      <Card dataTour="planfact">
        <CardHeader
          title={`План и факт · ${monthNameNominative(monthKey)}`}
          hint="Группировка по категориям за текущий месяц"
        />
        {rows.length === 0 ? (
          <div className="px-5 py-6">
            <EmptyState
              title="В этом месяце операций нет"
              hint="Добавьте план или факт — сравнение появится здесь."
              action={
                <Link to="/finance/operations">
                  <Button variant="primary" size="sm">
                    Добавить операцию
                  </Button>
                </Link>
              }
            />
          </div>
        ) : (
          <>
          <div
            aria-hidden="true"
            className="grid grid-cols-[1fr_auto_auto_auto] items-baseline gap-4 px-5 pt-3 text-[10px] uppercase tracking-[0.08em] text-text-faint"
          >
            <span>категория</span>
            <span className="w-24 text-right">план</span>
            <span className="w-24 text-right">факт</span>
            <span className="w-40 text-right">расхождение</span>
          </div>
          <div className="divide-y divide-border">
            {(["expense", "income"] as const).map((kind) => {
              const kindRows = rows.filter((row) => row.category.kind === kind);
              if (kindRows.length === 0) return null;
              return (
                <div key={kind} className="px-5 py-3">
                  <p className="mb-2 text-xs uppercase tracking-[0.08em] text-text-faint">
                    {kind === "expense" ? "Расходы" : "Доходы"}
                  </p>
                  <ul className="flex flex-col">
                    {kindRows.map((row) => (
                      <li key={row.category.id} className="grid grid-cols-[1fr_auto_auto_auto] items-baseline gap-4 py-1.5">
                        <span className="flex items-center gap-2 truncate text-sm text-text">
                          <span aria-hidden="true" className="flex size-5 shrink-0 items-center justify-center rounded border border-border text-[10px] text-text-muted">
                            {row.category.icon}
                          </span>
                          <span className="truncate">{row.category.name}</span>
                          {row.category.isEssential ? <span className="text-[10px] uppercase tracking-wide text-text-faint">обяз.</span> : null}
                        </span>
                        <span className="nums w-24 text-right text-xs text-text-faint">
                          {row.hasPlan ? <Money amountMinor={row.planMinor} compact /> : "—"}
                        </span>
                        <span className="w-24 text-right text-sm text-text">
                          <Money amountMinor={row.factMinor} />
                        </span>
                        <span className="flex w-40 justify-end text-right text-xs">
                          <DeviationText deviationMinor={row.deviationMinor} noPlan={!row.hasPlan} />
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          </>
        )}
      </Card>

      <p className="text-xs text-text-faint">
        Категорий в работе: {getCategoriesInUse(state).length}. Управление — в{" "}
        <Link to="/finance/settings" className="underline underline-offset-2 hover:text-text">
          настройках раздела
        </Link>
        .
      </p>

      {acceptOpen ? (
        <Dialog
          title="Принять реальность"
          description="Точка отсчёта переносится на фактический баланс выбранной даты"
          onClose={() => setAcceptOpen(false)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setAcceptOpen(false)}>
                Отмена
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  acceptReality(acceptDate);
                  setAcceptOpen(false);
                }}
              >
                Перенести отсчёт
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <Field label="Дата нового отсчёта">
              <TextInput type="date" value={acceptDate} onChange={(event) => setAcceptDate(event.target.value)} />
            </Field>
            <div className="rounded-md border border-border px-3 py-2 text-sm">
              <span className="text-text-muted">Фактический баланс на эту дату: </span>
              <Money amountMinor={actualBalance(state, acceptDate)} />
            </div>
            <p className="text-xs text-text-faint">
              Накопленное отклонение после этой даты начнёт считаться заново. Прошлые снимки месяцев останутся
              в истории.
            </p>
          </div>
        </Dialog>
      ) : null}

      {plan === null ? null : (
        <ConfirmPlanDialog plan={plan} state={state} today={today} onClose={() => setConfirmPlanId(null)} />
      )}
    </div>
  );
}
