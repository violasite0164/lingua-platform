-- 商店與訂閱方案預設貨幣改為 HKD
alter table public.shop_items
  alter column currency set default 'hkd';

alter table public.subscription_plans
  alter column currency set default 'hkd';

-- 既有仍為 usd 的種子／舊資料一併改為 hkd
update public.shop_items set currency = 'hkd' where currency = 'usd';
update public.subscription_plans set currency = 'hkd' where currency = 'usd';
