import type { QuizDifficultyLevel } from '@/types/database.types';

/**
 * 每局從該難度題庫隨機抽取的題數（上限，題庫不足則全出）
 * 與 `questions_seed_300.sql` 等大題庫搭配時可拉高；僅測試少量題時請勿超過題庫數。
 */
export const QUIZ_QUESTIONS_PER_ROUND = 15;

/** 過關所需最低總分（滿分 100，含答對率與速度）；未達則 STAGE FAIL */
export const QUIZ_STAGE_PASS_MIN_SCORE100 = 85;

/** 總分達此門檻但未過關時，評語走「差一點就通關」 */
export const QUIZ_STAGE_NEAR_PASS_MIN_SCORE100 = 75;

/** @deprecated 請改用 QUIZ_STAGE_PASS_MIN_SCORE100 */
export const QUIZ_ADVANCE_LEVEL_MIN_SCORE = QUIZ_STAGE_PASS_MIN_SCORE100;

export type QuizStageRemarkOutcome = 'pass' | 'near_pass' | 'fail';

export function isQuizRoundPassed(score100: number): boolean {
  return score100 >= QUIZ_STAGE_PASS_MIN_SCORE100;
}

/** 總分滿分（100/100，與排行榜 perfect_count 一致） */
export function isQuizRoundFullMark(score100: number): boolean {
  return score100 >= 100;
}

export function getQuizStageRemarkOutcome(score100: number): QuizStageRemarkOutcome {
  if (score100 >= QUIZ_STAGE_PASS_MIN_SCORE100) return 'pass';
  if (score100 >= QUIZ_STAGE_NEAR_PASS_MIN_SCORE100) return 'near_pass';
  return 'fail';
}

export const QUIZ_DIFFICULTY_ORDER = [
  'elementary',
  'junior',
  'college',
  'professor',
] as const satisfies readonly QuizDifficultyLevel[];

/** 難度對應關卡編號（開局 STAGE N START!） */
export const QUIZ_STAGE_NUMBER: Record<QuizDifficultyLevel, number> = {
  elementary: 1,
  junior: 2,
  college: 3,
  professor: 4,
};

export function getQuizStageNumber(level: QuizDifficultyLevel): number {
  return QUIZ_STAGE_NUMBER[level];
}

/** 結果／狀態列顯示用（例如 STAGE 1） */
export function getQuizStageLabel(level: QuizDifficultyLevel): string {
  return `STAGE ${getQuizStageNumber(level)}`;
}

export function getNextQuizDifficultyLevel(
  current: QuizDifficultyLevel,
): QuizDifficultyLevel | null {
  const i = QUIZ_DIFFICULTY_ORDER.indexOf(current);
  if (i < 0 || i >= QUIZ_DIFFICULTY_ORDER.length - 1) return null;
  return QUIZ_DIFFICULTY_ORDER[i + 1]!;
}

/** 答對一題可獲得的基礎經驗值（依難度加權） */
export const XP_PER_CORRECT: Record<QuizDifficultyLevel, number> = {
  elementary: 5,
  junior: 8,
  college: 12,
  professor: 15,
};

/**
 * 首頁 8-bit 測驗：理想難度配額（合計 10 題）
 * 不可放在 `'use server'` 檔案中匯出（Next 只允許 async server actions）。
 */
export const HOME_QUIZ_PER_DIFFICULTY: Record<QuizDifficultyLevel, number> = {
  elementary: 3,
  junior: 3,
  college: 2,
  professor: 2,
};

/** 與 `/quiz` 題幹打字機相同：每字間隔（毫秒） */
export const QUIZ_TYPEWRITER_MS_PER_CHAR = 22;

/** 開場預掛答題場景用的佔位題（不顯示內容） */
export const QUIZ_PLAY_PREWARM_QUESTION_ID = '__prewarm__';

/** 答題後自動下一題／結束前延遲（`/quiz` 英語大冒險） */
export const QUIZ_ADVANCE_AFTER_ANSWER_MS = 800;

/** 首頁 HomeQuiz：答題後倒數秒數（可點擊略過） */
export const HOME_QUIZ_ADVANCE_SECONDS = 3;

/** 首頁 HomeQuiz：答題後自動下一題延遲（與倒數秒數同步） */
export const HOME_QUIZ_ADVANCE_AFTER_ANSWER_MS =
  HOME_QUIZ_ADVANCE_SECONDS * 1000;

