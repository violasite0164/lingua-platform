import { createAdminClient } from '@/lib/supabase/server';
import type { ShopItem, SubscriptionPlan } from '@/types/database.types';

export type CommerceDashboardStats = {
  productCount: number;
  activeProductCount: number;
  planCount: number;
  orderTotal: number;
  orderPaid: number;
  orderPending: number;
  revenueCents: number;
  subscriptionActive: number;
  subscriptionTotal: number;
};

export type CommerceOrderRow = {
  id: string;
  user_id: string;
  kind: string;
  shop_item_id: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  amount_cents: number | null;
  currency: string | null;
  status: string;
  created_at: string;
  buyer_name: string | null;
  item_title: string | null;
  item_kind: string | null;
};

export type CommerceSubscriptionRow = {
  id: string;
  user_id: string;
  plan_code: string;
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
  buyer_name: string | null;
  plan_title: string | null;
};

async function adminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('缺少 SUPABASE_SERVICE_ROLE_KEY');
  }
  return createAdminClient();
}

export async function fetchCommerceDashboardStats(): Promise<CommerceDashboardStats> {
  const supabase = await adminClient();

  const { expireStalePendingPurchases } = await import(
    '@/lib/billing/expire-pending-purchases'
  );
  await expireStalePendingPurchases(supabase);

  const [
    { data: items },
    { data: plans },
    { data: purchases },
    { data: subscriptions },
  ] = await Promise.all([
    supabase.from('shop_items').select('id, is_active'),
    supabase.from('subscription_plans').select('code'),
    supabase.from('user_purchases').select('status, amount_cents'),
    supabase.from('user_subscriptions').select('status'),
  ]);

  const productRows = items ?? [];
  const purchaseRows = purchases ?? [];
  const subRows = subscriptions ?? [];

  const orderPaid = purchaseRows.filter((p) => p.status === 'paid').length;
  const revenueCents = purchaseRows
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + (p.amount_cents ?? 0), 0);

  return {
    productCount: productRows.length,
    activeProductCount: productRows.filter((i) => i.is_active).length,
    planCount: (plans ?? []).length,
    orderTotal: purchaseRows.length,
    orderPaid,
    orderPending: purchaseRows.filter((p) => p.status === 'pending').length,
    revenueCents,
    subscriptionActive: subRows.filter((s) => s.status === 'active').length,
    subscriptionTotal: subRows.length,
  };
}

export async function fetchAllShopItems(): Promise<ShopItem[]> {
  const supabase = await adminClient();
  const { data, error } = await supabase
    .from('shop_items')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ShopItem[];
}

export async function fetchAllSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const supabase = await adminClient();
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as SubscriptionPlan[];
}

export type SubscriptionPlanGiftEntry = {
  shopItemId: string;
  quantity: number;
};

/** plan_code → 贈送商品與數量 */
export async function fetchSubscriptionPlanGiftMap(): Promise<
  Record<string, SubscriptionPlanGiftEntry[]>
> {
  const supabase = await adminClient();
  const { data, error } = await supabase
    .from('subscription_plan_gifts')
    .select('plan_code, shop_item_id, quantity');
  if (error) throw new Error(error.message);

  const map: Record<string, SubscriptionPlanGiftEntry[]> = {};
  for (const row of data ?? []) {
    const code = row.plan_code as string;
    const shopItemId = row.shop_item_id as string;
    const quantity =
      typeof row.quantity === 'number' && row.quantity >= 1 ? row.quantity : 1;
    if (!map[code]) map[code] = [];
    map[code].push({ shopItemId, quantity });
  }
  return map;
}

export async function fetchCommerceOrders(limit = 200): Promise<CommerceOrderRow[]> {
  const supabase = await adminClient();

  const { expireStalePendingPurchases } = await import(
    '@/lib/billing/expire-pending-purchases'
  );
  await expireStalePendingPurchases(supabase);

  const { data, error } = await supabase
    .from('user_purchases')
    .select(
      `
      id,
      user_id,
      kind,
      shop_item_id,
      stripe_checkout_session_id,
      stripe_payment_intent_id,
      amount_cents,
      currency,
      status,
      created_at,
      profiles ( display_name ),
      shop_items ( title, kind )
    `,
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const profile = row.profiles as { display_name: string } | null;
    const item = row.shop_items as { title: string; kind: string } | null;
    return {
      id: row.id,
      user_id: row.user_id,
      kind: row.kind,
      shop_item_id: row.shop_item_id,
      stripe_checkout_session_id: row.stripe_checkout_session_id,
      stripe_payment_intent_id: row.stripe_payment_intent_id,
      amount_cents: row.amount_cents,
      currency: row.currency,
      status: row.status,
      created_at: row.created_at,
      buyer_name: profile?.display_name ?? null,
      item_title: item?.title ?? null,
      item_kind: item?.kind ?? null,
    };
  });
}

export async function fetchCommerceSubscriptions(
  limit = 200,
): Promise<CommerceSubscriptionRow[]> {
  const supabase = await adminClient();

  const [{ data: subs, error }, { data: plans }] = await Promise.all([
    supabase
      .from('user_subscriptions')
      .select(
        `
        id,
        user_id,
        plan_code,
        status,
        stripe_customer_id,
        stripe_subscription_id,
        current_period_end,
        created_at,
        updated_at,
        profiles ( display_name )
      `,
      )
      .order('updated_at', { ascending: false })
      .limit(limit),
    supabase.from('subscription_plans').select('code, title'),
  ]);

  if (error) throw new Error(error.message);

  const planTitleByCode = new Map(
    (plans ?? []).map((p) => [p.code, p.title] as const),
  );

  return (subs ?? []).map((row) => {
    const profile = row.profiles as { display_name: string } | null;
    return {
      id: row.id,
      user_id: row.user_id,
      plan_code: row.plan_code,
      status: row.status,
      stripe_customer_id: row.stripe_customer_id,
      stripe_subscription_id: row.stripe_subscription_id,
      current_period_end: row.current_period_end,
      created_at: row.created_at,
      updated_at: row.updated_at,
      buyer_name: profile?.display_name ?? null,
      plan_title: planTitleByCode.get(row.plan_code) ?? row.plan_code,
    };
  });
}
