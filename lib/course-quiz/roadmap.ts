import type {
  CourseQuizWithProgress,
  CourseRoadmapItem,
  LessonWithProgress,
} from '@/types/database.types';

/**
 * 將單元與課堂 Quiz 合併為課程大綱順序：每個單元後接插在該單元後的測驗，最後接總測驗。
 */
export function buildCourseRoadmap(
  lessons: LessonWithProgress[],
  quizzes: CourseQuizWithProgress[],
): CourseRoadmapItem[] {
  const afterMap = new Map<string, CourseQuizWithProgress[]>();
  const finals: CourseQuizWithProgress[] = [];

  for (const q of quizzes) {
    if (q.placement === 'final_exam') {
      finals.push(q);
      continue;
    }
    if (!q.after_lesson_id) continue;
    const list = afterMap.get(q.after_lesson_id) ?? [];
    list.push(q);
    afterMap.set(q.after_lesson_id, list);
  }

  for (const list of afterMap.values()) {
    list.sort((a, b) => a.sort_order - b.sort_order);
  }
  finals.sort((a, b) => a.sort_order - b.sort_order);

  const items: CourseRoadmapItem[] = [];
  lessons.forEach((lesson, lessonIndex) => {
    items.push({ kind: 'lesson', lesson, lessonIndex });
    const attached = afterMap.get(lesson.id) ?? [];
    for (const quiz of attached) {
      items.push({ kind: 'quiz', quiz });
    }
  });
  for (const quiz of finals) {
    items.push({ kind: 'quiz', quiz });
  }
  return items;
}
