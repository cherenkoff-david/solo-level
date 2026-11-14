import { useMemo, useState } from "react";

import {
  dayFlowFor,
  formatDayWithYear,
  formatRub,
  formatRubCompact,
  operationsOfDay,
} from "@solo/finance";
import type { CashflowPoint, Category, DayFlow, IsoDate, Operation } from "@solo/finance";

import { DeviationText, MASKED_AMOUNT, Money, SignedMoney } from "./components/ui";
import { useAmountsMasked } from "./privacy";

function niceStep(raw: number): number {
  if (raw <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return factor * magnitude;
}

interface Pt {
  readonly x: number;
  readonly y: number;
}

interface CashflowChartProps {
  readonly points: readonly CashflowPoint[];
  readonly operations: readonly Operation[];
  readonly categories: readonly Category[];
  readonly today: IsoDate;
}

export function CashflowChart({ points, operations, categories, today }: CashflowChartProps) {
  const masked = useAmountsMasked();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null);

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  const activeIndex = hoverIndex ?? pinnedIndex;

  if (points.length === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-text-muted">
        Недостаточно данных для графика
      </div>
    );
  }

  const width = 760;
  const height = 240;
  const padLeft = 64;
  const padRight = 16;
  const padTop = 16;
  const padBottom = 28;

  const values = points.flatMap((point) => [point.target, point.fact]);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);

  /**
   * Если все значения равны (одна базовая линия без операций), разброс нулевой
   * и все подписи оси выходят одинаковыми. Минимальный разброс берётся
   * от самой величины, а не от единицы.
   */
  const rawSpan = Math.max(
    rawMax - rawMin,
    Math.abs(rawMax) * 0.02,
    Math.abs(rawMin) * 0.02,
    1,
  );

  const crossesZero = rawMin <= 0 && rawMax >= 0;
  const min = crossesZero ? rawMin - rawSpan * 0.08 : rawMin - rawSpan * 0.15;
  const max = crossesZero ? rawMax + rawSpan * 0.08 : rawMax + rawSpan * 0.15;
  const showZeroLine = min <= 0 && max >= 0;

  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;
  const xOf = (index: number) => {
    if (points.length === 1) return padLeft + plotWidth / 2;
    return padLeft + (plotWidth * index) / (points.length - 1);
  };
  const yOf = (value: number) => padTop + plotHeight * (1 - (value - min) / (max - min));

  const line = (pick: (point: CashflowPoint) => number): Pt[] =>
    points.map((point, index) => ({ x: xOf(index), y: yOf(pick(point)) }));

  const path = (pts: readonly Pt[]) =>
    pts
      .map((pt, index) => `${index === 0 ? "M" : "L"}${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
      .join(" ");

  const targetPts = line((point) => point.target);

  /**
   * Факт существует только до сегодняшнего дня. Раньше сплошная линия
   * продолжалась в будущее плоской линией, и это читалось как «деньги
   * точно останутся такими» — хотя после сегодняшнего дня известен только план.
   */
  const factPts = line((point) => point.fact).filter((_, index) => (points[index]?.date ?? "") <= today);
  const factPointsAll = points
    .map((point, index) => ({ point, index }))
    .filter(({ point }) => point.date <= today);

  const step = niceStep((max - min) / 4);
  const tickStart = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  for (let value = tickStart; value <= max; value += step) ticks.push(Math.round(value));

  const last = points.at(-1);
  const first = points[0];
  const factPoints = factPointsAll.filter(
    ({ point }) => point.fact !== 0 || point.target !== 0,
  );

  const minIndex = points.reduce(
    (best, point, index) => (point.target < points[best]!.target ? index : best),
    0,
  );
  const minPoint = points[minIndex]!;

  const active = activeIndex === null ? undefined : points[activeIndex];
  const dayOperations =
    active === undefined ? [] : operationsOfDay(operations, active.date);
  const deviation = active === undefined ? 0 : active.fact - active.target;
  const isFuture = active !== undefined && active.date > today;
  const dayChange =
    active === undefined ? undefined : dayFlowFor(operations, categoryById, active.date);

  const indexAt = (clientX: number, rect: DOMRect): number | null => {
    if (rect.width <= 0 || points.length === 1) return 0;
    const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    return Math.round(ratio * (points.length - 1));
  };

  const moveSelection = (delta: number) => {
    const current = pinnedIndex ?? points.length - 1;
    const next = Math.min(Math.max(current + delta, 0), points.length - 1);
    setHoverIndex(null);
    setPinnedIndex(next);
  };

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[240px] w-full touch-none outline-none focus-visible:ring-1 focus-visible:ring-text"
        role="img"
        tabIndex={0}
        aria-label={
          masked
            ? "График денежного потока: суммы скрыты. Стрелки влево и вправо выбирают день"
            : `График денежного потока: план ${formatRub(last?.target ?? 0)}, факт ${formatRub(last?.fact ?? 0)}. Стрелки влево и вправо выбирают день`
        }
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            moveSelection(-1);
          } else if (event.key === "ArrowRight") {
            event.preventDefault();
            moveSelection(1);
          } else if (event.key === "Escape") {
            setPinnedIndex(null);
            setHoverIndex(null);
          }
        }}
      >
        {ticks.map((value, tickIndex) => {
          const y = yOf(value);
          return (
            <g key={`tick-${tickIndex}`}>
              <line
                x1={padLeft}
                x2={width - padRight}
                y1={y}
                y2={y}
                stroke="currentColor"
                strokeWidth={1}
                className="text-border"
                strokeDasharray="2 4"
              />
              <text
                x={padLeft - 10}
                y={y + 4}
                textAnchor="end"
                className="fill-current text-[11px] text-text-faint"
              >
                {masked ? MASKED_AMOUNT : formatRubCompact(value)}
              </text>
            </g>
          );
        })}

        {showZeroLine ? (
          <line
            x1={padLeft}
            x2={width - padRight}
            y1={yOf(0)}
            y2={yOf(0)}
            stroke="currentColor"
            strokeWidth={1.5}
            className="text-border-strong"
          />
        ) : null}

        <path
          d={path(targetPts)}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          className="text-text-muted"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={path(factPts)}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="text-text"
          vectorEffect="non-scaling-stroke"
        />

        {factPoints.map(({ point, index }) => (
          <circle
            key={`dot-${point.date}`}
            cx={xOf(index)}
            cy={yOf(point.fact)}
            r={2.5}
            className="fill-text"
          >
            <title>
              {masked
                ? `${point.date} · суммы скрыты`
                : `${point.date} · факт ${formatRub(point.fact)} · план ${formatRub(point.target)}`}
            </title>
          </circle>
        ))}

        {activeIndex === null || active === undefined ? null : (
          <g>
            <line
              x1={xOf(activeIndex)}
              x2={xOf(activeIndex)}
              y1={padTop}
              y2={height - padBottom}
              stroke="currentColor"
              strokeWidth={1}
              className="text-border-strong"
              strokeDasharray="3 3"
            />
            {active.date <= today ? (
              <circle cx={xOf(activeIndex)} cy={yOf(active.fact)} r={4} className="fill-text" />
            ) : null}
            <circle
              cx={xOf(activeIndex)}
              cy={yOf(active.target)}
              r={3}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="text-text-muted"
            />
          </g>
        )}

        {first === undefined ? null : (
          <>
            <text x={padLeft} y={height - 8} className="fill-current text-[11px] text-text-faint">
              {first.date.slice(8)}.{first.date.slice(5, 7)}
            </text>
            <text
              x={width - padRight}
              y={height - 8}
              textAnchor="end"
              className="fill-current text-[11px] text-text-faint"
            >
              {last?.date.slice(8)}.{last?.date.slice(5, 7)}
            </text>
          </>
        )}

        <text
          x={xOf(minIndex)}
          y={Math.min(yOf(minPoint.target) + 16, height - 34)}
          textAnchor="middle"
          className="fill-current text-[11px] text-text-muted"
        >
          {`минимум ${minPoint.date.slice(8)}.${minPoint.date.slice(5, 7)}`}
        </text>

        <rect
          x={padLeft}
          y={padTop}
          width={plotWidth}
          height={plotHeight}
          fill="transparent"
          className="cursor-crosshair"
          onPointerMove={(event) => {
            const index = indexAt(event.clientX, event.currentTarget.getBoundingClientRect());
            if (index !== null) setHoverIndex(index);
          }}
          onPointerLeave={() => setHoverIndex(null)}
          onClick={(event) => {
            if (pinnedIndex !== null) {
              setPinnedIndex(null);
              return;
            }
            const index = indexAt(event.clientX, event.currentTarget.getBoundingClientRect());
            if (index !== null) {
              setHoverIndex(index);
              setPinnedIndex(index);
            }
          }}
        />
      </svg>

      <div className="mt-1 flex flex-wrap items-center gap-5 px-1 text-xs text-text-faint">
        <span className="flex items-center gap-1.5">
          <svg width="18" height="6" aria-hidden="true">
            <line x1="0" y1="3" x2="18" y2="3" stroke="currentColor" strokeWidth="2" className="text-text" />
          </svg>
          факт
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="18" height="6" aria-hidden="true">
            <line
              x1="0"
              y1="3"
              x2="18"
              y2="3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="4 3"
              className="text-text-muted"
            />
          </svg>
          план
        </span>
        <span className="ml-auto">
          наведите на график · клик закрепляет день · стрелки ← → выбирают
        </span>
      </div>

      <div aria-live="polite" className="mt-2">
        {active === undefined ? (
          <p className="rounded-md border border-dashed border-border px-4 py-3 text-xs text-text-faint">
            Выберите день на графике, чтобы увидеть состояние накоплений и операции этого дня.
          </p>
        ) : (
          <DayDetails
            date={active.date}
            fact={active.fact}
            target={active.target}
            deviation={deviation}
            isFuture={isFuture}
            dayChange={dayChange}
            operations={dayOperations}
            categoryById={categoryById}
            pinned={pinnedIndex !== null}
            masked={masked}
          />
        )}
      </div>
    </div>
  );
}

interface DayDetailsProps {
  readonly date: IsoDate;
  readonly fact: number;
  readonly target: number;
  readonly deviation: number;
  readonly isFuture: boolean;
  readonly dayChange: DayFlow | undefined;
  readonly operations: readonly Operation[];
  readonly categoryById: ReadonlyMap<string, Category>;
  readonly pinned: boolean;
  readonly masked: boolean;
}

function DayDetails({
  date,
  fact,
  target,
  deviation,
  isFuture,
  dayChange,
  operations,
  categoryById,
  pinned,
  masked,
}: DayDetailsProps) {
  return (
    <div className="rounded-md border border-border px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-text">
          {formatDayWithYear(date)}
          {isFuture ? <span className="ml-2 text-xs text-text-faint">будущая дата</span> : null}
        </p>
        <span className="text-xs text-text-faint">{pinned ? "выбор закреплён" : "предпросмотр"}</span>
      </div>

      {isFuture ? (
        <dl className="mt-2 grid grid-cols-2 gap-x-5 gap-y-1 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-text-faint">прогноз на конец дня</dt>
            <dd className="text-text">
              <Money amountMinor={target} />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-text-faint">изменение по плану</dt>
            <dd className="text-text-muted">
              <SignedMoney amountMinor={dayChange?.plannedMinor ?? 0} />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-text-faint">уже проведено</dt>
            <dd className="text-text-faint">
              {dayChange === undefined || dayChange.actualMinor === 0 ? (
                "ничего"
              ) : (
                <SignedMoney amountMinor={dayChange.actualMinor} />
              )}
            </dd>
          </div>
        </dl>
      ) : (
        <dl className="mt-2 grid grid-cols-2 gap-x-5 gap-y-1 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-text-faint">на руках (факт)</dt>
            <dd className="text-text">
              <Money amountMinor={fact} />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-text-faint">по плану</dt>
            <dd className="text-text-muted">
              <Money amountMinor={target} />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-text-faint">факт против плана</dt>
            <dd className="text-text">
              <DeviationText deviationMinor={deviation} />
            </dd>
          </div>
        </dl>
      )}

      {isFuture ? (
        <p className="mt-2 text-xs text-text-faint">
          На будущую дату факта ещё нет: деньги остаются на руках, пока план не проведён.
          {dayChange !== undefined && dayChange.plannedMinor !== 0 ? (
            <>
              {" "}
              Поэтому на руках на <Money amountMinor={Math.abs(dayChange.plannedMinor)} /> больше,
              чем в прогнозе: план ещё не проведён. Это не прибыль.
            </>
          ) : null}
        </p>
      ) : null}

      {operations.length === 0 ? (
        <p className="mt-2 border-t border-border pt-2 text-xs text-text-faint">
          В этот день операций нет — баланс просто перешёл с предыдущего дня.
        </p>
      ) : (
        <ul className="mt-2 flex flex-col divide-y divide-border border-t border-border">
          {operations.map((operation) => {
            const category = categoryById.get(operation.categoryId);
            const isIncome = category?.kind === "income";
            return (
              <li
                key={operation.id}
                className="flex flex-wrap items-center justify-between gap-2 py-1.5 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded border border-border text-[10px] text-text-muted">
                    {category?.icon ?? "?"}
                  </span>
                  <span className="truncate text-text">{category?.name ?? "Без категории"}</span>
                  {operation.note === null ? null : (
                    <span className="truncate text-xs text-text-faint">{operation.note}</span>
                  )}
                  <span className="text-[10px] uppercase tracking-wide text-text-faint">
                    {operation.entryType === "planned" ? "план" : "факт"}
                  </span>
                </span>
                <span className={isIncome ? "text-income" : "text-expense"}>
                  {isIncome ? "+" : "−"}
                  {masked ? MASKED_AMOUNT : formatRub(operation.amountMinor)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
