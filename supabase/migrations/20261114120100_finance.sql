-- Схема направления «Финансы».
-- Хранится только история и точки отсчёта; балансы, отклонения и остатки считаются доменным пакетом @solo/finance.
-- Схема одинакова для локальной среды и production.

-- ---------------------------------------------------------------------------
-- finance_settings
-- ---------------------------------------------------------------------------

create table public.finance_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  hide_deviation boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.finance_settings is
  'Настройки раздела «Финансы»: одна строка на пользователя. Часовой пояс берётся из profiles, а не дублируется здесь.';

create trigger finance_settings_set_updated_at
before update on public.finance_settings
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- finance_categories
-- ---------------------------------------------------------------------------

create table public.finance_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  kind text not null check (kind in ('income', 'expense')),
  is_essential boolean not null default false,
  color text,
  icon text,
  sort_order integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.finance_categories is
  'Плоский справочник категорий. Направление дохода/расхода хранится только здесь; операции его не дублируют.';

create unique index finance_categories_active_name_key
  on public.finance_categories (user_id, kind, lower(name))
  where archived_at is null;

create index finance_categories_user_sort_idx
  on public.finance_categories (user_id, sort_order);

create trigger finance_categories_set_updated_at
before update on public.finance_categories
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- finance_series
-- ---------------------------------------------------------------------------

create table public.finance_series (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (btrim(title) <> ''),
  category_id uuid not null references public.finance_categories (id) on delete restrict,
  amount_minor bigint not null check (amount_minor > 0),
  recurrence text not null check (recurrence in ('daily', 'weekly', 'monthly')),
  start_date date not null,
  day_of_month smallint check (day_of_month between 1 and 31),
  weekday smallint check (weekday between 1 and 7),
  occurrences_count integer check (occurrences_count > 0),
  ends_on date,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((occurrences_count is null) <> (ends_on is null)),
  check (
    (recurrence = 'daily' and day_of_month is null and weekday is null)
    or (recurrence = 'weekly' and day_of_month is null and weekday is not null)
    or (recurrence = 'monthly' and day_of_month is not null and weekday is null)
  )
);

comment on table public.finance_series is
  'Правило повторов с обязательной конечной границей: либо количество вхождений, либо дата окончания.';
comment on column public.finance_series.day_of_month is
  'Для monthly; 29–31 в коротком месяце прижимается к последнему дню доменом.';

create index finance_series_user_start_idx on public.finance_series (user_id, start_date);

create trigger finance_series_set_updated_at
before update on public.finance_series
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- finance_operations
-- ---------------------------------------------------------------------------

create table public.finance_operations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_type text not null check (entry_type in ('planned', 'actual')),
  status text not null,
  category_id uuid not null references public.finance_categories (id) on delete restrict,
  on_date date not null,
  amount_minor bigint not null check (amount_minor > 0),
  plan_id uuid references public.finance_operations (id) on delete set null,
  series_id uuid references public.finance_series (id) on delete set null,
  series_occurrence_date date,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (entry_type = 'actual' and status = 'actual')
    or (entry_type = 'planned'
      and status in ('pending', 'due', 'overdue', 'partial', 'done', 'skipped'))
  ),
  check (entry_type = 'actual' or plan_id is null),
  check (
    (series_id is null and series_occurrence_date is null)
    or (series_id is not null and series_occurrence_date is not null)
  )
);

comment on table public.finance_operations is
  'Планы и факты. План и факт — разные строки; факт ссылается на план через plan_id. Сумма всегда положительна, знак задаёт категория.';
comment on column public.finance_operations.status is
  'План: pending, due, overdue, partial, done, skipped. Факт: actual.';

create unique index finance_operations_series_occurrence_key
  on public.finance_operations (series_id, series_occurrence_date, entry_type)
  where series_id is not null;

create index finance_operations_user_date_idx
  on public.finance_operations (user_id, on_date);
create index finance_operations_user_category_date_idx
  on public.finance_operations (user_id, category_id, on_date);
create index finance_operations_user_plan_idx
  on public.finance_operations (user_id, plan_id)
  where plan_id is not null;
create index finance_operations_user_due_idx
  on public.finance_operations (user_id, status)
  where status in ('due', 'overdue');

create trigger finance_operations_set_updated_at
before update on public.finance_operations
for each row execute function public.set_updated_at();

create or replace function public.finance_validate_plan_link()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_plan public.finance_operations%rowtype;
begin
  if new.plan_id is null then
    return new;
  end if;

  select * into target_plan
  from public.finance_operations
  where id = new.plan_id;

  if not found then
    raise exception 'План % не найден', new.plan_id;
  end if;

  if target_plan.user_id <> new.user_id then
    raise exception 'Факт и план принадлежат разным пользователям';
  end if;

  if target_plan.entry_type <> 'planned' then
    raise exception 'Ссылка plan_id должна указывать на плановую операцию';
  end if;

  if target_plan.status = 'skipped' then
    raise exception 'Нельзя привязать факт к пропущенному плану';
  end if;

  return new;
end;
$$;

create trigger finance_operations_validate_plan
before insert or update of plan_id on public.finance_operations
for each row execute function public.finance_validate_plan_link();

-- ---------------------------------------------------------------------------
-- finance_baselines
-- ---------------------------------------------------------------------------

create table public.finance_baselines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  effective_date date not null,
  amount_minor bigint not null,
  reason text not null check (reason in ('start', 'accept_reality')),
  created_at timestamptz not null default now()
);

comment on table public.finance_baselines is
  'Точки отсчёта: стартовая сумма и «принять реальность». Удаление запрещено; ошибка исправляется новой линией с более поздней датой.';

create unique index finance_baselines_user_date_key
  on public.finance_baselines (user_id, effective_date);
create index finance_baselines_user_date_desc_idx
  on public.finance_baselines (user_id, effective_date desc);

create or replace function public.finance_baselines_guard()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('postgres', 'supabase_admin') then
    return old;
  end if;
  raise exception 'finance_baselines неизменяемы: операция % запрещена', tg_op;
end;
$$;

create trigger finance_baselines_guard
before update or delete on public.finance_baselines
for each row execute function public.finance_baselines_guard();

-- ---------------------------------------------------------------------------
-- finance_snapshots
-- ---------------------------------------------------------------------------

create table public.finance_snapshots (
  user_id uuid not null references auth.users (id) on delete cascade,
  month_start date not null check (extract(day from month_start) = 1),
  target_minor bigint not null,
  fact_minor bigint not null,
  deviation_minor bigint generated always as (fact_minor - target_minor) stored,
  closed_at timestamptz not null default now(),
  close_mode text not null check (close_mode in ('auto', 'manual')),
  primary key (user_id, month_start)
);

comment on table public.finance_snapshots is
  'Замороженный итог закрытого месяца. Месяц закрывается один раз; снимок не пересчитывается.';

create or replace function public.finance_snapshots_guard()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('postgres', 'supabase_admin') then
    return old;
  end if;
  raise exception 'finance_snapshots неизменяемы: операция % запрещена', tg_op;
end;
$$;

create trigger finance_snapshots_guard
before update or delete on public.finance_snapshots
for each row execute function public.finance_snapshots_guard();

-- ---------------------------------------------------------------------------
-- finance_operation_revisions
-- ---------------------------------------------------------------------------

create table public.finance_operation_revisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  operation_id uuid not null,
  action text not null check (action in ('update', 'delete')),
  before jsonb not null,
  after jsonb,
  changed_at timestamptz not null default now()
);

comment on table public.finance_operation_revisions is
  'Append-only журнал правок операций. operation_id без FK: ревизия должна пережить удаление операции.';

create index finance_operation_revisions_user_time_idx
  on public.finance_operation_revisions (user_id, changed_at desc);
create index finance_operation_revisions_operation_idx
  on public.finance_operation_revisions (operation_id);

create or replace function public.finance_log_operation_revision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    insert into public.finance_operation_revisions (user_id, operation_id, action, before, after)
    values (old.user_id, old.id, 'update', to_jsonb(old), to_jsonb(new));
    return new;
  end if;

  insert into public.finance_operation_revisions (user_id, operation_id, action, before)
  values (old.user_id, old.id, 'delete', to_jsonb(old));
  return old;
end;
$$;

create trigger finance_operations_revision
after update or delete on public.finance_operations
for each row execute function public.finance_log_operation_revision();

create or replace function public.finance_revisions_guard()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('postgres', 'supabase_admin') then
    return old;
  end if;
  raise exception 'finance_operation_revisions append-only: операция % запрещена', tg_op;
end;
$$;

create trigger finance_revisions_guard
before update or delete on public.finance_operation_revisions
for each row execute function public.finance_revisions_guard();

-- ---------------------------------------------------------------------------
-- Функции записи
-- ---------------------------------------------------------------------------

create or replace function public.finance_confirm_plan(
  p_plan_id uuid,
  p_fact_id uuid,
  p_amount_minor bigint,
  p_on_date date,
  p_keep_open boolean,
  p_note text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan public.finance_operations%rowtype;
  v_paid bigint;
  v_status text;
begin
  if v_user_id is null then
    raise exception 'Требуется аутентификация';
  end if;

  select * into v_plan
  from public.finance_operations
  where id = p_plan_id and user_id = v_user_id
  for update;

  if not found then
    raise exception 'План не найден';
  end if;

  if v_plan.entry_type <> 'planned' then
    raise exception 'Подтвердить можно только плановую операцию';
  end if;

  if v_plan.status in ('done', 'skipped') then
    raise exception 'План уже закрыт или пропущен';
  end if;

  if p_amount_minor <= 0 then
    raise exception 'Сумма должна быть больше нуля';
  end if;

  insert into public.finance_operations (
    id, user_id, entry_type, status, category_id, on_date, amount_minor,
    plan_id, series_id, series_occurrence_date, note
  )
  values (
    p_fact_id, v_user_id, 'actual', 'actual', v_plan.category_id, p_on_date,
    p_amount_minor, v_plan.id, v_plan.series_id, v_plan.series_occurrence_date, p_note
  );

  select coalesce(sum(amount_minor), 0) into v_paid
  from public.finance_operations
  where plan_id = v_plan.id
    and entry_type = 'actual'
    and user_id = v_user_id;

  v_status := case
    when p_keep_open and v_plan.amount_minor - v_paid > 0 then 'partial'
    else 'done'
  end;

  update public.finance_operations
  set status = v_status
  where id = v_plan.id;

  return p_fact_id;
end;
$$;

create or replace function public.finance_delete_series(p_series_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Требуется аутентификация';
  end if;

  delete from public.finance_operations
  where user_id = v_user_id
    and series_id = p_series_id
    and entry_type = 'planned'
    and status not in ('done', 'skipped')
    and on_date >= current_date;

  update public.finance_operations
  set series_id = null,
      series_occurrence_date = null
  where user_id = v_user_id
    and series_id = p_series_id;

  delete from public.finance_series
  where id = p_series_id
    and user_id = v_user_id;
end;
$$;

create or replace function public.finance_close_month(
  p_month_start date,
  p_close_mode text default 'auto'
)
returns public.finance_snapshots
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_month_start date := date_trunc('month', p_month_start)::date;
  v_month_end date := (date_trunc('month', p_month_start) + interval '1 month - 1 day')::date;
  v_baseline public.finance_baselines%rowtype;
  v_target bigint;
  v_fact bigint;
  v_row public.finance_snapshots%rowtype;
begin
  if v_user_id is null then
    raise exception 'Требуется аутентификация';
  end if;

  if p_close_mode not in ('auto', 'manual') then
    raise exception 'close_mode должен быть auto или manual';
  end if;

  select * into v_baseline
  from public.finance_baselines
  where user_id = v_user_id
    and effective_date <= v_month_end
  order by effective_date desc
  limit 1;

  if not found then
    raise exception 'Нет базовой линии на %', v_month_end;
  end if;

  select v_baseline.amount_minor + coalesce(sum(
    case when c.kind = 'income' then o.amount_minor else -o.amount_minor end
  ), 0)
  into v_target
  from public.finance_operations o
  join public.finance_categories c on c.id = o.category_id
  where o.user_id = v_user_id
    and o.entry_type = 'planned'
    and o.status <> 'skipped'
    and o.on_date between v_baseline.effective_date and v_month_end;

  select v_baseline.amount_minor + coalesce(sum(
    case when c.kind = 'income' then o.amount_minor else -o.amount_minor end
  ), 0)
  into v_fact
  from public.finance_operations o
  join public.finance_categories c on c.id = o.category_id
  where o.user_id = v_user_id
    and o.entry_type = 'actual'
    and o.on_date between v_baseline.effective_date and v_month_end;

  insert into public.finance_snapshots (user_id, month_start, target_minor, fact_minor, close_mode)
  values (v_user_id, v_month_start, v_target, v_fact, p_close_mode)
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.finance_reset()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Требуется аутентификация';
  end if;

  delete from public.finance_operations where user_id = v_user_id;
  delete from public.finance_series where user_id = v_user_id;
  delete from public.finance_snapshots where user_id = v_user_id;
  delete from public.finance_baselines where user_id = v_user_id;
  delete from public.finance_categories where user_id = v_user_id;
  delete from public.finance_settings where user_id = v_user_id;
  delete from public.finance_operation_revisions where user_id = v_user_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS и права
-- ---------------------------------------------------------------------------

alter table public.finance_settings enable row level security;
alter table public.finance_categories enable row level security;
alter table public.finance_series enable row level security;
alter table public.finance_operations enable row level security;
alter table public.finance_baselines enable row level security;
alter table public.finance_snapshots enable row level security;
alter table public.finance_operation_revisions enable row level security;

create policy finance_settings_select_own on public.finance_settings
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy finance_settings_write_own on public.finance_settings
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy finance_categories_select_own on public.finance_categories
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy finance_categories_write_own on public.finance_categories
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy finance_series_select_own on public.finance_series
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy finance_series_write_own on public.finance_series
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy finance_operations_select_own on public.finance_operations
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy finance_operations_write_own on public.finance_operations
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy finance_baselines_select_own on public.finance_baselines
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy finance_baselines_insert_own on public.finance_baselines
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy finance_snapshots_select_own on public.finance_snapshots
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy finance_snapshots_insert_own on public.finance_snapshots
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy finance_operation_revisions_select_own on public.finance_operation_revisions
  for select to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.finance_settings to authenticated;
grant select, insert, update, delete on public.finance_categories to authenticated;
grant select, insert, update on public.finance_series to authenticated;
grant select, insert, update, delete on public.finance_operations to authenticated;
grant select, insert on public.finance_baselines to authenticated;
grant select, insert on public.finance_snapshots to authenticated;
grant select on public.finance_operation_revisions to authenticated;

grant execute on function public.finance_confirm_plan(uuid, uuid, bigint, date, boolean, text) to authenticated;
grant execute on function public.finance_delete_series(uuid) to authenticated;
grant execute on function public.finance_close_month(date, text) to authenticated;
grant execute on function public.finance_reset() to authenticated;

grant all on public.finance_settings to service_role;
grant all on public.finance_categories to service_role;
grant all on public.finance_series to service_role;
grant all on public.finance_operations to service_role;
grant all on public.finance_baselines to service_role;
grant all on public.finance_snapshots to service_role;
grant all on public.finance_operation_revisions to service_role;
