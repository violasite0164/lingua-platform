-- 訂閱方案贈送商品可設定數量（例如 2 組體力包）

alter table public.subscription_plan_gifts
  add column if not exists quantity smallint not null default 1;

alter table public.subscription_plan_gifts
  drop constraint if exists subscription_plan_gifts_quantity_check;

alter table public.subscription_plan_gifts
  add constraint subscription_plan_gifts_quantity_check
  check (quantity >= 1 and quantity <= 99);

comment on column public.subscription_plan_gifts.quantity is '贈送數量（體力包等會合併為單一收件匣，體力為單包點數 × 數量）';
