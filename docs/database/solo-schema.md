# Схема «Solo»: прогрессия

**Статус:** рабочий документ · версия 1.0  
**Миграция:** `supabase/migrations/20261114120000_profiles_and_solo.sql`  
**Связанные документы:** [`erd.md`](erd.md), `../solo/technical-architecture.md`, `../solo/progression-system.md`

---

## 1. Принцип

Источник истины о прогрессе — **append-only журнал наград** `reward_ledger`. Общий XP, общий уровень, уровень сферы, ритм и серия не хранятся отдельными числами: они вычисляются из журнала, расписания и выполнений. Поэтому в схеме нет колонок `total_xp` у пользователя или `level` у сферы.

Схема решает три задачи, которые нельзя надёжно решить в клиенте:

1. **Одна награда за период.** Уникальный индекс не даёт начислить два базовых XP за один и тот же факт, даже если два запроса пришли одновременно.
2. **Неизменяемость истории.** `UPDATE` и `DELETE` на журнале запрещены триггером. Отмена — новая строка с отрицательным `total_xp` и ссылкой `reverses_id`.
3. **Изоляция пользователей.** На каждой таблице включена RLS; политика сравнивает `user_id` со `auth.uid()`.

## 2. Обзор таблиц

| Таблица | Назначение | Характер |
| --- | --- | --- |
| `profiles` | Часовой пояс, начало дня и недели, версии правил | Одна строка на пользователя |
| `spheres` | Сферы развития | Архивируются |
| `goals` | Цели: результат, практика, проект | Контекст, не источник XP |
| `milestones` | Вехи — контейнеры задач и привычек | Закрываются один раз |
| `habits` | Привычки и расписание | Архивируются |
| `tasks` | Разовые задачи | Дают XP один раз |
| `completions` | Факты выполнения | Могут повторяться в периоде как статистика |
| `reward_ledger` | Награды | Append-only, источник истины |
| `daily_checkins` | Дневное самонаблюдение | Не влияет на прогрессию |

## 3. `profiles`

Настройки периода и версии правил. Строка создаётся триггером `on_auth_user_created` при регистрации в Supabase Auth.

| Поле | Тип | Ограничения | Смысл |
| --- | --- | --- | --- |
| `id` | `uuid` | PK, FK → `auth.users(id)` on delete cascade | Тот же id, что у пользователя Auth |
| `timezone` | `text` | not null, default `Europe/Moscow` | Пояс для локальной даты и `periodKey` |
| `week_start` | `smallint` | not null, 1…7 | 1 = понедельник; для периода `YYYY-Www` |
| `day_start_hour` | `smallint` | not null, 0…23, default 4 | Логическое начало дня; ночные отметки не рвут день |
| `level_curve_version` | `text` | not null, default `v1` | Версия кривой общего уровня и сфер |
| `current_rule_version` | `text` | not null, default `v1` | Версия правил награды |
| `created_at`, `updated_at` | `timestamptz` | not null, default `now()` | Аудит |

Часовой пояс хранится **только здесь**. Финансы не дублируют его: иначе месяц закрывался бы по одной дате, а операции вводились по другой.

## 4. `spheres`

| Поле | Тип | Ограничения | Смысл |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | not null, FK → `auth.users` on delete cascade | Владелец |
| `name` | `text` | not null, непустое | Название |
| `color` | `text` | | Токен или hex |
| `sort_order` | `integer` | not null, default 0 | Порядок отображения |
| `archived_at` | `timestamptz` | | `null` — активна |
| `created_at`, `updated_at` | `timestamptz` | not null | |

Инвариант: активные имена уникальны в пределах пользователя без учёта регистра — частичный уникальный индекс `(user_id, lower(name)) where archived_at is null`.

## 5. `goals`

| Поле | Тип | Ограничения | Смысл |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | not null, FK → `auth.users` | |
| `title` | `text` | not null, непустое | |
| `goal_type` | `text` | `outcome`, `practice`, `project` | Результат, практика, проект |
| `indicator_label` | `text` | | Название числового индикатора |
| `indicator_unit` | `text` | | Единица: «км», «тренировок» |
| `indicator_target` | `numeric` | `> 0`, если задан | Целевое значение |
| `indicator_current` | `numeric` | not null, default 0 | Текущее значение |
| `status` | `text` | `active`, `done`, `paused`, `archived` | |
| `completed_at` | `timestamptz` | | |
| `created_at`, `updated_at` | `timestamptz` | not null | |

Ограничение `check` связывает индикатор: либо все три поля (`label`, `unit`, `target`) пусты, либо заданы `label` и положительный `target`. Это и есть правило «не более одного активного числового индикатора»: одна цель — один набор колонок, второй индикатор потребовал бы отдельной таблицы и нового решения.

Цель не даёт XP. Закрытие цели — празднование и запись достижения, но не награда.

## 6. `milestones`

| Поле | Тип | Ограничения | Смысл |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | not null, FK → `auth.users` | |
| `goal_id` | `uuid` | FK → `goals` on delete cascade | Может отсутствовать |
| `title` | `text` | not null | |
| `effort` | `smallint` | 3…5 | Веха — крупный шаг |
| `completed_at` | `timestamptz` | | Закрытие фиксируется один раз |
| `created_at`, `updated_at` | `timestamptz` | not null | |

Веха — контейнер. Задачи и привычки, привязанные к ней, дают XP по общим правилам. Закрытие вехи даёт разовую надбавку 25% от фактически начисленного XP вложенных действий, в пределах 15…300 XP; надбавка — отдельная строка журнала с `event_type = 'milestone_bonus'`.

## 7. `habits`

| Поле | Тип | Ограничения | Смысл |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | not null, FK → `auth.users` | |
| `title` | `text` | not null | |
| `sphere_id` | `uuid` | FK → `spheres` on delete set null | Сфера может быть не указана |
| `goal_id` | `uuid` | FK → `goals` on delete set null | Контекст цели |
| `milestone_id` | `uuid` | FK → `milestones` on delete set null | Контейнер вехи |
| `effort` | `smallint` | 1…5 | Базовый XP: 10/20/35/55/80 |
| `schedule_kind` | `text` | `daily`, `weekdays`, `weekly_count`, `monthly_count` | Определяет период |
| `schedule_weekdays` | `smallint[]` | 1…7, непустой для `weekdays` | Выбранные дни недели |
| `schedule_count` | `smallint` | 1…7 или 1…31 | N раз в неделю / в месяц |
| `starts_on` | `date` | not null, default `current_date` | До старта периоды не считаются |
| `archived_at` | `timestamptz` | | |
| `created_at`, `updated_at` | `timestamptz` | not null | |

`check` связывает вид расписания с полями: для `daily` оба поля пусты, для `weekdays` заполнен массив и пуст счётчик, для `weekly_count` и `monthly_count` — наоборот. Это защищает от состояния «вид один, данные другого».

`periodKey`:

| Расписание | Период | Пример |
| --- | --- | --- |
| `daily` | Локальный день | `2026-11-14` |
| `weekdays` | Конкретный день недели | `2026-11-14` |
| `weekly_count` | Неделя от локального начала | `2026-W46` |
| `monthly_count` | Календарный месяц | `2026-11` |

## 8. `tasks`

| Поле | Тип | Ограничения | Смысл |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | not null, FK → `auth.users` | |
| `title` | `text` | not null | |
| `sphere_id` | `uuid` | FK → `spheres` on delete set null | |
| `goal_id` | `uuid` | FK → `goals` on delete set null | |
| `milestone_id` | `uuid` | FK → `milestones` on delete set null | |
| `effort` | `smallint` | 1…5 | |
| `status` | `text` | `open`, `done`, `skipped`, `archived` | |
| `due_date` | `date` | | |
| `completed_at` | `timestamptz` | | |
| `created_at`, `updated_at` | `timestamptz` | not null | |

Задача даёт базовый XP один раз. Повторяющееся действие моделируется привычкой, а не повторным нажатием «выполнено» на одной задаче.

## 9. `completions`

| Поле | Тип | Ограничения | Смысл |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | not null, FK → `auth.users` | |
| `source_type` | `text` | `task`, `habit`, `milestone` | Тип источника |
| `source_id` | `uuid` | not null | Полиморфная ссылка |
| `period_key` | `text` | not null | Период в момент подтверждения |
| `occurred_at` | `timestamptz` | not null, default `now()` | Момент подтверждения |
| `note` | `text` | | |
| `volume` | `numeric` | | Объём, если действие измеряется |
| `created_at` | `timestamptz` | not null | |

**Почему `source_id` без внешнего ключа.** Одна колонка указывает то на `tasks`, то на `habits`, то на `milestones`; обычный FK потребовал бы одной целевой таблицы. Целостность обеспечивается значением `source_type` и проверкой при записи. Это осознанный компромисс: каскадное удаление источника не сработает автоматически, зато схема не размножается на три ссылочные колонки.

Выполнения **не уникальны** по периоду: дополнительные отметки привычки разрешены как личная статистика. XP за них не начисляется — уникальность стоит на журнале наград, а не на фактах.

## 10. `reward_ledger`

| Поле | Тип | Ограничения | Смысл |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | not null, FK → `auth.users` | |
| `occurred_at` | `timestamptz` | not null, default `now()` | |
| `source_type` | `text` | `task`, `habit`, `milestone` | |
| `source_id` | `uuid` | not null | Полиморфная ссылка |
| `event_type` | `text` | `base_xp`, `rhythm_bonus`, `first_step`, `milestone_bonus`, `reversal` | |
| `period_key` | `text` | not null | Период, за который начислено |
| `sphere_id` | `uuid` | FK → `spheres` on delete set null | Вклад в сферу |
| `base_xp` | `integer` | `>= 0` | Базовая часть |
| `bonus_xp` | `integer` | `>= 0` | Бонусы |
| `total_xp` | `integer` | | Итог; отрицательный только у `reversal` |
| `rule_version` | `text` | not null | Версия правил расчёта |
| `reverses_id` | `uuid` | FK → `reward_ledger(id)` on delete restrict | Компенсируемая запись |
| `idempotency_key` | `text` | generated stored | `source_type:source_id:period_key:event_type` |
| `created_at` | `timestamptz` | not null | |

### 10.1. Инварианты

1. **Одна награда на период.** Уникальный индекс:
   `(user_id, source_type, source_id, period_key, event_type)`.
2. **Одна компенсация на запись.** Частичный уникальный индекс `(reverses_id) where reverses_id is not null`.
3. **Сумма сходится.** Для обычной записи `total_xp = base_xp + bonus_xp`; для `reversal` сумма неположительна.
4. **Ссылка у отмены обязательна.** `reversal` без `reverses_id` и обычная запись с `reverses_id` запрещены.
5. **Неизменяемость.** Триггер `reward_ledger_append_only` поднимает исключение на `UPDATE` и `DELETE`.

`idempotency_key` — производная колонка для аудита. Отдельного уникального индекса по ней нет: составной индекс выше уже выражает то же правило, а два индекса однажды разошлись бы.

### 10.2. Почему приложение не проверяет дубль «на глаз»

Проверка «посмотреть, не начислено ли уже» перед вставкой проигрывает гонку при двух одновременных запросах. Уникальный индекс — нет. Повторная вставка выполняется как `insert … on conflict do nothing` и возвращает тот же результат, а не ошибку.

## 11. `daily_checkins`

| Поле | Тип | Ограничения | Смысл |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | not null, FK → `auth.users` | |
| `local_date` | `date` | not null | Одна отметка в день |
| `state` | `text` | `useful`, `neutral`, `distracting` | «Полезно / нейтрально / мешает» |
| `note` | `text` | | Свободная заметка |
| `created_at` | `timestamptz` | not null | |

Уникальность `(user_id, local_date)`. Отметка не даёт XP и не влияет на награды: это метрика догфудинга, а не игровая механика.

## 12. Индексы

| Индекс | Зачем |
| --- | --- |
| `spheres (user_id, sort_order)` | Список сфер в пользовательском порядке |
| `goals (user_id, status)` | Активные цели |
| `milestones (user_id, goal_id)` | Вехи цели |
| `habits (user_id, archived_at)` | Активные привычки |
| `tasks (user_id, status, due_date)` | Задачи на сегодня и просроченные |
| `completions (user_id, occurred_at desc)` | История и ритм |
| `completions (user_id, source_type, source_id)` | Выполнения конкретной привычки |
| `reward_ledger (user_id, occurred_at desc)` | История наград |
| `reward_ledger (user_id, sphere_id)` | Вклад в сферу |

RLS фильтрует по `user_id`, поэтому ведущая колонка каждого индекса — `user_id`. Иначе сама политика становится причиной медленных запросов.

## 13. RLS

Канонический шаблон:

```sql
alter table public.habits enable row level security;

create policy habits_select_own on public.habits
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy habits_write_own on public.habits
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
```

Особенности:

| Таблица | Права клиента | Почему |
| --- | --- | --- |
| `profiles` | select, update | Строка создаётся триггером, не клиентом |
| `spheres`, `goals`, `milestones`, `habits`, `tasks` | select, insert, update, delete | Обычные пользовательские сущности |
| `completions` | select, insert | История выполнений не правится |
| `reward_ledger` | select | Клиент не может «начислить» XP напрямую: запись идёт через серверную функцию, которая считает награду и версию правил |
| `daily_checkins` | select, insert, update, delete | Отметку дня можно исправить |

`service_role` имеет полный доступ и обходит RLS. В браузер он не попадает.

## 14. Что появится позже

- Функция `complete_action(...)`, которая в одной транзакции проверяет расписание, считает награду доменным модулем и пишет выполнение с журналом. Сейчас схема готова к ней: уникальные индексы и триггеры уже стоят, а прямой `INSERT` в журнал клиенту запрещён.
- Функция `reverse_reward(...)` для безопасной отмены.
- Серверный расчёт ритма и уровня: пока это делает клиент из загруженного журнала.
