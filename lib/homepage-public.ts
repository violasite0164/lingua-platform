/**
 * 首頁設定：型別與純函式（Client / Server 皆可 import；勿在此引入 next/headers 或 server Supabase）
 */
import type { MarketingThemePresetId } from '@/lib/marketing-theme';

/** 傳給 HomeCinematicBackground / HomeBackdropMediaLayers */
export type HomeBackdropMedia = {
  imageUrl: string | null;
  videoUrl: string | null;
  imageEnabled: boolean;
  videoEnabled: boolean;
  /** 0–1，覆蓋於圖／影片上的主題色遮罩，提升前景可讀性 */
  overlayOpacity: number;
};

/** 首頁測驗標題／標語字色（null = 沿用主题 text-foreground） */
export type HomeQuizHeadingColors = {
  light: string | null;
  dark: string | null;
};

/** 後台自訂首頁測驗文案；欄位皆 null 表示沿用元件內建預設字串 */
export type HomeQuizCopy = {
  introText: string | null;
  ctaText: string | null;
};

/** HomeQuiz 結果畫面背景圖（公開首頁測驗專用） */
export type HomeQuizResultBackground = {
  imageUrl: string | null;
};

export type HomepagePublicSettings = {
  media: HomeBackdropMedia | null;
  headingColors: HomeQuizHeadingColors | null;
  quizCopy: HomeQuizCopy | null;
  quizResultBackground: HomeQuizResultBackground | null;
  /** 後台上傳或貼上的 HTTPS 圖址；null 則不顯示插圖 */
  featuresStudentImageUrl: string | null;
  /** AI×線上課程三張說明卡插圖；各 null 則該卡顯示首字圓塊 */
  teachersCardImageUrls: TeachersCardImageUrls;
  marketingThemePreset: MarketingThemePresetId;
};

export const TEACHERS_CARD_COUNT = 3;

/** [卡1, 卡2, 卡3] 對應 HOME_TEACHERS 順序 */
export type TeachersCardImageUrls = [string | null, string | null, string | null];

export function resolveTeachersCardImageUrls(
  raw1: string | null | undefined,
  raw2: string | null | undefined,
  raw3: string | null | undefined,
): TeachersCardImageUrls {
  return [raw1?.trim() || null, raw2?.trim() || null, raw3?.trim() || null];
}

/** 後台輸入：trim、空則 null；超長截斷 */
export function normalizeHomepageQuizCopy(raw: unknown, maxLen: number): string | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim().replace(/\r\n/g, '\n');
  if (!s) return null;
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen);
}

export const HOME_QUIZ_INTRO_MAX_LEN = 500;
export const HOME_QUIZ_CTA_MAX_LEN = 80;

/** 正規化為 #rrggbb；無效或空則 null */
export function normalizeHexColor(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (/^#[0-9A-Fa-f]{6}$/.test(s)) return s.toLowerCase();
  if (/^#[0-9A-Fa-f]{3}$/.test(s)) {
    const r = s[1];
    const g = s[2];
    const b = s[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return null;
}

/** DB / PostgREST 可能回傳 number 或字串；勿用 `|| 0.45` 否則合法值 0 會被吃掉 */
export function parseOverlayOpacityFromDb(val: unknown): number {
  if (val === null || val === undefined) return 0.45;
  const n =
    typeof val === 'number' ? val : Number.parseFloat(String(val).trim().replace(',', '.'));
  if (!Number.isFinite(n)) return 0.45;
  return Math.min(1, Math.max(0, n));
}
