'use client';

import { Gamepad2 } from 'lucide-react';

import { cn } from '@/lib/utils';

export function GameLoadingShell({ label = '載入遊戲中…' }: { label?: string }) {
  return (
    <div
      className={cn(
        'flex min-h-[240px] flex-1 flex-col items-center justify-center gap-4 px-4 py-12',
        'text-muted-foreground',
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="relative flex size-14 items-center justify-center">
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <Gamepad2 className="relative size-6 text-primary" aria-hidden />
      </div>
      <p className="text-sm">{label}</p>
    </div>
  );
}
