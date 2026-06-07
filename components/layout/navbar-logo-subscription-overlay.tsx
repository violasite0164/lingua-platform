import {
  isSubscriptionActive,
  planTitleForCode,
  resolveSubscriptionTier,
  type ProfileSubscriptionRow,
  type SubscriptionPlanMeta,
} from '@/lib/profile/subscription-display';
import { cn } from '@/lib/utils';

type Props = {
  subscriptions: ProfileSubscriptionRow[];
  plans: SubscriptionPlanMeta[];
  className?: string;
};

/** 「Platform」右下角訂閱角標（pointer-events-none，不阻擋首頁連結） */
export function NavbarLogoSubscriptionOverlay({
  subscriptions,
  plans,
  className,
}: Props) {
  const plansByCode = Object.fromEntries(plans.map((p) => [p.code, p]));
  const { tier, row } = resolveSubscriptionTier(subscriptions);

  if (tier === 'free' || !row || !isSubscriptionActive(row.status)) {
    return null;
  }

  const planTitle = planTitleForCode(row.plan_code, plansByCode);
  const isPro = tier === 'pro';
  const label = isPro ? 'PRO' : 'BASIC';

  return (
    <span
      className={cn(
        'absolute bottom-0 right-0 translate-x-[28%] translate-y-[38%] rounded px-[0.24rem] py-px text-[0.48rem] font-extrabold leading-none tracking-[0.08em] ring-[1.5px] ring-background shadow-sm',
        isPro
          ? 'bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white'
          : 'bg-gradient-to-r from-sky-600 to-cyan-500 text-white',
        className,
      )}
      title={`${planTitle} · 訂閱中`}
      aria-label={`${planTitle} · 訂閱中`}
    >
      {label}
    </span>
  );
}
