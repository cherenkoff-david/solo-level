import type { SphereProgress } from "../spheres/spheres";

const SIZE = 220;
const CENTER = SIZE / 2;
const RADIUS = 82;
const RINGS = 4;

function pointAt(index: number, count: number, ratio: number): [number, number] {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count;
  return [
    CENTER + Math.cos(angle) * RADIUS * ratio,
    CENTER + Math.sin(angle) * RADIUS * ratio,
  ];
}

function ringPath(count: number, ratio: number): string {
  const points = Array.from({ length: count }, (_, i) => pointAt(i, count, ratio));
  return points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
}

interface SphereRadarProps {
  readonly progress: readonly SphereProgress[];
}

export function SphereRadar({ progress }: SphereRadarProps) {
  const count = progress.length;
  if (count < 3) {
    return null;
  }

  const valuePoints = progress.map((item, i) => pointAt(i, count, Math.max(0.04, item.ratio)));
  const polygon = valuePoints.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

  return (
    <section
      aria-label="Развитие сфер"
      className="rounded-lg border border-border bg-surface px-5 py-5"
    >
      <h2 className="text-sm font-medium text-text">Развитие сфер</h2>

      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label="Радиальная диаграмма уровней сфер"
        className="mx-auto mt-2 block w-full max-w-[240px]"
      >
        {Array.from({ length: RINGS }, (_, ring) => {
          const ratio = (ring + 1) / RINGS;
          return (
            <polygon
              key={ring}
              points={ringPath(count, ratio)}
              fill="none"
              stroke="var(--color-border)"
              strokeWidth={1}
            />
          );
        })}

        {progress.map((item, i) => {
          const [x, y] = pointAt(i, count, 1);
          return (
            <line
              key={item.sphere.id}
              x1={CENTER}
              y1={CENTER}
              x2={x}
              y2={y}
              stroke="var(--color-border)"
              strokeWidth={1}
            />
          );
        })}

        <polygon
          points={polygon}
          fill="var(--color-accent-muted)"
          stroke="var(--color-accent)"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />

        {progress.map((item, i) => {
          const [x, y] = pointAt(i, count, Math.max(0.04, item.ratio));
          return <circle key={item.sphere.id} cx={x} cy={y} r={2.5} fill="var(--color-accent)" />;
        })}

        {progress.map((item, i) => {
          const [x, y] = pointAt(i, count, 1.22);
          return (
            <text
              key={item.sphere.id}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-[var(--color-text-muted)] text-[10px]"
            >
              {item.sphere.name}
            </text>
          );
        })}
      </svg>

      <ul className="mt-3 flex flex-col gap-1.5">
        {progress.map((item) => (
          <li key={item.sphere.id} className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-text-muted">{item.sphere.name}</span>
            <span className="nums text-text-faint">
              ур.&nbsp;{item.level} · {item.totalXp}&nbsp;XP
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs text-text-faint">
        демонстрационные данные — подключение журнала впереди
      </p>
    </section>
  );
}
