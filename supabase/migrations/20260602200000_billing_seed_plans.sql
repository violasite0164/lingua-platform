-- Seed default subscription plans (basic / pro)

insert into public.subscription_plans (code, title, description, price_cents, currency, is_active, sort_order)
select 'basic', '基本訂閱', '適合一般學習需求', 0, 'usd', true, 0
where not exists (select 1 from public.subscription_plans where code = 'basic');

insert into public.subscription_plans (code, title, description, price_cents, currency, is_active, sort_order)
select 'pro', '進階訂閱', '適合高頻練習與進階功能', 0, 'usd', true, 1
where not exists (select 1 from public.subscription_plans where code = 'pro');
