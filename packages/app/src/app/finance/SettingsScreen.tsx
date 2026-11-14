import { useState } from "react";

import {
  accumulatedDeviation,
  activeBaseline,
  actualBalance,
  formatDayLabel,
  monthNameNominative,
  monthKeyOf,
  planRemaining,
} from "@solo/finance";
import {
  acceptReality,
  addSampleData,
  closeCurrentMonth,
  deleteSeries,
  exportJson,
  resetFinance,
  toggleHideDeviation,
  updateSeriesAmount,
} from "./store";
import { Button, Card, CardHeader, Chip, DeviationText, Field, Money, Toggle, TextInput } from "./components/ui";
import { CategoryManager } from "./CategoryManager";
import { useFinanceState, useToday } from "./useFinance";
import { SignOutButton } from "../auth/AuthPanel";
import { useAuthState } from "../auth/useAuth";
import { useLocation, useNavigate } from "react-router-dom";

export function SettingsScreen() {
  const auth = useAuthState();
  const state = useFinanceState();
  const today = useToday();
  const navigate = useNavigate();
  const location = useLocation();
  const [acceptDate, setAcceptDate] = useState(today);
  const [resetArmed, setResetArmed] = useState(false);

  const baseline = activeBaseline(state.baselines, today);
  const accumulated = accumulatedDeviation(state, today);
  const monthKey = monthKeyOf(today);
  const currentMonthClosed = state.snapshots.some((snapshot) => snapshot.monthStart === `${monthKey}-01`);

  const download = () => {
    const blob = new Blob([exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `solo-finance-${today}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-5">
      <Card dataTour="baseline">
        <CardHeader title="Точка отсчёта" hint="От неё считаются и факт, и целевой баланс" />
        <div className="flex flex-col gap-4 px-5 py-4">
          {baseline === null ? (
            <p className="text-sm text-text-muted">Базовая линия не задана.</p>
          ) : (
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm">
              <span className="text-text-muted">
                Старт: <span className="text-text">{formatDayLabel(baseline.effectiveDate)}</span>
              </span>
              <span className="text-text-muted">
                Сумма: <Money amountMinor={baseline.amountMinor} className="text-text" />
              </span>
              <span className="text-text-muted">
                Накопленное отклонение: <Money amountMinor={accumulated} className="text-text" />
              </span>
            </div>
          )}

          <div className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
            <Field label="Принять реальность с даты" className="w-44">
              <TextInput type="date" value={acceptDate} onChange={(event) => setAcceptDate(event.target.value)} />
            </Field>
            <Button variant="secondary" onClick={() => acceptReality(acceptDate)}>
              Перенести отсчёт
            </Button>
            <span className="pb-2 text-xs text-text-faint">
              факт на дату: <Money amountMinor={actualBalance(state, acceptDate)} />
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
            <Button variant="secondary" size="sm" onClick={() => closeCurrentMonth(today)} disabled={currentMonthClosed}>
              Закрыть {monthNameNominative(monthKey).toLowerCase()} вручную
            </Button>
            <span className="text-xs text-text-faint">
              {currentMonthClosed
                ? "месяц уже закрыт; закрытые месяцы не пересчитываются"
                : "снимок зафиксирует цель, факт и отклонение; 1-го числа это происходит автоматически"}
            </span>
          </div>

          {state.snapshots.length === 0 ? null : (
            <div className="border-t border-border pt-4">
              <p className="text-xs uppercase tracking-[0.08em] text-text-faint">История месяцев</p>
              <ul className="mt-2 flex flex-col gap-1">
                {[...state.snapshots]
                  .sort((left, right) => right.monthStart.localeCompare(left.monthStart))
                  .map((snapshot) => (
                    <li key={snapshot.monthStart} className="flex flex-wrap items-baseline gap-x-4 text-sm">
                      <span className="w-28 text-text">{monthNameNominative(snapshot.monthStart.slice(0, 7))}</span>
                      <span className="text-xs text-text-faint">
                        план <Money amountMinor={snapshot.targetMinor} />
                      </span>
                      <span className="text-xs text-text-faint">
                        факт <Money amountMinor={snapshot.factMinor} />
                      </span>
                      <span className="text-xs">
                        <DeviationText deviationMinor={snapshot.deviationMinor} compact />
                      </span>
                      <Chip>{snapshot.closeMode === "auto" ? "авто" : "вручную"}</Chip>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      </Card>

      <CategoryManager />

      <Card>
        <CardHeader title="Серии" hint="Повторяющиеся операции с конечной границей" />
        <div className="px-5 py-4">
          {state.series.length === 0 ? (
            <p className="text-sm text-text-muted">
              Серий нет. Создайте серию на экране операций: зарплата, аренда, подписка, платёж по кредиту.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {state.series.map((series) => {
                const occurrences = state.operations.filter((operation) => operation.seriesId === series.id);
                const open = occurrences.filter(
                  (operation) => operation.entryType === "planned" && operation.status !== "done" && operation.status !== "skipped",
                );
                const remaining = open.reduce((sum, operation) => sum + planRemaining(operation, state.operations), 0);
                return (
                  <li key={series.id} className="flex flex-wrap items-center gap-3 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-text">{series.title}</span>
                      <span className="block text-xs text-text-faint">
                        {series.recurrence === "daily" ? "ежедневно" : series.recurrence === "weekly" ? "еженедельно" : "ежемесячно"}
                        {" · "}
                        {series.occurrencesCount === null
                          ? `до ${series.endsOn ?? "—"}`
                          : `${series.occurrencesCount} повторов`}
                        {" · "}
                        {occurrences.length} вхождений, открытых {open.length}
                      </span>
                    </span>
                    <TextInput
                      defaultValue={String(series.amountMinor / 100).replace(".", ",")}
                      onBlur={(event) => {
                        const parsed = Number(event.target.value.replace(",", ".").replace(/\s/g, ""));
                        if (Number.isFinite(parsed) && parsed > 0) updateSeriesAmount(series.id, Math.round(parsed * 100));
                      }}
                      className="h-8 w-28"
                      aria-label={`Сумма серии ${series.title}`}
                    />
                    <span className="nums w-28 text-right text-xs text-text-faint">
                      остаток <Money amountMinor={remaining} />
                    </span>
                    <Button size="sm" variant="ghost" onClick={() => deleteSeries(series.id)}>
                      удалить серию
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Card>

      <Card dataTour="calm">
        <CardHeader title="Отображение" />
        <div className="px-5 py-1">
          <Toggle
            checked={state.settings.hideDeviation}
            onChange={toggleHideDeviation}
            label="Режим без оценок"
            hint="Скрывает отклонение и сравнение с планом. Баланс и график остаются."
          />
        </div>
      </Card>

      <Card dataTour="export">
        <CardHeader title="Данные" hint="Хранятся в Supabase и защищены RLS" />
        <div className="flex flex-wrap items-center gap-3 px-5 py-4">
          <Button variant="secondary" onClick={download}>
            Экспорт JSON
          </Button>
          <Button variant="secondary" onClick={() => addSampleData(today)}>
            Заполнить примером
          </Button>
          <Button
            variant="secondary"
            data-tour="replay"
            onClick={() => navigate(location.pathname, { state: { tour: Date.now() }, replace: true })}
          >
            <span aria-hidden="true">▶</span>
            Повторить обучение
          </Button>
          {resetArmed ? (
            <>
              <span className="text-xs text-text-muted">Точно удалить все данные раздела?</span>
              <Button
                variant="danger"
                onClick={() => {
                  resetFinance();
                  setResetArmed(false);
                }}
              >
                Да, удалить
              </Button>
              <Button variant="ghost" onClick={() => setResetArmed(false)}>
                Отмена
              </Button>
            </>
          ) : (
            <Button variant="danger" onClick={() => setResetArmed(true)}>
              Сбросить раздел
            </Button>
          )}
        </div>
        <p className="border-t border-border px-5 py-3 text-xs text-text-faint">
          Обучение пока запускается кнопкой. Позже оно будет автоматически показываться новому пользователю один раз.
        </p>
      </Card>

      <Card>
        <CardHeader title="Аккаунт" hint="Один пользователь — один набор данных в облаке" />
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <span className="text-sm text-text-muted">{auth.email ?? "—"}</span>
          <SignOutButton />
        </div>
      </Card>
    </div>
  );
}
