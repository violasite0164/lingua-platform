import {
  buildSubscriptionPlanLabels,
  type SubscriptionPlanLabels,
} from '@/lib/billing/subscription-plan-labels';
import { createClient } from '@/lib/supabase/server';

export type { SubscriptionPlanLabels };

export async function getSubscriptionPlanLabels(): Promise<SubscriptionPlanLabels> {
  const plans = await getActiveSubscriptionPlans();
  return buildSubscriptionPlanLabels(plans);
}

export async function getActiveSubscriptionPlans() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('subscription_plans')
    .select(
      'id, code, title, description, price_cents, currency, stripe_price_id, free_play_games, sort_order',
    )
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  return data ?? [];
}

export async function getActiveShopItems() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('shop_items')
    .select('id, kind, title, description, price_cents, currency, stripe_price_id, stamina_amount, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  return data ?? [];
}

