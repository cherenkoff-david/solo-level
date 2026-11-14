-- Профиль пользователя и схема направления «Solo» (прогрессия).
-- Схема одинакова для локальной среды и production: меняется только содержимое таблиц.
-- Источник истины о прогрессе — append-only журнал public.reward_ledger.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Общие функции
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  timezone text not null default 'Europe/Moscow',
  week_start smallint not null default 1 check (week_start between 1 and 7),
  day_start_hour smallint not null default 4 check (day_start_hour between 0 and 23),
  level_curve_version text not null default 'v1',
  current_rule_version text not null default 'v1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Настройки периода и версии правил прогрессии. Одна строка на пользователя auth.users.';
comment on column public.profiles.week_start is
  'Первый день недели: 1 = понедельник ... 7 = воскресенье. Используется для periodKey вида YYYY-Www.';
comment on column public.profiles.day_start_hour is
  'Час локального начала логического дня. По умолчанию 04:00, чтобы отметки после полуночи не рвали день.';

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- spheres
-- ---------------------------------------------------------------------------

create table public.spheres (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  color text,
  sort_order integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.spheres is
  'Сферы развития (3–5 у пользователя). Архивируются вместо удаления, чтобы история журнала не теряла контекст.';

create unique index spheres_active_name_key
  on public.spheres (user_id, lower(name))
  where archived_at is null;

create index spheres_user_sort_idx on public.spheres (user_id, sort_order);

create trigger spheres_set_updated_at
before update on public.spheres
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- goals
-- ---------------------------------------------------------------------------

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (btrim(title) <> ''),
  goal_type text not null check (goal_type in ('outcome', 'practice', 'project')),
  indicator_label text,
  indicator_unit text,
  indicator_target numeric,
  indicator_current numeric not null default 0,
  status text not null default 'active'
    check (status in ('active', 'done', 'paused', 'archived')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (indicator_target is null and indicator_label is null and indicator_unit is null)
    or (indicator_target is not null and indicator_target > 0 and indicator_label is not null)
  )
);

comment on table public.goals is
  'Цели: результат, практика или проект. Цель — контекст, а не источник XP; один активный числовой индикатор на цель.';

create index goals_user_status_idx on public.goals (user_id, status);

create trigger goals_set_updated_at
before update on public.goals
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- milestones
-- ---------------------------------------------------------------------------

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  goal_id uuid references public.goals (id) on delete cascade,
  title text not null check (btrim(title) <> ''),
  effort smallint not null check (effort between 3 and 5),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.milestones is
  'Веха — контейнер задач и привычек. Закрытие вехи даёт разовую надбавку 25% от XP вложенных действий (15…300 XP).';

create index milestones_user_goal_idx on public.milestones (user_id, goal_id);

create trigger milestones_set_updated_at
before update on public.milestones
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- habits
-- ---------------------------------------------------------------------------

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (btrim(title) <> ''),
  sphere_id uuid references public.spheres (id) on delete set null,
  goal_id uuid references public.goals (id) on delete set null,
  milestone_id uuid references public.milestones (id) on delete set null,
  effort smallint not null check (effort between 1 and 5),
  schedule_kind text not null
    check (schedule_kind in ('daily', 'weekdays', 'weekly_count', 'monthly_count')),
  schedule_weekdays smallint[],
  schedule_count smallint,
  starts_on date not null default current_date,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    schedule_weekdays is null
    or schedule_weekdays <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]
  ),
  check (
    (schedule_kind = 'daily'
      and schedule_weekdays is null
      and schedule_count is null)
    or (schedule_kind = 'weekdays'
      and schedule_weekdays is not null
      and cardinality(schedule_weekdays) between 1 and 6
      and schedule_count is null)
    or (schedule_kind = 'weekly_count'
      and schedule_weekdays is null
      and schedule_count is not null
      and schedule_count between 1 and 7)
    or (schedule_kind = 'monthly_count'
      and schedule_weekdays is null
      and schedule_count is not null
      and schedule_count between 1 and 31)
  )
);

comment on table public.habits is
  'Привычка и её расписание. schedule_kind определяет periodKey: день, неделя или месяц.';
comment on column public.habits.starts_on is
  'Дата начала: до неё ожидаемые периоды не считаются, ритм не наказывает за ранний старт.';

create index habits_user_active_idx
  on public.habits (user_id, archived_at);

create trigger habits_set_updated_at
before update on public.habits
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (btrim(title) <> ''),
  sphere_id uuid references public.spheres (id) on delete set null,
  goal_id uuid references public.goals (id) on delete set null,
  milestone_id uuid references public.milestones (id) on delete set null,
  effort smallint not null check (effort between 1 and 5),
  status text not null default 'open'
    check (status in ('open', 'done', 'skipped', 'archived')),
  due_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.tasks is
  'Разовая задача. Даёт базовый XP один раз; повторное выполнение моделируется привычкой.';

create index tasks_user_status_idx on public.tasks (user_id, status, due_date);

create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- completions
-- ---------------------------------------------------------------------------

create table public.completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_type text not null check (source_type in ('task', 'habit', 'milestone')),
  source_id uuid not null,
  period_key text not null,
  occurred_at timestamptz not null default now(),
  note text,
  volume numeric,
  created_at timestamptz not null default now()
);

comment on table public.completions is
  'Факт выполнения. source_id полиморфный: указывает на tasks, habits или milestones в зависимости от source_type; обычный FK поставить нельзя.';
comment on column public.completions.period_key is
  'Период в момент подтверждения. Хранится, а не пересчитывается при чтении: смена часового пояса не переписывает историю.';

create index completions_user_time_idx
  on public.completions (user_id, occurred_at desc);
create index completions_user_source_idx
  on public.completions (user_id, source_type, source_id);

-- ---------------------------------------------------------------------------
-- reward_ledger
-- ---------------------------------------------------------------------------

create table public.reward_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  occurred_at timestamptz not null default now(),
  source_type text not null check (source_type in ('task', 'habit', 'milestone')),
  source_id uuid not null,
  event_type text not null
    check (event_type in ('base_xp', 'rhythm_bonus', 'first_step', 'milestone_bonus', 'reversal')),
  period_key text not null,
  sphere_id uuid references public.spheres (id) on delete set null,
  base_xp integer not null default 0 check (base_xp >= 0),
  bonus_xp integer not null default 0 check (bonus_xp >= 0),
  total_xp integer not null,
  rule_version text not null,
  reverses_id uuid references public.reward_ledger (id) on delete restrict,
  idempotency_key text generated always as (
    source_type || ':' || source_id::text || ':' || period_key || ':' || event_type
  ) stored,
  created_at timestamptz not null default now(),
  check (
    (event_type = 'reversal' and total_xp <= 0)
    or (event_type <> 'reversal' and total_xp >= 0 and total_xp = base_xp + bonus_xp)
  ),
  check (
    (event_type = 'reversal' and reverses_id is not null)
    or (event_type <> 'reversal' and reverses_id is null)
  )
);

comment on table public.reward_ledger is
  'Единственный источник истины о прогрессе. Append-only: UPDATE и DELETE запрещены триггером; отмена — новая строка с отрицательным total_xp и reverses_id.';
comment on column public.reward_ledger.idempotency_key is
  'Детерминированный ключ sourceType:sourceId:periodKey:eventType. Уникальность обеспечивает составной индекс ниже.';

create unique index reward_ledger_reward_key
  on public.reward_ledger (user_id, source_type, source_id, period_key, event_type);
create unique index reward_ledger_one_reversal
  on public.reward_ledger (reverses_id)
  where reverses_id is not null;
create index reward_ledger_user_time_idx
  on public.reward_ledger (user_id, occurred_at desc);
create index reward_ledger_user_sphere_idx
  on public.reward_ledger (user_id, sphere_id);

create or replace function public.reward_ledger_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception 'reward_ledger append-only: операция % запрещена', tg_op;
end;
$$;

create trigger reward_ledger_append_only
before update or delete on public.reward_ledger
for each row execute function public.reward_ledger_append_only();

-- ---------------------------------------------------------------------------
-- daily_checkins
-- ---------------------------------------------------------------------------

create table public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  local_date date not null,
  state text not null check (state in ('useful', 'neutral', 'distracting')),
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, local_date)
);

comment on table public.daily_checkins is
  'Необязательная дневная отметка самонаблюдения. Не влияет на прогрессию и награды.';

-- ---------------------------------------------------------------------------
-- RLS и права
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.spheres enable row level security;
alter table public.goals enable row level security;
alter table public.milestones enable row level security;
alter table public.habits enable row level security;
alter table public.tasks enable row level security;
alter table public.completions enable row level security;
alter table public.reward_ledger enable row level security;
alter table public.daily_checkins enable row level security;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy spheres_select_own on public.spheres
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy spheres_write_own on public.spheres
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy goals_select_own on public.goals
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy goals_write_own on public.goals
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy milestones_select_own on public.milestones
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy milestones_write_own on public.milestones
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy habits_select_own on public.habits
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy habits_write_own on public.habits
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy tasks_select_own on public.tasks
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy tasks_write_own on public.tasks
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy completions_select_own on public.completions
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy completions_insert_own on public.completions
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy reward_ledger_select_own on public.reward_ledger
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy daily_checkins_select_own on public.daily_checkins
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy daily_checkins_write_own on public.daily_checkins
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.spheres to authenticated;
grant select, insert, update, delete on public.goals to authenticated;
grant select, insert, update, delete on public.milestones to authenticated;
grant select, insert, update, delete on public.habits to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert on public.completions to authenticated;
grant select on public.reward_ledger to authenticated;
grant select, insert, update, delete on public.daily_checkins to authenticated;

grant all on public.profiles to service_role;
grant all on public.spheres to service_role;
grant all on public.goals to service_role;
grant all on public.milestones to service_role;
grant all on public.habits to service_role;
grant all on public.tasks to service_role;
grant all on public.completions to service_role;
grant all on public.reward_ledger to service_role;
grant all on public.daily_checkins to service_role;
