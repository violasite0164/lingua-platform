import {
  DEFAULT_MARKETING_THEME_PRESET,
  isMarketingThemePresetId,
  MARKETING_THEME_PRESET_IDS,
  marketingThemeStyleText,
  type MarketingThemePresetId,
} from '@/lib/marketing-theme';

const STORAGE_KEY = 'lingua-marketing-theme-preset';

export function getStoredMarketingThemePreset(): MarketingThemePresetId | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return isMarketingThemePresetId(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function storeMarketingThemePreset(presetId: MarketingThemePresetId): void {
  try {
    localStorage.setItem(STORAGE_KEY, presetId);
  } catch {
    // private mode / quota
  }
}

export function readServerMarketingThemePreset(): MarketingThemePresetId {
  if (typeof document === 'undefined') return DEFAULT_MARKETING_THEME_PRESET;
  const raw = document.getElementById('site-marketing-theme')?.getAttribute('data-preset');
  return isMarketingThemePresetId(raw) ? raw : DEFAULT_MARKETING_THEME_PRESET;
}

export function applyMarketingThemePreset(presetId: MarketingThemePresetId): void {
  if (typeof document === 'undefined') return;
  let el = document.getElementById('site-marketing-theme');
  if (!el) {
    el = document.createElement('style');
    el.id = 'site-marketing-theme';
    document.head.appendChild(el);
  }
  el.setAttribute('data-preset', presetId);
  el.textContent = marketingThemeStyleText(presetId);
}

export function resolveActiveMarketingThemePreset(): MarketingThemePresetId {
  return getStoredMarketingThemePreset() ?? readServerMarketingThemePreset();
}

export function cycleMarketingThemePreset(
  current: MarketingThemePresetId,
): MarketingThemePresetId {
  const idx = MARKETING_THEME_PRESET_IDS.indexOf(current);
  const next = (idx + 1) % MARKETING_THEME_PRESET_IDS.length;
  return MARKETING_THEME_PRESET_IDS[next] ?? DEFAULT_MARKETING_THEME_PRESET;
}
