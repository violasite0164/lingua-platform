import { toClassroomQuizQuestionPayload } from '@/lib/course-quiz/types';
import type {
  CourseQuizChoiceMode,
  CourseQuizQuestion,
  CourseQuizStep,
} from '@/types/database.types';

export type ClassroomQuizQuestionBlock = {
  question: ReturnType<typeof toClassroomQuizQuestionPayload>;
};

/** 依流程步驟建立題目區塊（僅 question 步驟；略過已停用的 video_text） */
export function buildQuestionBlocks(
  steps: CourseQuizStep[],
  questions: CourseQuizQuestion[],
  choiceMode: CourseQuizChoiceMode,
): ClassroomQuizQuestionBlock[] {
  const questionMap = new Map(questions.map((q) => [q.id, q]));
  const ordered = [...steps]
    .filter((s) => s.step_kind === 'question' && s.question_id)
    .sort((a, b) => a.sort_order - b.sort_order);

  const blocks: ClassroomQuizQuestionBlock[] = [];
  for (const step of ordered) {
    const q = questionMap.get(step.question_id!);
    if (!q) continue;
    blocks.push({
      question: toClassroomQuizQuestionPayload(q, choiceMode),
    });
  }

  if (blocks.length === 0 && questions.length > 0) {
    const sortedQ = [...questions].sort((a, b) => a.sort_order - b.sort_order);
    for (const q of sortedQ) {
      blocks.push({
        question: toClassroomQuizQuestionPayload(q, choiceMode),
      });
    }
  }

  return blocks;
}
