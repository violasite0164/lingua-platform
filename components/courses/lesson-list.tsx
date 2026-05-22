'use client';

import Link from 'next/link';
import { CheckCircle2, Circle, Clock, Lock, PlayCircle, Zap } from 'lucide-react';
import { cn, formatDuration } from '@/lib/utils';
import type { LessonWithProgress } from '@/types/database.types';

interface LessonListProps {
  courseId: string;
  lessons: LessonWithProgress[];
  currentLessonId?: string;
  isEnrolled: boolean;
}

export function LessonList({ courseId, lessons, currentLessonId, isEnrolled }: LessonListProps) {
  if (lessons.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">尚未新增課堂</p>;
  }

  const completedCount = lessons.filter((l) => l.progress?.completed).length;

  return (
    <div className="space-y-1">
      {/* Progress summary */}
      {isEnrolled && completedCount > 0 && (
        <p className="text-xs text-muted-foreground pb-2">
          已完成 {completedCount} / {lessons.length} 堂
        </p>
      )}

      {lessons.map((lesson, index) => {
        const isCompleted = !!lesson.progress?.completed;
        const isCurrent   = lesson.id === currentLessonId;
        const canAccess   = isEnrolled || lesson.is_preview;

        return (
          <LessonItem
            key={lesson.id}
            lesson={lesson}
            index={index}
            courseId={courseId}
            isCompleted={isCompleted}
            isCurrent={isCurrent}
            canAccess={canAccess}
          />
        );
      })}
    </div>
  );
}

function LessonItem({
  lesson,
  index,
  courseId,
  isCompleted,
  isCurrent,
  canAccess,
}: {
  lesson: LessonWithProgress;
  index: number;
  courseId: string;
  isCompleted: boolean;
  isCurrent: boolean;
  canAccess: boolean;
}) {
  const inner = (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
        isCurrent
          ? 'bg-accent text-accent-foreground font-medium'
          : 'hover:bg-muted/50',
        !canAccess && 'opacity-60',
      )}
    >
      {/* Status icon */}
      <div className="mt-0.5 shrink-0">
        {isCompleted ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : isCurrent ? (
          <PlayCircle className="h-4 w-4 text-primary" />
        ) : canAccess ? (
          <Circle className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Lock className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground shrink-0">{index + 1}.</span>
          <span className="truncate">{lesson.title}</span>
          {lesson.is_preview && (
            <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-medium">
              試看
            </span>
          )}
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 mt-0.5">
          {lesson.duration_sec > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatDuration(lesson.duration_sec)}
            </span>
          )}
          {lesson.xp_reward > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
              <Zap className="h-3 w-3" />
              +{lesson.xp_reward} XP
            </span>
          )}
        </div>

        {/* Watch progress bar */}
        {lesson.progress && !isCompleted && lesson.progress.watched_seconds > 0 && (
          <div className="mt-1.5 h-0.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full"
              style={{
                width: `${Math.min(
                  (lesson.progress.watched_seconds / (lesson.duration_sec || 1)) * 100,
                  100,
                )}%`,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );

  if (!canAccess) return <div key={lesson.id}>{inner}</div>;

  return (
    <Link href={`/learn/${courseId}/${lesson.id}`} key={lesson.id}>
      {inner}
    </Link>
  );
}
