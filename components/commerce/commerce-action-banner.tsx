'use client';

import { cn } from '@/lib/utils';
import type { CommerceManageActionResult } from '@/lib/commerce/manage-actions';

export function CommerceActionBanner({
  state,
  className,
}: {
  state: CommerceManageActionResult | null | undefined;
  className?: string;
}) {
  if (!state) return null;
  if (state.ok) {
    return (
      <p
        className={cn(
          'rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300',
          className,
        )}
        role="status"
      >
        {state.message ?? '已儲存'}
      </p>
    );
  }
  return (
    <p
      className={cn(
        'rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300',
        className,
      )}
      role="alert"
    >
      {state.error}
    </p>
  );
}
