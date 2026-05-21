'use server';

/**
 * 英語測驗 — Server Actions（`/quiz` 完整版；須登入，由 middleware 與抽題守衛雙重檢查）
 * - 隨機抽題：僅已登入使用者
 * - 結算時若已登入：寫入最高分、發放 XP、回傳摘要
 * 首頁公開測驗請用 `lib/quiz/home-quiz-actions.ts`。
 */

import { createClient } from '@/lib/supabase/server';
import type { QuizDifficultyLevel } from '@/types/database.types';
import type {
  FetchQuizQuestionsResult,
  QuizQuestionPayload,
  QuizBootstrap,
  RecordQuizOutcome,
} from '@/lib/quiz/types';
import { QUIZ_QUESTIONS_PER_ROUND, XP_PER_CORRECT } from '@/lib/quiz/constants';
import { shuffle, shuffleQuestionOptions, toPayload } from '@/lib/quiz/question-utils';
import {
  computeQuizScore100,
  isPlausibleTotalAnswerTime,
} from '@/lib/quiz/score-formula';
import type { Database } from '@/types/database.types';

/** 將資料庫錯誤轉成可操作的提示（常見：best_score 仍為 0–10 限制） */
function formatQuizScoreSaveError(dbMessage: string): string {
  const hint =
    '若資料庫仍為舊版 best_score 上限 10，請在 Supabase SQL 執行 `supabase/quiz_score100_alter.sql`。';
  if (/violates check constraint/i.test(dbMessage) || /check constraint/i.test(dbMessage)) {
    return `儲存最高分失敗：資料表限制與目前計分（0–100）不符。${hint}`;
  }
  return `儲存最高分失敗：${dbMessage}`;
}

/** 與 profiles 等級公式一致：floor((1 + sqrt(1 + 8*exp/100)) / 2) */
function levelFromTotalExp(exp: number): number {
  const lv = Math.floor((1 + Math.sqrt(1 + (8 * exp) / 100)) / 2);
  return Math.max(lv, 1);
}

type QuizUserStat = Database['public']['Views']['quiz_user_stats']['Row'];

/** 正規化「平均每局作答秒數」：約為「每題 60 秒 × 每局題數」量級 */
const AVG_GAME_SECONDS_REF = QUIZ_QUESTIONS_PER_ROUND * 60;
const TIE_TIME_WEIGHT = 0.6;
const TIE_SCORE_WEIGHT = 0.4;
const TIE_COMPOSITE_EPS = 1e-9;

function avgSecondsPerGame(s: QuizUserStat): number {
  const g = Math.max(s.games_played, 1);
  return s.total_answer_seconds / g;
}

function quizTieBreakComposite(s: QuizUserStat): number {
  const avgScore = Number(s.avg_score);
  const avgSec = avgSecondsPerGame(s);
  const timeNorm = AVG_GAME_SECONDS_REF / (AVG_GAME_SECONDS_REF + avgSec);
  return TIE_SCORE_WEIGHT * (avgScore / 100) + TIE_TIME_WEIGHT * timeNorm;
}

function compareQuizStats(a: QuizUserStat, b: QuizUserStat): number {
  if (b.perfect_count !== a.perfect_count) {
    return b.perfect_count - a.perfect_count;
  }

  const ca = quizTieBreakComposite(a);
  const cb = quizTieBreakComposite(b);
  if (Math.abs(cb - ca) > TIE_COMPOSITE_EPS) return cb - ca;

  const secA = avgSecondsPerGame(a);
  const secB = avgSecondsPerGame(b);
  if (secA !== secB) return secA - secB;

  const scoreCmp = Number(b.avg_score) - Number(a.avg_score);
  if (scoreCmp !== 0) return scoreCmp;

  return a.user_id.localeCompare(b.user_id);
}

async function fetchQuizStats(
  supabase: Awaited<ReturnType<typeof createClient>>,
  difficulty: QuizDifficultyLevel,
): Promise<QuizUserStat[]> {
  const { data, error } = await supabase
    .from('quiz_user_stats')
    .select('*')
    .eq('difficulty', difficulty);

  if (error) {
    console.error('[quiz] fetch quiz_user_stats', difficulty, error);
    return [];
  }

  const list = [...(data ?? [])] as QuizUserStat[];
  list.sort(compareQuizStats);
  return list;
}

function rankOf(stats: QuizUserStat[], userId: string): number | null {
  const idx = stats.findIndex((s) => s.user_id === userId);
  return idx >= 0 ? idx + 1 : null;
}

/**
 * 依難度隨機抽取最多 `QUIZ_QUESTIONS_PER_ROUND` 題（題庫不足則回傳所有可用題目）
 */
export async function fetchRandomQuizQuestions(
  difficulty: QuizDifficultyLevel,
): Promise<FetchQuizQuestionsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: '請先登入以使用 AI英語鬥。' };
  }

  const { data, error } = await supabase
    .from('questions')
    .select('id, difficulty, question_text, options, correct_index, explanation')
    .eq('difficulty', difficulty);

  if (error) {
    console.error('[quiz] fetch questions', error);
    return { ok: false, message: error.message };
  }
  if (!data?.length) {
    return { ok: false, message: '此難度尚無題目，請稍後再試。' };
  }

  const shuffled = shuffle(data);
  const picked = shuffled.slice(
    0,
    Math.min(QUIZ_QUESTIONS_PER_ROUND, shuffled.length),
  );
  const questions: QuizQuestionPayload[] = [];
  for (const row of picked) {
    const q = toPayload(row as Parameters<typeof toPayload>[0]);
    if (q) questions.push(shuffleQuestionOptions(q));
  }
  if (!questions.length) {
    return { ok: false, message: '題目資料格式異常（需要 options 陣列長度為 4）。' };
  }
  return { ok: true, questions };
}

const LEVELS: QuizDifficultyLevel[] = [
  'elementary',
  'junior',
  'college',
  'professor',
];

/** 首屏載入：登入狀態、最高分；題庫筆數僅回傳給管理員 */
export async function getQuizBootstrap(): Promise<QuizBootstrap> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let showQuestionBankCounts = false;
  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    isAdmin = profile?.role === 'admin';
    showQuestionBankCounts = isAdmin;
  }

  const questionCounts: Partial<Record<QuizDifficultyLevel, number>> = {};
  if (showQuestionBankCounts) {
    for (const d of LEVELS) {
      const { count, error } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('difficulty', d);
      if (!error && typeof count === 'number') {
        questionCounts[d] = count;
      }
    }
  }

  if (!user) {
    return {
      userId: null,
      isAdmin: false,
      bestScores: {},
      questionCounts,
      showQuestionBankCounts: false,
    };
  }

  const { data } = await supabase
    .from('user_quiz_scores')
    .select('difficulty, best_score')
    .eq('user_id', user.id);

  const bestScores: Partial<Record<QuizDifficultyLevel, number>> = {};
  for (const row of data ?? []) {
    bestScores[row.difficulty as QuizDifficultyLevel] = row.best_score;
  }
  return {
    userId: user.id,
    isAdmin,
    bestScores,
    questionCounts,
    showQuestionBankCounts,
  };
}

/**
 * 遊戲結算：登入者更新最高分（0–100，含速度）、發放 XP（仍依答對題數）
 */
export async function recordQuizSession(
  difficulty: QuizDifficultyLevel,
  correctCount: number,
  totalQuestions: number,
  /** 每題「看到題目 → 點選答案」秒數加總；與客端計分公式一致並於伺服端重算 */
  totalAnswerSeconds: number,
): Promise<RecordQuizOutcome> {
  if (
    correctCount < 0 ||
    totalQuestions < 1 ||
    correctCount > totalQuestions
  ) {
    return { ok: false, message: '分數參數無效。' };
  }

  if (!Number.isFinite(totalAnswerSeconds) || totalAnswerSeconds < 0) {
    return { ok: false, message: '作答時間參數無效。' };
  }

  if (!isPlausibleTotalAnswerTime(totalQuestions, totalAnswerSeconds)) {
    return { ok: false, message: '作答時間異常，請勿修改請求參數。' };
  }

  const { score100 } = computeQuizScore100(
    correctCount,
    totalQuestions,
    totalAnswerSeconds,
  );

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: true, loggedIn: false };
  }

  // 結算前先取一次名次（可能為 null：從未上榜）
  const statsBefore = await fetchQuizStats(supabase, difficulty);
  const previousRank = rankOf(statsBefore, user.id);
  const totalPlayersBefore = statsBefore.length;

  const xpEarned = correctCount * XP_PER_CORRECT[difficulty];

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('exp, total_xp_earned, level')
    .eq('id', user.id)
    .single();

  if (profileErr || !profile) {
    console.error('[quiz] profile', profileErr);
    return { ok: false, message: '讀取使用者資料失敗。' };
  }

  /** 每局紀錄（排行榜：平均／滿分次數／累計時間）— 先寫入再更新最高分與 XP */
  const { error: attemptErr } = await supabase.from('quiz_attempts').insert({
    user_id: user.id,
    difficulty,
    score100,
    total_questions: totalQuestions,
    correct_count: correctCount,
    total_answer_seconds: totalAnswerSeconds,
  });

  if (attemptErr) {
    console.error('[quiz] insert quiz_attempts', attemptErr);
    return {
      ok: false,
      message: `紀錄本局成績失敗：${attemptErr.message}`,
    };
  }

  // 寫入後再取一次名次
  const statsAfter = await fetchQuizStats(supabase, difficulty);
  const newRankRaw = rankOf(statsAfter, user.id);
  const newRank = newRankRaw ?? Math.max(1, statsAfter.length); // 正常不會為 null
  const totalPlayers = statsAfter.length || totalPlayersBefore;
  const rankDelta = previousRank == null ? null : previousRank - newRank;

  const { data: existing } = await supabase
    .from('user_quiz_scores')
    .select('best_score')
    .eq('user_id', user.id)
    .eq('difficulty', difficulty)
    .maybeSingle();

  const previousBest = existing?.best_score ?? 0;
  const newBest = Math.max(previousBest, score100);

  /**
   * 不用 upsert：Postgres + RLS 下 INSERT … ON CONFLICT 有時與政策互動異常。
   * 改為「有列則 update、無列則 insert」較穩定。
   */
  if (existing) {
    const { error: updScoreErr } = await supabase
      .from('user_quiz_scores')
      .update({ best_score: newBest })
      .eq('user_id', user.id)
      .eq('difficulty', difficulty);

    if (updScoreErr) {
      console.error('[quiz] update user_quiz_scores', updScoreErr);
      return {
        ok: false,
        message: formatQuizScoreSaveError(updScoreErr.message),
      };
    }
  } else {
    const { error: insScoreErr } = await supabase.from('user_quiz_scores').insert({
      user_id: user.id,
      difficulty,
      best_score: newBest,
    });

    if (insScoreErr) {
      console.error('[quiz] insert user_quiz_scores', insScoreErr);
      return {
        ok: false,
        message: formatQuizScoreSaveError(insScoreErr.message),
      };
    }
  }

  const newExp = profile.exp + xpEarned;
  const newLevel = levelFromTotalExp(newExp);

  const { error: updErr } = await supabase
    .from('profiles')
    .update({
      exp: newExp,
      total_xp_earned: profile.total_xp_earned + xpEarned,
      level: newLevel,
    })
    .eq('id', user.id);

  if (updErr) {
    console.error('[quiz] update xp', updErr);
    return { ok: false, message: '發放經驗值失敗。' };
  }

  return {
    ok: true,
    loggedIn: true,
    xpEarned,
    previousBest,
    newBest,
    newExp,
    newLevel,
    previousRank,
    newRank,
    rankDelta,
    totalPlayers,
  };
}
