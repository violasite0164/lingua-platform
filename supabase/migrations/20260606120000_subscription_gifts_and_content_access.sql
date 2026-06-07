-- 訂閱方案贈送商品、課程／單元／測驗的訂閱免費觀看設定

-- ── 方案贈送商店商品 ─────────────────────────────────────
create table if not exists public.subscription_plan_gifts (
  plan_code text not null references public.subscription_plans(code) on delete cascade,
  shop_item_id uuid not null references public.shop_items(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (plan_code, shop_item_id)
);

comment on table public.subscription_plan_gifts is '訂閱啟用後贈送的商店商品（如體力包）';

alter table public.subscription_plan_gifts enable row level security;

drop policy if exists subscription_plan_gifts_public_read on public.subscription_plan_gifts;
create policy subscription_plan_gifts_public_read
  on public.subscription_plan_gifts
  for select
  using (true);

-- 贈送紀錄（避免同一 Stripe 訂閱重複發放）
create table if not exists public.subscription_gift_deliveries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_code text not null,
  shop_item_id uuid not null references public.shop_items(id) on delete cascade,
  stripe_subscription_id text not null,
  delivered_at timestamptz not null default now(),
  unique (user_id, plan_code, shop_item_id, stripe_subscription_id)
);

alter table public.subscription_gift_deliveries enable row level security;

-- ── 課程／單元／測驗：訂閱者可免費觀看 ───────────────────
alter table public.courses
  add column if not exists sub_basic_free boolean not null default false,
  add column if not exists sub_pro_free boolean not null default false;

comment on column public.courses.sub_basic_free is '持有有效基本訂閱者可免費觀看本課程影片';
comment on column public.courses.sub_pro_free is '持有有效進階訂閱者可免費觀看本課程影片';

alter table public.lessons
  add column if not exists sub_basic_free boolean,
  add column if not exists sub_pro_free boolean;

comment on column public.lessons.sub_basic_free is 'null=沿用課程設定；true/false=覆寫此單元';
comment on column public.lessons.sub_pro_free is 'null=沿用課程設定；true/false=覆寫此單元';

alter table public.course_quizzes
  add column if not exists sub_basic_free boolean,
  add column if not exists sub_pro_free boolean;

comment on column public.course_quizzes.sub_basic_free is 'null=沿用課程設定；測驗影片訂閱存取';
comment on column public.course_quizzes.sub_pro_free is 'null=沿用課程設定；測驗影片訂閱存取';

-- ── 訂閱層級（RLS 用）────────────────────────────────────
create or replace function public.user_subscription_tier_rank()
returns smallint
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (
      select 1 from public.user_subscriptions us
      where us.user_id = auth.uid()
        and us.plan_code = 'pro'
        and us.status in ('active', 'trialing')
    ) then 2::smallint
    when exists (
      select 1 from public.user_subscriptions us
      where us.user_id = auth.uid()
        and us.plan_code = 'basic'
        and us.status in ('active', 'trialing')
    ) then 1::smallint
    else 0::smallint
  end;
$$;

grant execute on function public.user_subscription_tier_rank() to authenticated;

create or replace function public.can_watch_lesson_via_subscription(p_lesson_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_rank smallint;
  v_basic boolean;
  v_pro boolean;
begin
  if auth.uid() is null then
    return false;
  end if;

  v_rank := public.user_subscription_tier_rank();
  if v_rank = 0 then
    return false;
  end if;

  select
    coalesce(l.sub_basic_free, c.sub_basic_free),
    coalesce(l.sub_pro_free, c.sub_pro_free)
  into v_basic, v_pro
  from public.lessons l
  join public.courses c on c.id = l.course_id
  where l.id = p_lesson_id;

  if not found then
    return false;
  end if;

  if v_rank >= 2 and v_pro then
    return true;
  end if;
  if v_rank >= 1 and v_basic then
    return true;
  end if;

  return false;
end;
$$;

grant execute on function public.can_watch_lesson_via_subscription(uuid) to authenticated;

create or replace function public.can_watch_quiz_via_subscription(p_quiz_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_rank smallint;
  v_basic boolean;
  v_pro boolean;
begin
  if auth.uid() is null then
    return false;
  end if;

  v_rank := public.user_subscription_tier_rank();
  if v_rank = 0 then
    return false;
  end if;

  select
    coalesce(q.sub_basic_free, c.sub_basic_free),
    coalesce(q.sub_pro_free, c.sub_pro_free)
  into v_basic, v_pro
  from public.course_quizzes q
  join public.courses c on c.id = q.course_id
  where q.id = p_quiz_id;

  if not found then
    return false;
  end if;

  if v_rank >= 2 and v_pro then
    return true;
  end if;
  if v_rank >= 1 and v_basic then
    return true;
  end if;

  return false;
end;
$$;

grant execute on function public.can_watch_quiz_via_subscription(uuid) to authenticated;

-- lessons：訂閱者可讀標記為免費的單元
drop policy if exists lessons_select_subscription on public.lessons;
create policy lessons_select_subscription
  on public.lessons
  for select
  using (public.can_watch_lesson_via_subscription(id));

-- 課本：訂閱存取
drop policy if exists lesson_textbooks_select_student on public.lesson_textbooks;
create policy lesson_textbooks_select_student
  on public.lesson_textbooks
  for select
  using (
    exists (
      select 1
      from public.lessons l
      where l.id = lesson_textbooks.lesson_id
        and (
          l.is_preview = true
          or public.is_enrolled(l.course_id)
          or public.can_watch_lesson_via_subscription(l.id)
        )
    )
  );

-- 測驗：訂閱存取（已發布）
drop policy if exists course_quizzes_select_subscription on public.course_quizzes;
create policy course_quizzes_select_subscription
  on public.course_quizzes
  for select
  using (
    is_published = true
    and public.can_watch_quiz_via_subscription(id)
  );

drop policy if exists course_quiz_questions_select_student on public.course_quiz_questions;
create policy course_quiz_questions_select_student
  on public.course_quiz_questions
  for select
  using (
    exists (
      select 1
      from public.course_quizzes q
      join public.courses c on c.id = q.course_id
      where q.id = course_quiz_questions.quiz_id
        and q.is_published = true
        and (
          public.is_enrolled(c.id)
          or public.can_watch_quiz_via_subscription(q.id)
          or exists (
            select 1
            from public.lessons l
            where l.course_id = c.id
              and l.is_preview = true
          )
        )
    )
  );
