'use server';

/**
 * 首頁 8-bit 測驗專用 Server Actions（與 /quiz 完整版分檔，避免客端 bundling 與 /quiz 結算邏輯綁在一起）。
 * 與 `fetchRandomQuizQuestions` 共用同一張 `questions` 表，但抽題規則不同。
 */

import { createClient } from '@/lib/supabase/server';
import type { QuizDifficultyLevel } from '@/types/database.types';
import type { FetchQuizQuestionsResult, QuizQuestionPayload } from '@/lib/quiz/types';
import { HOME_QUIZ_PER_DIFFICULTY } from '@/lib/quiz/constants';
import { shuffle, shuffleQuestionOptions, toPayload } from '@/lib/quiz/question-utils';

type QuestionRow = {
  id: string;
  difficulty: QuizDifficultyLevel;
  question_text: string;
  options: unknown;
  correct_index: unknown;
  explanation: string;
};

/**
 * 先依各難度配額盡量抽滿；不足則從全庫尚未使用的題目中補滿 10 題（不重複同一題）。
 * 僅當全庫有效題少於 10 題時才失敗——因此與「單選難度」的 /quiz 頁是否可玩無必然連動。
 */
export async function fetchHomeQuizQuestions(): Promise<FetchQuizQuestionsResult> {
  const supabase = await createClient();
  const merged: QuizQuestionPayload[] = [];
  const usedIds = new Set<string>();

  const levels: QuizDifficultyLevel[] = ['elementary', 'junior', 'college', 'professor'];

  for (const diff of levels) {
    const need = HOME_QUIZ_PER_DIFFICULTY[diff];
    const { data, error } = await supabase
      .from('questions')
      .select('id, difficulty, question_text, options, correct_index, explanation')
      .eq('difficulty', diff);

    if (error) {
      console.error('[quiz home] fetch', diff, error);
      return { ok: false, message: error.message };
    }

    const pool = shuffle((data ?? []) as QuestionRow[]);
    let taken = 0;
    for (let i = 0; i < pool.length && taken < need; i++) {
      const q = toPayload(pool[i]!);
      if (q && !usedIds.has(q.id)) {
        merged.push(shuffleQuestionOptions(q));
        usedIds.add(q.id);
        taken++;
      }
    }
  }

  if (merged.length < 10) {
    const { data: rest, error: err2 } = await supabase
      .from('questions')
      .select('id, difficulty, question_text, options, correct_index, explanation')
      .limit(1500);

    if (err2) {
      console.error('[quiz home] fetch fill', err2);
      return { ok: false, message: err2.message };
    }

    const pool = shuffle((rest ?? []) as QuestionRow[]);
    for (const row of pool) {
      if (merged.length >= 10) break;
      const q = toPayload(row);
      if (q && !usedIds.has(q.id)) {
        merged.push(shuffleQuestionOptions(q));
        usedIds.add(q.id);
      }
    }
  }

  if (merged.length < 10) {
    return {
      ok: false,
      message: `題庫不足：目前最多只能組出 ${merged.length} 題有效題目（需 options 長度為 4）。請補齊題庫後再試。`,
    };
  }

  return { ok: true, questions: shuffle(merged.slice(0, 10)) };
}
