import { useState } from "react";

import { Reveal } from "./Reveal";

const ITEMS = [
  {
    question: "Это ещё один список задач?",
    answer:
      "Список хранит дела. Solo показывает накопленный эффект: действие даёт опыт, опыт складывается в уровень, а уровень виден в сферах жизни.",
  },
  {
    question: "Что будет, если пропустить неделю?",
    answer:
      "Ничего не сгорит. Опыт не отнимается за пропуски — только если ты сам отменишь ошибочную отметку.",
  },
  {
    question: "Нужен ли аккаунт?",
    answer:
      "Да. Данные лежат на сервере в базе, поэтому вход нужен — зато прогресс доступен с любого устройства.",
  },
  {
    question: "Кто видит мои данные?",
    answer:
      "Только ты. Доступ закрыт на уровне базы, а не на честном слове интерфейса. Всё можно выгрузить одним файлом.",
  },
  {
    question: "Зачем отдельный раздел про деньги?",
    answer:
      "Потому что смешивать игру и деньги — плохая идея. Трата не даёт опыта, чтобы система не поощряла тратить.",
  },
] as const;

export function Faq() {
  const [active, setActive] = useState(0);
  const current = ITEMS[active] ?? ITEMS[0]!;

  return (
    <section aria-labelledby="faq-title">
      <Reveal className="landing-faq-grid">
        <div>
          <h2 id="faq-title" className="landing-heading reveal-child">
            Частые вопросы
          </h2>

          <ul className="landing-faq-list reveal-child mt-10">
            {ITEMS.map((item, index) => (
              <li key={item.question}>
                <button
                  type="button"
                  aria-expanded={index === active}
                  onClick={() => setActive(index)}
                  className="landing-faq-question"
                >
                  <span aria-hidden="true" className="landing-faq-dot" />
                  {item.question}
                </button>

                {index === active ? (
                  <p className="landing-faq-answer landing-faq-answer--inline mt-3">
                    {item.answer}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>

        <p aria-live="polite" className="landing-faq-answer landing-faq-answer--desktop reveal-child">
          {current.answer}
        </p>
      </Reveal>
    </section>
  );
}
