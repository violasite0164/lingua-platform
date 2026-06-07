import type { SupabaseClient } from '@supabase/supabase-js';

import { grantSubscriptionPlanGifts } from '@/lib/billing/grant-subscription-gifts';
import { getStripeServer } from '@/lib/stripe/server';

export async function syncStripeSubscriptionToDb(
  supabase: SupabaseClient,
  input: {
    userId: string;
    planCode: string;
    stripeSubscriptionId: string;
    stripeCustomerId?: string | null;
  },
): Promise<void> {
  const stripe = getStripeServer();
  const sub = await stripe.subscriptions.retrieve(input.stripeSubscriptionId);
  const customerId =
    input.stripeCustomerId ??
    (typeof sub.customer === 'string' ? sub.customer : null);

  const periodEnd =
    typeof sub.current_period_end === 'number'
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null;

  await supabase.from('user_subscriptions').upsert(
    {
      user_id: input.userId,
      plan_code: input.planCode,
      stripe_customer_id: customerId,
      stripe_subscription_id: input.stripeSubscriptionId,
      status: sub.status,
      current_period_end: periodEnd,
    } as never,
    { onConflict: 'user_id,plan_code' },
  );

  if (sub.status === 'active' || sub.status === 'trialing') {
    await grantSubscriptionPlanGifts(supabase, {
      userId: input.userId,
      planCode: input.planCode,
      stripeSubscriptionId: input.stripeSubscriptionId,
    });
  }
}

export async function applyStripeSubscriptionEvent(
  supabase: SupabaseClient,
  stripeSub: {
    id: string;
    status: string;
    current_period_end?: number;
    customer?: string | { id: string } | null;
  },
): Promise<void> {
  const { data: row } = await supabase
    .from('user_subscriptions')
    .select('user_id, plan_code')
    .eq('stripe_subscription_id', stripeSub.id)
    .maybeSingle();

  if (!row?.user_id || !row?.plan_code) return;

  const customerId =
    typeof stripeSub.customer === 'string'
      ? stripeSub.customer
      : stripeSub.customer && typeof stripeSub.customer === 'object'
        ? stripeSub.customer.id
        : null;

  const periodEnd =
    typeof stripeSub.current_period_end === 'number'
      ? new Date(stripeSub.current_period_end * 1000).toISOString()
      : null;

  await supabase
    .from('user_subscriptions')
    .update({
      status: stripeSub.status,
      current_period_end: periodEnd,
      stripe_customer_id: customerId,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('stripe_subscription_id', stripeSub.id);
}
