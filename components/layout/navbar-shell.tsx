import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/types/database.types';

import { Navbar } from '@/components/layout/navbar';
import type {
  ProfileSubscriptionRow,
  SubscriptionPlanMeta,
} from '@/lib/profile/subscription-display';

export async function NavbarShell() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let initialProfile: Profile | null = null;
  let initialSubscriptions: ProfileSubscriptionRow[] = [];
  let initialPlanMeta: SubscriptionPlanMeta[] = [];

  if (user) {
    const [{ data: profile }, { data: subRows }, { data: planRows }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
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

    initialProfile = profile;
    initialSubscriptions = (subRows ?? []).map((row) => ({
      plan_code: row.plan_code,
      status: row.status,
      current_period_end: row.current_period_end,
      updated_at: row.updated_at,
    }));
    initialPlanMeta = (planRows ?? []).map((row) => ({
      code: row.code,
      title: row.title,
      description: row.description,
    }));
  }

  return (
    <Navbar
      initialProfile={initialProfile}
      initialSubscriptions={initialSubscriptions}
      initialPlanMeta={initialPlanMeta}
    />
  );
}
