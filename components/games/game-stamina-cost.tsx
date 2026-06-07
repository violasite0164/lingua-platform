import { Battery } from 'lucide-react';

import { cn } from '@/lib/utils';

/** 體力消耗標示：🔋N（以電池代表體力單位） */
export function GameStaminaCost({
  amount,
  className,
  iconClassName,
}: {
  amount: number;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <span
      className={cn('inline-flex items-center gap-0.5 tabular-nums', className)}
      aria-label={`消耗 ${amount} 點體力`}
    >
      <Battery className={cn('size-4 shrink-0', iconClassName)} aria-hidden />
      <span>{amount}</span>
    </span>
  );
}
