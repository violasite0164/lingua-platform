'use client';

import { useCallback, useEffect, useState } from 'react';
import { Battery, BatteryFull, BatteryLow, BatteryMedium } from 'lucide-react';

import {
  formatStaminaRegenCountdown,
  isGameFreePlay,
  msUntilStaminaRegen,
} from '@/lib/game/stamina';
import { useOptionalGameStamina } from '@/lib/game/stamina-context';
import { cn } from '@/lib/utils';

function BatteryIcon({ ratio, className }: { ratio: number; className?: string }) {
  if (ratio >= 0.85) {
    return <BatteryFull className={className} aria-hidden />;
  }
  if (ratio >= 0.45) {
    return <BatteryMedium className={className} aria-hidden />;
  }
  if (ratio > 0) {
    return <BatteryLow className={className} aria-hidden />;
  }
  return <Battery className={className} aria-hidden />;
}

function useRegenCountdown(
  nextRegenAt: string | null,
  enabled: boolean,
  onRegenDue: () => void,
): string | null {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled || !nextRegenAt) return;

    const tick = () => {
      const nextNow = Date.now();
      setNowMs(nextNow);
      const remaining = msUntilStaminaRegen(nextRegenAt, nextNow);
      if (remaining === 0) onRegenDue();
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [enabled, nextRegenAt, onRegenDue]);

  if (!enabled || !nextRegenAt) return null;
  const remaining = msUntilStaminaRegen(nextRegenAt, nowMs);
  if (remaining === null) return null;
  return formatStaminaRegenCountdown(remaining);
}

export function GameStaminaBattery({ className }: { className?: string }) {
  const ctx = useOptionalGameStamina();
  const stamina = ctx?.stamina ?? null;

  const onRegenDue = useCallback(() => {
    void ctx?.refreshStamina();
  }, [ctx]);

  const isFreePlay = isGameFreePlay(stamina);
  const regenCountdown = useRegenCountdown(
    stamina?.nextRegenAt ?? null,
    Boolean(stamina && !isFreePlay && stamina.stamina < stamina.max),
    onRegenDue,
  );

  if (!ctx || (ctx.loading && !stamina) || !stamina) {
    return null;
  }

  const ratio = stamina.max > 0 ? stamina.stamina / stamina.max : 0;
  const sideLabel = isFreePlay ? 'FREE PLAY' : regenCountdown;

  const title = isFreePlay
    ? `體力 ${stamina.stamina}/${stamina.max} · FREE PLAY（不扣體力）`
    : sideLabel
      ? `體力 ${stamina.stamina}/${stamina.max} · 回復倒數 ${sideLabel}`
      : `體力 ${stamina.stamina}/${stamina.max}`;

  return (
    <div
      className={cn(
        'flex h-8 items-center gap-1.5 rounded-md px-1.5 text-xs font-semibold tabular-nums',
        ratio <= 0.2 && !isFreePlay ? 'text-red-600' : 'text-muted-foreground',
        className,
      )}
      title={title}
      aria-label={title}
    >
      <div className="flex items-center gap-1">
        <BatteryIcon ratio={ratio} className="h-4 w-4 shrink-0" />
        <span>
          {stamina.stamina}/{stamina.max}
        </span>
      </div>
      {sideLabel ? (
        <span
          className={cn(
            'border-l border-border/70 pl-1.5 text-[10px] font-bold tracking-wide',
            isFreePlay
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'min-w-[2.75rem] text-amber-700 dark:text-amber-300',
          )}
        >
          {sideLabel}
        </span>
      ) : null}
    </div>
  );
}
