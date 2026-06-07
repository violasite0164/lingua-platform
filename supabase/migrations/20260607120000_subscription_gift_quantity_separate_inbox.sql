-- 訂閱贈送 quantity：每件各送一則收件匣道具（不再合併為單一 ×N 道具）

comment on column public.subscription_plan_gifts.quantity is
  '贈送件數（體力包等：每件各一則收件匣道具，每則體力為該商品 stamina_amount）';
