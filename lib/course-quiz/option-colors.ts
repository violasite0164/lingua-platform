import type { QuizOptionColors } from '@/lib/games/quiz-theme-css-vars';
import { getQuizOptionColors } from '@/lib/games/quiz-theme-css-vars';
import { DEFAULT_QUIZ_VISUAL_THEME } from '@/lib/games/quiz-visual-themes';

import type { CourseQuizPlayTheme } from '@/types/database.types';

/** 「關閉」主題：答案按鈕跟隨網站 secondary 色 */
export function getCourseQuizOffOptionColors(): QuizOptionColors {
  return {
    border: 'hsl(var(--secondary-foreground) / 0.42)',
    bg: 'hsl(var(--secondary))',
    badge: 'hsl(var(--secondary-foreground) / 0.62)',
    ring: 'hsl(var(--secondary-foreground) / 0.5)',
  };
}

export function getCourseQuizOptionColorsForTheme(
  playTheme: CourseQuizPlayTheme,
  index: number,
): QuizOptionColors {
  if (playTheme === 'off') {
    return getCourseQuizOffOptionColors();
  }
  return getQuizOptionColors(DEFAULT_QUIZ_VISUAL_THEME, index);
}
