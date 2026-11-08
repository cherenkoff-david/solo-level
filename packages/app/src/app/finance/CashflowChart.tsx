import { formatRub, formatRubCompact } from "@solo/finance";

import { MASKED_AMOUNT } from "./components/ui";
import { useAmountsMasked } from "./privacy";

function niceStep(raw: number): number {
  if (raw <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return factor * magnitude;
}
import type { CashflowPoint } from "@solo/finance";

interface Pt {
  readonly x: number;
  readonly y: number;
}

export function CashflowChart({ points }: { points: readonly CashflowPoint[] }) {
  const masked = useAmountsMasked();

  if (points.length < 2) {
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
  const rawMin = Math.min(...values, 0);
  const rawMax = Math.max(...values, 0);
  const span = Math.max(rawMax - rawMin, 1);
  const min = rawMin - span * 0.08;
  const max = rawMax + span * 0.08;

  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;
  const xOf = (index: number) => padLeft + (plotWidth * index) / (points.length - 1);
  const yOf = (value: number) => padTop + plotHeight * (1 - (value - min) / (max - min));

  const line = (pick: (point: CashflowPoint) => number): Pt[] =>
    points.map((point, index) => ({ x: xOf(index), y: yOf(pick(point)) }));

  const path = (pts: readonly Pt[]) => pts.map((pt, index) => `${index === 0 ? "M" : "L"}${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(" ");

  const targetPts = line((point) => point.target);
  const factPts = line((point) => point.fact);

  const step = niceStep((max - min) / 4);
  const tickStart = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  for (let value = tickStart; value <= max; value += step) ticks.push(Math.round(value));

  const last = points.at(-1);
  const first = points[0];
  const factPoints = points
    .map((point, index) => ({ point, index }))
    .filter(({ point }) => point.fact !== 0 || point.target !== 0);

  const minIndex = points.reduce((best, point, index) => (point.target < points[best]!.target ? index : best), 0);
  const minPoint = points[minIndex]!;

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[240px] w-full"
        role="img"
        aria-label={
          masked
            ? "График денежного потока: суммы скрыты"
            : `График денежного потока: план ${formatRub(last?.target ?? 0)}, факт ${formatRub(last?.fact ?? 0)}`
        }
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
              <text x={padLeft - 10} y={y + 4} textAnchor="end" className="fill-current text-[11px] text-text-faint">
                {masked ? MASKED_AMOUNT : formatRubCompact(value)}
              </text>
            </g>
          );
        })}

        <line
          x1={padLeft}
          x2={width - padRight}
          y1={yOf(0)}
          y2={yOf(0)}
          stroke="currentColor"
          strokeWidth={1.5}
          className="text-border-strong"
        />

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

        {first === undefined ? null : (
          <>
            <text x={padLeft} y={height - 8} className="fill-current text-[11px] text-text-faint">
              {first.date.slice(8)}.{first.date.slice(5, 7)}
            </text>
            <text x={width - padRight} y={height - 8} textAnchor="end" className="fill-current text-[11px] text-text-faint">
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
      </svg>

      <div className="mt-1 flex items-center gap-5 px-1 text-xs text-text-faint">
        <span className="flex items-center gap-1.5">
          <svg width="18" height="6" aria-hidden="true">
            <line x1="0" y1="3" x2="18" y2="3" stroke="currentColor" strokeWidth="2" className="text-text" />
          </svg>
          факт
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="18" height="6" aria-hidden="true">
            <line x1="0" y1="3" x2="18" y2="3" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" className="text-text-muted" />
          </svg>
          план
        </span>
      </div>
    </div>
  );
}
