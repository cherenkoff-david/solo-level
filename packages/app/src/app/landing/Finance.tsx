import { useMemo, useState } from "react";

import { Reveal } from "./Reveal";

const BASE = 100_000;
const INCOME = { day: 10, amount: 50_000 };
const SPEND = { day: 15, amount: 35_000 };
const TODAY = 20;
const DAYS = 30;

const WIDTH = 520;
const HEIGHT = 230;
const PAD_X = 8;
const PAD_Y = 20;
const MIN = 40_000;
const MAX = 180_000;

function planOn(day: number): number {
  return (
    BASE + (day >= INCOME.day ? INCOME.amount : 0) - (day >= SPEND.day ? SPEND.amount : 0)
  );
}

function xFor(day: number): number {
  return PAD_X + (day / DAYS) * (WIDTH - PAD_X * 2);
}

function yFor(value: number): number {
  const ratio = (value - MIN) / (MAX - MIN);
  return HEIGHT - PAD_Y - ratio * (HEIGHT - PAD_Y * 2);
}

function pathFor(fn: (day: number) => number): string {
  return Array.from({ length: DAYS + 1 }, (_, day) =>
    `${xFor(day).toFixed(1)},${yFor(fn(day)).toFixed(1)}`,
  ).join(" ");
}

const rubles = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

const signed = new Intl.NumberFormat("ru-RU", {
  signDisplay: "always",
  maximumFractionDigits: 0,
});

export function FinanceDemo() {
  const [net, setNet] = useState(0);

  const { planPath, factPath, areaPath, planNow, factNow, deviation } = useMemo(() => {
    const plan = (day: number) => planOn(day);
    const fact = (day: number) => planOn(day) + (day >= TODAY ? net : 0);
    const planPoints = pathFor(plan);
    const factPoints = pathFor(fact);
    return {
      planPath: planPoints,
      factPath: factPoints,
      areaPath: `M${xFor(0)},${HEIGHT} L${factPoints.replaceAll(" ", " L")} L${xFor(DAYS)},${HEIGHT} Z`,
      planNow: plan(TODAY),
      factNow: fact(TODAY),
      deviation: fact(TODAY) - plan(TODAY),
    };
  }, [net]);

  return (
    <div className="finance-demo" data-ui>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <p className="finance-demo__title">Баланс, 30 дней</p>
        <p className="finance-meta">базовая линия {rubles.format(BASE)} · 1-е число</p>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`График баланса: факт ${rubles.format(factNow)}, план ${rubles.format(planNow)}`}
        className="mt-4 block w-full"
      >
        <path d={areaPath} fill="rgba(255,255,255,0.05)" />
        <polyline
          points={planPath}
          fill="none"
          stroke="rgba(255,255,255,0.38)"
          strokeWidth="1.25"
          strokeDasharray="4 5"
          strokeLinejoin="round"
        />
        <polyline
          points={factPath}
          fill="none"
          stroke="rgba(255,255,255,0.92)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle
          cx={xFor(TODAY)}
          cy={yFor(factNow)}
          r="4"
          fill="#111114"
          stroke="#f4f0f5"
          strokeWidth="2"
        />
        <circle cx={xFor(0)} cy={yFor(BASE)} r="2.5" fill="rgba(255,255,255,0.7)" />
      </svg>

      <div className="finance-meta mt-2 flex flex-wrap gap-x-6 gap-y-1">
        <span className="flex items-center gap-2">
          <svg aria-hidden="true" viewBox="0 0 24 8" className="h-2 w-6">
            <polyline
              points="0,6 6,2 12,5 18,1 24,3"
              fill="none"
              stroke="rgba(255,255,255,0.9)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          факт
        </span>
        <span className="flex items-center gap-2">
          <svg aria-hidden="true" viewBox="0 0 24 8" className="h-2 w-6">
            <polyline
              points="0,6 6,2 12,5 18,1 24,3"
              fill="none"
              stroke="rgba(255,255,255,0.45)"
              strokeWidth="2"
              strokeDasharray="3 3"
              strokeLinecap="round"
            />
          </svg>
          план
        </span>
      </div>

      <dl className="mt-5 flex flex-col gap-3">
        <div className="finance-row">
          <dt>Факт на сегодня</dt>
          <dd className="nums text-white/90">{rubles.format(factNow)}</dd>
        </div>
        <div className="finance-row">
          <dt>План на сегодня</dt>
          <dd className="nums text-white/90">{rubles.format(planNow)}</dd>
        </div>
        <div className="finance-row mt-2">
          <dt>{deviation > 0 ? "Выше плана" : deviation < 0 ? "Ниже плана" : "По плану"}</dt>
          <dd className="nums text-white">
            {deviation === 0 ? "0 ₽" : `${signed.format(deviation)} ₽`}
          </dd>
        </div>
      </dl>

      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={() => setNet((value) => value + 12_000)} className="finance-button">
          Поступление 12 000 ₽
        </button>
        <button type="button" onClick={() => setNet((value) => value - 9_000)} className="finance-button">
          Трата 9 000 ₽
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p aria-live="polite" className="finance-meta">
          {net === 0
            ? "Факт совпадает с планом."
            : `Отклонение ${signed.format(net)} ₽ — это измерение, а не оценка.`}
        </p>
        {net !== 0 ? (
          <button
            type="button"
            onClick={() => setNet(0)}
            className="finance-meta underline-offset-4 hover:text-white/80 hover:underline"
          >
            Сбросить
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function FinanceSection() {
  return (
    <section aria-labelledby="finance-title" className="landing-finance">
      <Reveal className="landing-wrap landing-finance-grid">
        <div>
          <h2 id="finance-title" className="landing-heading reveal-child">
            Деньги считаются отдельно
          </h2>
          <p className="landing-body reveal-child mt-6 max-w-[40ch]">
            В Solo трата не приносит опыта: деньги требуют точности, а не награды. Поэтому
            «Финансы» — соседний раздел со своими правилами и своим видом.
          </p>
          <ul className="landing-body reveal-child mt-8 flex max-w-[42ch] list-disc flex-col gap-3 pl-5">
            <li>Факт, целевой баланс и отклонение — три разные величины.</li>
            <li>Отклонение называется «выше или ниже плана», а не провалом.</li>
            <li>Один ликвидный баланс и целые копейки в расчётах.</li>
          </ul>
        </div>

        <div className="reveal-child">
          <FinanceDemo />
        </div>
      </Reveal>
    </section>
  );
}
