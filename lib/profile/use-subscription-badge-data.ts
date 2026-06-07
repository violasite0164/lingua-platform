'use client';

import { useEffect, useState } from 'react';

import { createClient } from '@/lib/supabase/client';
import type {
  ProfileSubscriptionRow,
  SubscriptionPlanMeta,
} from '@/lib/profile/subscription-display';

export function useSubscriptionBadgeData() {
  const [subscriptions, setSubscriptions] = useState<ProfileSubscriptionRow[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlanMeta[]>([]);

  useEffect(() => {
    const supabase = createClient();

    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setSubscriptions([]);
        setPlans([]);
        return;
      }

      const [{ data: subRows }, { data: planRows }] = await Promise.all([
        supabase
          .from('user_subscriptions')
          .select('plan_code, status, current_period_end, updated_at')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false }),
        supabase
          .from('subscription_plans')
          .select('code, title, description')
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
      ]);

      setSubscriptions(
        (subRows ?? []).map((row) => ({
          plan_code: row.plan_code,
          status: row.status,
          current_period_end: row.current_period_end,
          updated_at: row.updated_at,
        })),
      );
      setPlans(
        (planRows ?? []).map((row) => ({
          code: row.code,
          title: row.title,
          description: row.description,
        })),
      );
    })();
  }, []);

  return { subscriptions, plans };
}
