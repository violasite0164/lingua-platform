import { Badge } from '@/components/ui/badge';
import type { SubscriptionPlanLabels } from '@/lib/billing/subscription-plan-labels';
import { cn } from '@/lib/utils';

type Props = {
  subBasicFree?: boolean;
  subProFree?: boolean;
  labels: SubscriptionPlanLabels;
  className?: string;
  size?: 'sm' | 'md';
};

export function CourseSubscriptionBadges({
  subBasicFree = false,
  subProFree = false,
  labels,
  className,
  size = 'sm',
}: Props) {
  if (!subBasicFree && !subProFree) return null;

  const sizeClass = size === 'md' ? 'text-xs px-2.5 py-0.5' : 'text-[11px] px-2 py-0';

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {subBasicFree ? (
        <Badge
          variant="outline"
          className={cn(
            sizeClass,
            'border-sky-300/70 bg-sky-50 text-sky-800 dark:border-sky-700/60 dark:bg-sky-950/40 dark:text-sky-200',
          )}
        >
          {labels.basic} 免費
        </Badge>
      ) : null}
      {subProFree ? (
        <Badge
          variant="outline"
          className={cn(
            sizeClass,
            'border-violet-300/70 bg-violet-50 text-violet-800 dark:border-violet-700/60 dark:bg-violet-950/40 dark:text-violet-200',
          )}
        >
          {labels.pro} 免費
        </Badge>
      ) : null}
    </div>
  );
}
