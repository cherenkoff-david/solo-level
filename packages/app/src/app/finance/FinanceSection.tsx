import { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import { addSampleData, ensureSnapshots, isConfigured, setupFinance } from "./store";
import { useFinanceState, useToday } from "./useFinance";
import { Button, Card, Field, TextInput } from "./components/ui";
import { parseRub, todayIso } from "@solo/finance";
import { buildTourSteps, TOUR_SEEN_KEY } from "./tour/tourSteps";
import { TourOverlay } from "./tour/TourOverlay";
import { AmountsPrivacyProvider, useInactivityMask } from "./privacy";

const TABS = [
  { to: "/finance", label: "Обзор", end: true },
  { to: "/finance/calendar", label: "Календарь", end: false },
  { to: "/finance/operations", label: "Операции", end: false },
  { to: "/finance/settings", label: "Раздел", end: false },
];

const TOUR_BUTTON_KEY = "tour-button";

function readTourSeen(): boolean {
  if (typeof localStorage === "undefined") return true;
  return localStorage.getItem(TOUR_SEEN_KEY) === "1";
}

function markTourSeen(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(TOUR_SEEN_KEY, "1");
}

export function FinanceSection() {
  const state = useFinanceState();
  const location = useLocation();
  const configured = isConfigured(state);
  const amountsMasked = useInactivityMask();
  const [tourOpen, setTourOpen] = useState(false);
  const [tourRun, setTourRun] = useState(0);

  const startTour = useCallback(() => {
    setTourRun((value) => value + 1);
    setTourOpen(true);
  }, []);

  const closeTour = useCallback(() => {
    setTourOpen(false);
    markTourSeen();
  }, []);

  useEffect(() => {
    ensureSnapshots(todayIso());
    document.body.dataset.section = "finance";
    return () => {
      delete document.body.dataset.section;
    };
  }, []);

  useEffect(() => {
    if (configured && !readTourSeen()) {
      const timer = window.setTimeout(() => setTourOpen(true), 500);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [configured]);

  useEffect(() => {
    if (location.state !== null && typeof location.state === "object" && "tour" in location.state) {
      startTour();
    }
  }, [location.state, startTour]);

  const steps = buildTourSteps(configured);

  return (
    <AmountsPrivacyProvider masked={amountsMasked}>
      {configured ? (
        <div className="flex flex-col gap-6">
          {amountsMasked ? (
            <div
              role="status"
              className="rounded-lg border border-dashed border-border-strong px-5 py-3 text-sm text-text-muted"
            >
              Суммы скрыты: 30 секунд без движения мыши и нажатий клавиш. Двиньте мышью или нажмите клавишу,
              чтобы показать.
            </div>
          ) : null}
          <header className="flex flex-col gap-4">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <h1 className="text-2xl font-medium tracking-[-0.01em] text-text">Финансы</h1>
                <p className="mt-1 text-sm text-text-muted">
                  План и факт по дням: сколько есть, сколько должно быть и куда движется баланс.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-text-faint">рубль · один баланс · без геймификации</span>
                <Button variant="secondary" size="sm" onClick={startTour} data-tour={TOUR_BUTTON_KEY}>
                  <span aria-hidden="true">▶</span>
                  Обучение
                </Button>
              </div>
            </div>

            <nav
              aria-label="Разделы финансов"
              className="flex items-center gap-1 border-b border-border"
              data-tour="tabs"
            >
              {TABS.map((tab) => (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  end={tab.end}
                  className={({ isActive }) =>
                    [
                      "-mb-px border-b-2 px-3 py-2 text-base transition-colors",
                      isActive
                        ? "border-text text-text"
                        : "border-transparent text-text-muted hover:border-border-strong hover:text-text",
                    ].join(" ")
                  }
                >
                  {tab.label}
                </NavLink>
              ))}
              <span className="ml-auto pb-2 text-[11px] text-text-faint">{location.pathname}</span>
            </nav>
          </header>

          <Outlet />
        </div>
      ) : (
        <Onboarding onStartTour={startTour} />
      )}

      {tourOpen ? <TourOverlay key={tourRun} steps={steps} onClose={closeTour} /> : null}
    </AmountsPrivacyProvider>
  );
}

function Onboarding({ onStartTour }: { onStartTour: () => void }) {
  const today = useToday();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const amountMinor = parseRub(amount);

  const submit = () => {
    if (amountMinor === null) {
      setError("Введите сумму, например 12500 или 12 500,50");
      return;
    }
    setupFinance({ startAmountMinor: amountMinor, startDate: date });
  };

  return (
    <div className="mx-auto max-w-xl py-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-[-0.01em] text-text">Финансы</h1>
          <p className="mt-2 text-sm text-text-muted">
            Раздел ещё не настроен. Нужна одна точка отсчёта: сколько денег у вас на руках и с какой даты считать.
            Дальше всё остальное — планы и факты — вы добавляете сами.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={onStartTour}>
          <span aria-hidden="true">▶</span>
          Как это работает
        </Button>
      </div>

      <Card className="mt-6 p-6" data-tour="setup">
        <div className="flex flex-col gap-4">
          <Field label="Сумма на руках, ₽" hint="один общий баланс, без разбивки на счета">
            <TextInput
              inputMode="decimal"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                setError(null);
              }}
              placeholder="12 500"
              autoFocus
            />
          </Field>
          <Field label="Дата отсчёта" hint="с этого дня считается прогноз и отклонение">
            <TextInput type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </Field>
          <p className="text-xs text-text-faint">
            Категории по умолчанию создадутся сразу: зарплата, аванс, аренда, кредит, продукты, транспорт,
            связь, кафе, развлечения, одежда, прочее.
          </p>
          {error === null ? null : <p className="text-sm text-text">{error}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" onClick={submit}>
              Начать вести учёт
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                addSampleData(today);
              }}
            >
              Сначала посмотреть на примере
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
