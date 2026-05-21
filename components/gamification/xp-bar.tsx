import { Progress } from '@/components/ui/progress';
import { xpForLevel, xpToNextLevel, levelProgress } from '@/types/database.types';
import { cn } from '@/lib/utils';

interface XpBarProps {
  exp: number;
  level: number;
  /** compact: 只顯示進度條 */
  compact?: boolean;
  className?: string;
}

export function XpBar({ exp, level, compact = false, className }: XpBarProps) {
  const pct     = Math.round(levelProgress(exp, level) * 100);
  const toNext  = xpToNextLevel(exp, level);
  const current = exp - xpForLevel(level);
  const needed  = xpForLevel(level + 1) - xpForLevel(level);

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2 min-w-[80px]', className)}>
        <Progress
          value={pct}
          className="h-1.5 flex-1"
          indicatorClassName="bg-[hsl(var(--xp-bar))]"
        />
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
          {toNext} XP
        </span>
      </div>
    );
  }

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{current} / {needed} XP</span>
        <span>Lv.{level + 1} 還差 {toNext} XP</span>
      </div>
      <Progress
        value={pct}
        className="h-2"
        indicatorClassName="bg-[hsl(var(--xp-bar))]"
      />
    </div>
  );
}
