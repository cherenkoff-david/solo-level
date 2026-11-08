import { useMemo, useRef, useState } from "react";
import { computeActionReward, levelState, type Effort } from "@solo/domain";

import { Mascot } from "../mascot/Mascot";

interface DemoHabit {
  readonly id: string;
  readonly title: string;
  readonly sphere: string;
  readonly effort: Effort;
}

const HABITS: readonly DemoHabit[] = [
  { id: "training", title: "Тренировка", sphere: "Здоровье", effort: 4 },
  { id: "english", title: "20 минут английского", sphere: "Разум", effort: 2 },
  { id: "doc", title: "Раздел документа", sphere: "Ремесло", effort: 3 },
  { id: "call", title: "Позвонить родителям", sphere: "Связи", effort: 1 },
  { id: "morning", title: "Утренние страницы", sphere: "Опора", effort: 2 },
];

const MAX_MARKS = 3;

function rewardFor(habit: DemoHabit, isFirstInSphere: boolean): number {
  return computeActionReward({
    effort: habit.effort,
    isFirstActionInSphere: isFirstInSphere,
    previousPeriods: [],
  }).totalXp;
}

export function HeroDemo() {
  const [counts, setCounts] = useState<Readonly<Record<string, number>>>({});
  const [notice, setNotice] = useState("");
  const [gain, setGain] = useState<{ id: string; amount: number; nonce: number } | null>(null);
  const nonce = useRef(0);

  const totalXp = useMemo(
    () =>
      HABITS.reduce((sum, habit) => {
        const marks = counts[habit.id] ?? 0;
        if (marks === 0) {
          return sum;
        }
        const first = rewardFor(habit, true);
        const rest = rewardFor(habit, false);
        return sum + first + rest * (marks - 1);
      }, 0),
    [counts],
  );

  const state = levelState(totalXp);
  const progress = Math.round((state.xpIntoLevel / state.xpForNext) * 100);

  function mark(habit: DemoHabit) {
    const marks = counts[habit.id] ?? 0;
    if (marks >= MAX_MARKS) {
      return;
    }
    const amount = rewardFor(habit, marks === 0);
    nonce.current += 1;
    setGain({ id: habit.id, amount, nonce: nonce.current });
    setCounts({ ...counts, [habit.id]: marks + 1 });
    setNotice("");
  }

  function reset() {
    setCounts({});
    setNotice("");
    setGain(null);
  }

  return (
    <div className="landing-demo" data-ui>
      <div className="flex items-baseline justify-between gap-4">
        <p className="landing-demo__title">Сегодня</p>
        <p className="nums landing-small">
          ур. {state.level} · {totalXp} XP
        </p>
      </div>

      <div className="relative mx-auto mt-2 h-[252px] w-[178px]">
        <Mascot level={state.level} className="absolute inset-0" />
        <span key={state.level} aria-hidden="true" className="level-flash" />
      </div>

      <div className="mt-1">
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="nums landing-small mt-2">
          {state.xpIntoLevel} / {state.xpForNext} XP до уровня {state.level + 1}
        </p>
      </div>

      <ul className="mt-4 flex flex-col">
        {HABITS.map((habit) => {
          const marks = counts[habit.id] ?? 0;
          const done = marks >= MAX_MARKS;
          const gained = gain?.id === habit.id ? gain : null;

          return (
            <li key={habit.id} className="relative">
              <button
                type="button"
                onClick={() => mark(habit)}
                disabled={done}
                aria-label={`Отметить «${habit.title}», отмечено ${marks} из ${MAX_MARKS}`}
                className="group flex w-full items-center gap-3 rounded-md px-1 py-2.5 text-left transition-colors duration-150 hover:bg-white/5 disabled:cursor-default disabled:hover:bg-transparent"
              >
                <span
                  aria-hidden="true"
                  className={[
                    "grid size-4 shrink-0 place-items-center rounded-[4px] border transition-colors duration-150",
                    marks > 0
                      ? "border-accent bg-accent/25 text-accent"
                      : "border-white/30 group-hover:border-white/60",
                  ].join(" ")}
                >
                  {marks > 0 ? (
                    <svg viewBox="0 0 10 10" className="size-2.5" fill="none">
                      <path
                        d="M2 5.2 L4.2 7.4 L8 3"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="landing-row truncate">{habit.title}</span>
                  <span className="landing-row__meta">{habit.sphere}</span>
                </span>
                {marks > 0 ? <span className="nums landing-small">×{marks}</span> : null}
              </button>

              {gained ? (
                <span
                  key={gained.nonce}
                  aria-hidden="true"
                  className="nums gain-pop landing-small pointer-events-none absolute right-1 top-1.5 text-accent"
                >
                  +{gained.amount}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setNotice("−0 XP. Пропуск не отнимает опыт — счётчик остался прежним.")}
          className="landing-small underline-offset-4 transition-colors duration-150 hover:text-text-muted hover:underline"
        >
          Пропустить неделю
        </button>
        <button
          type="button"
          onClick={reset}
          className="landing-small underline-offset-4 transition-colors duration-150 hover:text-text-muted hover:underline"
        >
          Сбросить
        </button>
      </div>

      <p aria-live="polite" className="landing-small mt-2 min-h-5">
        {notice}
      </p>
    </div>
  );
}
