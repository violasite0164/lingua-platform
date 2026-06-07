import type { RecordQuizOutcome } from '@/lib/quiz/types';
import type { QuizDifficultyLevel } from '@/types/database.types';

import { recordQuizSession } from '@/lib/quiz/actions';

const RECORD_QUIZ_TIMEOUT_MS = 20_000;

export type RecordQuizSessionParams = {
  playSessionId: string;
  difficulty: QuizDifficultyLevel;
  correctCount: number;
  totalQuestions: number;
  totalAnswerSeconds: number;
  score100Override?: number;
  stageCleared?: boolean;
};

/** 客端結算：逾時保護，避免「正在同步成績」永遠卡住 */
export async function recordQuizSessionWithTimeout(
  params: RecordQuizSessionParams,
): Promise<RecordQuizOutcome> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      recordQuizSession(
        params.playSessionId,
        params.difficulty,
        params.correctCount,
        params.totalQuestions,
        params.totalAnswerSeconds,
        params.score100Override,
        params.stageCleared,
      ),
      new Promise<RecordQuizOutcome>((resolve) => {
        timer = setTimeout(
          () =>
            resolve({
              ok: false,
              message:
                '同步成績逾時。請再按一次「下一關」或重新整理；若經驗未更新請稍後查看個人資料。',
            }),
          RECORD_QUIZ_TIMEOUT_MS,
        );
      }),
    ]);
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : '同步成績失敗',
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
