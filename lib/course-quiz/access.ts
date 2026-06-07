import {
  canAccessCourseViaSubscription,
  hasLessonSubscriptionAccess,
  hasQuizSubscriptionAccess,
} from '@/lib/billing/subscription-access';
import type {
  CourseQuizWithProgress,
  CourseRoadmapItem,
  CourseWithLessons,
  LessonWithProgress,
} from '@/types/database.types';

/** 學習路徑／訂閱存取判斷所需欄位 */
export type CourseAccessContext = Pick<
  CourseWithLessons,
  'is_enrolled' | 'subscription_tier' | 'sub_basic_free' | 'sub_pro_free' | 'lessons' | 'quizzes'
>;

import { buildCourseRoadmap } from '@/lib/course-quiz/roadmap';

function isQuizDone(quiz: CourseQuizWithProgress): boolean {
  return !!quiz.progress?.completed;
}

function isLessonDone(lesson: LessonWithProgress): boolean {
  return !!lesson.progress?.completed;
}

function hasLessonWatchAccess(
  lesson: LessonWithProgress,
  course: CourseAccessContext,
): boolean {
  if (lesson.is_preview) return true;
  if (course.is_enrolled) return true;
  return hasLessonSubscriptionAccess(
    lesson,
    course,
    course.subscription_tier ?? 'free',
  );
}

function hasQuizWatchAccess(
  quiz: CourseQuizWithProgress,
  course: CourseAccessContext,
): boolean {
  if (course.is_enrolled) return true;
  return hasQuizSubscriptionAccess(
    quiz,
    course,
    course.subscription_tier ?? 'free',
  );
}

/**
 * 前一個必須完成的 roadmap 節點是否已完成（含必做測驗）。
 */
export function isRoadmapItemAccessible(
  items: CourseRoadmapItem[],
  targetIndex: number,
  course: CourseAccessContext,
): boolean {
  const target = items[targetIndex];
  if (!target) return false;

  if (target.kind === 'lesson') {
    if (!hasLessonWatchAccess(target.lesson, course)) return false;
  } else if (!hasQuizWatchAccess(target.quiz, course)) {
    return false;
  }

  if (targetIndex === 0) {
    return true;
  }

  for (let i = targetIndex - 1; i >= 0; i--) {
    const prev = items[i]!;
    if (prev.kind === 'lesson') {
      if (!isLessonDone(prev.lesson)) return false;
      continue;
    }
    if (prev.quiz.require_to_continue && !isQuizDone(prev.quiz)) {
      return false;
    }
    return true;
  }

  return true;
}

export function findRoadmapIndexForLesson(
  items: CourseRoadmapItem[],
  lessonId: string,
): number {
  return items.findIndex(
    (item) => item.kind === 'lesson' && item.lesson.id === lessonId,
  );
}

export function findRoadmapIndexForQuiz(
  items: CourseRoadmapItem[],
  quizId: string,
): number {
  return items.findIndex((item) => item.kind === 'quiz' && item.quiz.id === quizId);
}

export function canAccessLessonInCourse(
  course: CourseWithLessons,
  lessonId: string,
): boolean {
  const items = buildCourseRoadmap(course.lessons, course.quizzes);
  const idx = findRoadmapIndexForLesson(items, lessonId);
  if (idx < 0) return false;
  return isRoadmapItemAccessible(items, idx, course);
}

export function canAccessQuizInCourse(
  course: CourseWithLessons,
  quizId: string,
): boolean {
  const items = buildCourseRoadmap(course.lessons, course.quizzes);
  const idx = findRoadmapIndexForQuiz(items, quizId);
  if (idx < 0) return false;
  return isRoadmapItemAccessible(items, idx, course);
}

/** 課程是否視為完成（所有單元 + 必做總測驗） */
export function isCourseFullyComplete(course: CourseWithLessons): boolean {
  const items = buildCourseRoadmap(course.lessons, course.quizzes);
  for (const item of items) {
    if (item.kind === 'lesson') {
      if (!isLessonDone(item.lesson)) return false;
      continue;
    }
    if (
      item.quiz.placement === 'final_exam' &&
      item.quiz.require_to_complete_course &&
      !isQuizDone(item.quiz)
    ) {
      return false;
    }
  }
  return course.lessons.length > 0;
}

/** 下一個未完成的 roadmap 節點 href */
export function nextIncompleteRoadmapHref(
  courseId: string,
  items: CourseRoadmapItem[],
): string | null {
  for (const item of items) {
    if (item.kind === 'lesson' && !isLessonDone(item.lesson)) {
      return `/learn/${courseId}/${item.lesson.id}`;
    }
    if (item.kind === 'quiz' && !isQuizDone(item.quiz)) {
      return `/learn/${courseId}/quiz/${item.quiz.id}`;
    }
  }
  return null;
}

/** 單元完成後若後方有必做測驗且未完成，導向測驗 */
export function quizGateAfterLesson(
  course: CourseWithLessons,
  lessonId: string,
): string | null {
  const items = buildCourseRoadmap(course.lessons, course.quizzes);
  const lessonIdx = findRoadmapIndexForLesson(items, lessonId);
  if (lessonIdx < 0) return null;

  for (let i = lessonIdx + 1; i < items.length; i++) {
    const item = items[i]!;
    if (item.kind === 'lesson') break;
    if (item.quiz.require_to_continue && !isQuizDone(item.quiz)) {
      return `/learn/${course.id}/quiz/${item.quiz.id}`;
    }
  }
  return null;
}

export function userHasCourseSubscriptionAccess(
  course: Pick<
    CourseWithLessons,
    'sub_basic_free' | 'sub_pro_free' | 'subscription_tier'
  >,
): boolean {
  return canAccessCourseViaSubscription(
    course,
    course.subscription_tier ?? 'free',
  );
}

/** 訂閱會員是否可透過訂閱權益觀看本課程任一單元／測驗（不需購買） */
export function hasAnySubscriptionWatchAccess(course: CourseAccessContext): boolean {
  const tier = course.subscription_tier ?? 'free';
  if (tier === 'free') return false;
  if (canAccessCourseViaSubscription(course, tier)) return true;
  if (
    course.lessons.some((lesson) => hasLessonSubscriptionAccess(lesson, course, tier))
  ) {
    return true;
  }
  return (course.quizzes ?? []).some((quiz) =>
    hasQuizSubscriptionAccess(quiz, course, tier),
  );
}

export { hasLessonWatchAccess, hasQuizWatchAccess };
