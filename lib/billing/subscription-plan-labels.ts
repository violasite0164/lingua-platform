export type SubscriptionPlanLabels = {
  basic: string;
  pro: string;
};

export const FALLBACK_SUBSCRIPTION_PLAN_LABELS: SubscriptionPlanLabels = {
  basic: '基本訂閱',
  pro: '進階訂閱',
};

export function buildSubscriptionPlanLabels(
  plans: readonly { code: string; title: string }[],
): SubscriptionPlanLabels {
  const basic = plans.find((p) => p.code === 'basic')?.title?.trim();
  const pro = plans.find((p) => p.code === 'pro')?.title?.trim();
  return {
    basic: basic || FALLBACK_SUBSCRIPTION_PLAN_LABELS.basic,
    pro: pro || FALLBACK_SUBSCRIPTION_PLAN_LABELS.pro,
  };
}
