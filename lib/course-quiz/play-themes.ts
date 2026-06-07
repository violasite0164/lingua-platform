import type { CourseQuizPlayTheme } from '@/types/database.types';

export const COURSE_QUIZ_PLAY_THEME_IDS = ['off', 'magic_forest', 'kindergarten'] as const;

export const COURSE_QUIZ_DEFAULT_PLAY_THEME: CourseQuizPlayTheme = 'kindergarten';

export type CourseQuizPlayThemeConfig = {
  id: CourseQuizPlayTheme;
  label: string;
  description: string;
  backgroundImageUrl: string | null;
  bgmUrl: string | null;
  /** 背景音樂基準音量（0–1），再乘使用者 BGM 滑桿 */
  bgmVolumeBase: number;
  showMascots: boolean;
  /** 使用靜態 PNG 取代 Rive 動畫 */
  useStaticMascots: boolean;
  mascotBoyImageUrl: string | null;
  mascotGirlImageUrl: string | null;
  /** 答對 WELL DONE 時短暫顯示的慶祝姿勢 PNG */
  mascotBoyCelebrateImageUrl: string | null;
  mascotGirlCelebrateImageUrl: string | null;
  /** 答錯 NICE TRY 時短暫顯示的加油姿勢 PNG */
  mascotBoyEncourageImageUrl: string | null;
  mascotGirlEncourageImageUrl: string | null;
  /** 進入測驗 QUIZ START / READY? 開場 cut-in */
  mascotBoyIntroImageUrl: string | null;
  mascotGirlIntroImageUrl: string | null;
  useSiteSecondaryOptions: boolean;
  /** 套用魔法森林同款標題／答案配色 */
  useAdventureChrome: boolean;
  /** 吉祥物容器寬度倍率（幼稚園靜態角色較大） */
  mascotWidthScale: number;
};

export const COURSE_QUIZ_PLAY_THEMES: Record<
  CourseQuizPlayTheme,
  CourseQuizPlayThemeConfig
> = {
  off: {
    id: 'off',
    label: '關閉',
    description: '無背景圖、無背景音樂、無吉祥物；答案按鈕使用網站副色',
    backgroundImageUrl: null,
    bgmUrl: null,
    bgmVolumeBase: 0,
    showMascots: false,
    useStaticMascots: false,
    mascotBoyImageUrl: null,
    mascotGirlImageUrl: null,
    mascotBoyCelebrateImageUrl: null,
    mascotGirlCelebrateImageUrl: null,
    mascotBoyEncourageImageUrl: null,
    mascotGirlEncourageImageUrl: null,
    mascotBoyIntroImageUrl: null,
    mascotGirlIntroImageUrl: null,
    useSiteSecondaryOptions: true,
    useAdventureChrome: false,
    mascotWidthScale: 1,
  },
  magic_forest: {
    id: 'magic_forest',
    label: '魔法森林',
    description: '魔法森林背景圖與背景音樂，含男女 Rive 吉祥物',
    backgroundImageUrl: '/course-quiz/themes/magic-forest-bg.png',
    bgmUrl: '/course-quiz/themes/magic-forest-bgm.mp3',
    bgmVolumeBase: 0.42,
    showMascots: true,
    useStaticMascots: false,
    mascotBoyImageUrl: null,
    mascotGirlImageUrl: null,
    mascotBoyCelebrateImageUrl: null,
    mascotGirlCelebrateImageUrl: null,
    mascotBoyEncourageImageUrl: null,
    mascotGirlEncourageImageUrl: null,
    mascotBoyIntroImageUrl: null,
    mascotGirlIntroImageUrl: null,
    useSiteSecondaryOptions: false,
    useAdventureChrome: true,
    mascotWidthScale: 1,
  },
  kindergarten: {
    id: 'kindergarten',
    label: '幼稚園',
    description: '教室背景、小手跳跳背景音樂與男女老師／學童靜態角色',
    backgroundImageUrl: '/course-quiz/themes/kindergarten-bg.png',
    bgmUrl: '/course-quiz/themes/kindergarten-bgm.mp3',
    bgmVolumeBase: 0.22,
    showMascots: true,
    useStaticMascots: true,
    mascotBoyImageUrl: '/course-quiz/themes/kindergarten-boy.png',
    mascotGirlImageUrl: '/course-quiz/themes/kindergarten-girl.png',
    mascotBoyCelebrateImageUrl: '/course-quiz/themes/kindergarten-boy-celebrate.png',
    mascotGirlCelebrateImageUrl: '/course-quiz/themes/kindergarten-girl-celebrate.png',
    mascotBoyEncourageImageUrl: '/course-quiz/themes/kindergarten-boy-encourage.png',
    mascotGirlEncourageImageUrl: '/course-quiz/themes/kindergarten-girl-encourage.png',
    mascotBoyIntroImageUrl: '/course-quiz/themes/kindergarten-boy-intro.png',
    mascotGirlIntroImageUrl: '/course-quiz/themes/kindergarten-girl-intro.png',
    useSiteSecondaryOptions: false,
    useAdventureChrome: true,
    mascotWidthScale: 1.38,
  },
};

export function resolveCourseQuizPlayTheme(
  value: string | null | undefined,
): CourseQuizPlayTheme {
  if (value === 'magic_forest') return 'magic_forest';
  if (value === 'kindergarten') return 'kindergarten';
  if (value === 'off') return 'off';
  return COURSE_QUIZ_DEFAULT_PLAY_THEME;
}

export function getCourseQuizPlayThemeConfig(
  theme: CourseQuizPlayTheme,
): CourseQuizPlayThemeConfig {
  return COURSE_QUIZ_PLAY_THEMES[theme];
}

export function isCourseQuizThemedBackground(theme: CourseQuizPlayTheme): boolean {
  return Boolean(COURSE_QUIZ_PLAY_THEMES[theme].backgroundImageUrl);
}

export function courseQuizHasSessionIntro(theme: CourseQuizPlayTheme): boolean {
  const config = COURSE_QUIZ_PLAY_THEMES[theme];
  return Boolean(config.mascotBoyIntroImageUrl && config.mascotGirlIntroImageUrl);
}
