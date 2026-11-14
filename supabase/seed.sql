-- Локальные данные для разработки и ручной проверки.
-- Загружается только при `supabase db reset`; в production не применяется.
--
-- Тестовый пользователь: test@solo.local / solo-test-password
-- Локальная почта перехватывается Mailpit: http://127.0.0.1:54324

do $$
declare
  v_user uuid := '11111111-1111-1111-1111-111111111111';
  v_month_start date := date_trunc('month', current_date)::date;
  v_sphere uuid;
  v_rent uuid;
  v_salary uuid;
  v_food uuid;
  v_cafe uuid;
  v_credit uuid;
  v_phone uuid;
begin
  if exists (select 1 from auth.users where id = v_user) then
    return;
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    v_user,
    'authenticated',
    'authenticated',
    'test@solo.local',
    extensions.crypt('solo-test-password', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Локальный тест"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  )
  values (
    gen_random_uuid(),
    v_user,
    v_user::text,
    jsonb_build_object('sub', v_user::text, 'email', 'test@solo.local'),
    'email',
    now(),
    now(),
    now()
  );

  insert into public.spheres (user_id, name, color, sort_order)
  values
    (v_user, 'Здоровье', 'green', 0),
    (v_user, 'Разум', 'violet', 1),
    (v_user, 'Ремесло', 'amber', 2);

  select id into v_sphere from public.spheres where user_id = v_user and name = 'Здоровье';

  insert into public.habits (
    user_id, title, sphere_id, effort, schedule_kind, starts_on
  )
  values (
    v_user, 'Выпить стакан воды', v_sphere, 1, 'daily', current_date
  );

  insert into public.finance_settings (user_id, hide_deviation)
  values (v_user, false)
  on conflict (user_id) do nothing;

  insert into public.finance_categories (user_id, name, kind, is_essential, icon, sort_order)
  values
    (v_user, 'Зарплата', 'income', false, 'З', 0),
    (v_user, 'Аванс', 'income', false, 'А', 1),
    (v_user, 'Другие поступления', 'income', false, 'Д', 2),
    (v_user, 'Аренда', 'expense', true, 'А', 3),
    (v_user, 'Кредит', 'expense', true, 'К', 4),
    (v_user, 'Продукты', 'expense', true, 'П', 5),
    (v_user, 'Транспорт', 'expense', true, 'Т', 6),
    (v_user, 'Связь', 'expense', true, 'С', 7),
    (v_user, 'Кафе', 'expense', false, 'К', 8),
    (v_user, 'Развлечения', 'expense', false, 'Р', 9),
    (v_user, 'Одежда', 'expense', false, 'О', 10),
    (v_user, 'Прочее', 'expense', false, 'П', 11);

  select id into v_rent from public.finance_categories where user_id = v_user and name = 'Аренда';
  select id into v_salary from public.finance_categories where user_id = v_user and name = 'Зарплата';
  select id into v_food from public.finance_categories where user_id = v_user and name = 'Продукты';
  select id into v_cafe from public.finance_categories where user_id = v_user and name = 'Кафе';
  select id into v_credit from public.finance_categories where user_id = v_user and name = 'Кредит';
  select id into v_phone from public.finance_categories where user_id = v_user and name = 'Связь';

  insert into public.finance_baselines (user_id, effective_date, amount_minor, reason)
  values (v_user, v_month_start, 4500000, 'start');

  insert into public.finance_operations (
    user_id, entry_type, status, category_id, on_date, amount_minor, note
  )
  values
    (v_user, 'planned', 'pending', v_rent, v_month_start + 4, 3500000, 'Аренда'),
    (v_user, 'planned', 'pending', v_salary, v_month_start + 9, 12000000, 'Зарплата'),
    (v_user, 'actual', 'actual', v_food, v_month_start + 3, 650000, 'Продукты'),
    (v_user, 'actual', 'actual', v_cafe, v_month_start + 5, 180000, 'Кафе'),
    (v_user, 'planned', 'pending', v_food, current_date + 5, 700000, 'Продукты'),
    (v_user, 'planned', 'pending', v_credit, v_month_start + 19, 1500000, 'Платёж по кредиту'),
    (v_user, 'planned', 'pending', v_phone, current_date - 1, 60000, 'Связь');
end $$;
