'use client';

import { Fredoka } from 'next/font/google';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import '@/app/quiz-play-themes.css';
import '@/app/classroom-quiz-play.css';

import {
  ClassroomQuizAudioButton,
  useClassroomQuizAudioPlayer,
} from '@/components/classroom-quiz/classroom-quiz-audio';
import { ClassroomQuizHeader } from '@/components/classroom-quiz/classroom-quiz-header';
import { ClassroomQuizMascots } from '@/components/classroom-quiz/classroom-quiz-mascots';
import { ClassroomQuizOutcomeAnnounce } from '@/components/classroom-quiz/classroom-quiz-outcome-announce';
import { ClassroomQuizStreamPlayer } from '@/components/classroom-quiz/classroom-quiz-stream-player';
import { ClassroomQuizVocabularyDrop } from '@/components/classroom-quiz/classroom-quiz-vocabulary-drop';
import { getCourseQuizOptionColorsForTheme } from '@/lib/course-quiz/option-colors';
import { getCourseQuizPlayThemeConfig } from '@/lib/course-quiz/play-themes';
import { getQuizOptionButtonStyle } from '@/lib/games/quiz-theme-css-vars';
import type { ClassroomQuizPlayPhase } from '@/lib/course-quiz/play-phases';
import { resolveCourseQuizVocabularyDisplay } from '@/lib/course-quiz/vocabulary-display';
import type { CourseQuizInteractionMode, CourseQuizPlayTheme } from '@/types/database.types';
import type { QuizCharacterMood } from '@/lib/games/quiz-play-engine';
import type { ClassroomQuizQuestionPayload } from '@/lib/course-quiz/types';
import { emojiForOptionText } from '@/lib/quiz/option-decor';
import {
  playQuizAnswerCorrect,
  playQuizAnswerEncourage,
  playQuizVocabPickup,
  resumeQuizAudio,
} from '@/lib/quiz/rpg-audio';
import { stripChoiceLetterPrefix } from '@/lib/quiz/question-utils';
import { cn } from '@/lib/utils';

const fredoka = Fredoka({
  subsets: ['latin'],
  weight: ['600', '700'],
  display: 'swap',
});

const ANSWER_POPUP_AUTO_MS = 3000;
/** 答題音效播完後再顯示結果彈窗 */
const ANSWER_SFX_PAD_MS = 450;
/** 答題階段閒置多久後顯示思考提示氣泡 */
const ANSWER_THINKING_HINT_MS = 12_000;
/** 思考氣泡顯示多久後自動收起 */
const THINKING_BUBBLE_VISIBLE_MS = 4_500;

function cleanOption(opt: string): string {
  return (
    stripChoiceLetterPrefix(opt) ||
    opt.replace(/^\s*[A-Da-d][\.\)\uff0e]\s*/u, '').trim() ||
    opt
  );
}

function boyThinkingBubble(): string {
  return 'Hmm… what do you think?';
}

function girlThinkingBubble(): string {
  return 'Take your time! You got this!';
}

/** WELL DONE / NICE TRY 彈出後的幼兒向對話氣泡 */
function boyBubbleAfterOutcome(isCorrect: boolean): string | null {
  if (isCorrect) return 'Wow! You got it! So, so good!';
  return 'Oopsie! That is okay! Wanna try again?';
}

function girlBubbleAfterOutcome(isCorrect: boolean): string | null {
  if (isCorrect) return 'Yay! I am so happy for you! High five!';
  return 'Hey, you are doing great! Let us go again!';
}

export type ClassroomQuizPlayProps = {
  isAdmin?: boolean;
  playTheme: CourseQuizPlayTheme;
  interactionMode: CourseQuizInteractionMode;
  shapeTypefaceUrl?: string | null;
  quizTitle: string;
  current: ClassroomQuizQuestionPayload;
  cursor: number;
  total: number;
  playPhase: ClassroomQuizPlayPhase;
  /** 開場 cut-in 完成後才顯示內容 */
  sessionRevealed?: boolean;
  /** 開場結束後延遲才掛載題目影片（避免 intro 漏音） */
  videoPlaybackAllowed?: boolean;
  showQuestionPanel: boolean;
  outcomeVideoUid: string | null;
  outcomePopupText: string | null;
  onVideoEnded: () => void;
  onEnterVocabularyPhase: () => void;
  picked: number | null;
  answeredThis: boolean;
  isCorrect: boolean;
  characterMood: QuizCharacterMood;
  onPickOptionBegin: (index: number) => boolean | null;
  onPickOptionReveal: () => void;
  onAnswerOutcome: (correct: boolean) => void;
  onDismissFeedback: () => void;
  onDismissOutcomePopup: () => void;
};

export function ClassroomQuizPlay({
  isAdmin = false,
  playTheme,
  interactionMode,
  shapeTypefaceUrl,
  quizTitle,
  current,
  cursor,
  total,
  playPhase,
  sessionRevealed = true,
  videoPlaybackAllowed = true,
  showQuestionPanel,
  outcomeVideoUid,
  outcomePopupText,
  onVideoEnded,
  onEnterVocabularyPhase,
  picked,
  answeredThis,
  isCorrect,
  characterMood,
  onPickOptionBegin,
  onPickOptionReveal,
  onAnswerOutcome,
  onDismissFeedback,
  onDismissOutcomePopup,
}: ClassroomQuizPlayProps) {
  const themeConfig = getCourseQuizPlayThemeConfig(playTheme);
  const isVocabularyMode = interactionMode === 'vocabulary_drop';
  const questionVocabularyDisplay = resolveCourseQuizVocabularyDisplay(
    current.vocabulary_display,
  );
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLDivElement | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const sceneEl = sceneRef.current;
  const videoEl = videoRef.current;
  const stageEl = stageRef.current;
  const { playUrl, playUrlAndWait, stop, preloadUrls } = useClassroomQuizAudioPlayer();
  const pickFlowGenRef = useRef(0);
  const questionSpeechDoneRef = useRef<string | null>(null);
  const pendingQuestionSpeechRef = useRef<string | null>(null);

  useEffect(() => {
    questionSpeechDoneRef.current = null;
    pendingQuestionSpeechRef.current = null;
  }, [current.id]);

  useEffect(() => {
    preloadUrls([current.question_audio_url, ...current.option_audio_urls]);
  }, [current.id, current.question_audio_url, current.option_audio_urls, preloadUrls]);

  const attemptQuestionSpeech = useCallback(
    async (url: string | null | undefined): Promise<boolean> => {
      const trimmed = url?.trim() || null;
      if (!trimmed) return false;
      if (questionSpeechDoneRef.current === current.id) return true;

      await resumeQuizAudio();
      const started = await playUrl(trimmed);
      if (started) {
        questionSpeechDoneRef.current = current.id;
        pendingQuestionSpeechRef.current = null;
        return true;
      }
      pendingQuestionSpeechRef.current = trimmed;
      return false;
    },
    [current.id, playUrl],
  );

  const retryPendingQuestionSpeech = useCallback(() => {
    const url = pendingQuestionSpeechRef.current;
    if (!url || questionSpeechDoneRef.current === current.id) return;
    if (playPhase !== 'question' && playPhase !== 'vocabulary') return;
    void attemptQuestionSpeech(url);
  }, [attemptQuestionSpeech, current.id, playPhase]);

  const handleVideoPlaybackStarted = useCallback(() => {
    void resumeQuizAudio();
    if (playPhase === 'question' || playPhase === 'vocabulary') {
      retryPendingQuestionSpeech();
    }
  }, [playPhase, retryPendingQuestionSpeech]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const onPointerDown = () => retryPendingQuestionSpeech();
    scene.addEventListener('pointerdown', onPointerDown, { passive: true });
    return () => scene.removeEventListener('pointerdown', onPointerDown);
  }, [retryPendingQuestionSpeech]);

  useEffect(() => {
    const inOutcome =
      playPhase === 'outcome_video' ||
      playPhase === 'outcome_popup';

    if (inOutcome || answeredThis) {
      return;
    }

    const url = current.question_audio_url?.trim() || null;
    let cancelled = false;

    if (isVocabularyMode) {
      if (playPhase !== 'question') return;

      const enterVocab = () => {
        if (!cancelled) onEnterVocabularyPhase();
      };

      if (!url) {
        const timer = window.setTimeout(enterVocab, 400);
        return () => {
          cancelled = true;
          window.clearTimeout(timer);
        };
      }

      void (async () => {
        try {
          if (cancelled) return;
          const played = await playUrlAndWait(url);
          if (!played && !cancelled) pendingQuestionSpeechRef.current = url;
          else if (played) questionSpeechDoneRef.current = current.id;
        } finally {
          if (!cancelled) enterVocab();
        }
      })();

      return () => {
        cancelled = true;
        stop();
      };
    }

    if (playPhase !== 'question') return;
    if (!url) return;

    const timer = window.setTimeout(() => {
      if (!cancelled) void attemptQuestionSpeech(url);
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      stop();
    };
  }, [
    playPhase,
    current.id,
    current.question_audio_url,
    isVocabularyMode,
    answeredThis,
    onEnterVocabularyPhase,
    attemptQuestionSpeech,
    playUrlAndWait,
    stop,
  ]);

  useEffect(() => {
    pickFlowGenRef.current += 1;
  }, [current.id]);

  const handlePickOption = useCallback(
    (index: number) => {
      const flowGen = ++pickFlowGenRef.current;
      const correct = onPickOptionBegin(index);
      if (correct === null) return;

      void (async () => {
        stop();
        const answerUrl =
          current.option_audio_urls[index]?.trim() ||
          current.option_audio_urls[current.correct_index]?.trim() ||
          null;
        await playUrlAndWait(answerUrl);
        if (flowGen !== pickFlowGenRef.current) return;

        await resumeQuizAudio();
        if (flowGen !== pickFlowGenRef.current) return;

        if (correct) playQuizAnswerCorrect();
        else playQuizAnswerEncourage();

        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, ANSWER_SFX_PAD_MS);
        });
        if (flowGen !== pickFlowGenRef.current) return;

        onPickOptionReveal();
        onAnswerOutcome(correct);
      })();
    },
    [
      current.correct_index,
      current.option_audio_urls,
      onAnswerOutcome,
      onPickOptionBegin,
      onPickOptionReveal,
      playUrlAndWait,
      stop,
    ],
  );

  const handleVocabLetterPickup = useCallback(
    (index: number) => {
      const url = current.option_audio_urls[index]?.trim() || null;
      void playUrl(url);
      void resumeQuizAudio();
      playQuizVocabPickup();
    },
    [current.option_audio_urls, playUrl],
  );

  const handleVocabAnswer = useCallback(
    (index: number) => {
      const flowGen = ++pickFlowGenRef.current;
      const correct = onPickOptionBegin(index);
      if (correct === null) return;

      void (async () => {
        stop();
        const answerUrl =
          current.option_audio_urls[index]?.trim() ||
          current.option_audio_urls[current.correct_index]?.trim() ||
          null;
        await playUrlAndWait(answerUrl);
        if (flowGen !== pickFlowGenRef.current) return;

        await resumeQuizAudio();
        if (flowGen !== pickFlowGenRef.current) return;

        if (correct) playQuizAnswerCorrect();
        else playQuizAnswerEncourage();

        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, ANSWER_SFX_PAD_MS);
        });
        if (flowGen !== pickFlowGenRef.current) return;

        onPickOptionReveal();
        onAnswerOutcome(correct);
      })();
    },
    [
      current.correct_index,
      current.option_audio_urls,
      onAnswerOutcome,
      onPickOptionBegin,
      onPickOptionReveal,
      playUrlAndWait,
      stop,
    ],
  );

  const inOutcomeFlow =
    playPhase === 'outcome_video' ||
    playPhase === 'outcome_popup' ||
    Boolean(outcomeVideoUid) ||
    Boolean(outcomePopupText);

  const hasQuestionVideo = Boolean(current.cf_video_uid);
  const showingOutcomeClip = Boolean(
    outcomeVideoUid && (playPhase === 'outcome_video' || playPhase === 'outcome_popup'),
  );
  const hasVideo = hasQuestionVideo || showingOutcomeClip;
  const mountQuestionVideo =
    sessionRevealed &&
    videoPlaybackAllowed &&
    Boolean(current.cf_video_uid) &&
    !showingOutcomeClip;
  const mountOutcomeVideo = sessionRevealed && showingOutcomeClip && Boolean(outcomeVideoUid);
  const mountStreamPlayer = mountQuestionVideo || mountOutcomeVideo;
  const videoActive =
    sessionRevealed &&
    ((mountQuestionVideo && playPhase === 'video') ||
      (mountOutcomeVideo && playPhase === 'outcome_video'));

  const answersInteractive =
    playPhase === 'question' && !isVocabularyMode && !inOutcomeFlow;
  const showQuestionAudio =
    answersInteractive ||
    (isVocabularyMode && playPhase === 'vocabulary' && !answeredThis);
  const [vocabLayerDismissed, setVocabLayerDismissed] = useState(false);
  const [showThinkingHints, setShowThinkingHints] = useState(false);

  useEffect(() => {
    if (!answeredThis) {
      setVocabLayerDismissed(false);
      return;
    }
    const id = window.setTimeout(() => setVocabLayerDismissed(true), 480);
    return () => window.clearTimeout(id);
  }, [answeredThis]);

  const showVocabularyDrop =
    isVocabularyMode &&
    playPhase === 'vocabulary' &&
    !inOutcomeFlow &&
    (!answeredThis || !vocabLayerDismissed);

  const inAnswerPhase =
    !answeredThis &&
    picked === null &&
    !inOutcomeFlow &&
    (answersInteractive ||
      (isVocabularyMode && playPhase === 'vocabulary'));

  useEffect(() => {
    setShowThinkingHints(false);
    if (!inAnswerPhase) return;

    const showTimer = window.setTimeout(() => {
      setShowThinkingHints(true);
    }, ANSWER_THINKING_HINT_MS);

    return () => window.clearTimeout(showTimer);
  }, [inAnswerPhase, current.id, playPhase]);

  useEffect(() => {
    if (!showThinkingHints || !inAnswerPhase) return;

    const hideTimer = window.setTimeout(() => {
      setShowThinkingHints(false);
    }, THINKING_BUBBLE_VISIBLE_MS);

    return () => window.clearTimeout(hideTimer);
  }, [showThinkingHints, inAnswerPhase, current.id]);

  /** WELL DONE / NICE TRY 彈出後才顯示對話氣泡 */
  const showOutcomeDialogue = playPhase === 'outcome_popup' && answeredThis;
  const showThinkingDialogue = showThinkingHints && inAnswerPhase;
  /** 答對 WELL DONE 期間切換慶祝姿勢 PNG */
  const useCelebrateMascots =
    showOutcomeDialogue &&
    isCorrect &&
    themeConfig.useStaticMascots &&
    Boolean(themeConfig.mascotBoyCelebrateImageUrl && themeConfig.mascotGirlCelebrateImageUrl);
  /** 答錯 NICE TRY 期間切換加油姿勢 PNG */
  const useEncourageMascots =
    showOutcomeDialogue &&
    !isCorrect &&
    themeConfig.useStaticMascots &&
    Boolean(themeConfig.mascotBoyEncourageImageUrl && themeConfig.mascotGirlEncourageImageUrl);

  const mascotBoySrc = useCelebrateMascots
    ? themeConfig.mascotBoyCelebrateImageUrl!
    : useEncourageMascots
      ? themeConfig.mascotBoyEncourageImageUrl!
      : themeConfig.mascotBoyImageUrl;
  const mascotGirlSrc = useCelebrateMascots
    ? themeConfig.mascotGirlCelebrateImageUrl!
    : useEncourageMascots
      ? themeConfig.mascotGirlEncourageImageUrl!
      : themeConfig.mascotGirlImageUrl;

  const showPlayDialogue =
    (answersInteractive || showVocabularyDrop) && !showOutcomeDialogue;

  const popupOnVideo = hasVideo && Boolean(videoEl);
  const popupAnchorEl = popupOnVideo ? videoEl : stageEl ?? sceneEl;

  useEffect(() => {
    if (isVocabularyMode || inOutcomeFlow) return;
    if (!showQuestionPanel || !answeredThis) return;
    const timer = window.setTimeout(() => {
      onDismissFeedback();
    }, ANSWER_POPUP_AUTO_MS);
    return () => window.clearTimeout(timer);
  }, [
    isVocabularyMode,
    inOutcomeFlow,
    showQuestionPanel,
    answeredThis,
    current.id,
    onDismissFeedback,
  ]);

  const answerPopupPortal =
    !isVocabularyMode &&
    !inOutcomeFlow &&
    showQuestionPanel &&
    answeredThis &&
    popupAnchorEl &&
    createPortal(
      <div
        className={cn(
          'quiz-play-popup-overlay quiz-play-popup-overlay--scene',
          popupOnVideo && 'quiz-play-popup-overlay--video',
        )}
        role="dialog"
        aria-modal="true"
        onClick={onDismissFeedback}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onDismissFeedback();
        }}
      >
        <div className="quiz-play-popup-stack">
          {isCorrect ? (
            <p className="quiz-good-burst-text" aria-hidden>
              GOOD
            </p>
          ) : null}
          <div
            className={cn(
              'quiz-play-popup touch-manipulation',
              isCorrect ? 'quiz-play-popup--correct' : 'quiz-play-popup--wrong',
            )}
          >
            <p className="quiz-popup-headline">
              {isCorrect ? '🎉 答對了！' : '再想想看～'}
            </p>
            {current.explanation ? (
              <p className="quiz-popup-explanation">{current.explanation}</p>
            ) : null}
            <p className="quiz-popup-hint">3 秒後進入下一題 · 點擊可略過</p>
          </div>
        </div>
      </div>,
      popupAnchorEl,
    );

  return (
    <div className={cn(fredoka.className, 'classroom-quiz-root select-none')} data-classroom-quiz>
      <div
        ref={sceneRef}
        className={cn(
          'classroom-quiz-scene classroom-quiz-scene--embedded',
          showVocabularyDrop && 'classroom-quiz-scene--vocab-active',
          sessionRevealed
            ? 'classroom-quiz-scene--session-revealed'
            : 'classroom-quiz-scene--session-hidden',
        )}
        aria-hidden={!sessionRevealed}
      >
        <ClassroomQuizHeader
          playTheme={playTheme}
          quizTitle={quizTitle}
          cursor={cursor}
          total={total}
          showRepeatQuestion={showQuestionAudio}
          questionAudioUrl={current.question_audio_url}
          onRepeatQuestion={playUrl}
        />

        <div
          ref={stageRef}
          className={cn(
            'classroom-quiz-stage',
            !isVocabularyMode && 'classroom-quiz-stage--with-answers',
            isVocabularyMode && 'classroom-quiz-stage--vocab-only',
          )}
        >
          <div className="classroom-quiz-video-column">
            <div
              ref={videoRef}
              className="classroom-quiz-video-wrap classroom-quiz-video-wrap--relative"
            >
              {!hasQuestionVideo && !mountOutcomeVideo ? (
                <div className="classroom-quiz-video-placeholder">此題尚無影片</div>
              ) : mountStreamPlayer ? (
                <ClassroomQuizStreamPlayer
                  videoUid={(mountOutcomeVideo ? outcomeVideoUid : current.cf_video_uid)!}
                  active={videoActive}
                  onEnded={onVideoEnded}
                  onPlaybackStarted={handleVideoPlaybackStarted}
                />
              ) : (
                <div className="classroom-quiz-video-placeholder" aria-hidden />
              )}
              {playPhase !== 'outcome_popup' ? (
                <div
                  className={cn(
                    'classroom-quiz-question-panel',
                    (!answersInteractive || inOutcomeFlow) &&
                      'classroom-quiz-question-panel--preview',
                  )}
                >
                  <p className="classroom-quiz-question-text">{current.question_text}</p>
                </div>
              ) : null}
              {outcomePopupText ? (
                <ClassroomQuizOutcomeAnnounce
                  text={outcomePopupText}
                  correct={isCorrect}
                  onDone={onDismissOutcomePopup}
                />
              ) : null}
            </div>

          </div>

          <div
            className={cn(
              'classroom-quiz-answers-zone',
              isVocabularyMode && 'classroom-quiz-answers-zone--hidden',
              !answersInteractive && !isVocabularyMode && 'classroom-quiz-answers-zone--preview',
            )}
            aria-hidden={isVocabularyMode}
          >
            <div ref={boardRef} className="classroom-quiz-board">
              <div className="classroom-quiz-board-body">
                {!isVocabularyMode ? (
                  <div
                    className={cn(
                      'quiz-play-options classroom-quiz-options',
                      current.option_count === 3 && 'classroom-quiz-options--three',
                      answeredThis && 'quiz-play-answered',
                      !answersInteractive && 'classroom-quiz-options--preview',
                    )}
                    style={{
                      gridTemplateColumns:
                        current.option_count === 3
                          ? 'repeat(3, minmax(0, 1fr))'
                          : 'repeat(2, minmax(0, 1fr))',
                    }}
                    inert={!answersInteractive || picked !== null}
                    onClick={(e) => {
                      if (!answersInteractive) return;
                      const el = (e.target as HTMLElement | null)?.closest?.(
                        '[data-option-index]',
                      ) as HTMLElement | null;
                      const raw = el?.dataset?.optionIndex;
                      const idx = raw === undefined ? NaN : Number.parseInt(raw, 10);
                      const maxIdx = current.options.length - 1;
                      if (!Number.isInteger(idx) || idx < 0 || idx > maxIdx) return;
                      handlePickOption(idx);
                    }}
                  >
                    {current.options.map((opt, i) => {
                      const label = cleanOption(opt);
                      const decor = emojiForOptionText(label);
                      const isSel = picked === i;
                      const showTruth = answeredThis;
                      const isAns = i === current.correct_index;
                      const optColors = getCourseQuizOptionColorsForTheme(playTheme, i);
                      const optStyle = getQuizOptionButtonStyle(optColors, {
                        picked: isSel && !showTruth,
                        revealed: showTruth,
                        correct: showTruth && isAns,
                        wrong: showTruth && isSel && !isAns,
                      });

                      return (
                        <button
                          key={`${current.id}-${i}`}
                          type="button"
                          data-option-index={String(i)}
                          className={cn(
                            'quiz-play-opt',
                            isSel && !showTruth && 'is-picked',
                            showTruth && 'is-revealed',
                            showTruth && isAns && 'is-correct',
                            showTruth && isSel && !isAns && 'is-wrong',
                          )}
                          style={optStyle}
                        >
                          <span className="quiz-play-opt-badge">
                            {String.fromCharCode(65 + i)}
                          </span>
                      <span className="flex flex-1 items-center gap-1.5 min-w-0">
                        {decor && (
                          <span className="quiz-play-opt-emoji">{decor}</span>
                        )}
                        <span
                          className={cn(
                            'quiz-play-opt-label truncate',
                            themeConfig.useSiteSecondaryOptions
                              ? 'font-semibold text-secondary-foreground'
                              : 'quiz-cute-stroke-text',
                          )}
                        >
                          {label}
                        </span>
                        <ClassroomQuizAudioButton
                          url={current.option_audio_urls[i]}
                          label={`播放選項 ${String.fromCharCode(65 + i)} 語音`}
                          className="pointer-events-auto"
                          onPlay={playUrl}
                        />
                      </span>
                          {showTruth && isAns && (
                            <CheckCircle2
                              className="absolute -right-1 -top-1 size-7 fill-[#22c55e] text-white"
                              aria-hidden
                            />
                          )}
                          {showTruth && isSel && !isAns && (
                            <XCircle
                              className="absolute -right-1 -top-1 size-7 text-[#ef4444]"
                              aria-hidden
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>

            {themeConfig.showMascots && sessionRevealed ? (
              <ClassroomQuizMascots
                sceneRef={sceneRef}
                stageRef={stageRef}
                videoRef={videoRef}
                boardRef={boardRef}
                layoutKey={`${current.id}:${videoPlaybackAllowed ? 'video-on' : 'video-off'}`}
                useStaticMascots={themeConfig.useStaticMascots}
                mascotBoyImageUrl={mascotBoySrc}
                mascotGirlImageUrl={mascotGirlSrc}
                mascotWidthScale={themeConfig.mascotWidthScale}
                characterMood={characterMood}
                boyBubble={
                  showOutcomeDialogue
                    ? boyBubbleAfterOutcome(isCorrect)
                    : showThinkingDialogue
                      ? boyThinkingBubble()
                      : null
                }
                girlBubble={
                  showOutcomeDialogue
                    ? girlBubbleAfterOutcome(isCorrect)
                    : showThinkingDialogue
                      ? girlThinkingBubble()
                      : null
                }
                dialogueTone={
                  showOutcomeDialogue
                    ? 'outcome'
                    : showThinkingDialogue
                      ? 'thinking'
                      : 'play'
                }
                outcomeBubbleVariant={
                  showOutcomeDialogue ? (isCorrect ? 'celebrate' : 'encourage') : undefined
                }
              />
            ) : null}
          </div>
        </div>

        {showVocabularyDrop ? (
          <ClassroomQuizVocabularyDrop
            key={`${current.id}-vocab`}
            isAdmin={isAdmin}
            playTheme={playTheme}
            displayMode={questionVocabularyDisplay}
            shapeTypefaceUrl={shapeTypefaceUrl}
            optionTexts={current.options}
            optionImageUrls={current.option_image_urls}
            optionShapeGlyphs={current.option_shape_glyphs}
            correctIndex={current.correct_index}
            sceneRef={sceneRef}
            videoRef={videoRef}
            freezeThreeCanvas={answeredThis && !vocabLayerDismissed}
            onLetterPickup={handleVocabLetterPickup}
            onAnswer={handleVocabAnswer}
          />
        ) : null}
      </div>
      {answerPopupPortal}
    </div>
  );
}
