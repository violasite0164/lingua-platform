import { cn } from '@/lib/utils';

const LEVEL_TIERS: { min: number; label: string; color: string }[] = [
  { min: 1,  label: '初學',   color: 'bg-slate-400 text-white' },
  { min: 5,  label: '入門',   color: 'bg-green-500 text-white' },
  { min: 10, label: '進階',   color: 'bg-blue-500 text-white' },
  { min: 20, label: '高級',   color: 'bg-violet-600 text-white' },
  { min: 30, label: '精英',   color: 'bg-amber-500 text-white' },
  { min: 50, label: '大師',   color: 'bg-rose-600 text-white' },
];

function getTier(level: number) {
  return [...LEVEL_TIERS].reverse().find((t) => level >= t.min) ?? LEVEL_TIERS[0];
}

interface LevelBadgeProps {
  level: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function LevelBadge({ level, size = 'md', showLabel = false, className }: LevelBadgeProps) {
  const tier = getTier(level);

  const sizeClasses = {
    sm: 'h-5 min-w-5 text-[10px] px-1.5',
    md: 'h-6 min-w-6 text-xs px-2',
    lg: 'h-8 min-w-8 text-sm px-2.5',
  };

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-full font-bold leading-none',
          tier.color,
          sizeClasses[size],
        )}
      >
        {level}
      </span>
      {showLabel && (
        <span className="text-xs text-muted-foreground font-medium">{tier.label}</span>
      )}
    </div>
  );
}
