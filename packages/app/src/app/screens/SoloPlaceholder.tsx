const QUOTE = {
  text: "Всё, что с тобой случается, ты по своей природе можешь либо вынести, либо не вынести. Если можешь — выноси, не досадуя…",
  source: "Марк Аврелий, «Размышления», X.3",
  note: "наш пер. с англ. текста изд. Project Gutenberg, eBook № 2680",
};

const GROWTH_RINGS = [
  { radius: 30, opacity: 0.2, delay: 0.1 },
  { radius: 46, opacity: 0.15, delay: 0.35 },
  { radius: 62, opacity: 0.11, delay: 0.6 },
  { radius: 78, opacity: 0.08, delay: 0.85 },
];

const DRIFT_DOTS = [
  { cx: 74, delay: 0 },
  { cx: 102, delay: 2 },
  { cx: 128, delay: 4 },
];

function PatienceGrowth() {
  return (
    <svg
      viewBox="0 0 200 200"
      role="img"
      aria-label="Растущий росток: терпение как медленный рост"
      className="block w-full max-w-[200px]"
    >
      <defs>
        <radialGradient id="sprout-glow">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.22" />
          <stop offset="70%" stopColor="var(--color-accent)" stopOpacity="0.04" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="100" cy="104" r="78" fill="url(#sprout-glow)" className="breathe" />

      {GROWTH_RINGS.map((ring) => (
        <circle
          key={ring.radius}
          cx="100"
          cy="104"
          r={ring.radius}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={0.8}
          opacity={ring.opacity}
        />
      ))}

      <circle
        cx="100"
        cy="104"
        r="24"
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth={1}
        opacity={0.35}
        className="ripple-ring"
      />
      <circle
        cx="100"
        cy="104"
        r="24"
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth={1}
        opacity={0.35}
        className="ripple-ring"
        style={{ animationDelay: "3.25s" }}
      />

      <line
        x1="58"
        y1="154"
        x2="142"
        y2="154"
        stroke="var(--color-border-strong)"
        strokeWidth={1}
      />

      <path
        d="M100 154 C 99 128 101 104 100 72"
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth={2}
        strokeLinecap="round"
        pathLength={1}
        className="growth-line"
      />

      <path
        d="M100 114 C 88 114 78 106 76 93 C 90 93 99 101 100 114 Z"
        fill="var(--color-accent)"
        fillOpacity={0.5}
        className="leaf"
        style={{ animationDelay: "1.5s" }}
      />
      <path
        d="M100 97 C 112 99 121 91 124 75 C 110 77 101 87 100 97 Z"
        fill="var(--color-accent)"
        fillOpacity={0.42}
        className="leaf"
        style={{ animationDelay: "1.9s" }}
      />

      {DRIFT_DOTS.map((dot) => (
        <circle
          key={dot.cx}
          cx={dot.cx}
          cy={150}
          r={1.3}
          fill="var(--color-accent)"
          className="drift-dot"
          style={{ animationDelay: `${dot.delay}s` }}
        />
      ))}
    </svg>
  );
}

export function SoloPlaceholder() {
  return (
    <section
      aria-labelledby="page-title"
      className="flex flex-col gap-7 rounded-lg border border-border bg-surface px-9 py-10"
    >
      <div className="flex flex-col gap-2">
        <p className="nums text-xs uppercase tracking-[0.18em] text-text-faint">Solo · ранняя сборка</p>
        <h1 id="page-title" className="text-3xl font-semibold tracking-[-0.02em]">
          Раздел в разработке
        </h1>
        <p className="text-body text-text">Данный раздел ещё в разработке</p>
        <p className="max-w-[52ch] text-sm text-text-muted">
          Интерфейс Solo ещё собирается. Пока здесь нечего открыть — но идея уже растёт.
        </p>
      </div>

      <div className="grid items-center gap-8 rounded-md border border-border bg-bg/40 px-7 py-8 md:grid-cols-[1fr_200px]">
        <figure className="flex flex-col gap-4">
          <blockquote
            cite="https://www.gutenberg.org/ebooks/2680"
            className="text-body leading-[1.6] text-text"
          >
            <span aria-hidden="true" className="text-accent">
              «
            </span>
            {QUOTE.text}
            <span aria-hidden="true" className="text-accent">
              »
            </span>
          </blockquote>
          <figcaption className="flex flex-col gap-1">
            <cite className="nums text-xs not-italic tracking-[0.04em] text-text-muted">
              {QUOTE.source}
            </cite>
            <span className="text-xs text-text-faint">{QUOTE.note}</span>
          </figcaption>
        </figure>

        <div className="mx-auto md:mx-0">
          <PatienceGrowth />
        </div>
      </div>

      <div className="h-0.5 overflow-hidden rounded-full bg-border">
        <div className="h-full w-1/3 rounded-full bg-accent/70 animate-march motion-reduce:animate-none" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="nums flex items-center gap-2 text-xs text-text-muted">
          <span className="size-1.5 rounded-full bg-accent animate-pulse-soft motion-reduce:animate-none" />
          идёт сборка интерфейса
          <span className="flex items-center gap-0.5">
            <span className="size-0.5 rounded-full bg-accent animate-pulse-soft motion-reduce:animate-none [animation-delay:0ms]" />
            <span className="size-0.5 rounded-full bg-accent animate-pulse-soft motion-reduce:animate-none [animation-delay:300ms]" />
            <span className="size-0.5 rounded-full bg-accent animate-pulse-soft motion-reduce:animate-none [animation-delay:600ms]" />
          </span>
        </p>
        <p className="nums text-xs text-text-faint">сейчас в работе — «Финансы»</p>
      </div>
    </section>
  );
}
