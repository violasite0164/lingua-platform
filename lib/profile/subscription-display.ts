export type ProfileSubscriptionRow = {
  plan_code: string;
  status: string;
  current_period_end: string | null;
  updated_at?: string;
};

export type SubscriptionPlanMeta = {
  code: string;
  title: string;
  description: string;
};

export type SubscriptionTier = 'free' | 'basic' | 'pro';

const TIER_RANK: Record<string, number> = { pro: 2, basic: 1 };

export function isSubscriptionActive(status: string): boolean {
  return status === 'active' || status === 'trialing';
}

export function subscriptionStatusLabel(status: string): string {
  switch (status) {
    case 'active':
      return '訂閱中';
    case 'trialing':
      return '試用中';
    case 'past_due':
      return '待付款';
    case 'canceled':
      return '已取消';
    case 'unpaid':
      return '未付款';
    case 'incomplete':
    case 'incomplete_expired':
      return '未完成';
    case 'paused':
      return '已暫停';
    default:
      return status || '未知';
  }
}

export function resolveSubscriptionTier(
  subscriptions: ProfileSubscriptionRow[],
): { tier: SubscriptionTier; row: ProfileSubscriptionRow | null } {
  const active = subscriptions.filter((s) => isSubscriptionActive(s.status));
  if (active.length === 0) {
    const latest = [...subscriptions].sort(
      (a, b) =>
        new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime(),
    )[0];
    return { tier: 'free', row: latest ?? null };
  }

  const best = [...active].sort(
    (a, b) => (TIER_RANK[b.plan_code] ?? 0) - (TIER_RANK[a.plan_code] ?? 0),
  )[0];

  const code = best.plan_code;
  if (code === 'pro') return { tier: 'pro', row: best };
  if (code === 'basic') return { tier: 'basic', row: best };
  return { tier: 'free', row: best };
}

export function planTitleForCode(
  planCode: string,
  plansByCode: Record<string, SubscriptionPlanMeta>,
): string {
  return plansByCode[planCode]?.title ?? planCode;
}
