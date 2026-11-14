# ERD: схема базы данных

**Статус:** рабочий документ · версия 1.0  
**Связанные документы:** [`solo-schema.md`](solo-schema.md), [`finance-schema.md`](finance-schema.md), `../supabase-setup.md`

---

## 1. Как читать диаграммы

- `||--o{` — один к многим; `||--||` — один к одному.
- Пунктирная связь на диаграмме означает логическую связь без внешнего ключа.
- Все пользовательские таблицы связаны с `auth.users` через `user_id`; на диаграммах показан только верхний уровень, чтобы не повторять одну и ту же линию.
- `source_id` в `completions` и `reward_ledger` — полиморфная ссылка: она указывает на `tasks`, `habits` или `milestones` в зависимости от `source_type`. Обычного внешнего ключа по ней нет.

## 2. Solo: прогрессия

```mermaid
erDiagram
  AUTH_USERS ||--|| PROFILES : "профиль"
  AUTH_USERS ||--o{ SPHERES : "имеет"
  AUTH_USERS ||--o{ GOALS : "ставит"
  AUTH_USERS ||--o{ HABITS : "ведёт"
  AUTH_USERS ||--o{ TASKS : "планирует"
  AUTH_USERS ||--o{ COMPLETIONS : "выполняет"
  AUTH_USERS ||--o{ REWARD_LEDGER : "владеет"
  AUTH_USERS ||--o{ DAILY_CHECKINS : "наблюдает"

  SPHERES ||--o{ HABITS : "направляет"
  SPHERES ||--o{ TASKS : "направляет"
  SPHERES ||--o{ REWARD_LEDGER : "учитывает вклад"

  GOALS ||--o{ MILESTONES : "содержит"
  GOALS ||--o{ HABITS : "контекст"
  GOALS ||--o{ TASKS : "контекст"

  MILESTONES ||--o{ HABITS : "контейнер"
  MILESTONES ||--o{ TASKS : "контейнер"

  HABITS ||--o{ COMPLETIONS : "фиксирует"
  TASKS ||--o{ COMPLETIONS : "фиксирует"
  MILESTONES ||--o{ COMPLETIONS : "фиксирует"

  COMPLETIONS ||--o{ REWARD_LEDGER : "порождает"
  REWARD_LEDGER ||--o| REWARD_LEDGER : "reverses_id"

  PROFILES {
    uuid id PK
    text timezone
    smallint week_start
    smallint day_start_hour
    text level_curve_version
    text current_rule_version
    timestamptz created_at
    timestamptz updated_at
  }

  SPHERES {
    uuid id PK
    uuid user_id FK
    text name
    text color
    integer sort_order
    timestamptz archived_at
    timestamptz created_at
    timestamptz updated_at
  }

  GOALS {
    uuid id PK
    uuid user_id FK
    text title
    text goal_type
    text indicator_label
    text indicator_unit
    numeric indicator_target
    numeric indicator_current
    text status
    timestamptz completed_at
    timestamptz created_at
    timestamptz updated_at
  }

  MILESTONES {
    uuid id PK
    uuid user_id FK
    uuid goal_id FK
    text title
    smallint effort
    timestamptz completed_at
    timestamptz created_at
    timestamptz updated_at
  }

  HABITS {
    uuid id PK
    uuid user_id FK
    text title
    uuid sphere_id FK
    uuid goal_id FK
    uuid milestone_id FK
    smallint effort
    text schedule_kind
    smallint_array schedule_weekdays
    smallint schedule_count
    date starts_on
    timestamptz archived_at
    timestamptz created_at
    timestamptz updated_at
  }

  TASKS {
    uuid id PK
    uuid user_id FK
    text title
    uuid sphere_id FK
    uuid goal_id FK
    uuid milestone_id FK
    smallint effort
    text status
    date due_date
    timestamptz completed_at
    timestamptz created_at
    timestamptz updated_at
  }

  COMPLETIONS {
    uuid id PK
    uuid user_id FK
    text source_type
    uuid source_id
    text period_key
    timestamptz occurred_at
    text note
    numeric volume
    timestamptz created_at
  }

  REWARD_LEDGER {
    uuid id PK
    uuid user_id FK
    timestamptz occurred_at
    text source_type
    uuid source_id
    text event_type
    text period_key
    uuid sphere_id FK
    integer base_xp
    integer bonus_xp
    integer total_xp
    text rule_version
    uuid reverses_id FK
    text idempotency_key
    timestamptz created_at
  }

  DAILY_CHECKINS {
    uuid id PK
    uuid user_id FK
    date local_date
    text state
    text note
    timestamptz created_at
  }
```

## 3. Finance: деньги

```mermaid
erDiagram
  AUTH_USERS ||--|| FINANCE_SETTINGS : "настройки"
  AUTH_USERS ||--o{ FINANCE_CATEGORIES : "справочник"
  AUTH_USERS ||--o{ FINANCE_SERIES : "серии"
  AUTH_USERS ||--o{ FINANCE_OPERATIONS : "операции"
  AUTH_USERS ||--o{ FINANCE_BASELINES : "точки отсчёта"
  AUTH_USERS ||--o{ FINANCE_SNAPSHOTS : "снимки месяцев"
  AUTH_USERS ||--o{ FINANCE_OPERATION_REVISIONS : "ревизии"

  FINANCE_CATEGORIES ||--o{ FINANCE_SERIES : "категория серии"
  FINANCE_CATEGORIES ||--o{ FINANCE_OPERATIONS : "категория операции"
  FINANCE_SERIES ||--o{ FINANCE_OPERATIONS : "вхождения"
  FINANCE_OPERATIONS ||--o{ FINANCE_OPERATIONS : "plan_id"
  FINANCE_OPERATIONS ||--o{ FINANCE_OPERATION_REVISIONS : "логическая связь"

  FINANCE_SETTINGS {
    uuid user_id PK
    boolean hide_deviation
    timestamptz created_at
    timestamptz updated_at
  }

  FINANCE_CATEGORIES {
    uuid id PK
    uuid user_id FK
    text name
    text kind
    boolean is_essential
    text color
    text icon
    integer sort_order
    timestamptz archived_at
    timestamptz created_at
    timestamptz updated_at
  }

  FINANCE_SERIES {
    uuid id PK
    uuid user_id FK
    text title
    uuid category_id FK
    bigint amount_minor
    text recurrence
    date start_date
    smallint day_of_month
    smallint weekday
    integer occurrences_count
    date ends_on
    timestamptz archived_at
    timestamptz created_at
    timestamptz updated_at
  }

  FINANCE_OPERATIONS {
    uuid id PK
    uuid user_id FK
    text entry_type
    text status
    uuid category_id FK
    date on_date
    bigint amount_minor
    uuid plan_id FK
    uuid series_id FK
    date series_occurrence_date
    text note
    timestamptz created_at
    timestamptz updated_at
  }

  FINANCE_BASELINES {
    uuid id PK
    uuid user_id FK
    date effective_date
    bigint amount_minor
    text reason
    timestamptz created_at
  }

  FINANCE_SNAPSHOTS {
    uuid user_id PK
    date month_start PK
    bigint target_minor
    bigint fact_minor
    bigint deviation_minor
    timestamptz closed_at
    text close_mode
  }

  FINANCE_OPERATION_REVISIONS {
    uuid id PK
    uuid user_id FK
    uuid operation_id
    text action
    jsonb before
    jsonb after
    timestamptz changed_at
  }
```

## 4. Связь двух направлений

```mermaid
erDiagram
  AUTH_USERS ||--|| PROFILES : "один профиль"
  AUTH_USERS ||--o{ SOLO_TABLES : "прогрессия"
  AUTH_USERS ||--o{ FINANCE_TABLES : "деньги"

  AUTH_USERS {
    uuid id PK
    text email
  }

  PROFILES {
    uuid id PK
    text timezone
    smallint week_start
    smallint day_start_hour
  }

  SOLO_TABLES {
    text tables
  }

  FINANCE_TABLES {
    text tables
  }
```

Направления не связаны предметно: трата не даёт XP, сфера не влияет на баланс. Общая только инфраструктура — пользователь Auth, `profiles` (часовой пояс и настройки периода), RLS и миграции.

## 5. Ключевые решения схемы

| Решение | Причина |
| --- | --- |
| `reward_ledger` без `total_xp` у пользователя | Иначе два источника истины: сумма журнала и сохранённое число разойдутся |
| Уникальность награды на журнале, а не на `completions` | Дополнительные отметки привычки разрешены как статистика, но XP не удваивают |
| Полиморфный `source_id` без FK | Одна колонка указывает на разные таблицы; целостность обеспечивает `source_type` |
| План и факт — разные строки | Позволяет связать частичное исполнение и сохранить историю плана |
| Деньги в копейках `bigint` | Точное сложение без `float` |
| Снимок месяца — отдельная неизменяемая строка | Закрытый месяц не пересчитывается задним числом |
| Базовые линии и снимки неизменяемы | Иначе исправление одной строки молча переписывает историю |
| Ревизии операций вместо append-only операций | Опечатка в сумме — обычная ситуация; аудит важнее реверсов |
| RLS на каждой таблице | Ошибка изоляции данных между пользователями — самая дорогая из возможных |
