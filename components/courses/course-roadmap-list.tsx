'use client';

import Link from 'next/link';
import {
  CheckCircle2,
  Circle,
  ClipboardList,
  Clock,
  Lock,
  PlayCircle,
  Zap,
} from 'lucide-react';

import { buildCourseRoadmap } from '@/lib/course-quiz/roadmap';
import {
  type CourseAccessContext,
  isRoadmapItemAccessible,
} from '@/lib/course-quiz/access';
import { cn, formatDuration } from '@/lib/utils';
import type {
  CourseQuizWithProgress,
  CourseRoadmapItem,
  CourseWithLessons,
  LessonWithProgress,
} from '@/types/database.types';

interface CourseRoadmapListProps {
  courseId: string;
  lessons: LessonWithProgress[];
  quizzes?: CourseQuizWithProgress[];
  currentLessonId?: string;
  currentQuizId?: string;
  /** @deprecated 請改傳 course */
  isEnrolled?: boolean;
  course?: CourseAccessContext;
}

export function CourseRoadmapList({
  courseId,
  lessons,
  quizzes = [],
  currentLessonId,
  currentQuizId,
  isEnrolled = false,
  course: courseProp,
}: CourseRoadmapListProps) {
  const courseAccess: CourseAccessContext =
    courseProp ??
    {
      is_enrolled: isEnrolled,
      subscription_tier: 'free',
      sub_basic_free: false,
      sub_pro_free: false,
      lessons,
      quizzes,
    };

  const items = buildCourseRoadmap(lessons, quizzes);

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">尚未新增課堂</p>;
  }

  const completedLessons = lessons.filter((l) => l.progress?.completed).length;
  const completedQuizzes = quizzes.filter((q) => q.progress?.completed).length;
  const hasAccess =
    courseAccess.is_enrolled || courseAccess.subscription_tier !== 'free';

  return (
    <div className="space-y-1">
      {hasAccess && (completedLessons > 0 || completedQuizzes > 0) && (
        <p className="text-xs text-muted-foreground pb-2">
          已完成 {completedLessons} 堂 · {completedQuizzes} 測驗
        </p>
      )}

      {items.map((item, index) => (
        <RoadmapItemRow
          key={item.kind === 'lesson' ? item.lesson.id : item.quiz.id}
          item={item}
          index={index}
          courseId={courseId}
          items={items}
          course={courseAccess}
          isCurrent={
            item.kind === 'lesson'
              ? item.lesson.id === currentLessonId
              : item.quiz.id === currentQuizId
          }
        />
      ))}
    </div>
  );
}

function RoadmapItemRow({
  item,
  index,
  courseId,
  items,
  course,
  isCurrent,
}: {
  item: CourseRoadmapItem;
  index: number;
  courseId: string;
  items: CourseRoadmapItem[];
  course: CourseAccessContext;
  isCurrent: boolean;
}) {
  const canAccess = isRoadmapItemAccessible(items, index, course);

  if (item.kind === 'lesson') {
    return (
      <LessonRow
        lesson={item.lesson}
        lessonIndex={item.lessonIndex}
        courseId={courseId}
        isCompleted={!!item.lesson.progress?.completed}
        isCurrent={isCurrent}
        canAccess={canAccess}
      />
    );
  }

  return (
    <QuizRow
      quiz={item.quiz}
      courseId={courseId}
      isCompleted={!!item.quiz.progress?.completed}
      isCurrent={isCurrent}
      canAccess={canAccess}
    />
  );
}

function LessonRow({
  lesson,
  lessonIndex,
  courseId,
  isCompleted,
  isCurrent,
  canAccess,
}: {
  lesson: LessonWithProgress;
  lessonIndex: number;
  courseId: string;
  isCompleted: boolean;
  isCurrent: boolean;
  canAccess: boolean;
}) {
  const href = `/learn/${courseId}/${lesson.id}`;
  const Icon = isCompleted ? CheckCircle2 : canAccess ? PlayCircle : Lock;

  const content = (
    <>
      <Icon
        className={cn(
          'h-4 w-4 shrink-0',
          isCompleted && 'text-green-500',
          !canAccess && 'text-muted-foreground',
          isCurrent && canAccess && 'text-primary',
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-sm font-medium', isCurrent && 'text-primary')}>
          {lessonIndex + 1}. {lesson.title}
        </p>
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          {lesson.duration_sec > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <Clock className="h-3 w-3" />
              {formatDuration(lesson.duration_sec)}
            </span>
          )}
          {lesson.is_preview && <span>試看</span>}
          {lesson.xp_reward > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <Zap className="h-3 w-3" />
              {lesson.xp_reward} XP
            </span>
          )}
        </p>
      </div>
    </>
  );

  if (!canAccess) {
    return (
      <div className="flex items-center gap-3 rounded-lg px-2 py-2 opacity-60">{content}</div>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60',
        isCurrent && 'bg-muted/80',
      )}
    >
      {content}
    </Link>
  );
}

function QuizRow({
  quiz,
  courseId,
  isCompleted,
  isCurrent,
  canAccess,
}: {
  quiz: CourseQuizWithProgress;
  courseId: string;
  isCompleted: boolean;
  isCurrent: boolean;
  canAccess: boolean;
}) {
  const href = `/learn/${courseId}/quiz/${quiz.id}`;
  const Icon = isCompleted ? CheckCircle2 : canAccess ? ClipboardList : Lock;

  const content = (
    <>
      <Icon
        className={cn(
          'h-4 w-4 shrink-0',
          isCompleted && 'text-green-500',
          !canAccess && 'text-muted-foreground',
          isCurrent && canAccess && 'text-primary',
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-sm font-medium', isCurrent && 'text-primary')}>
          {quiz.title}
        </p>
        <p className="text-xs text-muted-foreground">課堂測驗</p>
      </div>
    </>
  );

  if (!canAccess) {
    return (
      <div className="flex items-center gap-3 rounded-lg px-2 py-2 opacity-60">{content}</div>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60',
        isCurrent && 'bg-muted/80',
      )}
    >
      {content}
    </Link>
  );
}

/** @deprecated 使用 CourseRoadmapList */
export function LessonList(props: CourseRoadmapListProps) {
  return <CourseRoadmapList {...props} />;
}
