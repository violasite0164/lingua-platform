import Link from 'next/link';
import { BookOpen } from 'lucide-react';

import { NavbarLogoSubscriptionOverlay } from '@/components/layout/navbar-logo-subscription-overlay';
import { GUEST_HOME_PATH } from '@/lib/site-routes';
import type {
  ProfileSubscriptionRow,
  SubscriptionPlanMeta,
} from '@/lib/profile/subscription-display';
import { cn } from '@/lib/utils';

type Props = {
  subscriptions?: ProfileSubscriptionRow[];
  plans?: SubscriptionPlanMeta[];
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  asLink?: boolean;
};

export function PlatformBrandMark({
  subscriptions = [],
  plans = [],
  className,
  iconClassName,
  textClassName,
  asLink = true,
}: Props) {
  const content = (
    <>
      <BookOpen className={cn('h-5 w-5 shrink-0 text-primary', iconClassName)} aria-hidden />
      <span className={cn('inline-flex items-baseline whitespace-nowrap', textClassName)}>
        <span>Vint&nbsp;</span>
        <span className="relative inline-block">
          Platform
          <NavbarLogoSubscriptionOverlay
            subscriptions={subscriptions}
            plans={plans}
            className="pointer-events-none"
          />
        </span>
      </span>
    </>
  );

  if (!asLink) {
    return (
      <span className={cn('inline-flex items-center gap-2 font-bold text-lg', className)}>
        {content}
      </span>
    );
  }

  return (
    <Link
      href={GUEST_HOME_PATH}
      className={cn('inline-flex items-center gap-2 font-bold text-lg', className)}
    >
      {content}
    </Link>
  );
}
