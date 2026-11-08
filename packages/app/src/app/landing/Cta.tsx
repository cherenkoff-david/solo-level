import { useState } from "react";
import { Link } from "react-router-dom";
import { BASE_XP, type Effort } from "@solo/domain";

import { Reveal } from "./Reveal";

const EFFORTS: readonly Effort[] = [1, 2, 3, 4, 5];

export function Cta() {
  const [title, setTitle] = useState("");
  const [effort, setEffort] = useState<Effort>(2);

  return (
    <section aria-labelledby="cta-title" className="landing-cta">
      <Reveal className="landing-wrap landing-cta-grid">
        <div>
          <h2 id="cta-title" className="landing-cta-title reveal-child">
            Первый шаг уже открыт
          </h2>
          <p className="landing-cta-sentence reveal-child">
            Дальше — один день. Отмечай сделанное, остальное посчитается само.
          </p>
        </div>

        <div className="landing-cta-dialog reveal-child">
          <p className="landing-note-title">Создать первое дело</p>

          <label htmlFor="first-task" className="landing-field-label">
            Название
          </label>
          <input
            id="first-task"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Например, 20 минут английского"
            className="landing-cta-input mt-1.5"
          />

          <p id="effort-label" className="landing-field-label">
            Сколько усилий требует дело
          </p>
          <div role="group" aria-labelledby="effort-label" className="landing-effort mt-1.5">
            {EFFORTS.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={value === effort}
                onClick={() => setEffort(value)}
                className="nums"
              >
                {value}
              </button>
            ))}
          </div>
          <p className="landing-effect nums">один шаг стоит {BASE_XP[effort]} XP</p>

          <Link to="/" className="landing-button mt-6 w-full">
            Открыть Solo
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
