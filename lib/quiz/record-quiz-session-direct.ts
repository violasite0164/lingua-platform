/**
 * 英語大冒險一局結算：直接寫入 quiz_attempts、更新最高分與 XP（無 record_quiz_session RPC）。
 */
import { createClient } from '@/lib/supabase/server';
import {
  assertGamePlaySession,
  consumeGamePlaySession,
  issueGameAdvanceGrant,
} from '@/lib/game/play-session-actions';
import {
  getNextQuizDifficultyLevel,
  isQuizRoundPassed,
  XP_PER_CORRECT,
} from '@/lib/quiz/constants';
import { computeQuizScore100 } from '@/lib/quiz/score-formula';
import type { RecordQuizOutcome } from '@/lib/quiz/types';
import type { Database, QuizDifficultyLevel } from '@/types/database.types';

function levelFromTotalExp(exp: number): number {
  const lv = Math.floor((1 + Math.sqrt(1 + (8 * exp) / 100)) / 2);
  return Math.max(lv, 1);
}

async function fetchQuizUserRank(
  supabase: Awaited<ReturnType<typeof createClient>>,
  difficulty: QuizDifficultyLevel,
  userId: string,
): Promise<{ userRank: number | null; totalPlayers: number }> {
  const { data, error } = await supabase.rpc('quiz_user_stat_rank', {
    p_difficulty: difficulty,
    p_user_id: userId,
  });

  if (error) {
    console.error('[quiz] quiz_user_stat_rank', difficulty, error.message);
    return { userRank: null, totalPlayers: 0 };
  }

  const row = Array.isArray(data) ? data[0] : data;
  const parsed = row as { user_rank?: number | null; total_players?: number | null } | null;
  return {
    userRank:
      typeof parsed?.user_rank === 'number' ? parsed.user_rank : null,
    totalPlayers:
      typeof parsed?.total_players === 'number' ? parsed.total_players : 0,
  };
}

function formatQuizScoreSaveError(dbMessage: string): string {
  const hint =
    '若資料庫仍為舊版 best_score 上限 10，請在 Supabase SQL 執行 `supabase/quiz_score100_alter.sql`。';
  if (/violates check constraint/i.test(dbMessage) || /check constraint/i.test(dbMessage)) {
    return `儲存最高分失敗：資料表限制與目前計分（0–100）不符。${hint}`;
  }
  return `儲存最高分失敗：${dbMessage}`;
}

export async function recordQuizSessionDirect(
  playSessionId: string,
  difficulty: QuizDifficultyLevel,
  correctCount: number,
  totalQuestions: number,
  totalAnswerSeconds: number,
  score100Override?: number,
  /** STAGE 2/3 遊戲內判定通關（與 score100 門檻可能不一致） */
  stageCleared?: boolean,
): Promise<RecordQuizOutcome> {
  const sessionCheck = await assertGamePlaySession(playSessionId, difficulty);
  if (!sessionCheck.ok) {
    return { ok: false, message: sessionCheck.message };
  }

  const computed = computeQuizScore100(
    correctCount,
    totalQuestions,
    totalAnswerSeconds,
  );
  const score100 =
    typeof score100Override === 'number' &&
    Number.isFinite(score100Override) &&
    score100Override >= 0 &&
    score100Override <= 100
      ? Math.round(score100Override)
      : computed.score100;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: true, loggedIn: false };
  }

  const rankBefore = await fetchQuizUserRank(supabase, difficulty, user.id);
  const previousRank = rankBefore.userRank;
  const totalPlayersBefore = rankBefore.totalPlayers;

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

  const rankAfter = await fetchQuizUserRank(supabase, difficulty, user.id);
  const newRank = rankAfter.userRank ?? Math.max(1, rankAfter.totalPlayers);
  const totalPlayers = rankAfter.totalPlayers || totalPlayersBefore;
  const rankDelta = previousRank == null ? null : previousRank - newRank;

  const { data: existing } = await supabase
    .from('user_quiz_scores')
    .select('best_score')
    .eq('user_id', user.id)
    .eq('difficulty', difficulty)
    .maybeSingle();

  const previousBest = existing?.best_score ?? 0;
  const newBest = Math.max(previousBest, score100);

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

  const consumed = await consumeGamePlaySession(playSessionId);
  if (!consumed.ok && !/已結算/.test(consumed.message)) {
    return { ok: false, message: consumed.message };
  }

  const grantAdvance =
    stageCleared === true || isQuizRoundPassed(score100);
  if (grantAdvance) {
    const next = getNextQuizDifficultyLevel(difficulty);
    if (next) {
      void issueGameAdvanceGrant(next, difficulty).catch((err) => {
        console.error('[quiz] issueGameAdvanceGrant', err);
      });
    }
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
