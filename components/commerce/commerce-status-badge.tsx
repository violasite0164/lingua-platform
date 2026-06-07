import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<string, string> = {
  paid: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  active: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  pending: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300',
  cancelled: 'border-border bg-muted text-muted-foreground',
  canceled: 'border-border bg-muted text-muted-foreground',
  inactive: 'border-border bg-muted text-muted-foreground',
  failed: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300',
};

export function CommerceStatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase();
  return (
    <Badge
      variant="outline"
      className={cn('font-mono text-[10px] uppercase', STATUS_STYLES[key] ?? STATUS_STYLES.inactive)}
    >
      {status}
    </Badge>
  );
}
