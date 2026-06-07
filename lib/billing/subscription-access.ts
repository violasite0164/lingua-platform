import type { SubscriptionTier } from '@/lib/profile/subscription-display';
import type { Course, CourseQuiz, Lesson } from '@/types/database.types';

export type SubAccessEntity = {
  sub_basic_free?: boolean | null;
  sub_pro_free?: boolean | null;
};

export type CourseSubDefaults = Pick<Course, 'sub_basic_free' | 'sub_pro_free'>;

export function effectiveSubBasicFree(
  entity: SubAccessEntity,
  course: CourseSubDefaults,
): boolean {
  return entity.sub_basic_free ?? course.sub_basic_free;
}

export function effectiveSubProFree(
  entity: SubAccessEntity,
  course: CourseSubDefaults,
): boolean {
  return entity.sub_pro_free ?? course.sub_pro_free;
}

/** 進階訂閱可觀看標記為基本或進階免費的內容 */
export function hasSubscriptionContentAccess(
  entity: SubAccessEntity,
  course: CourseSubDefaults,
  tier: SubscriptionTier,
): boolean {
  if (tier === 'free') return false;
  if (tier === 'pro') {
    return (
      effectiveSubProFree(entity, course) || effectiveSubBasicFree(entity, course)
    );
  }
  return effectiveSubBasicFree(entity, course);
}

export function hasLessonSubscriptionAccess(
  lesson: Pick<Lesson, 'sub_basic_free' | 'sub_pro_free'>,
  course: CourseSubDefaults,
  tier: SubscriptionTier,
): boolean {
  return hasSubscriptionContentAccess(lesson, course, tier);
}

export function hasQuizSubscriptionAccess(
  quiz: Pick<CourseQuiz, 'sub_basic_free' | 'sub_pro_free'>,
  course: CourseSubDefaults,
  tier: SubscriptionTier,
): boolean {
  return hasSubscriptionContentAccess(quiz, course, tier);
}

export function canWatchLessonVideo(
  lesson: Pick<Lesson, 'is_preview' | 'sub_basic_free' | 'sub_pro_free'>,
  course: CourseSubDefaults & { is_enrolled: boolean },
  tier: SubscriptionTier,
): boolean {
  return (
    lesson.is_preview ||
    course.is_enrolled ||
    hasLessonSubscriptionAccess(lesson, course, tier)
  );
}

export function canAccessCourseViaSubscription(
  course: CourseSubDefaults,
  tier: SubscriptionTier,
): boolean {
  if (tier === 'free') return false;
  if (tier === 'pro') return course.sub_pro_free || course.sub_basic_free;
  return course.sub_basic_free;
}
