'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useLayoutEffect, type CSSProperties } from 'react';

import { markCourseQuizComplete } from '@/app/actions/course-quiz-progress';
import { ClassroomQuizToolbar } from '@/components/classroom-quiz/classroom-quiz-toolbar';
import { ClassroomQuizPlay } from '@/components/classroom-quiz/classroom-quiz-play';
import { ClassroomQuizIntro, CLASSROOM_QUIZ_POST_INTRO_VIDEO_DELAY_MS } from '@/components/classroom-quiz/classroom-quiz-intro';
import { ClassroomQuizThemeShell } from '@/components/classroom-quiz/classroom-quiz-theme-shell';
import { ClassroomQuizBgmCornerToggle } from '@/components/classroom-quiz/classroom-quiz-bgm-corner-toggle';
import { bindClassroomQuizAudioRuntime } from '@/lib/course-quiz/classroom-quiz-audio-runtime';
import { resolveCourseQuizInteractionMode } from '@/lib/course-quiz/interaction-modes';
import type { ClassroomQuizPlayPhase } from '@/lib/course-quiz/play-phases';
import {
  courseQuizHasSessionIntro,
  getCourseQuizPlayThemeConfig,
  resolveCourseQuizPlayTheme,
} from '@/lib/course-quiz/play-themes';
import { GameShell } from '@/components/games/game-shell';
import { Button } from '@/components/ui/button';
import { buildQuestionBlocks } from '@/lib/course-quiz/play-segments';
import { resolveQuizCharacterMood } from '@/lib/games/quiz-play-engine';
import type {
  CourseQuiz,
  CourseQuizChoiceMode,
  CourseQuizQuestion,
  CourseQuizStep,
} from '@/types/database.types';
import type { ClassroomQuizQuestionBlock } from '@/lib/course-quiz/play-segments';

const CLASSROOM_QUIZ_CANVAS_BASE_WIDTH = 1280;
const CLASSROOM_QUIZ_CANVAS_BASE_HEIGHT = 720;

function initialPhaseForBlock(block: ClassroomQuizQuestionBlock | undefined): ClassroomQuizPlayPhase {
  if (!block) return 'question';
  if (block.question.cf_video_uid) return 'video';
  return 'question';
}

function initialSessionPhase(
  theme: ReturnType<typeof resolveCourseQuizPlayTheme>,
  block: ClassroomQuizQuestionBlock | undefined,
): ClassroomQuizPlayPhase {
  if (courseQuizHasSessionIntro(theme)) return 'intro';
  return initialPhaseForBlock(block);
}

function resetBlockAnswerState(setters: {
  setPicked: (v: number | null) => void;
  setAnsweredThis: (v: boolean) => void;
  setIsCorrect: (v: boolean) => void;
  setOptionsLocked: (v: boolean) => void;
  setOutcomeVideoUid: (v: string | null) => void;
  setOutcomePopupText: (v: string | null) => void;
  setOutcomeWasCorrect: (v: boolean | null) => void;
}) {
  setters.setPicked(null);
  setters.setAnsweredThis(false);
  setters.setIsCorrect(false);
  setters.setOptionsLocked(false);
  setters.setOutcomeVideoUid(null);
  setters.setOutcomePopupText(null);
  setters.setOutcomeWasCorrect(null);
}

function resolveChoiceMode(quiz: CourseQuiz): CourseQuizChoiceMode {
  return quiz.choice_mode === 'three' ? 'three' : 'four';
}

export function ClassroomQuizApp({
  courseId,
  quiz,
  questions,
  steps,
  initialCompleted,
  isAdmin = false,
}: {
  courseId: string;
  quiz: CourseQuiz;
  questions: CourseQuizQuestion[];
  steps: CourseQuizStep[];
  initialCompleted: boolean;
  isAdmin?: boolean;
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [canvasScale, setCanvasScale] = useState(1);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const choiceMode = resolveChoiceMode(quiz);
  const interactionMode = resolveCourseQuizInteractionMode(quiz.interaction_mode);
  const isVocabularyMode = interactionMode === 'vocabulary_drop';

  const blocks = useMemo(
    () => buildQuestionBlocks(steps, questions, choiceMode),
    [steps, questions, choiceMode],
  );

  const [finished, setFinished] = useState(initialCompleted);
  /** 重溫模式：重玩不呼叫完成 API、不重複發放 XP */
  const [isReviewRun, setIsReviewRun] = useState(false);
  const [earnedXpThisSession, setEarnedXpThisSession] = useState(false);
  const [blockIndex, setBlockIndex] = useState(0);

  const playTheme = resolveCourseQuizPlayTheme(quiz.play_theme);
  const themeConfig = getCourseQuizPlayThemeConfig(playTheme);
  const hasSessionIntro = courseQuizHasSessionIntro(playTheme);

  const [playPhase, setPlayPhase] = useState<ClassroomQuizPlayPhase>(() =>
    initialSessionPhase(playTheme, blocks[0]),
  );
  /** 開場 cut-in 結束後才淡入測驗內容 */
  const [sessionRevealed, setSessionRevealed] = useState(() => !hasSessionIntro);
  /** 開場結束後再延遲才掛載／播放題目影片（避免 intro 期間漏音） */
  const [videoPlaybackAllowed, setVideoPlaybackAllowed] = useState(() => !hasSessionIntro);
  const postIntroVideoTimerRef = useRef<number | null>(null);
  const showQuestionPanel =
    playPhase === 'question' || playPhase === 'vocabulary' || playPhase === 'outcome_popup';
  const [picked, setPicked] = useState<number | null>(null);
  const [answeredThis, setAnsweredThis] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [optionsLocked, setOptionsLocked] = useState(false);
  const [outcomeVideoUid, setOutcomeVideoUid] = useState<string | null>(null);
  const [outcomePopupText, setOutcomePopupText] = useState<string | null>(null);
  const [outcomeWasCorrect, setOutcomeWasCorrect] = useState<boolean | null>(null);
  const useFixedCanvas = true;

  const currentBlock = blocks[blockIndex];
  const current = currentBlock?.question;
  const total = blocks.length;

  useLayoutEffect(() => {
    if (!useFixedCanvas) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    const updateScale = () => {
      const h = viewport.clientHeight;
      if (h <= 0) return;
      // Match Stage1/2/3 old-game scaling:
      // fixed 1280x720 canvas, height-driven scale, top aligned.
      const next = h / CLASSROOM_QUIZ_CANVAS_BASE_HEIGHT;
      const clamped = Math.max(0.2, Math.min(next, 3));
      setCanvasScale((prev) => (Math.abs(prev - clamped) < 0.0001 ? prev : clamped));
    };
    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(viewport);
    window.addEventListener('resize', updateScale);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, [useFixedCanvas]);

  useEffect(() => bindClassroomQuizAudioRuntime(), []);

  useEffect(() => {
    return () => {
      if (postIntroVideoTimerRef.current !== null) {
        window.clearTimeout(postIntroVideoTimerRef.current);
      }
    };
  }, []);

  const characterMood = resolveQuizCharacterMood({
    phase: finished ? 'result' : 'play',
    answeredThis,
    isCorrect: answeredThis ? isCorrect : null,
    optionsAnswerable:
      ((playPhase === 'question' || playPhase === 'vocabulary') &&
        !optionsLocked &&
        picked === null) ||
      false,
  });

  const handleBack = useCallback(() => {
    router.push(`/learn/${courseId}`);
  }, [router, courseId]);

  const completeQuiz = useCallback(() => {
    startTransition(async () => {
      const res = await markCourseQuizComplete({ quizId: quiz.id, courseId });
      if (!res.error) {
        setEarnedXpThisSession(true);
        setFinished(true);
        router.refresh();
      }
    });
  }, [quiz.id, courseId, router]);

  const startBlock = useCallback(
    (index: number) => {
      const block = blocks[index];
      if (!block) return;
      setBlockIndex(index);
      setPlayPhase(initialPhaseForBlock(block));
      resetBlockAnswerState({
        setPicked,
        setAnsweredThis,
        setIsCorrect,
        setOptionsLocked,
        setOutcomeVideoUid,
        setOutcomePopupText,
        setOutcomeWasCorrect,
      });
    },
    [blocks],
  );

  const handleIntroComplete = useCallback(() => {
    const block = currentBlock;
    setPlayPhase(initialPhaseForBlock(block));
    requestAnimationFrame(() => setSessionRevealed(true));

    if (postIntroVideoTimerRef.current !== null) {
      window.clearTimeout(postIntroVideoTimerRef.current);
    }
    const hasVideo = Boolean(block?.question.cf_video_uid);
    if (hasVideo) {
      setVideoPlaybackAllowed(false);
      postIntroVideoTimerRef.current = window.setTimeout(() => {
        postIntroVideoTimerRef.current = null;
        setVideoPlaybackAllowed(true);
      }, CLASSROOM_QUIZ_POST_INTRO_VIDEO_DELAY_MS);
    } else {
      setVideoPlaybackAllowed(true);
    }
  }, [currentBlock]);

  const handleReplay = useCallback(() => {
    setIsReviewRun(true);
    setFinished(false);
    setBlockIndex(0);
    resetBlockAnswerState({
      setPicked,
      setAnsweredThis,
      setIsCorrect,
      setOptionsLocked,
      setOutcomeVideoUid,
      setOutcomePopupText,
      setOutcomeWasCorrect,
    });
    if (postIntroVideoTimerRef.current !== null) {
      window.clearTimeout(postIntroVideoTimerRef.current);
      postIntroVideoTimerRef.current = null;
    }
    if (hasSessionIntro) {
      setSessionRevealed(false);
      setVideoPlaybackAllowed(false);
    }
    setPlayPhase(
      hasSessionIntro ? 'intro' : initialPhaseForBlock(blocks[0]),
    );
  }, [blocks, hasSessionIntro]);

  const advanceToNextOrComplete = useCallback(() => {
    const isLast = blockIndex >= total - 1;
    if (isLast) {
      if (isReviewRun) {
        setIsReviewRun(false);
        setFinished(true);
        return;
      }
      completeQuiz();
      return;
    }
    startBlock(blockIndex + 1);
  }, [blockIndex, total, isReviewRun, completeQuiz, startBlock]);

  const onVideoEnded = useCallback(() => {
    if (playPhase === 'outcome_video') {
      setOutcomePopupText(outcomeWasCorrect ? 'WELL DONE！' : 'NICE TRY！');
      setPlayPhase('outcome_popup');
      return;
    }
    if (playPhase === 'video') {
      // 先進 question，讓題目語音播放後再由 play 進入 vocabulary
      setPlayPhase('question');
      return;
    }
  }, [playPhase, outcomeWasCorrect]);

  const onAnswerOutcome = useCallback(
    (correct: boolean) => {
      setOutcomeWasCorrect(correct);
      const uid = correct ? current?.cf_correct_video_uid : current?.cf_wrong_video_uid;
      if (uid) {
        setOutcomeVideoUid(uid);
        setOutcomePopupText(null);
        setPlayPhase('outcome_video');
        return;
      }
      setOutcomeVideoUid(null);
      setOutcomePopupText(correct ? 'WELL DONE！' : 'NICE TRY！');
      setPlayPhase('outcome_popup');
    },
    [current?.cf_correct_video_uid, current?.cf_wrong_video_uid],
  );

  const onDismissOutcomePopup = useCallback(() => {
    if (!outcomePopupText) return;
    setOutcomePopupText(null);
    setOutcomeVideoUid(null);
    setOutcomeWasCorrect(null);
    // vocab mode：完成結果後進下一題
    advanceToNextOrComplete();
  }, [outcomePopupText, advanceToNextOrComplete]);

  const onEnterVocabularyPhase = useCallback(() => {
    if (!isVocabularyMode) return;
    setPlayPhase('vocabulary');
  }, [isVocabularyMode]);

  useEffect(() => {
    if (playPhase !== 'video' && playPhase !== 'outcome_video') return;
    const block = blocks[blockIndex];
    if (playPhase === 'video' && !block?.question.cf_video_uid) {
      setPlayPhase('question');
      return;
    }
    const fallbackMs = 90_000;
    const timer = window.setTimeout(() => {
      if (playPhase === 'outcome_video') {
        setOutcomePopupText(outcomeWasCorrect ? 'WELL DONE！' : 'NICE TRY！');
        setPlayPhase('outcome_popup');
        return;
      }
      setPlayPhase('question');
    }, fallbackMs);
    return () => window.clearTimeout(timer);
  }, [playPhase, blockIndex, blocks, outcomeWasCorrect]);

  const onPickOptionBegin = useCallback(
    (index: number): boolean | null => {
      if (picked !== null || !current) return null;
      const correct = index === current.correct_index;
      setPicked(index);
      setIsCorrect(correct);
      setOptionsLocked(true);
      return correct;
    },
    [picked, current],
  );

  const onPickOptionReveal = useCallback(() => {
    setAnsweredThis(true);
  }, []);

  const onDismissFeedback = useCallback(() => {
    if (!answeredThis) return;
    if (outcomeVideoUid || outcomePopupText || playPhase === 'outcome_video' || playPhase === 'outcome_popup') {
      return;
    }
    advanceToNextOrComplete();
  }, [answeredThis, outcomeVideoUid, outcomePopupText, playPhase, advanceToNextOrComplete]);

  const shellToolbar = (
    <ClassroomQuizToolbar
      question={current ?? null}
      playPhase={playPhase}
      outcomeVideoUid={outcomeVideoUid}
    />
  );
  const classroomBgmCorner = (
    <ClassroomQuizBgmCornerToggle className="pointer-events-auto absolute bottom-3 right-3 z-[500] sm:bottom-4 sm:right-4" />
  );
  const fixedViewportStyle: CSSProperties | undefined = themeConfig.backgroundImageUrl
    ? {
        backgroundImage: `url(${themeConfig.backgroundImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }
    : undefined;

  if (blocks.length === 0 && !finished) {
    return (
      <GameShell
        title={quiz.title}
        onBack={handleBack}
        headerToolbarExtra={shellToolbar}
        cornerControl={classroomBgmCorner}
      >
        <p className="p-6 text-center text-sm text-muted-foreground">
          此測驗尚無題目，請聯絡導師。
        </p>
      </GameShell>
    );
  }

  if (finished) {
    return (
      <GameShell
        title={quiz.title}
        onBack={handleBack}
        headerToolbarExtra={shellToolbar}
        cornerControl={classroomBgmCorner}
      >
        <div className="classroom-quiz-finish">
          <p className="text-2xl font-bold text-emerald-700">測驗完成！</p>
          <p className="text-muted-foreground">
            {earnedXpThisSession
              ? `獲得 +${quiz.xp_reward} XP`
              : initialCompleted
                ? '你已完成此測驗。'
                : '進度已儲存。'}
          </p>
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
            <Button type="button" variant="secondary" onClick={handleReplay}>
              重溫測驗
            </Button>
            <Button type="button" onClick={handleBack}>
              返回課程
            </Button>
          </div>
          <p className="max-w-sm text-xs text-muted-foreground">
            重溫僅供複習練習，不會重複計分或獲得 XP。
          </p>
        </div>
      </GameShell>
    );
  }

  if (!current) {
    return (
      <GameShell
        title={quiz.title}
        onBack={handleBack}
        headerToolbarExtra={shellToolbar}
        cornerControl={classroomBgmCorner}
      >
        <p className="p-6 text-center text-sm text-muted-foreground">載入中…</p>
      </GameShell>
    );
  }

  return (
    <GameShell
      title={quiz.title}
      onBack={handleBack}
      headerToolbarExtra={shellToolbar}
      cornerControl={classroomBgmCorner}
    >
      {useFixedCanvas ? (
        <div className="relative flex min-h-0 flex-1">
          <div ref={viewportRef} className="classroom-quiz-fixed-viewport" style={fixedViewportStyle}>
            <div
              className="classroom-quiz-fixed-canvas"
              style={{ '--classroom-quiz-canvas-scale': canvasScale } as CSSProperties}
            >
              <ClassroomQuizThemeShell
                playTheme={playTheme}
                playPhase={playPhase}
                className="relative classroom-quiz-theme-shell--fixed"
              >
              {playPhase !== 'intro' ? (
                <ClassroomQuizPlay
                  isAdmin={isAdmin}
                  playTheme={playTheme}
                  interactionMode={interactionMode}
                  shapeTypefaceUrl={
                    (quiz as { shape_typeface_url?: string | null }).shape_typeface_url ?? null
                  }
                  quizTitle={quiz.title}
                  current={current}
                  cursor={blockIndex}
                  total={total}
                  playPhase={playPhase}
                  sessionRevealed={sessionRevealed}
                  videoPlaybackAllowed={videoPlaybackAllowed}
                  showQuestionPanel={showQuestionPanel}
                  outcomeVideoUid={outcomeVideoUid}
                  outcomePopupText={outcomePopupText}
                  onVideoEnded={onVideoEnded}
                  onEnterVocabularyPhase={onEnterVocabularyPhase}
                  picked={picked}
                  answeredThis={answeredThis}
                  isCorrect={isCorrect}
                  characterMood={characterMood}
                  onPickOptionBegin={onPickOptionBegin}
                  onPickOptionReveal={onPickOptionReveal}
                  onAnswerOutcome={onAnswerOutcome}
                  onDismissFeedback={onDismissFeedback}
                  onDismissOutcomePopup={onDismissOutcomePopup}
                />
              ) : null}
              {playPhase === 'intro' &&
              themeConfig.mascotBoyIntroImageUrl &&
              themeConfig.mascotGirlIntroImageUrl ? (
                <ClassroomQuizIntro
                  boyImageUrl={themeConfig.mascotBoyIntroImageUrl}
                  girlImageUrl={themeConfig.mascotGirlIntroImageUrl}
                  onComplete={handleIntroComplete}
                />
              ) : null}
              {pending ? (
                <div
                  className="absolute inset-0 z-50 flex items-center justify-center gap-2 bg-background/70 text-sm text-muted-foreground backdrop-blur-[1px]"
                  aria-busy
                  aria-live="polite"
                >
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                  儲存進度…
                </div>
              ) : null}
              </ClassroomQuizThemeShell>
            </div>
          </div>
        </div>
      ) : (
        <ClassroomQuizThemeShell
          playTheme={playTheme}
          playPhase={playPhase}
          className="relative"
        >
          {playPhase !== 'intro' ? (
            <ClassroomQuizPlay
              isAdmin={isAdmin}
              playTheme={playTheme}
              interactionMode={interactionMode}
              shapeTypefaceUrl={
                (quiz as { shape_typeface_url?: string | null }).shape_typeface_url ?? null
              }
              quizTitle={quiz.title}
              current={current}
              cursor={blockIndex}
              total={total}
              playPhase={playPhase}
              sessionRevealed={sessionRevealed}
              videoPlaybackAllowed={videoPlaybackAllowed}
              showQuestionPanel={showQuestionPanel}
              outcomeVideoUid={outcomeVideoUid}
              outcomePopupText={outcomePopupText}
              onVideoEnded={onVideoEnded}
              onEnterVocabularyPhase={onEnterVocabularyPhase}
              picked={picked}
              answeredThis={answeredThis}
              isCorrect={isCorrect}
              characterMood={characterMood}
              onPickOptionBegin={onPickOptionBegin}
              onPickOptionReveal={onPickOptionReveal}
              onAnswerOutcome={onAnswerOutcome}
              onDismissFeedback={onDismissFeedback}
              onDismissOutcomePopup={onDismissOutcomePopup}
            />
          ) : null}
          {playPhase === 'intro' &&
          themeConfig.mascotBoyIntroImageUrl &&
          themeConfig.mascotGirlIntroImageUrl ? (
            <ClassroomQuizIntro
              boyImageUrl={themeConfig.mascotBoyIntroImageUrl}
              girlImageUrl={themeConfig.mascotGirlIntroImageUrl}
              onComplete={handleIntroComplete}
            />
          ) : null}
          {pending ? (
            <div
              className="absolute inset-0 z-50 flex items-center justify-center gap-2 bg-background/70 text-sm text-muted-foreground backdrop-blur-[1px]"
              aria-busy
              aria-live="polite"
            >
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              儲存進度…
            </div>
          ) : null}
        </ClassroomQuizThemeShell>
      )}
    </GameShell>
  );
}
