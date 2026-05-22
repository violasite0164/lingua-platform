import type {
  QuizDifficultyLevel,
  QuizEditorPersonality,
} from '@/types/database.types';

/** 客戶端一輪遊戲使用的題目（由 Server Action 回傳） */
export type QuizQuestionPayload = {
  id: string;
  difficulty: QuizDifficultyLevel;
  question_text: string;
  options: [string, string, string, string];
  correct_index: number;
  explanation: string;
};

/** Server Action 抽題結果 */
export type FetchQuizQuestionsResult =
  | { ok: true; questions: QuizQuestionPayload[] }
  | { ok: false; message: string };

/** `getQuizBootstrap()` 回傳（勿放在 `'use server'` 檔案中匯出型別） */
export type QuizBootstrap = {
  userId: string | null;
  /** 後台／評語除錯用：一般使用者介面勿曝露敏感標記時可依此判斷 */
  isAdmin: boolean;
  /** 各難度歷史最高分 0–100 */
  bestScores: Partial<Record<QuizDifficultyLevel, number>>;
  /** 各難度題庫筆數；僅在 `showQuestionBankCounts` 時由伺服端填入 */
  questionCounts: Partial<Record<QuizDifficultyLevel, number>>;
  /** 僅管理員可取得／顯示題庫題數 */
  showQuestionBankCounts: boolean;
  /** AI小編風格；null 表示尚未選擇 */
  quizEditorPersonality: QuizEditorPersonality | null;
};

/** `recordQuizSession()` 回傳 */
export type RecordQuizOutcome =
  | { ok: true; loggedIn: false }
  | {
      ok: true;
      loggedIn: true;
      xpEarned: number;
      previousBest: number;
      newBest: number;
      newExp: number;
      newLevel: number;
      /** 本難度排行榜名次（更新前；若此前未上榜則為 null） */
      previousRank: number | null;
      /** 本難度排行榜名次（更新後；完成本局後應一定有值） */
      newRank: number;
      /** 名次升跌：正數 = 上升（數字越小越前）；負數 = 下跌；null = 無從比較 */
      rankDelta: number | null;
      /** 本難度目前上榜總玩家數（用於顯示「第 X / N 名」） */
      totalPlayers: number;
    }
  | { ok: false; message: string };
