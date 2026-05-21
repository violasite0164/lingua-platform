'use client';

import {
  MARKETING_THEME_PRESET_IDS,
  MARKETING_THEME_PRESETS,
  type MarketingThemePresetId,
} from '@/lib/marketing-theme';
import { cn } from '@/lib/utils';

type Props = {
  value: MarketingThemePresetId;
  onChange: (id: MarketingThemePresetId) => void;
};

export function MarketingThemePicker({ value, onChange }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {MARKETING_THEME_PRESET_IDS.map((id) => {
        const preset = MARKETING_THEME_PRESETS[id];
        const selected = value === id;
        return (
          <label
            key={id}
            className={cn(
              'flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors',
              selected
                ? 'border-violet-500 bg-violet-500/10 ring-1 ring-violet-500/50'
                : 'border-zinc-700 bg-zinc-950/50 hover:border-zinc-600',
            )}
          >
            <input
              type="radio"
              name="marketing_theme_preset"
              value={id}
              checked={selected}
              onChange={() => onChange(id)}
              className="mt-1 shrink-0 accent-violet-500"
            />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span
                  className="size-5 shrink-0 rounded-full border border-zinc-600"
                  style={{ backgroundColor: preset.swatch[0] }}
                  aria-hidden
                />
                <span
                  className="size-5 shrink-0 rounded-full border border-zinc-600"
                  style={{ backgroundColor: preset.swatch[1] }}
                  aria-hidden
                />
                <span className="font-medium text-zinc-100">{preset.label}</span>
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-zinc-500">
                {preset.description}
              </span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
