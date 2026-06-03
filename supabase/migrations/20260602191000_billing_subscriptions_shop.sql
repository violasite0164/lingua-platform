-- Subscriptions & Shop (Stripe)

create table if not exists public.subscription_plans (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique, -- 'basic', 'pro'
  title text not null,
  description text not null default '',
  price_cents integer not null default 0 check (price_cents >= 0),
  currency text not null default 'usd',
  stripe_price_id text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.subscription_plans is 'Subscription plans configurable in admin. Stripe price id optional.';

create table if not exists public.shop_items (
  id uuid primary key default uuid_generate_v4(),
  kind text not null, -- 'stamina_pack'
  title text not null,
  description text not null default '',
  price_cents integer not null default 0 check (price_cents >= 0),
  currency text not null default 'usd',
  stripe_price_id text,
  stamina_amount smallint, -- used when kind=stamina_pack
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.shop_items is 'Shop items configurable in admin.';

create table if not exists public.user_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_code text not null,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'inactive',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, plan_code)
);

create table if not exists public.user_purchases (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null, -- 'shop_item'
  shop_item_id uuid references public.shop_items(id) on delete set null,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  amount_cents integer,
  currency text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.subscription_plans enable row level security;
alter table public.shop_items enable row level security;
alter table public.user_subscriptions enable row level security;
alter table public.user_purchases enable row level security;
alter table public.stripe_events enable row level security;

-- Public can read active plans/items
drop policy if exists subscription_plans_public_read on public.subscription_plans;
create policy subscription_plans_public_read
  on public.subscription_plans
  for select
  using (is_active = true);

drop policy if exists shop_items_public_read on public.shop_items;
create policy shop_items_public_read
  on public.shop_items
  for select
  using (is_active = true);

-- Users can read their own purchases/subscriptions
drop policy if exists user_subscriptions_read_own on public.user_subscriptions;
create policy user_subscriptions_read_own
  on public.user_subscriptions
  for select
  using (auth.uid() = user_id);

drop policy if exists user_purchases_read_own on public.user_purchases;
create policy user_purchases_read_own
  on public.user_purchases
  for select
  using (auth.uid() = user_id);

-- Admin writes are done via service role; no insert/update policies needed here.

-- Seed: stamina pack (10 stamina) $15
insert into public.shop_items (kind, title, description, price_cents, currency, stamina_amount, is_active, sort_order)
select 'stamina_pack', '遊戲體力包', '回復 10 體力', 1500, 'usd', 10, true, 0
where not exists (
  select 1 from public.shop_items where kind='stamina_pack' and stamina_amount=10
);

-- Grant stamina function (idempotent by clamping to max)
create or replace function public.grant_game_stamina(p_amount smallint)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_uid uuid;
  v_now timestamptz := now();
  v_row public.user_game_stamina%rowtype;
  v_max smallint := 10;
  v_applied_stamina smallint;
  v_applied_anchor timestamptz;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return jsonb_build_object('ok', false, 'message', '未登入');
  end if;
  if p_amount is null or p_amount <= 0 then
    return jsonb_build_object('ok', false, 'message', '無效的體力回復');
  end if;

  insert into public.user_game_stamina (user_id)
  values (v_uid)
  on conflict (user_id) do nothing;

  select * into v_row from public.user_game_stamina where user_id = v_uid;

  select r.out_stamina, r.out_anchor
  into v_applied_stamina, v_applied_anchor
  from public.apply_game_stamina_regen(v_row.stamina, v_row.stamina_anchor, v_now) r;

  v_applied_stamina := least(v_max, (v_applied_stamina + p_amount)::smallint);
  if v_applied_stamina >= v_max then
    v_applied_anchor := v_now;
  end if;

  update public.user_game_stamina
  set stamina = v_applied_stamina,
      stamina_anchor = v_applied_anchor,
      updated_at = v_now
  where user_id = v_uid;

  return jsonb_build_object('ok', true, 'stamina', v_applied_stamina, 'max', v_max);
end;
$$;

grant execute on function public.grant_game_stamina(smallint) to authenticated;

