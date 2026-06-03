-- 個人資料收件匣（購買道具、系統通知等）

create table if not exists public.profile_inbox_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('stamina_pack', 'system')),
  title text not null,
  body text not null default '',
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.profile_inbox_messages is '使用者收件匣；體力包等道具需在此領取使用';

create index if not exists profile_inbox_messages_user_created_idx
  on public.profile_inbox_messages (user_id, created_at desc);

create index if not exists profile_inbox_messages_user_unread_idx
  on public.profile_inbox_messages (user_id)
  where read_at is null;

create unique index if not exists profile_inbox_messages_purchase_unique
  on public.profile_inbox_messages ((payload->>'purchase_id'))
  where (payload->>'purchase_id') is not null and (payload->>'purchase_id') <> '';

alter table public.profile_inbox_messages enable row level security;

drop policy if exists profile_inbox_select_own on public.profile_inbox_messages;
create policy profile_inbox_select_own
  on public.profile_inbox_messages
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists profile_inbox_update_own on public.profile_inbox_messages;
create policy profile_inbox_update_own
  on public.profile_inbox_messages
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 既有已付款體力包：補發收件匣（尚未自動領取者可在個人資料使用）
insert into public.profile_inbox_messages (user_id, kind, title, body, payload, created_at)
select
  p.user_id,
  'stamina_pack',
  '購買成功：' || coalesce(si.title, '體力道具'),
  '付款已完成。請點擊「使用」將體力回復至遊戲帳戶（上限 10 點）。',
  jsonb_build_object(
    'purchase_id', p.id::text,
    'shop_item_id', p.shop_item_id::text,
    'stamina_amount', si.stamina_amount,
    'shop_item_title', si.title
  ),
  coalesce(p.updated_at, p.created_at)
from public.user_purchases p
join public.shop_items si on si.id = p.shop_item_id
where p.status = 'paid'
  and si.kind = 'stamina_pack'
  and coalesce(si.stamina_amount, 0) > 0
  and not exists (
    select 1
    from public.profile_inbox_messages m
    where m.payload->>'purchase_id' = p.id::text
  );
