import type { SupabaseClient } from '@supabase/supabase-js';

import type { CourseQuizQuestion } from '@/types/database.types';

/** 舊測驗若尚無流程列，依題目建立 question 步驟（不覆蓋既有流程） */
export async function ensureCourseQuizQuestionSteps(
  supabase: SupabaseClient,
  quizId: string,
  questions: CourseQuizQuestion[],
): Promise<void> {
  const { count, error: countError } = await supabase
    .from('course_quiz_steps')
    .select('*', { count: 'exact', head: true })
    .eq('quiz_id', quizId);

  if (countError) return;
  if ((count ?? 0) > 0) return;

  const ordered = [...questions]
    .filter((q) => q.quiz_id === quizId)
    .sort((a, b) => a.sort_order - b.sort_order);

  if (ordered.length === 0) return;

  const rows = ordered.map((q, index) => ({
    quiz_id: quizId,
    sort_order: index + 1,
    step_kind: 'question' as const,
    question_id: q.id,
  }));

  await supabase.from('course_quiz_steps').insert(rows as never);
}
