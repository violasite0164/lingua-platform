'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';

import { VideoPlayer } from '@/components/VideoPlayer';
import { LessonList } from '@/components/courses/lesson-list';
import { useLessonLiveFeedback } from '@/components/learn/lesson-live-feedback';
import { RelearnLessonButton } from '@/components/learn/relearn-lesson-button';
import {
  allRequiredCuesAnswered,
  getRequiredCueIds,
} from '@/lib/lesson-cues/completion';
import {
  LessonTextbookPanel,
  LessonTextbookPreviewPopup,
} from '@/components/learn/lesson-textbook-panel';
import { Button } from '@/components/ui/button';
import { cn, formatDuration } from '@/lib/utils';
import type {
  CourseWithLessons,
  LessonTextbook,
  LessonTimedCue,
  LessonWithProgress,
} from '@/types/database.types';

type Props = {
  course: CourseWithLessons;
  lesson: LessonWithProgress;
  textbooks: LessonTextbook[];
  timedCues: LessonTimedCue[];
  answeredCueIds: string[];
};

export function LessonWorkspace({
  course,
  lesson,
  textbooks,
  timedCues,
  answeredCueIds: initialAnsweredCueIds,
}: Props) {
  const router = useRouter();
  const [previewTextbook, setPreviewTextbook] = useState<LessonTextbook | null>(null);
  const requiredCueIds = useMemo(
    () => getRequiredCueIds(timedCues),
    [timedCues],
  );
  const hasRequiredCues = requiredCueIds.length > 0;

  const [videoResetKey, setVideoResetKey] = useState(0);
  const [resumeAt, setResumeAt] = useState(
    lesson.progress?.watched_seconds ?? 0,
  );

  const {
    videoPlayerProps,
    panel: liveFeedbackPanel,
    answeredCueIds,
    lessonCompleted,
    persistError,
    incompleteAfterVideo,
    resetLearningSession,
    restartVideoFromStart,
    requiredCueIds: requiredCueIdsFromHook,
  } = useLessonLiveFeedback(timedCues, {
    lessonId: lesson.id,
    courseId: course.id,
    initialAnsweredCueIds,
    initialCompleted: !!lesson.progress?.completed,
  });

  const canWatch = course.is_enrolled || lesson.is_preview;
  const allRequiredDone = allRequiredCuesAnswered(
    requiredCueIds,
    answeredCueIds,
  );
  const showRelearn =
    canWatch &&
    hasRequiredCues &&
    (answeredCueIds.length > 0 || lessonCompleted);
  const lessonIndex = course.lessons.findIndex((l) => l.id === lesson.id);
  const prevLesson = lessonIndex > 0 ? course.lessons[lessonIndex - 1] : null;
  const nextLesson =
    lessonIndex >= 0 && lessonIndex < course.lessons.length - 1
      ? course.lessons[lessonIndex + 1]
      : null;

  function lessonHref(l: LessonWithProgress) {
    return `/learn/${course.id}/${l.id}`;
  }

  function canNavigateTo(l: LessonWithProgress) {
    return course.is_enrolled || l.is_preview;
  }

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-3 lg:gap-8">
      <div className="min-w-0 space-y-4 sm:space-y-6 lg:col-span-2">
        <div className="w-full min-w-0">
          <VideoPlayer
            key={`${lesson.id}-${videoResetKey}`}
            videoUid={lesson.cf_video_uid}
            lessonId={canWatch ? lesson.id : undefined}
            startTime={resumeAt}
            locked={!canWatch}
            autoCompleteOnWatch={!hasRequiredCues}
            initialCompleted={lessonCompleted}
            className="w-full"
            {...(canWatch ? videoPlayerProps : {})}
          />
        </div>

        {canWatch ? liveFeedbackPanel : null}

        {canWatch && incompleteAfterVideo && !lessonCompleted ? (
          <div
            className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-4"
            role="alert"
          >
            <p className="text-sm font-medium text-foreground">
              影片已播畢，尚未答對所有互動題
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              目前答對 {answeredCueIds.length} / {requiredCueIdsFromHook.length}{' '}
              題。請重新觀看影片並答對每一題選擇題與文字題，才能完成此單元。
            </p>
            <Button
              type="button"
              size="sm"
              className="mt-3"
              onClick={() => {
                restartVideoFromStart();
                setResumeAt(0);
                setVideoResetKey((k) => k + 1);
              }}
            >
              重新觀看課程
            </Button>
          </div>
        ) : null}

        {canWatch && hasRequiredCues ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm">
            <div className="space-y-0.5">
              <p className="font-medium text-foreground">
                答對進度：{answeredCueIds.length} / {requiredCueIds.length}
              </p>
              <p className="text-xs text-muted-foreground">
                須全部答對選擇題與文字題，此單元才算完成
                {lesson.progress?.xp_granted ? '（經驗值僅首次完成時獲得）' : ''}
              </p>
              {persistError ? (
                <p className="text-xs text-destructive" role="alert">
                  無法儲存作答：{persistError}
                </p>
              ) : null}
            </div>
            {lessonCompleted || allRequiredDone ? (
              <p className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {lessonCompleted ? '單元已完成' : '題目已全部答對'}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-2 sm:space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:text-sm">
            <span>第 {lessonIndex + 1} 堂</span>
            {lesson.duration_sec > 0 && (
              <>
                <span>·</span>
                <span>{formatDuration(lesson.duration_sec)}</span>
              </>
            )}
            {lesson.is_preview && (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                試看
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{lesson.title}</h1>
          {lesson.description ? (
            <p className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed sm:text-base">
              {lesson.description}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {showRelearn ? (
            <RelearnLessonButton
              lessonId={lesson.id}
              courseId={course.id}
              onSuccess={() => {
                resetLearningSession();
                setResumeAt(0);
                setVideoResetKey((k) => k + 1);
                router.refresh();
              }}
            />
          ) : null}
          {prevLesson && canNavigateTo(prevLesson) ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={lessonHref(prevLesson)}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                上一堂
              </Link>
            </Button>
          ) : null}
          {nextLesson && canNavigateTo(nextLesson) ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={lessonHref(nextLesson)}>
                下一堂
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <aside className="relative min-w-0 lg:col-span-1">
        {previewTextbook ? (
          <div
            className={cn(
              'z-30 grid h-[calc(100dvh-4rem)] w-full grid-rows-[minmax(0,1fr)] overflow-hidden',
              'rounded-xl border border-border bg-background shadow-xl',
              'lg:sticky lg:top-16',
            )}
            role="dialog"
            aria-modal="true"
            aria-label="課本教材預覽"
          >
            <LessonTextbookPreviewPopup
              textbook={previewTextbook}
              onClose={() => setPreviewTextbook(null)}
            />
          </div>
        ) : null}

        <div
          className={cn(
            'flex min-h-[280px] flex-col rounded-xl border bg-card shadow-sm',
            'lg:sticky lg:top-16 lg:max-h-[calc(100dvh-6rem)] lg:overflow-hidden',
            previewTextbook && 'hidden',
          )}
        >
          <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">課程大綱</h2>
              <Link
                href={`/courses/${course.id}`}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                課程頁
              </Link>
            </div>
            <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">
              {course.title}
            </p>
            <LessonList
              courseId={course.id}
              lessons={course.lessons}
              currentLessonId={lesson.id}
              isEnrolled={course.is_enrolled}
            />
            {canWatch ? (
              <LessonTextbookPanel
                textbooks={textbooks}
                activeId={previewTextbook?.id ?? null}
                onSelect={(tb) =>
                  setPreviewTextbook((prev) => (prev?.id === tb.id ? null : tb))
                }
              />
            ) : null}
          </div>
        </div>
      </aside>
    </div>
  );
}
