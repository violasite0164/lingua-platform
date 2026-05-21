/**
 * 排行榜共用型別與常數（可被 Client / Server 安全匯入；勿在此檔 import server-only 模組）
 */

import type { QuizDifficultyLevel } from '@/types/database.types';

export const QUIZ_LEADERBOARD_LEVELS: {
  id: QuizDifficultyLevel;
  label: string;
  short: string;
}[] = [
  { id: 'elementary', label: '初級 Elementary', short: '初級' },
  { id: 'junior', label: '中級 Junior', short: '中級' },
  { id: 'college', label: '大學 College', short: '大學' },
  { id: 'professor', label: '教授 Professor', short: '教授' },
];

export type ExpLeaderboardEntry = {
  rank: number;
  id: string;
  display_name: string;
  avatar_url: string | null;
  exp: number;
  level: number;
};

export type QuizLeaderboardEntry = {
  rank: number;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  /** 平均得分 0–100 */
  avg_score: number;
  perfect_count: number;
  /** 累計「選答案」秒數 */
  total_answer_seconds: number;
  games_played: number;
};

export type LeaderboardPageData = {
  /** 是否已登入（用於顯示「我的排名」提示） */
  loggedIn: boolean;
  /** 目前使用者 id（已登入時），用於醒目提示榜上列 */
  currentUserId: string | null;
  expTop10: ExpLeaderboardEntry[];
  myExp: {
    rank: number;
    exp: number;
    level: number;
    display_name: string;
  } | null;
  /** 各難度：前十 + 我的名次（有玩過才顯示） */
  quizByDifficulty: Record<
    QuizDifficultyLevel,
    { top10: QuizLeaderboardEntry[]; my: QuizLeaderboardEntry | null }
  >;
};
