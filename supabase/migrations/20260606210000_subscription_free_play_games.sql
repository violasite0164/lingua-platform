-- 訂閱方案：訂閱期內遊戲 FREE PLAY（不扣體力）

alter table public.subscription_plans
  add column if not exists free_play_games boolean not null default false;

comment on column public.subscription_plans.free_play_games is
  '有效訂閱期內，會員遊玩遊戲不扣體力（顯示 FREE PLAY）';

create or replace function public.user_has_subscription_free_play()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_subscriptions us
    inner join public.subscription_plans sp on sp.code = us.plan_code
    where us.user_id = auth.uid()
      and us.status in ('active', 'trialing')
      and sp.is_active = true
      and sp.free_play_games = true
  );
$$;

grant execute on function public.user_has_subscription_free_play() to authenticated;

-- ─── get_game_stamina：回傳 freePlay ───────────────────────────────────────

create or replace function public.get_game_stamina()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_free_play boolean;
  v_stamina smallint;
  v_anchor timestamptz;
  v_applied_stamina smallint;
  v_applied_anchor timestamptz;
  v_now timestamptz := now();
  v_max constant smallint := 10;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'message', '請先登入');
  end if;

  select role into v_role from public.profiles where id = v_uid;
  v_free_play := v_role = 'admin' or public.user_has_subscription_free_play();

  insert into public.user_game_stamina (user_id)
  values (v_uid)
  on conflict (user_id) do nothing;

  select s.stamina, s.stamina_anchor
  into v_stamina, v_anchor
  from public.user_game_stamina s
  where s.user_id = v_uid
  for update;

  select r.out_stamina, r.out_anchor
  into v_applied_stamina, v_applied_anchor
  from public.apply_game_stamina_regen(v_stamina, v_anchor, v_now) r;

  if v_applied_stamina is distinct from v_stamina
     or v_applied_anchor is distinct from v_anchor then
    update public.user_game_stamina
    set
      stamina = v_applied_stamina,
      stamina_anchor = v_applied_anchor,
      updated_at = v_now
    where user_id = v_uid;
  end if;

  return jsonb_build_object(
    'ok', true,
    'stamina', v_applied_stamina,
    'max', v_max,
    'isAdmin', v_role = 'admin',
    'freePlay', v_free_play,
    'nextRegenAt',
      case
        when v_free_play or v_applied_stamina >= v_max then null
        else (v_applied_anchor + interval '1 hour')::timestamptz
      end
  );
end;
$$;

-- ─── spend_game_stamina：訂閱 FREE PLAY 不扣體力 ───────────────────────────

create or replace function public.spend_game_stamina(p_amount smallint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_free_play boolean;
  v_stamina smallint;
  v_anchor timestamptz;
  v_applied_stamina smallint;
  v_applied_anchor timestamptz;
  v_now timestamptz := now();
  v_max constant smallint := 10;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'message', '請先登入');
  end if;

  if p_amount is null or p_amount < 1 or p_amount > v_max then
    return jsonb_build_object('ok', false, 'message', '無效的體力消耗');
  end if;

  select role into v_role from public.profiles where id = v_uid;
  v_free_play := v_role = 'admin' or public.user_has_subscription_free_play();

  insert into public.user_game_stamina (user_id)
  values (v_uid)
  on conflict (user_id) do nothing;

  select s.stamina, s.stamina_anchor
  into v_stamina, v_anchor
  from public.user_game_stamina s
  where s.user_id = v_uid
  for update;

  select r.out_stamina, r.out_anchor
  into v_applied_stamina, v_applied_anchor
  from public.apply_game_stamina_regen(v_stamina, v_anchor, v_now) r;

  if v_free_play then
    if v_applied_stamina is distinct from v_stamina
       or v_applied_anchor is distinct from v_anchor then
      update public.user_game_stamina
      set stamina = v_applied_stamina, stamina_anchor = v_applied_anchor, updated_at = v_now
      where user_id = v_uid;
    end if;

    return jsonb_build_object(
      'ok', true,
      'spent', 0,
      'stamina', v_applied_stamina,
      'max', v_max,
      'isAdmin', v_role = 'admin',
      'freePlay', true,
      'nextRegenAt', null
    );
  end if;

  if v_applied_stamina < p_amount then
    return jsonb_build_object(
      'ok', false,
      'message', '體力不足',
      'stamina', v_applied_stamina,
      'max', v_max,
      'freePlay', false,
      'nextRegenAt', (v_applied_anchor + interval '1 hour')::timestamptz
    );
  end if;

  v_applied_stamina := v_applied_stamina - p_amount;

  if v_applied_stamina < v_max then
    v_applied_anchor := v_now;
  end if;

  update public.user_game_stamina
  set
    stamina = v_applied_stamina,
    stamina_anchor = v_applied_anchor,
    updated_at = v_now
  where user_id = v_uid;

  return jsonb_build_object(
    'ok', true,
    'spent', p_amount,
    'stamina', v_applied_stamina,
    'max', v_max,
    'isAdmin', false,
    'freePlay', false,
    'nextRegenAt',
      case
        when v_applied_stamina >= v_max then null
        else (v_applied_anchor + interval '1 hour')::timestamptz
      end
  );
end;
$$;

-- ─── begin_game_play_session：記錄實際扣除體力 ─────────────────────────────

create or replace function public.begin_game_play_session(
  p_difficulty text,
  p_charge_kind text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_cost smallint;
  v_spend jsonb;
  v_actual_spent smallint := 0;
  v_session_id uuid;
  v_grant_id uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'message', '請先登入');
  end if;

  if p_difficulty not in ('elementary', 'junior', 'college', 'professor') then
    return jsonb_build_object('ok', false, 'message', '難度參數無效');
  end if;

  if p_charge_kind not in ('none', 'start', 'retry', 'continue') then
    return jsonb_build_object('ok', false, 'message', '無效的開局類型');
  end if;

  v_cost := public.game_play_stamina_cost(p_charge_kind);

  if p_charge_kind = 'none' then
    select g.id
    into v_grant_id
    from public.game_play_advance_grants g
    where g.user_id = v_uid
      and g.target_difficulty = p_difficulty
      and g.used_at is null
      and g.expires_at > now()
    order by g.created_at desc
    limit 1
    for update;

    if v_grant_id is null then
      return jsonb_build_object(
        'ok', false,
        'message', '沒有可用的通關晉級憑證，請先完成上一關或重新開始（需扣體力）'
      );
    end if;

    update public.game_play_advance_grants
    set used_at = now()
    where id = v_grant_id;
  elsif v_cost > 0 then
    v_spend := public.spend_game_stamina(v_cost);
    if (v_spend->>'ok')::boolean is distinct from true then
      return v_spend;
    end if;
    v_actual_spent := coalesce((v_spend->>'spent')::int, 0);
  end if;

  insert into public.game_play_sessions (
    user_id,
    difficulty,
    charge_kind,
    stamina_spent,
    expires_at
  )
  values (
    v_uid,
    p_difficulty,
    p_charge_kind,
    v_actual_spent,
    now() + interval '4 hours'
  )
  returning id into v_session_id;

  return jsonb_build_object(
    'ok', true,
    'sessionId', v_session_id,
    'expiresAt', (now() + interval '4 hours')::timestamptz
  );
end;
$$;
