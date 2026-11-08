import { useState } from "react";
import { cumulativeXp, levelState } from "@solo/domain";

import { Reveal } from "./Reveal";
import { Mascot } from "../mascot/Mascot";

const LEVELS = [1, 3, 6, 10] as const;

const STAGES = LEVELS.map((level) => {
  const xp = cumulativeXp(level);
  return { level, state: levelState(xp) };
});

const CLAUSES = [
  {
    title: "Добавил то, что важно",
    text: "Дело попадает в сегодняшний день, а не в бесконечный список.",
  },
  {
    title: "Отметил один день",
    text: "Одна отметка — одна запись в журнале. Награда начисляется сразу.",
  },
  {
    title: "Собрал ритм",
    text: "Серия повышает награду на 5–20%. Пропуск её не отнимает.",
  },
  {
    title: "Вырос в уровне",
    text: "Уровень считается из истории: его нельзя потерять, можно только продолжить.",
  },
] as const;

export function Stages() {
  const [index, setIndex] = useState(0);
  const stage = STAGES[index] ?? STAGES[0]!;
  const clause = CLAUSES[index] ?? CLAUSES[0]!;

  return (
    <section id="how" aria-labelledby="stages-title" className="landing-stage-field">
      <div className="landing-wrap">
        <Reveal className="landing-split">
          <div className="landing-split__side">
            <h2 id="stages-title" className="landing-clause reveal-child">
              {clause.title}
            </h2>
            <p className="landing-body reveal-child mt-6 max-w-[36ch]">{clause.text}</p>
          </div>

          <div className="landing-split__side landing-split__side--stage">
            <div className="landing-stage-figure">
              <Mascot level={stage.state.level} className="h-full w-full" />
            </div>
            <p className="nums landing-small mt-3 text-center">
              уровень {stage.state.level} · {stage.state.totalXp} XP
            </p>
          </div>
        </Reveal>

        <div className="landing-slider">
          <label htmlFor="stage-range" className="sr-only">
            Этап пути
          </label>
          <div className="landing-range-field">
            <span aria-hidden="true" className="landing-range-rail">
              <span
                className="landing-range-fill"
                style={{ width: `${(index / (STAGES.length - 1)) * 100}%` }}
              />
            </span>
            <input
              id="stage-range"
              type="range"
              min={0}
              max={STAGES.length - 1}
              step={1}
              value={index}
              onChange={(event) => setIndex(Number(event.target.value))}
              aria-valuetext={`${clause.title}, уровень ${stage.state.level}`}
              className="landing-range"
            />
          </div>
          <ol className="landing-range-labels">
            {STAGES.map((item, itemIndex) => (
              <li key={item.level}>
                <button
                  type="button"
                  onClick={() => setIndex(itemIndex)}
                  aria-current={itemIndex === index}
                  className={itemIndex === index ? "is-current" : undefined}
                >
                  <span className="nums">{item.state.level}</span>
                  <span className="landing-range-word">
                    {item.level === 1 ? "начало" : `уровень ${item.level}`}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
