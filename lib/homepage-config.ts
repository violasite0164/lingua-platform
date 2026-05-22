/**
 * 首頁全幅背景設定（公開讀取）— 僅 Server 元件 / Server Actions 請由此 import；
 * 型別與 normalizeHexColor 等請用 `@/lib/homepage-public`，以免 bundle `next/headers`。
 */
import { createClient } from '@/lib/supabase/server';
import type { HomepageConfig } from '@/types/database.types';
import {
  resolveFeaturesStudentImageUrl,
  resolveMarketingThemePreset,
} from '@/lib/marketing-theme';
import {
  HOME_QUIZ_CTA_MAX_LEN,
  HOME_QUIZ_INTRO_MAX_LEN,
  normalizeHexColor,
  normalizeHomepageQuizCopy,
  parseBackgroundImageUrlsFromDb,
  parseOverlayOpacityFromDb,
  pickRandomBackgroundImageUrl,
  resolveTeachersCardImageUrls,
  type HomeBackdropMedia,
  type HomepagePublicSettings,
} from '@/lib/homepage-public';

export type {
  HomeBackdropMedia,
  HomeQuizCopy,
  HomeQuizResultBackground,
  HomeQuizHeadingColors,
  HomepagePublicSettings,
} from '@/lib/homepage-public';

export { normalizeHexColor, parseOverlayOpacityFromDb } from '@/lib/homepage-public';

function rowToMedia(row: HomepageConfig): HomeBackdropMedia {
  const imageUrls = parseBackgroundImageUrlsFromDb(
    row.background_image_urls,
    row.background_image_url,
  );
  return {
    imageUrl: pickRandomBackgroundImageUrl(imageUrls),
    imageUrls,
    videoUrl: row.background_video_url?.trim() || null,
    imageEnabled: row.background_image_enabled ?? true,
    videoEnabled: row.background_video_enabled ?? true,
    overlayOpacity: parseOverlayOpacityFromDb(row.overlay_opacity),
  };
}

/** 首頁一次讀取：背景媒體 + 標題字色 */
export async function getHomepagePublicSettings(): Promise<HomepagePublicSettings> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('homepage_config')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error || !data) {
    return {
      media: null,
      headingColors: null,
      quizCopy: null,
      quizResultBackground: null,
      featuresStudentImageUrl: resolveFeaturesStudentImageUrl(null),
      teachersCardImageUrls: resolveTeachersCardImageUrls(null, null, null),
      marketingThemePreset: resolveMarketingThemePreset(null),
    };
  }

  return {
    media: rowToMedia(data),
    headingColors: {
      light: normalizeHexColor(data.heading_text_color_light),
      dark: normalizeHexColor(data.heading_text_color_dark),
    },
    quizCopy: {
      introText: normalizeHomepageQuizCopy(
        data.home_quiz_intro_text,
        HOME_QUIZ_INTRO_MAX_LEN,
      ),
      ctaText: normalizeHomepageQuizCopy(data.home_quiz_cta_text, HOME_QUIZ_CTA_MAX_LEN),
    },
    quizResultBackground: {
      imageUrl: data.home_quiz_result_background_image_url?.trim() || null,
    },
    featuresStudentImageUrl: resolveFeaturesStudentImageUrl(data.features_student_image_url),
    teachersCardImageUrls: resolveTeachersCardImageUrls(
      data.home_teachers_card_1_image_url,
      data.home_teachers_card_2_image_url,
      data.home_teachers_card_3_image_url,
    ),
    marketingThemePreset: resolveMarketingThemePreset(data.marketing_theme_preset),
  };
}

/** 僅媒體層（相容舊呼叫） */
export async function getHomepageBackdrop(): Promise<HomeBackdropMedia | null> {
  const { media } = await getHomepagePublicSettings();
  return media;
}

export async function getHomepageConfigRow(): Promise<HomepageConfig | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('homepage_config')
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}
