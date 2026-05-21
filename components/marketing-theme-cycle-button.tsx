'use client';

import { PaintBucket } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  applyMarketingThemePreset,
  cycleMarketingThemePreset,
  resolveActiveMarketingThemePreset,
  storeMarketingThemePreset,
} from '@/lib/marketing-theme-client';
import { MARKETING_THEME_PRESETS, type MarketingThemePresetId } from '@/lib/marketing-theme';

export function MarketingThemeCycleButton() {
  const [preset, setPreset] = useState<MarketingThemePresetId | null>(null);

  useEffect(() => {
    const active = resolveActiveMarketingThemePreset();
    applyMarketingThemePreset(active);
    setPreset(active);
  }, []);

  const handleCycle = useCallback(() => {
    const current = preset ?? resolveActiveMarketingThemePreset();
    const next = cycleMarketingThemePreset(current);
    applyMarketingThemePreset(next);
    storeMarketingThemePreset(next);
    setPreset(next);
  }, [preset]);

  const nextPreset =
    preset !== null ? cycleMarketingThemePreset(preset) : null;
  const nextLabel =
    nextPreset !== null ? MARKETING_THEME_PRESETS[nextPreset].label : '下一主題';

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleCycle}
      disabled={preset === null}
      aria-label={
        preset === null
          ? '切換主題配色'
          : `切換主題配色（目前：${MARKETING_THEME_PRESETS[preset].label}，下一個：${nextLabel}）`
      }
      title={
        preset === null
          ? '切換主題配色'
          : `主題：${MARKETING_THEME_PRESETS[preset].label} · 按一下切換`
      }
    >
      <PaintBucket className="h-4 w-4" aria-hidden />
    </Button>
  );
}
