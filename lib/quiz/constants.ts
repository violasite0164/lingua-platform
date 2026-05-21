import type { QuizDifficultyLevel } from '@/types/database.types';

/**
 * 每局從該難度題庫隨機抽取的題數（上限，題庫不足則全出）
 * 與 `questions_seed_300.sql` 等大題庫搭配時可拉高；僅測試少量題時請勿超過題庫數。
 */
export const QUIZ_QUESTIONS_PER_ROUND = 15;

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
export const QUIZ_TYPEWRITER_MS_PER_CHAR = 28;

/** 答題後自動下一題／結束前延遲（與 `/quiz` 一致） */
export const QUIZ_ADVANCE_AFTER_ANSWER_MS = 800;

