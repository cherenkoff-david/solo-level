# Finance — модель данных

**Статус:** рабочий документ · версия 0.1  
**Связанные документы:** `requirements.md`, `architecture.md`, `../solo/technical-architecture.md`  
**Область:** таблицы, инварианты, индексы и политики доступа раздела «Финансы». Продуктовые правила — в `requirements.md`.

---

## 1. Принципы

1. **Хранится только то, что нельзя восстановить:** операции, категории, серии, базовые линии и снимки месяцев. Балансы, отклонения и агрегаты не хранятся — они считаются доменным пакетом (§4).
2. **Деньги — целые копейки** (`bigint`), без `float` и `numeric` с дробной частью. Причина: точное сложение по построению.
3. **Даты — календарные** (`date`), без времени. Раздел считает по дням, внутридневной порядок не моделируется.
4. **Все таблицы с пользовательскими данными имеют `user_id` и RLS** — включённую явно, с политикой `auth.uid() = user_id`.
5. **Схема меняется только миграциями** (`supabase/migrations/`), не через визуальный редактор.

## 2. Общая картина

```text
finance_settings         настройки раздела (одна строка на пользователя)
finance_categories       плоский справочник, архивирование
finance_series           правила повторов с конечной границей
finance_operations       планы и факты, факт → план ссылкой
finance_baselines        точки отсчёта: стартовая сумма и «принять реальность»
finance_snapshots        замороженные итоги закрытых месяцев
finance_operation_revisions  журнал правок операций (append-only)
```

## 3. Таблицы

### 3.1. `finance_settings`

| Поле | Тип | Замечания |
| --- | --- | --- |
| `user_id` | `uuid` pk, `references auth.users` on delete cascade | Одна строка на пользователя |
| `hide_deviation` | `boolean` not null default `false` | Режим «без оценок» |
| `created_at` / `updated_at` | `timestamptz` | |

Часовой пояс здесь **не дублируется**: он берётся из `profiles.timezone`. Два источника пояса означали бы, что месяц закрывается по одной дате, а операции вводятся по другой.

### 3.2. `finance_categories`

| Поле | Тип | Замечания |
| --- | --- | --- |
| `id` | `uuid` pk | |
| `user_id` | `uuid` not null | |
| `name` | `text` not null | |
| `kind` | `text` not null | `check (kind in ('income','expense'))` — единственный источник направления |
| `is_essential` | `boolean` not null default `false` | Только для расходов, для доходов игнорируется |
| `color` | `text` | Токен или hex |
| `icon` | `text` | Имя иконки |
| `sort_order` | `integer` not null default `0` | |
| `archived_at` | `timestamptz` | `null` — активна |
| `created_at` | `timestamptz` not null default `now()` | |

Инварианты:

- Активные имена уникальны в пределах пользователя и вида:
  `unique (user_id, kind, name) where archived_at is null` (частичный уникальный индекс).
- Удаление категории, у которой есть операции, **запрещено** внешним ключом `on delete restrict`. Разрешено только архивирование — иначе история потеряет смысл.
- `is_essential` не влияет на расчёт баланса. Он нужен для разбивки отклонения по причинам и для ответа «сколько можно было отложить».

Направление операции (доход/расход) хранится **только** в категории. Дублировать его на операции — значит получить две колонки, которые однажды разойдутся. Цена решения: для агрегатов нужен `join` с категорией, что при сотнях строк в месяц несущественно.

### 3.3. `finance_series`

| Поле | Тип | Замечания |
| --- | --- | --- |
| `id` | `uuid` pk | |
| `user_id` | `uuid` not null | |
| `title` | `text` not null | «Зарплата», «Аренда» |
| `category_id` | `uuid` not null `references finance_categories` restrict | |
| `amount_minor` | `bigint` not null `check (amount_minor > 0)` | |
| `recurrence` | `text` not null `check (recurrence in ('daily','weekly','monthly'))` | |
| `start_date` | `date` not null | Первое вхождение |
| `day_of_month` | `smallint` `check (day_of_month between 1 and 31)` | Для `monthly`; 29–31 в коротком месяце прижимается к последнему дню |
| `weekday` | `smallint` `check (weekday between 1 and 7)` | Для `weekly` |
| `occurrences_count` | `integer` `check (occurrences_count > 0)` | Граница способом «сколько раз» |
| `ends_on` | `date` | Граница способом «до даты» |
| `archived_at` | `timestamptz` | |
| `created_at` | `timestamptz` not null default `now()` | |

Инвариант границы — одна из двух, не обе и не ни одной:

```sql
check ((occurrences_count is null) <> (ends_on is null))
```

Почему граница обязательна: горизонт планирования не ограничен, а бесконечная серия означала бы либо бесконечную генерацию, либо скрытый лимит, противоречащий требованию. Конечная серия — это честный компромисс: планируете на 12 месяцев — получаете 12 вхождений.

### 3.4. `finance_operations`

Главная таблица. План и факт — разные строки, различаемые `entry_type`.

| Поле | Тип | Замечания |
| --- | --- | --- |
| `id` | `uuid` pk | |
| `user_id` | `uuid` not null | |
| `entry_type` | `text` not null `check (entry_type in ('planned','actual'))` | |
| `status` | `text` not null | Для плана: `pending`,`due`,`overdue`,`partial`,`done`,`skipped`. Для факта: `actual` |
| `category_id` | `uuid` not null `references finance_categories` restrict | |
| `on_date` | `date` not null | День операции |
| `amount_minor` | `bigint` not null `check (amount_minor > 0)` | Знак определяется видом категории, не суммой |
| `plan_id` | `uuid` `references finance_operations(id)` | Только у факта, необязателен |
| `series_id` | `uuid` `references finance_series(id) on delete set null` | |
| `series_occurrence_date` | `date` | Дата вхождения в серии |
| `note` | `text` | |
| `created_at` / `updated_at` | `timestamptz` not null default `now()` | |

**Согласованность типа и статуса:**

```sql
check (
  (entry_type = 'actual'  and status = 'actual') or
  (entry_type = 'planned' and status in ('pending','due','overdue','partial','done','skipped'))
)
```

**Идемпотентность генерации серий.** Вхождения создаются заранее, при повторном запуске генерации дубликаты не появляются:

```sql
unique (series_id, series_occurrence_date, entry_type)
```

Уникальность частичная — только при `series_id is not null`.

**Почему сумма всегда положительна.** Направление задаёт категория. Знак в `amount_minor` завёл бы третий источник истины и позволил бы записать доход с отрицательной суммой, который потом вычитался бы из дохода.

**Почему плановая операция не хранит признак исполнения в сумме.** Остаток плана (`amount_minor − Σ связанных фактов`) — производная величина, она считается доменом. Хранить `remaining_minor` означало бы иметь два числа, которые расходятся после каждой правки факта.

### 3.5. `finance_baselines`

Точка отсчёта для обеих линий.

| Поле | Тип | Замечания |
| --- | --- | --- |
| `id` | `uuid` pk | |
| `user_id` | `uuid` not null | |
| `effective_date` | `date` not null | Первый день, к которому применяется отсчёт |
| `amount_minor` | `bigint` not null | Фактический баланс на начало этого дня |
| `reason` | `text` not null `check (reason in ('start','accept_reality'))` | |
| `created_at` | `timestamptz` not null default `now()` | |

Инварианты:

- Одна базовая линия на дату: `unique (user_id, effective_date)`.
- Действующая базовая линия — последняя по `effective_date`, не превосходящей расчётную дату. Более поздняя линия не влияет на расчёт прошлых дней.
- Удаление запрещено: это точка, от которой посчитаны все числа; её удаление молча переписывает историю. Ошибочно заданная линия исправляется новой линией с более поздней датой.

### 3.6. `finance_snapshots`

Замороженный итог закрытого месяца.

| Поле | Тип | Замечания |
| --- | --- | --- |
| `user_id` | `uuid` not null | |
| `month_start` | `date` not null | Первый день месяца; `pk (user_id, month_start)` |
| `target_minor` | `bigint` not null | Целевой баланс на конец месяца |
| `fact_minor` | `bigint` not null | Фактический баланс на конец месяца |
| `deviation_minor` | `bigint` generated always as (`fact_minor - target_minor`) stored | Производная, не вводится руками |
| `closed_at` | `timestamptz` not null default `now()` | |
| `close_mode` | `text` not null `check (close_mode in ('auto','manual'))` | |

Инвариант: месяц закрывается один раз — первичный ключ не даёт сделать второй снимок. Пересчёт закрытого месяца не предусмотрен: снимок — исторический факт. Если в нём ошибка, исправление — новой базовой линией, а не правкой снимка.

### 3.7. `finance_operation_revisions`

Журнал правок. Append-only.

| Поле | Тип | Замечания |
| --- | --- | --- |
| `id` | `uuid` pk | |
| `user_id` | `uuid` not null | |
| `operation_id` | `uuid` not null | Без внешнего ключа: ревизия должна пережить удаление операции |
| `action` | `text` not null `check (action in ('update','delete'))` | |
| `before` | `jsonb` not null | Снимок строки до изменения |
| `after` | `jsonb` | `null` при удалении |
| `changed_at` | `timestamptz` not null default `now()` | |

Почему не неизменяемые операции и компенсирующие записи (как `reward_ledger` в Solo Level): там неизменяемость решала конкретную проблему — повторная отметка удваивала XP. Здесь баланс — сумма, двойного счёта не возникает, зато опечатка в сумме возникает постоянно. Ревизии дают аудит без реверсов.

## 4. Что не хранится

| Величина | Почему |
| --- | --- |
| Фактический баланс на дату | Считается: базовая линия + факты |
| Целевой баланс на дату | Считается: базовая линия + планы |
| Отклонение дня и месяца (кроме закрытых) | Считается; хранится только снимок закрытого месяца |
| Накопленное отклонение | Сумма снимков после последней базовой линии + живое отклонение месяца |
| Остаток плановой операции | `amount_minor` минус сумма связанных фактов |
| Суммы дня в календаре | Агрегат по операциям дня |

Кэш допустим только как оптимизация с явным признаком кэша. Для одного пользователя и десятков операций в месяц он не нужен.

## 5. Производные величины: точные определения

Чтобы домен и документы считали одинаково, определения фиксируются здесь.

```text
baseline(D)      = последняя из finance_baselines с effective_date <= D
target(D)        = baseline.amount + Σ план-доход [baseline.date .. D]
                                 − Σ план-расход [baseline.date .. D]
fact(D)          = baseline.amount + Σ факт-доход [baseline.date .. D]
                                 − Σ факт-расход [baseline.date .. D]
```

В суммы плана входят статусы `pending`, `due`, `overdue`, `partial`, `done`. **Исключается только `skipped`.** Причина: несостоявшийся план — это неверный эталон, и оставлять его значило бы навсегда занижать цель.

```text
remaining(plan)  = plan.amount − Σ фактов с plan_id = plan.id
```

```text
accumulated_deviation =
    Σ snapshot.deviation  для month_start >= дата последнего пересмотра
  + живое отклонение текущего месяца (если он не закрыт)
```

`fact` на конец дня `D` использует операции с `on_date <= D`. Операция, введённая задним числом, меняет прошлые значения — это ожидаемо, и именно поэтому закрытые месяцы защищены снимками.

## 6. Ограничения и триггеры

Проверка, которую нельзя выразить обычным `check`, реализуется триггером:

| Правило | Почему не `check` |
| --- | --- |
| Факт ссылается на план того же пользователя | Нужна выборка из другой строки |
| Факт нельзя связать с планом в статусе `skipped` | То же |
| Связанный план должен быть `planned` | То же |
| `updated_at` обновляется при правке | Нужен `now()` на `update` |
| Правка и удаление операции пишут ревизию | Нужна запись в другую таблицу |
| `UPDATE`/`DELETE` на ревизиях запрещены | Защита append-only |

Скелет триггера ревизий:

```sql
create function finance_log_operation_revision() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' then
    insert into finance_operation_revisions (user_id, operation_id, action, before, after)
    values (old.user_id, old.id, 'update', to_jsonb(old), to_jsonb(new));
    return new;
  else
    insert into finance_operation_revisions (user_id, operation_id, action, before)
    values (old.user_id, old.id, 'delete', to_jsonb(old));
    return old;
  end if;
end $$;

create trigger finance_operations_revision
after update or delete on finance_operations
for each row execute function finance_log_operation_revision();
```

**Проверка ссылки на план** — тот же приём: `before insert or update` читает целевую строку и поднимает исключение при нарушении. Альтернатива (составной внешний ключ с `user_id`) работает только для проверки пользователя и не проверяет статус.

**Удаление серии.** Внешний ключ `on delete set null` сохраняет факты, но оставляет планы-сироты без признака серии. Поэтому удаление серии выполняется функцией `finance_delete_series(p_series_id)`: удаляет неподтверждённые плановые вхождения с `on_date >= today`, остальным проставляет `series_id = null`. Прямой `delete` на `finance_series` из клиента не даётся.

## 7. Индексы

| Индекс | Зачем |
| --- | --- |
| `finance_operations (user_id, on_date)` | Календарь и график: выборка по диапазону дней |
| `finance_operations (user_id, category_id, on_date)` | Блок «план/факт» по категориям |
| `finance_operations (user_id, plan_id)` где `plan_id is not null` | Остаток плана и связанные факты |
| `finance_operations (user_id, status)` где `status in ('due','overdue')` | Плашка подтверждений |
| `finance_series (user_id, start_date)` | Генерация вхождений |
| `finance_baselines (user_id, effective_date desc)` | Действующая базовая линия |

Политика RLS фильтрует по `user_id`, поэтому ведущая колонка индекса — `user_id`. Иначе сама политика становится причиной медленных запросов.

## 8. Безопасность

### 8.1. RLS

Канонический шаблон на каждую таблицу раздела — тот же, что в `../solo/technical-architecture.md` §6.1:

```sql
alter table finance_operations enable row level security;

create policy "finance_operations_select_own" on finance_operations
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "finance_operations_write_own" on finance_operations
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
```

Четыре правила, которые легко забыть:

- RLS **не включается автоматически** на новых таблицах; таблица без RLS при наличии прав читается кем угодно.
- Права и политики — разные вещи: права выдаются явно и узко.
- `auth.uid()` оборачивается в `select`, чтобы вычисляться один раз на запрос.
- Секретный ключ (`service_role`) в браузер не попадает никогда.

### 8.2. Что закрыто политикой особенно тщательно

| Таблица | Почему |
| --- | --- |
| `finance_operations` | Основной массив персональных данных о деньгах |
| `finance_snapshots` | Содержит итоговые балансы |
| `finance_baselines` | Содержит фактический баланс на дату |
| `finance_operation_revisions` | Содержит прежние значения сумм |

**Проверка изоляции обязательна и должна быть первой:** тест-пользователь A не видит ни одной строки пользователя B ни при каком запросе — включая агрегаты и ревизии.

### 8.3. Персональные данные

Раздел хранит финансовые операции, суммы, категории и заметки. Данные не передаются третьим лицам, не участвуют в аналитике, не уходят в логи. Экспорт — по запросу пользователя. Удаление учётной записи удаляет данные каскадно через `on delete cascade` от `auth.users`.

## 9. Порядок применения

```text
1. finance_settings, finance_categories, seed стартовых категорий
2. finance_series, finance_operations + триггеры + индексы
3. finance_baselines, finance_snapshots
4. finance_operation_revisions + запрет правки
5. RLS-политики на все таблицы
6. Проверка изоляции двумя тест-пользователями
7. Проверка инвариантов: дубль вхождения серии, факт без плана, факт на skipped-план,
   удаление категории с операциями, второй снимок месяца
```

Каждый пункт заканчивается проверяемым результатом: схема применяется с нуля через `supabase db reset`, неверные записи отвергаются базой, а не приложением.
