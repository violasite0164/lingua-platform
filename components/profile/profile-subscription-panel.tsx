'use client';

import Link from 'next/link';
import { CalendarClock, Crown, Sparkles, Zap } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { formatCommerceDate } from '@/lib/commerce/format';
import {
  isSubscriptionActive,
  planTitleForCode,
  resolveSubscriptionTier,
  subscriptionStatusLabel,
  type ProfileSubscriptionRow,
  type SubscriptionPlanMeta,
  type SubscriptionTier,
} from '@/lib/profile/subscription-display';
import { cn } from '@/lib/utils';

const TIER_STYLES: Record<
  SubscriptionTier,
  {
    card: string;
    glow: string;
    badge: string;
    title: string;
    icon: typeof Sparkles;
    iconWrap: string;
  }
> = {
  free: {
    card: 'border-border/70 bg-muted/30',
    glow: '',
    badge: 'bg-muted text-muted-foreground',
    title: 'text-foreground',
    icon: Zap,
    iconWrap: 'bg-muted text-muted-foreground',
  },
  basic: {
    card: 'border-sky-400/50 bg-gradient-to-br from-sky-50/90 via-card to-amber-50/40 shadow-md shadow-sky-500/10 dark:from-sky-950/40 dark:via-card dark:to-amber-950/20 dark:shadow-sky-900/20',
    glow: 'before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-br before:from-sky-400/10 before:via-transparent before:to-amber-300/15 before:pointer-events-none',
    badge: 'bg-gradient-to-r from-sky-600 to-sky-500 text-white shadow-sm',
    title: 'bg-gradient-to-r from-sky-700 to-sky-500 bg-clip-text text-transparent dark:from-sky-300 dark:to-sky-100',
    icon: Sparkles,
    iconWrap:
      'bg-gradient-to-br from-sky-400/25 to-amber-400/20 text-sky-700 ring-1 ring-sky-400/30 dark:text-sky-200',
  },
  pro: {
    card: 'border-violet-400/60 bg-gradient-to-br from-violet-100/90 via-fuchsia-50/50 to-amber-100/40 shadow-lg shadow-violet-500/20 dark:from-violet-950/50 dark:via-fuchsia-950/30 dark:to-amber-950/25 dark:shadow-violet-900/30',
    glow: 'before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-br before:from-violet-500/15 before:via-fuchsia-400/10 before:to-amber-400/15 before:pointer-events-none after:absolute after:-inset-px after:rounded-[13px] after:bg-gradient-to-r after:from-violet-500/40 after:via-fuchsia-400/30 after:to-amber-400/40 after:-z-10 after:opacity-60',
    badge: 'bg-gradient-to-r from-violet-600 via-fuchsia-500 to-amber-500 text-white shadow-md',
    title: 'bg-gradient-to-r from-violet-700 via-fuchsia-600 to-amber-600 bg-clip-text text-transparent dark:from-violet-200 dark:via-fuchsia-200 dark:to-amber-200',
    icon: Crown,
    iconWrap:
      'bg-gradient-to-br from-violet-500/30 via-fuchsia-500/25 to-amber-400/25 text-violet-800 ring-1 ring-violet-400/40 shadow-inner dark:text-violet-100',
  },
};

export function ProfileSubscriptionPanel({
  subscriptions,
  plans,
}: {
  subscriptions: ProfileSubscriptionRow[];
  plans: SubscriptionPlanMeta[];
}) {
  const plansByCode = Object.fromEntries(plans.map((p) => [p.code, p]));
  const { tier, row } = resolveSubscriptionTier(subscriptions);
  const styles = TIER_STYLES[tier];
  const Icon = styles.icon;
  const active = row ? isSubscriptionActive(row.status) : false;

  const planTitle =
    tier === 'free'
      ? '免費會員'
      : planTitleForCode(row?.plan_code ?? tier, plansByCode);

  const tierLabel =
    tier === 'pro' ? '進階訂閱' : tier === 'basic' ? '基本訂閱' : '尚未訂閱';

  return (
    <section className="relative">
      <div
        className={cn(
          'relative overflow-hidden rounded-xl border px-5 py-5 transition-all',
          styles.card,
          styles.glow,
        )}
      >
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-4">
            <div
              className={cn(
                'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl',
                styles.iconWrap,
              )}
            >
              <Icon className="h-7 w-7" aria-hidden />
            </div>
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide',
                    styles.badge,
                  )}
                >
                  {tierLabel}
                </span>
                {row ? (
                  <span
                    className={cn(
                      'text-[11px] font-medium rounded-full px-2 py-0.5',
                      active
                        ? 'bg-green-500/15 text-green-700 dark:text-green-400'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {subscriptionStatusLabel(row.status)}
                  </span>
                ) : null}
              </div>
              <h2 className={cn('text-lg font-bold leading-tight', styles.title)}>{planTitle}</h2>
              {tier !== 'free' && plansByCode[row?.plan_code ?? '']?.description ? (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {plansByCode[row!.plan_code].description}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {tier === 'free'
                    ? '升級訂閱以解鎖更多學習與遊戲權益。'
                    : '感謝您的支持。'}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col items-start gap-2 sm:items-end sm:text-right">
            {row?.current_period_end ? (
              <div className="flex items-center gap-2 text-sm">
                <CalendarClock className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
                    {active ? '訂閱到期' : '上次週期結束'}
                  </p>
                  <p className="font-semibold tabular-nums">
                    {formatCommerceDate(row.current_period_end)}
                  </p>
                </div>
              </div>
            ) : row && active ? (
              <p className="text-xs text-muted-foreground">到期時間同步中…</p>
            ) : null}

            <Button
              asChild
              size="sm"
              variant={tier === 'pro' ? 'default' : 'outline'}
              className={cn(
                tier === 'pro' &&
                  'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 border-0',
              )}
            >
              <Link href="/commerce">
                {tier === 'free' ? '前往訂閱' : tier === 'basic' ? '升級進階' : '管理訂閱'}
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {subscriptions.length > 1 ? (
        <ul className="mt-3 space-y-2">
          {subscriptions.map((sub) => (
            <li
              key={sub.plan_code}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-card/60 px-3 py-2 text-xs"
            >
              <span className="font-medium">
                {planTitleForCode(sub.plan_code, plansByCode)}
              </span>
              <span className="text-muted-foreground">
                {subscriptionStatusLabel(sub.status)}
                {sub.current_period_end
                  ? ` · ${formatCommerceDate(sub.current_period_end)}`
                  : ''}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
