'use server';

import { revalidatePath } from 'next/cache';

import { requireAdmin } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';
import {
  isMarketingThemePresetId,
  resolveMarketingThemePreset,
} from '@/lib/marketing-theme';
import {
  HOMEPAGE_BACKGROUND_IMAGE_SLOTS,
  HOME_QUIZ_CTA_MAX_LEN,
  HOME_QUIZ_INTRO_MAX_LEN,
  normalizeHexColor,
  normalizeHomepageQuizCopy,
} from '@/lib/homepage-public';

function parseOptionalUrl(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
    return s;
  } catch {
    return '';
  }
}

export type HomepageBackdropActionResult = { ok: true } | { ok: false; error: string };

function parseOverlayOpacity(raw: unknown): number {
  const s = String(raw ?? '')
    .trim()
    .replace(',', '.');
  const n = Number.parseFloat(s);
  if (Number.isNaN(n)) return 0.45;
  return Math.min(1, Math.max(0, n));
}

function parseBool(raw: unknown, defaultTrue: boolean): boolean {
  const s = String(raw ?? '').toLowerCase();
  if (s === 'true' || s === '1' || s === 'on') return true;
  if (s === 'false' || s === '0') return false;
  return defaultTrue;
}

export async function updateHomepageBackdrop(formData: FormData): Promise<HomepageBackdropActionResult> {
  await requireAdmin();

  const backgroundImageUrls: string[] = [];
  for (let i = 0; i < HOMEPAGE_BACKGROUND_IMAGE_SLOTS; i++) {
    const raw = String(formData.get(`background_image_url_${i}`) ?? '');
    const url = parseOptionalUrl(raw);
    if (url === '') {
      return { ok: false, error: `背景圖 ${i + 1}：請輸入有效的 http(s) 網址，或留空。` };
    }
    if (url) backgroundImageUrls.push(url);
  }

  const videoRaw = String(formData.get('background_video_url') ?? '');
  const quizResultBgRaw = String(formData.get('home_quiz_result_background_image_url') ?? '');
  const featuresStudentRaw = String(formData.get('features_student_image_url') ?? '');
  const teachersCard1Raw = String(formData.get('home_teachers_card_1_image_url') ?? '');
  const teachersCard2Raw = String(formData.get('home_teachers_card_2_image_url') ?? '');
  const teachersCard3Raw = String(formData.get('home_teachers_card_3_image_url') ?? '');

  const videoUrl = parseOptionalUrl(videoRaw);
  const quizResultBgUrl = parseOptionalUrl(quizResultBgRaw);
  const featuresStudentUrl = parseOptionalUrl(featuresStudentRaw);
  const teachersCard1Url = parseOptionalUrl(teachersCard1Raw);
  const teachersCard2Url = parseOptionalUrl(teachersCard2Raw);
  const teachersCard3Url = parseOptionalUrl(teachersCard3Raw);
  if (
    videoUrl === '' ||
    quizResultBgUrl === '' ||
    featuresStudentUrl === '' ||
    teachersCard1Url === '' ||
    teachersCard2Url === '' ||
    teachersCard3Url === ''
  ) {
    return { ok: false, error: '請輸入有效的 http(s) 網址，或留空。' };
  }

  const overlay = parseOverlayOpacity(formData.get('overlay_opacity'));
  const imageEnabled = parseBool(formData.get('background_image_enabled'), true);
  const videoEnabled = parseBool(formData.get('background_video_enabled'), true);

  const lightRaw = String(formData.get('heading_text_color_light') ?? '').trim();
  const darkRaw = String(formData.get('heading_text_color_dark') ?? '').trim();
  const headingLight = lightRaw ? normalizeHexColor(lightRaw) : null;
  const headingDark = darkRaw ? normalizeHexColor(darkRaw) : null;
  if (lightRaw && !headingLight) {
    return { ok: false, error: '亮色主題字色請使用 #RRGGBB 格式（例如 #0f172a）。' };
  }
  if (darkRaw && !headingDark) {
    return { ok: false, error: '暗黑主題字色請使用 #RRGGBB 格式（例如 #f8fafc）。' };
  }

  const introRaw = String(formData.get('home_quiz_intro_text') ?? '');
  const ctaRaw = String(formData.get('home_quiz_cta_text') ?? '');
  const homeQuizIntro = normalizeHomepageQuizCopy(introRaw, HOME_QUIZ_INTRO_MAX_LEN);
  const homeQuizCta = normalizeHomepageQuizCopy(ctaRaw, HOME_QUIZ_CTA_MAX_LEN);

  const themeRaw = String(formData.get('marketing_theme_preset') ?? '').trim();
  const marketingThemePreset = isMarketingThemePresetId(themeRaw)
    ? themeRaw
    : resolveMarketingThemePreset(null);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('homepage_config')
    .update({
      background_image_urls: backgroundImageUrls,
      background_image_url: backgroundImageUrls[0] ?? null,
      background_video_url: videoUrl,
      overlay_opacity: overlay,
      background_image_enabled: imageEnabled,
      background_video_enabled: videoEnabled,
      heading_text_color_light: headingLight,
      heading_text_color_dark: headingDark,
      home_quiz_intro_text: homeQuizIntro,
      home_quiz_cta_text: homeQuizCta,
      home_quiz_result_background_image_url: quizResultBgUrl,
      features_student_image_url: featuresStudentUrl,
      home_teachers_card_1_image_url: teachersCard1Url,
      home_teachers_card_2_image_url: teachersCard2Url,
      home_teachers_card_3_image_url: teachersCard3Url,
      marketing_theme_preset: marketingThemePreset,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('[updateHomepageBackdrop]', error.message);
    return { ok: false, error: error.message || '儲存失敗' };
  }
  if (!data) {
    return {
      ok: false,
      error: '找不到首頁設定列（請在 Supabase 執行 homepage_config 遷移）。',
    };
  }

  revalidatePath('/', 'layout');
  revalidatePath('/admin');
  revalidatePath('/admin/homepage');
  return { ok: true };
}
