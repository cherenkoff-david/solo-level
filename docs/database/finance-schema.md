# Схема «Финансы»

**Статус:** рабочий документ · версия 1.0  
**Миграция:** `supabase/migrations/20261114120100_finance.sql`  
**Связанные документы:** [`erd.md`](erd.md), `../finance/data-model.md`, `../finance/architecture.md`

---

## 1. Принцип

Хранится только то, что нельзя восстановить: операции, категории, серии, базовые линии, снимки закрытых месяцев и журнал правок. Балансы, отклонения, остатки планов и агрегаты не хранятся — их считает доменный пакет `@solo/finance`.

Деньги — **целые копейки** (`bigint`). Даты — **календарные** (`date`): раздел считает по дням, внутридневной порядок не моделируется.

## 2. Обзор таблиц

| Таблица | Назначение | Характер |
| --- | --- | --- |
| `finance_settings` | Настройки раздела | Одна строка на пользователя |
| `finance_categories` | Справочник категорий | Архивирование вместо удаления |
| `finance_series` | Правила повторов | Обязательная конечная граница |
| `finance_operations` | Планы и факты | Главная таблица; план и факт — разные строки |
| `finance_baselines` | Точки отсчёта | Неизменяемые |
| `finance_snapshots` | Итоги закрытых месяцев | Один снимок на месяц |
| `finance_operation_revisions` | Журнал правок операций | Append-only |

## 3. `finance_settings`

| Поле | Тип | Ограничения | Смысл |
| --- | --- | --- | --- |
| `user_id` | `uuid` | PK, FK → `auth.users` on delete cascade | Одна строка на пользователя |
| `hide_deviation` | `boolean` | not null, default false | Режим «без оценок» |
| `created_at`, `updated_at` | `timestamptz` | not null | |

Часовой пояс здесь не дублируется: он берётся из `profiles.timezone`.

## 4. `finance_categories`

| Поле | Тип | Ограничения | Смысл |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | not null, FK → `auth.users` | |
| `name` | `text` | not null, непустое | |
| `kind` | `text` | `income`, `expense` | Направление |
| `is_essential` | `boolean` | not null, default false | Обязательная трата |
| `color` | `text` | | Токен или hex |
| `icon` | `text` | | Имя иконки или первая буква |
| `sort_order` | `integer` | not null, default 0 | Только порядок отображения |
| `archived_at` | `timestamptz` | | `null` — активна |
| `created_at`, `updated_at` | `timestamptz` | not null | |

Инварианты:

- Активные имена уникальны в пределах пользователя и вида без учёта регистра:
  частичный уникальный индекс `(user_id, kind, lower(name)) where archived_at is null`.
- Удаление категории с операциями запрещено внешним ключом `on delete restrict`. Разрешено только архивирование — иначе история потеряет смысл.
- `sort_order` не влияет ни на один расчёт: только на порядок строк.

Направление дохода/расхода хранится **только в категории**. Дублировать его в операции — значит получить две колонки, которые однажды разойдутся.

## 5. `finance_series`

| Поле | Тип | Ограничения | Смысл |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | not null, FK → `auth.users` | |
| `title` | `text` | not null | «Зарплата», «Аренда» |
| `category_id` | `uuid` | not null, FK → `finance_categories` on delete restrict | |
| `amount_minor` | `bigint` | not null, `> 0` | |
| `recurrence` | `text` | `daily`, `weekly`, `monthly` | |
| `start_date` | `date` | not null | Первое вхождение |
| `day_of_month` | `smallint` | 1…31 | Для `monthly` |
| `weekday` | `smallint` | 1…7 | Для `weekly` |
| `occurrences_count` | `integer` | `> 0` | Граница «сколько раз» |
| `ends_on` | `date` | | Граница «до даты» |
| `archived_at` | `timestamptz` | | |
| `created_at`, `updated_at` | `timestamptz` | not null | |

Инварианты:

- Граница обязательна и ровно одна: `check ((occurrences_count is null) <> (ends_on is null))`. Бесконечная серия означала бы либо бесконечную генерацию, либо скрытый лимит.
- Вид повтора согласован с полями: `daily` без дня и недели, `weekly` с `weekday`, `monthly` с `day_of_month`.
- 29–31 число в коротком месяце прижимается к последнему дню месяца доменом, а не базой.

## 6. `finance_operations`

Главная таблица. План и факт — разные строки, различаемые `entry_type`.

| Поле | Тип | Ограничения | Смысл |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | not null, FK → `auth.users` | |
| `entry_type` | `text` | `planned`, `actual` | |
| `status` | `text` | см. ниже | Для плана — стадия, для факта — `actual` |
| `category_id` | `uuid` | not null, FK → `finance_categories` on delete restrict | |
| `on_date` | `date` | not null | День операции |
| `amount_minor` | `bigint` | not null, `> 0` | Сумма всегда положительна |
| `plan_id` | `uuid` | FK → `finance_operations(id)` on delete set null | Только у факта |
| `series_id` | `uuid` | FK → `finance_series` on delete set null | |
| `series_occurrence_date` | `date` | | Дата вхождения в серии |
| `note` | `text` | | |
| `created_at`, `updated_at` | `timestamptz` | not null | |

### 6.1. Статусы

| `entry_type` | Допустимые `status` |
| --- | --- |
| `actual` | `actual` |
| `planned` | `pending`, `due`, `overdue`, `partial`, `done`, `skipped` |

`check` связывает тип и статус: факт не может быть `pending`, план — `actual`.

### 6.2. Идемпотентность генерации серий

Уникальный частичный индекс `(series_id, series_occurrence_date, entry_type) where series_id is not null` не даёт повторной генерации создать второе вхождение той же серии на ту же дату.

### 6.3. Почему сумма всегда положительна

Направление задаёт категория. Знак в `amount_minor` завёл бы третий источник истины и позволил бы записать доход с отрицательной суммой.

### 6.4. Почему план не хранит остаток

Остаток `amount_minor − Σ связанных фактов` — производная величина. Хранить `remaining_minor` означало бы иметь два числа, которые расходятся после каждой правки факта.

## 7. `finance_baselines`

| Поле | Тип | Ограничения | Смысл |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | not null, FK → `auth.users` | |
| `effective_date` | `date` | not null | Первый день, к которому применяется отсчёт |
| `amount_minor` | `bigint` | not null | Фактический баланс на начало дня |
| `reason` | `text` | `start`, `accept_reality` | |
| `created_at` | `timestamptz` | not null | |

Инварианты:

- Одна линия на дату: уникальный индекс `(user_id, effective_date)`.
- Действующая линия — последняя с `effective_date <= D`.
- `UPDATE` и `DELETE` запрещены триггером. Ошибочная линия исправляется новой линией с более поздней датой. Исключение — служебная функция `finance_reset()`: она выполняется от `postgres` и удаляет данные пользователя при явном сбросе раздела.

## 8. `finance_snapshots`

| Поле | Тип | Ограничения | Смысл |
| --- | --- | --- | --- |
| `user_id` | `uuid` | not null, FK → `auth.users` | |
| `month_start` | `date` | not null, `extract(day) = 1` | Первый день месяца |
| `target_minor` | `bigint` | not null | Целевой баланс на конец месяца |
| `fact_minor` | `bigint` | not null | Фактический баланс на конец месяца |
| `deviation_minor` | `bigint` | generated stored | `fact_minor - target_minor` |
| `closed_at` | `timestamptz` | not null, default `now()` | |
| `close_mode` | `text` | `auto`, `manual` | |

Первичный ключ `(user_id, month_start)` не даёт закрыть месяц дважды. `UPDATE` и `DELETE` запрещены триггером: снимок — исторический факт, а не пересчитываемая величина.

## 9. `finance_operation_revisions`

| Поле | Тип | Ограничения | Смысл |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | not null, FK → `auth.users` | |
| `operation_id` | `uuid` | not null, без FK | Ревизия переживает удаление операции |
| `action` | `text` | `update`, `delete` | |
| `before` | `jsonb` | not null | Снимок строки до изменения |
| `after` | `jsonb` | | `null` при удалении |
| `changed_at` | `timestamptz` | not null, default `now()` | |

Триггер `finance_operations_revision` пишет ревизию после `UPDATE` и `DELETE` операции. `UPDATE` и `DELETE` на самих ревизиях запрещены триггером `finance_revisions_guard`.

Почему не неизменяемые операции и компенсирующие записи, как в журнале наград: там неизменяемость решала проблему двойного XP. Здесь баланс — сумма, двойного счёта не возникает, зато опечатка в сумме возникает постоянно. Ревизии дают аудит без реверсов.

## 10. Триггеры

| Триггер | Таблица | Что делает |
| --- | --- | --- |
| `finance_settings_set_updated_at` | `finance_settings` | Обновляет `updated_at` |
| `finance_categories_set_updated_at` | `finance_categories` | Обновляет `updated_at` |
| `finance_series_set_updated_at` | `finance_series` | Обновляет `updated_at` |
| `finance_operations_set_updated_at` | `finance_operations` | Обновляет `updated_at` |
| `finance_operations_validate_plan` | `finance_operations` | Проверяет, что `plan_id` — план того же пользователя и не `skipped` |
| `finance_operations_revision` | `finance_operations` | Пишет ревизию при правке и удалении |
| `finance_baselines_guard` | `finance_baselines` | Запрещает правку и удаление |
| `finance_snapshots_guard` | `finance_snapshots` | Запрещает правку и удаление |
| `finance_revisions_guard` | `finance_operation_revisions` | Запрещает правку и удаление ревизий |

Проверка ссылки на план не выражается обычным `check`: нужно прочитать другую строку и сравнить пользователя и статус. Поэтому это триггер, а не ограничение.

## 11. Функции записи

Функции нужны там, где одна операция пользователя меняет несколько строк и сбой на середине оставил бы неполное состояние.

| Функция | Что делает | Почему функция |
| --- | --- | --- |
| `finance_confirm_plan(p_plan_id, p_fact_id, p_amount_minor, p_on_date, p_keep_open, p_note)` | Вставляет факт, пересчитывает оплаченное и ставит план в `partial` или `done` в одной транзакции | Два запроса из браузера могли бы оставить факт без статуса или создать два факта при двойном нажатии |
| `finance_delete_series(p_series_id)` | Удаляет будущие неподтверждённые вхождения, остальным обнуляет `series_id`, затем удаляет серию | Прямой `delete` оставил бы планы-сироты без признака серии |
| `finance_close_month(p_month_start, p_close_mode)` | Считает цель и факт на конец месяца из истории и вставляет снимок | Снимок должен считаться из базы, а не из доверенного клиента; повторный вызов отвергается первичным ключом |
| `finance_reset()` | Удаляет все данные раздела текущего пользователя | Явный сброс раздела; выполняется от `postgres`, чтобы обойти защиту неизменяемых таблиц |

`finance_confirm_plan` работает с `auth.uid()` и `security invoker`: RLS применяется к вызывающему пользователю. `finance_delete_series` и `finance_reset` — `security definer`, потому что должны удалять строки, на которые у клиента нет прямого права `delete`; обе функции всё равно фильтруют по `auth.uid()` и не принимают пользователя из аргументов.

**Про формулы.** `finance_close_month` повторяет простую формулу баланса на SQL: базовая линия плюс доходы минус расходы. Это единственное место, где формула живёт в двух местах; причина — требование «снимок считается из истории, а не из клиента». Доменный пакет остаётся источником для отображения, а снимок — историческим фактом, который после закрытия не пересчитывается.

## 12. Индексы

| Индекс | Зачем |
| --- | --- |
| `finance_categories (user_id, sort_order)` | Списки категорий |
| `finance_series (user_id, start_date)` | Генерация вхождений |
| `finance_operations (user_id, on_date)` | Календарь и график |
| `finance_operations (user_id, category_id, on_date)` | План/факт по категориям |
| `finance_operations (user_id, plan_id) where plan_id is not null` | Остаток плана и связанные факты |
| `finance_operations (user_id, status) where status in ('due','overdue')` | Плашка подтверждений |
| `finance_baselines (user_id, effective_date desc)` | Действующая базовая линия |
| `finance_operation_revisions (user_id, changed_at desc)` | История правок |

## 13. RLS

Канонический шаблон тот же, что в Solo:

```sql
alter table public.finance_operations enable row level security;

create policy finance_operations_select_own on public.finance_operations
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy finance_operations_write_own on public.finance_operations
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
```

Права клиента:

| Таблица | Права | Почему |
| --- | --- | --- |
| `finance_settings` | select, insert, update, delete | Настройка отображения |
| `finance_categories` | select, insert, update, delete | Справочник; удаление ограничено FK |
| `finance_series` | select, insert, update | Удаление — только через `finance_delete_series`; прямой `delete` клиенту не выдан |
| `finance_operations` | select, insert, update, delete | Основной массив данных; ревизии пишет триггер |
| `finance_baselines` | select, insert | Точки отсчёта не правятся |
| `finance_snapshots` | select, insert | Снимки не правятся |
| `finance_operation_revisions` | select | Пишет только триггер |

Проверка изоляции обязательна и должна быть первой: пользователь A не видит ни одной строки пользователя B, включая агрегаты и ревизии.

## 14. Что не хранится

| Величина | Почему |
| --- | --- |
| Фактический баланс на дату | Базовая линия плюс факты |
| Целевой баланс на дату | Базовая линия плюс планы, кроме `skipped` |
| Отклонение дня и текущего месяца | Считается; хранится только снимок закрытого месяца |
| Накопленное отклонение | Сумма снимков после последней базовой линии плюс живое отклонение |
| Остаток плановой операции | `amount_minor` минус сумма связанных фактов |
| Суммы дня в календаре | Агрегат по операциям дня |
