import { computeActionReward, levelState } from "@solo/domain";

import { Reveal } from "./Reveal";

const REWARD = computeActionReward({
  effort: 3,
  isFirstActionInSphere: true,
  previousPeriods: [true, true, false, true],
});

const XP_BEFORE = 311;
const STATE = levelState(XP_BEFORE + REWARD.totalXp);

const NOTES = [
  {
    title: "Усилие, а не важность",
    text: "Ты выбираешь шаг от 1 до 5. Сколько это в опыте, считает система — спорить с ней не нужно.",
  },
  {
    title: "Ритм — бонус, не долг",
    text: "Держишь серию — сверху 5–20%. Пропустил — бонус не начислен, но накопленное остаётся.",
  },
  {
    title: "Первый шаг в сфере",
    text: "Первое действие в новой сфере даёт +5 опыта: начало всегда видно.",
  },
  {
    title: "Журнал, а не счётчик",
    text: "Уровень вычисляется из истории подтверждённых дел. Отмена — тоже запись, а не перезапись.",
  },
] as const;

export function TodayPanel() {
  return (
    <section aria-labelledby="panel-title">
      <Reveal className="landing-panel-grid">
        <h2 id="panel-title" className="landing-panel-title reveal-child">
          Что видно после нажатия
        </h2>

        <div className="landing-panel-notes landing-panel-notes--left">
          {NOTES.slice(0, 2).map((note, index) => (
            <div
              key={note.title}
              className="reveal-child"
              style={{ transitionDelay: `${120 + index * 70}ms` }}
            >
              <h3 className="landing-note-title">{note.title}</h3>
              <p className="landing-note-text">{note.text}</p>
            </div>
          ))}
        </div>

        <div className="landing-panel-card reveal-child" data-ui>
          <div className="flex items-baseline justify-between gap-3">
            <p className="landing-note-title">Отметка засчитана</p>
            <span className="landing-small">журнал</span>
          </div>
          <p className="landing-small mt-1">«Раздел документа» · Ремесло</p>

          <dl className="mt-5 flex flex-col gap-3">
            <div className="finance-row">
              <dt>Базовое усилие 3 из 5</dt>
              <dd className="nums text-text">{REWARD.baseXp} XP</dd>
            </div>
            <div className="finance-row">
              <dt>Бонус за ритм 10%</dt>
              <dd className="nums text-accent">+{REWARD.rhythmBonusXp} XP</dd>
            </div>
            <div className="finance-row">
              <dt>Первый шаг в сфере</dt>
              <dd className="nums text-accent">+{REWARD.firstStepXp} XP</dd>
            </div>
          </dl>

          <div className="mt-6 flex items-baseline justify-between gap-3">
            <p className="landing-body text-text">Итого</p>
            <p className="nums text-2xl text-accent">{REWARD.totalXp} XP</p>
          </div>

          <div className="mt-5">
            <div className="h-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${Math.round((STATE.xpIntoLevel / STATE.xpForNext) * 100)}%` }}
              />
            </div>
            <p className="nums landing-small mt-2">
              уровень {STATE.level} · до следующего {STATE.xpToNext} XP
            </p>
          </div>

          <ul className="mt-5 flex flex-col gap-2">
            <li className="landing-row flex items-center gap-2.5">
              <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-accent" />
              Тренировка · Здоровье
            </li>
            <li className="landing-row flex items-center gap-2.5 text-text-muted">
              <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-white/25" />
              20 минут английского · Разум
            </li>
          </ul>
        </div>

        <div className="landing-panel-notes landing-panel-notes--right">
          {NOTES.slice(2).map((note, index) => (
            <div
              key={note.title}
              className="reveal-child"
              style={{ transitionDelay: `${200 + index * 70}ms` }}
            >
              <h3 className="landing-note-title">{note.title}</h3>
              <p className="landing-note-text">{note.text}</p>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
