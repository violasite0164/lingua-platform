import { QUIZ_PLAY_BACKGROUND_SRC } from '@/lib/games/registry';
import type { QuizDifficultyLevel } from '@/types/database.types';

/**
 * 各難度關卡背景圖（STAGE 提示與遊玩場景預載用）。
 * 若有獨立檔案可改為 `/games/quiz-bg-stage-2.png` 等。
 */
export const QUIZ_STAGE_BACKGROUND_SRC: Record<QuizDifficultyLevel, string> = {
  elementary: '/games/quiz-magic-woods-bg.png',
  junior: '/games/stage2/castle-bg.png',
  college: '/games/stage3/disco-bg.png',
  professor: '/games/quiz-magic-woods-bg.png',
};

export function getQuizStageBackgroundSrc(level: QuizDifficultyLevel): string {
  return QUIZ_STAGE_BACKGROUND_SRC[level] ?? QUIZ_PLAY_BACKGROUND_SRC;
}

export function preloadQuizStageBackground(level: QuizDifficultyLevel): Promise<void> {
  const src = getQuizStageBackgroundSrc(level);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });
}
