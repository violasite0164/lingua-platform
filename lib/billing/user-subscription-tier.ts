import type { SupabaseClient } from '@supabase/supabase-js';

import {
  isSubscriptionActive,
  resolveSubscriptionTier,
  type ProfileSubscriptionRow,
  type SubscriptionTier,
} from '@/lib/profile/subscription-display';

export async function fetchUserSubscriptionTier(
  supabase: SupabaseClient,
  userId: string,
): Promise<SubscriptionTier> {
  const { data: rows } = await supabase
    .from('user_subscriptions')
    .select('plan_code, status, current_period_end, updated_at')
    .eq('user_id', userId);

  const subs = (rows ?? []) as ProfileSubscriptionRow[];
  const active = subs.filter((s) => isSubscriptionActive(s.status));
  if (active.length === 0) return 'free';
  return resolveSubscriptionTier(active).tier;
}
