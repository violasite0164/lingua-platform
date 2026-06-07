'use server';

/**
 * 英語測驗 — Server Actions（`/quiz` 完整版；須登入，由 middleware 與抽題守衛雙重檢查）
 * - 隨機抽題：僅已登入使用者
 * - 結算時若已登入：寫入最高分、發放 XP、回傳摘要
 * 首頁公開測驗請用 `lib/quiz/home-quiz-actions.ts`。
 */

import { createClient } from '@/lib/supabase/server';
import type {
  QuizDifficultyLevel,
  QuizEditorPersonality,
} from '@/types/database.types';
import type {
  FetchQuizQuestionsResult,
  QuizQuestionPayload,
  QuizBootstrap,
  RecordQuizOutcome,
} from '@/lib/quiz/types';
import { parseQuizCinemaConfig } from '@/lib/quiz-game-config';
import { QUIZ_QUESTIONS_PER_ROUND } from '@/lib/quiz/constants';
import { shuffle, shuffleQuestionOptions, toPayload } from '@/lib/quiz/question-utils';
import { recordQuizSessionDirect } from '@/lib/quiz/record-quiz-session-direct';
import { isPlausibleTotalAnswerTime } from '@/lib/quiz/score-formula';

/** 將資料庫錯誤轉成可操作的提示（常見：best_score 仍為 0–10 限制） */
function formatQuizScoreSaveError(dbMessage: string): string {
  const hint =
    '若資料庫仍為舊版 best_score 上限 10，請在 Supabase SQL 執行 `supabase/quiz_score100_alter.sql`。';
  if (/violates check constraint/i.test(dbMessage) || /check constraint/i.test(dbMessage)) {
    return `儲存最高分失敗：資料表限制與目前計分（0–100）不符。${hint}`;
  }
  return `儲存最高分失敗：${dbMessage}`;
}

/**
 * 依難度隨機抽取最多 `QUIZ_QUESTIONS_PER_ROUND` 題（題庫不足則回傳所有可用題目）
 */
export async function fetchRandomQuizQuestions(
  playSessionId: string,
  difficulty: QuizDifficultyLevel,
): Promise<FetchQuizQuestionsResult> {
  const { assertGamePlaySession } = await import('@/lib/game/play-session-actions');
  const sessionCheck = await assertGamePlaySession(playSessionId, difficulty);
  if (!sessionCheck.ok) {
    return { ok: false, message: sessionCheck.message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: '請先登入以使用英語大冒險。' };
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

async function fetchQuizCinemaConfig(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const { data } = await supabase
    .from('homepage_config')
    .select(
      `
      quiz_stage_start_video_url,
      quiz_stage_complete_video_url,
      quiz_elementary_start_video_url,
      quiz_elementary_complete_video_url,
      quiz_junior_start_video_url,
      quiz_junior_complete_video_url,
      quiz_college_start_video_url,
      quiz_college_complete_video_url,
      quiz_professor_start_video_url,
      quiz_professor_complete_video_url
    `,
    )
    .eq('id', 1)
    .maybeSingle();
  return parseQuizCinemaConfig(data);
}

/** 首屏載入：登入狀態、最高分；題庫筆數僅回傳給管理員 */
export async function getQuizBootstrap(): Promise<QuizBootstrap> {
  const supabase = await createClient();
  const cinema = await fetchQuizCinemaConfig(supabase);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let showQuestionBankCounts = false;
  let isAdmin = false;
  let quizEditorPersonality: QuizEditorPersonality | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, quiz_editor_personality')
      .eq('id', user.id)
      .maybeSingle();
    isAdmin = profile?.role === 'admin';
    showQuestionBankCounts = isAdmin;
    const p = profile?.quiz_editor_personality;
    if (p === 'toxic' || p === 'gentle') quizEditorPersonality = p;
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
      quizEditorPersonality: null,
      cinema,
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
    quizEditorPersonality,
    cinema,
  };
}

/** 儲存英語大冒險小編風格偏好 */
export async function saveQuizEditorPersonality(
  personality: QuizEditorPersonality,
): Promise<{ error?: string }> {
  if (personality !== 'toxic' && personality !== 'gentle') {
    return { error: '無效的風格' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '請先登入' };

  const { error } = await supabase
    .from('profiles')
    .update({ quiz_editor_personality: personality } as never)
    .eq('id', user.id);

  if (error) {
    const msg = error.message ?? '';
    if (msg.includes('quiz_editor_personality') || error.code === '42703') {
      return {
        error:
          '資料庫尚未更新，請執行 migration：20260525170000_profiles_quiz_editor_personality.sql',
      };
    }
    return { error: error.message };
  }

  return {};
}

/**
 * 遊戲結算：登入者更新最高分（0–100，含速度）、發放 XP（仍依答對題數）
 */
export async function recordQuizSession(
  playSessionId: string,
  difficulty: QuizDifficultyLevel,
  correctCount: number,
  totalQuestions: number,
  /** 每題「看到題目 → 點選答案」秒數加總；與客端計分公式一致並於伺服端重算 */
  totalAnswerSeconds: number,
  /** STAGE 2/3 等特殊關卡：與畫面一致的總分，用於過關判定與晉級憑證 */
  score100Override?: number,
  /** STAGE 2/3 遊戲內已通關（用於發放下一關免扣體力憑證） */
  stageCleared?: boolean,
): Promise<RecordQuizOutcome> {
  if (!playSessionId?.trim()) {
    return { ok: false, message: '缺少遊戲局次憑證，請重新開始本局。' };
  }

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

  if (
    score100Override !== undefined &&
    (!Number.isFinite(score100Override) ||
      score100Override < 0 ||
      score100Override > 100)
  ) {
    return { ok: false, message: '分數參數無效。' };
  }

  return recordQuizSessionDirect(
    playSessionId,
    difficulty,
    correctCount,
    totalQuestions,
    totalAnswerSeconds,
    score100Override,
    stageCleared,
  );
}
