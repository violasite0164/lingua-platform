/**
 * 行銷／全站主色與 CTA 配色預設（後台可選）
 * 數值為 HSL 三元組，不含 hsl() 包裹，供 CSS 變數使用。
 */

export const MARKETING_THEME_PRESET_IDS = [
  'yellow_blue',
  'green_purple',
  'lemongrass',
  'pink_sky',
  'kids_classic',
] as const;

export type MarketingThemePresetId = (typeof MARKETING_THEME_PRESET_IDS)[number];

export type MarketingThemeTokens = {
  primary: string;
  primaryForeground: string;
  marketingCta: string;
  marketingCtaForeground: string;
  marketingAccent: string;
  /** 「點解家長揀…」賣點區塊背景 */
  featuresSectionBg: string;
  /** 「家長好評回饋」區塊背景（依主題次要色） */
  testimonialsSectionBg: string;
  /** 內頁標題列（課程總覽等）；dark 為更深副色 */
  pageHeaderBg: string;
  /** 落地頁區塊／卡片底 */
  marketingSurface: string;
  marketingMuted: string;
  ring: string;
};

export const MARKETING_THEME_PRESETS: Record<
  MarketingThemePresetId,
  {
    label: string;
    description: string;
    swatch: [string, string];
    tokens: MarketingThemeTokens;
    tokensDark: MarketingThemeTokens;
  }
> = {
  yellow_blue: {
    label: '黃＋藍',
    description: '明亮黃色主色配藍色按鈕，活潑清晰',
    swatch: ['#F5C518', '#009FE3'],
    tokens: {
      primary: '48 96% 52%',
      primaryForeground: '220 25% 12%',
      marketingCta: '199 100% 46%',
      marketingCtaForeground: '0 0% 100%',
      marketingAccent: '199 100% 46%',
      featuresSectionBg: '48 96% 86%',
      testimonialsSectionBg: '199 75% 82%',
      pageHeaderBg: '199 75% 82%',
      marketingSurface: '150 25% 97%',
      marketingMuted: '220 10% 46%',
      ring: '199 85% 42%',
    },
    tokensDark: {
      primary: '48 92% 58%',
      primaryForeground: '220 25% 10%',
      marketingCta: '199 90% 52%',
      marketingCtaForeground: '0 0% 100%',
      marketingAccent: '199 90% 55%',
      featuresSectionBg: '48 35% 14%',
      testimonialsSectionBg: '199 45% 18%',
      pageHeaderBg: '199 38% 12%',
      marketingSurface: '220 18% 9%',
      marketingMuted: '215 14% 68%',
      ring: '199 75% 55%',
    },
  },
  green_purple: {
    label: '綠＋紫',
    description: '自然綠色主色配紫色行動按鈕',
    swatch: ['#0d9668', '#8B5CF6'],
    tokens: {
      primary: '158 64% 36%',
      primaryForeground: '0 0% 100%',
      marketingCta: '270 65% 55%',
      marketingCtaForeground: '0 0% 100%',
      marketingAccent: '270 65% 55%',
      featuresSectionBg: '150 30% 96%',
      testimonialsSectionBg: '270 55% 92%',
      pageHeaderBg: '270 55% 92%',
      marketingSurface: '150 25% 97%',
      marketingMuted: '220 10% 46%',
      ring: '158 55% 32%',
    },
    tokensDark: {
      primary: '158 55% 48%',
      primaryForeground: '0 0% 100%',
      marketingCta: '270 60% 62%',
      marketingCtaForeground: '0 0% 100%',
      marketingAccent: '270 60% 62%',
      featuresSectionBg: '158 28% 14%',
      testimonialsSectionBg: '270 35% 20%',
      pageHeaderBg: '270 28% 14%',
      marketingSurface: '220 18% 9%',
      marketingMuted: '215 14% 68%',
      ring: '158 50% 45%',
    },
  },
  lemongrass: {
    label: 'Lemon grass',
    description: '檸檬草綠調，清新柔和',
    swatch: ['#9CB86B', '#5A7A3A'],
    tokens: {
      primary: '82 42% 48%',
      primaryForeground: '0 0% 100%',
      marketingCta: '95 38% 38%',
      marketingCtaForeground: '0 0% 100%',
      marketingAccent: '75 50% 42%',
      featuresSectionBg: '82 40% 94%',
      testimonialsSectionBg: '95 38% 88%',
      pageHeaderBg: '95 38% 88%',
      marketingSurface: '150 25% 97%',
      marketingMuted: '220 10% 46%',
      ring: '82 38% 40%',
    },
    tokensDark: {
      primary: '82 45% 52%',
      primaryForeground: '0 0% 100%',
      marketingCta: '95 40% 45%',
      marketingCtaForeground: '0 0% 100%',
      marketingAccent: '75 48% 48%',
      featuresSectionBg: '82 25% 14%',
      testimonialsSectionBg: '95 30% 18%',
      pageHeaderBg: '95 26% 12%',
      marketingSurface: '220 18% 9%',
      marketingMuted: '215 14% 68%',
      ring: '82 42% 48%',
    },
  },
  pink_sky: {
    label: '粉紅＋粉藍',
    description: '粉紅主色配天藍按鈕，溫和親切',
    swatch: ['#EC4899', '#38BDF8'],
    tokens: {
      primary: '330 75% 58%',
      primaryForeground: '0 0% 100%',
      marketingCta: '199 90% 56%',
      marketingCtaForeground: '220 25% 12%',
      marketingAccent: '199 90% 56%',
      featuresSectionBg: '330 55% 97%',
      testimonialsSectionBg: '199 80% 92%',
      pageHeaderBg: '199 80% 92%',
      marketingSurface: '150 25% 97%',
      marketingMuted: '220 10% 46%',
      ring: '330 65% 50%',
    },
    tokensDark: {
      primary: '330 70% 65%',
      primaryForeground: '0 0% 100%',
      marketingCta: '199 85% 58%',
      marketingCtaForeground: '220 25% 10%',
      marketingAccent: '199 85% 58%',
      featuresSectionBg: '330 35% 16%',
      testimonialsSectionBg: '199 40% 20%',
      pageHeaderBg: '199 32% 14%',
      marketingSurface: '220 18% 9%',
      marketingMuted: '215 14% 68%',
      ring: '330 60% 58%',
    },
  },
  kids_classic: {
    label: '經典兒童向',
    description: '紅、黃、藍經典繽紛組合',
    swatch: ['#F97316', '#3B82F6'],
    tokens: {
      primary: '12 88% 55%',
      primaryForeground: '0 0% 100%',
      marketingCta: '217 85% 55%',
      marketingCtaForeground: '0 0% 100%',
      marketingAccent: '45 96% 52%',
      featuresSectionBg: '210 85% 96%',
      testimonialsSectionBg: '217 70% 90%',
      pageHeaderBg: '217 70% 90%',
      marketingSurface: '150 25% 97%',
      marketingMuted: '220 10% 46%',
      ring: '217 75% 48%',
    },
    tokensDark: {
      primary: '12 85% 58%',
      primaryForeground: '0 0% 100%',
      marketingCta: '217 80% 58%',
      marketingCtaForeground: '0 0% 100%',
      marketingAccent: '45 92% 55%',
      featuresSectionBg: '210 40% 14%',
      testimonialsSectionBg: '217 45% 18%',
      pageHeaderBg: '217 35% 12%',
      marketingSurface: '220 18% 9%',
      marketingMuted: '215 14% 68%',
      ring: '217 70% 52%',
    },
  },
};

export const DEFAULT_MARKETING_THEME_PRESET: MarketingThemePresetId = 'yellow_blue';

export function isMarketingThemePresetId(raw: unknown): raw is MarketingThemePresetId {
  return (
    typeof raw === 'string' &&
    (MARKETING_THEME_PRESET_IDS as readonly string[]).includes(raw)
  );
}

export function resolveMarketingThemePreset(raw: unknown): MarketingThemePresetId {
  return isMarketingThemePresetId(raw) ? raw : DEFAULT_MARKETING_THEME_PRESET;
}

export function getMarketingThemeTokens(presetId: MarketingThemePresetId): MarketingThemeTokens {
  return MARKETING_THEME_PRESETS[presetId].tokens;
}

function marketingThemeVarsBlock(t: MarketingThemeTokens): string {
  return [
    `--primary: ${t.primary};`,
    `--primary-foreground: ${t.primaryForeground};`,
    `--marketing-cta: ${t.marketingCta};`,
    `--marketing-cta-foreground: ${t.marketingCtaForeground};`,
    `--marketing-accent: ${t.marketingAccent};`,
    `--marketing-features-bg: ${t.featuresSectionBg};`,
    `--marketing-testimonials-bg: ${t.testimonialsSectionBg};`,
    `--marketing-page-header-bg: ${t.pageHeaderBg};`,
    `--marketing-surface: ${t.marketingSurface};`,
    `--marketing-muted: ${t.marketingMuted};`,
    `--ring: ${t.ring};`,
  ].join('\n  ');
}

/** 注入 :root 的 CSS 變數字串（light） */
export function marketingThemeCssBlock(presetId: MarketingThemePresetId): string {
  return marketingThemeVarsBlock(getMarketingThemeTokens(presetId));
}

/** 注入 :root 與 .dark 的完整主題 CSS */
export function marketingThemeStyleText(presetId: MarketingThemePresetId): string {
  const { tokens, tokensDark } = MARKETING_THEME_PRESETS[presetId];
  return `:root {\n  ${marketingThemeVarsBlock(tokens)}\n}\n.dark {\n  ${marketingThemeVarsBlock(tokensDark)}\n}`;
}

export function resolveFeaturesStudentImageUrl(raw: string | null | undefined): string | null {
  const s = raw?.trim();
  return s || null;
}
