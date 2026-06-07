'use client';

import { Fredoka } from 'next/font/google';
import { CheckCircle2, Star, XCircle } from 'lucide-react';
import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';

import '@/app/quiz-play-themes.css';

import { QuizForestAtmosphere } from '@/components/quiz/quiz-forest-atmosphere';
import { QuizQuestionMascots } from '@/components/quiz/quiz-question-mascots';
import { QuizProgressStar } from '@/components/quiz/quiz-progress-star';
import { QuizQuestionTypewriter } from '@/components/quiz/quiz-question-typewriter';
import {
  getQuizOptionButtonStyle,
  getQuizOptionColors,
  getQuizThemeRootStyle,
} from '@/lib/games/quiz-theme-css-vars';
import { DEFAULT_QUIZ_VISUAL_THEME, QUIZ_VISUAL_THEMES } from '@/lib/games/quiz-visual-themes';
import type { QuizCharacterMood } from '@/lib/games/quiz-play-engine';
import { emojiForOptionText } from '@/lib/quiz/option-decor';
import { stripChoiceLetterPrefix } from '@/lib/quiz/question-utils';
import { QUIZ_PLAY_PREWARM_QUESTION_ID, QUIZ_QUESTIONS_PER_ROUND } from '@/lib/quiz/constants';
import type { QuizQuestionPayload } from '@/lib/quiz/types';
import type { QuizDifficultyLevel } from '@/types/database.types';
import { cn } from '@/lib/utils';

const fredoka = Fredoka({
  subsets: ['latin'],
  weight: ['600', '700'],
  display: 'swap',
});

const QUIZ_CANVAS_BASE_WIDTH = 1280;
const QUIZ_CANVAS_BASE_HEIGHT = 720;

function cleanOption(opt: string): string {
  return (
    stripChoiceLetterPrefix(opt) ||
    opt.replace(/^\s*[A-Da-d][\.\)\uff0e]\s*/u, '').trim() ||
    opt
  );
}


function boyBubble(mood: QuizCharacterMood, isCorrect: boolean): string | null {
  if (mood === 'correct') return 'Yay! 👍';
  if (mood === 'wrong') return 'Oh…';
  if (mood === 'thinking') return 'Hmm?';
  if (isCorrect) return 'Yay!';
  return null;
}

function girlBubble(mood: QuizCharacterMood): string | null {
  if (mood === 'correct' || mood === 'celebrate') return 'Great Job!';
  if (mood === 'wrong') return 'Try again!';
  return null;
}

const BEAR_BUBBLES = {
  correct: [
    'Nature King! 👑',
    'Forest champion!',
    'Roar-some! 🐻',
    'Bearilliant!',
    'You rule the woods!',
    'Majestic answer!',
  ],
  wrong: [
    'Try again!',
    'Almost there!',
    'One more go!',
    "Don't give up!",
    'So close!',
    'Shake it off!',
  ],
  thinking: [
    'Hmm?',
    'Tricky one…',
    'Let me sniff…',
    'Thinking cap on!',
    'Woodsy puzzle…',
    'Bear with me…',
  ],
  celebrate: [
    'Victory roar! 🎉',
    'King of the forest!',
    'Legendary bear!',
    'Honey sweet win!',
  ],
} as const;

function pickBearLine(lines: readonly string[], seed: number): string {
  const i = ((seed % lines.length) + lines.length) % lines.length;
  return lines[i]!;
}

function bearBubble(
  mood: QuizCharacterMood,
  isCorrect: boolean,
  seed: number,
): string | null {
  if (mood === 'correct') return pickBearLine(BEAR_BUBBLES.correct, seed);
  if (mood === 'wrong') return pickBearLine(BEAR_BUBBLES.wrong, seed);
  if (mood === 'celebrate') return pickBearLine(BEAR_BUBBLES.celebrate, seed);
  if (mood === 'thinking') return pickBearLine(BEAR_BUBBLES.thinking, seed);
  if (isCorrect) return pickBearLine(BEAR_BUBBLES.correct, seed + 1);
  return null;
}

const PREWARM_PLACEHOLDER_QUESTION: QuizQuestionPayload = {
  id: QUIZ_PLAY_PREWARM_QUESTION_ID,
  difficulty: 'elementary',
  question_text: '',
  options: ['A', 'B', 'C', 'D'],
  correct_index: 0,
  explanation: '',
};

export type ThemedQuizPlayProps = {
  embedded?: boolean;
  /** 開場／STAGE 期間畫外掛載；與 play 共用同一 Rive 實例 */
  prewarm?: boolean;
  current: QuizQuestionPayload;
  cursor: number;
  total: number;
  questionText: string;
  optionsAnswerable: boolean;
  onQuestionTypingComplete: () => void;
  picked: number | null;
  answeredThis: boolean;
  isCorrect: boolean;
  /** 長度為 total；true 表示該題曾答對，對應星星持續發光 */
  starsCorrect: boolean[];
  /** 即時總分（滿分 100） */
  score100: number;
  difficulty: QuizDifficultyLevel;
  characterMood: QuizCharacterMood;
  aiTauntLine: string | null;
  holdMessageTarget: string | null;
  holdTyped: string;
  onPickOption: (index: number) => void;
  onHoldPointerDown: (e: React.PointerEvent) => void;
  onHoldPointerUp: () => void;
  onHoldPointerCancel: () => void;
  onHoldTouchStart: (e: React.TouchEvent) => void;
  onHoldTouchEnd: (e: React.TouchEvent) => void;
  onHoldTouchCancel: (e: React.TouchEvent) => void;
};

export function ThemedQuizPlay(props: ThemedQuizPlayProps) {
  const themeId = DEFAULT_QUIZ_VISUAL_THEME;
  const theme = QUIZ_VISUAL_THEMES[themeId];
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [canvasScale, setCanvasScale] = useState(1);
  const {
    embedded = false,
    prewarm = false,
    current,
    cursor,
    total,
    questionText,
    optionsAnswerable,
    onQuestionTypingComplete,
    picked,
    answeredThis,
    isCorrect,
    starsCorrect,
    score100,
    difficulty,
    characterMood,
    aiTauntLine,
    holdMessageTarget,
    holdTyped,
    onPickOption,
    onHoldPointerDown,
    onHoldPointerUp,
    onHoldPointerCancel,
    onHoldTouchStart,
    onHoldTouchEnd,
    onHoldTouchCancel,
  } = props;

  const starsCompleted = cursor + (answeredThis ? 1 : 0);
  const themeStyle = getQuizThemeRootStyle(themeId);
  const sceneEl = sceneRef.current;
  const displayMood = prewarm ? 'idle' : characterMood;
  const prewarmTotal = total || QUIZ_QUESTIONS_PER_ROUND;
  const useFixedCanvas = !prewarm;

  useLayoutEffect(() => {
    if (!useFixedCanvas) return;
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateScale = () => {
      const w = viewport.clientWidth;
      const h = viewport.clientHeight;
      if (w <= 0 || h <= 0) return;
      const next = h / QUIZ_CANVAS_BASE_HEIGHT;
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

  const answerPopupPortal =
    !prewarm &&
    answeredThis &&
    sceneEl &&
    createPortal(
      <div
        className="quiz-play-popup-overlay quiz-play-popup-overlay--scene"
        data-quiz-hold-feedback
        role="dialog"
        aria-modal="true"
        aria-labelledby="quiz-popup-title"
        onPointerDown={onHoldPointerDown}
        onPointerUp={onHoldPointerUp}
        onPointerCancel={onHoldPointerCancel}
        onTouchStart={onHoldTouchStart}
        onTouchEnd={onHoldTouchEnd}
        onTouchCancel={onHoldTouchCancel}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="quiz-play-popup-stack">
          {isCorrect ? (
            <p
              className="quiz-good-burst-text"
              key={`good-${cursor}-${picked}`}
              aria-hidden
            >
              GOOD
            </p>
          ) : null}
          <div
            className={cn(
              'quiz-play-popup touch-manipulation',
              isCorrect ? 'quiz-play-popup--correct' : 'quiz-play-popup--wrong',
            )}
          >
          <p id="quiz-popup-title" className="quiz-popup-headline">
            {isCorrect ? '🎉 答對了！' : '再想想看～'}
          </p>
          <p className="quiz-popup-hint">長按此視窗暫停 · 鬆開繼續</p>
          {holdMessageTarget && holdTyped ? (
            <p className="quiz-popup-hold-line">{holdTyped}</p>
          ) : null}
          {aiTauntLine ? <p className="quiz-popup-taunt">{aiTauntLine}</p> : null}
          <p className="quiz-popup-explanation">{current.explanation}</p>
          </div>
        </div>
      </div>,
      sceneEl,
    );

  return (
    <div
      className={cn(
        fredoka.className,
        'quiz-play-root select-none',
        prewarm && 'quiz-play-root--prewarm',
        useFixedCanvas ? 'quiz-play-root--fixed' : embedded ? 'flex min-h-0 flex-1 flex-col' : 'mx-auto w-full max-w-4xl px-2 py-2',
        embedded && useFixedCanvas && 'quiz-play-root--embedded',
      )}
      style={themeStyle}
      data-quiz-play-area
      data-quiz-theme={themeId}
      aria-hidden={prewarm || undefined}
    >
      {useFixedCanvas ? (
        <div ref={viewportRef} className="quiz-play-fixed-viewport">
          <div
            className="quiz-play-fixed-canvas"
            style={{ '--quiz-canvas-scale': canvasScale } as CSSProperties}
          >
            <div
              ref={sceneRef}
              className={cn('quiz-play-scene quiz-play-scene--fixed')}
            >
              <QuizForestAtmosphere />
              <div className="quiz-play-inner">
                <header className="text-center">
                  <h2 className="quiz-bubble-title">
                    <span className="quiz-title-line-1">English</span>{' '}
                    <span className="quiz-title-line-2">quiz</span>{' '}
                    <span className="quiz-title-line-3">adventure</span>
                  </h2>
                </header>

                <div
                  ref={boardRef}
                  className="quiz-play-board"
                  style={{
                    marginTop: '0.75rem',
                    borderColor: themeStyle['--qp-board-border'],
                    background: themeStyle['--qp-board-bg'],
                    boxShadow: themeStyle['--qp-board-shadow'],
                  }}
                >
                  <div
                    className="quiz-play-status-bar"
                    style={{ background: themeStyle['--qp-status-bg'] }}
                  >
                    <span className="quiz-status-stroke-text">
                      Question {prewarm ? 1 : cursor + 1} of {prewarm ? prewarmTotal : total}
                    </span>
                    {!prewarm ? (
                      <span className="quiz-status-score quiz-status-stroke-text">
                        總分 {score100}/100
                        <Star className="quiz-status-star size-6 sm:size-7" fill="currentColor" aria-hidden />
                      </span>
                    ) : null}
                  </div>

                  <div className="quiz-play-board-body">
                  {prewarm && (
                    <div className="quiz-play-stage-placeholder" style={{ minHeight: '10rem' }} />
                  )}
                  {!prewarm && (
                  <div
                    className={cn('quiz-play-stage', answeredThis && 'quiz-play-answered')}
                  >
                    <div className="quiz-play-stage-content">
                      <div className="quiz-play-question">
                        <QuizQuestionTypewriter
                          questionKey={current.id}
                          text={questionText}
                          onTypingComplete={onQuestionTypingComplete}
                        />
                      </div>

                      <div className="relative">
                        <div
                          className="quiz-play-options"
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                            gap: '0.625rem',
                            marginTop: '0.75rem',
                          }}
                          inert={picked !== null}
                          onClick={(e) => {
                            const el = (e.target as HTMLElement | null)?.closest?.(
                              '[data-option-index]',
                            ) as HTMLElement | null;
                            const raw = el?.dataset?.optionIndex;
                            const idx = raw === undefined ? NaN : Number.parseInt(raw, 10);
                            if (!Number.isInteger(idx) || idx < 0 || idx > 3) return;
                            onPickOption(idx);
                          }}
                        >
                          {current.options.map((opt, i) => {
                        const label = cleanOption(opt);
                        const decor = emojiForOptionText(label);
                        const isSel = picked === i;
                        const showTruth = answeredThis;
                        const isAns = i === Number(current.correct_index);
                        const optColors = getQuizOptionColors(themeId, i);
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
                            data-opt={String(i)}
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
                            <span className="flex flex-1 items-center gap-1.5">
                              {decor && <span className="quiz-play-opt-emoji">{decor}</span>}
                              <span className="quiz-play-opt-label quiz-cute-stroke-text">{label}</span>
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
                        {!optionsAnswerable && (
                          <div
                            className="absolute inset-0 z-10 cursor-wait touch-none"
                            aria-hidden
                          />
                        )}
                      </div>
                    </div>

                  </div>
                  )}

                  {!prewarm && (
                  <footer className="mt-4 text-center">
                    <div
                      className="flex flex-wrap justify-center gap-1"
                      aria-label={`${starsCompleted}/${total}`}
                    >
                      {Array.from({ length: total }, (_, i) => {
                        const filled = i < starsCompleted;
                        const color = theme.starFilled[i % theme.starFilled.length];
                        return (
                          <QuizProgressStar
                            key={i}
                            filled={filled}
                            correct={filled && starsCorrect[i] === true}
                            fillColor={color}
                            className="size-6 sm:size-7"
                          />
                        );
                      })}
                    </div>
                    <p className="quiz-play-footer-text">Keep going, Super Star! ⭐</p>
                  </footer>
                  )}
                  </div>
                </div>
              </div>

              {answerPopupPortal}

              <QuizQuestionMascots
                sceneRef={sceneRef}
                boardRef={boardRef}
                characterMood={displayMood}
                bearBubble={
                  prewarm ? null : bearBubble(characterMood, isCorrect, cursor * 11 + (picked ?? 0))
                }
                boyBubble={prewarm ? null : boyBubble(characterMood, isCorrect)}
                girlBubble={prewarm ? null : girlBubble(characterMood)}
              />
            </div>
          </div>
        </div>
      ) : (
        <div
          ref={sceneRef}
          className={cn('quiz-play-scene', embedded && 'quiz-play-scene--embedded')}
        >
          <QuizForestAtmosphere />
          <div className="quiz-play-inner">
          <header className="text-center">
            <h2 className="quiz-bubble-title">
              <span className="quiz-title-line-1">English</span>{' '}
              <span className="quiz-title-line-2">quiz</span>{' '}
              <span className="quiz-title-line-3">adventure</span>
            </h2>
          </header>

          <div
            ref={boardRef}
            className="quiz-play-board"
            style={{
              marginTop: '0.75rem',
              borderColor: themeStyle['--qp-board-border'],
              background: themeStyle['--qp-board-bg'],
              boxShadow: themeStyle['--qp-board-shadow'],
            }}
          >
            <div
              className="quiz-play-status-bar"
              style={{ background: themeStyle['--qp-status-bg'] }}
            >
              <span className="quiz-status-stroke-text">
                Question {prewarm ? 1 : cursor + 1} of {prewarm ? prewarmTotal : total}
              </span>
              {!prewarm ? (
                <span className="quiz-status-score quiz-status-stroke-text">
                  總分 {score100}/100
                  <Star className="quiz-status-star size-6 sm:size-7" fill="currentColor" aria-hidden />
                </span>
              ) : null}
            </div>

            <div className="quiz-play-board-body">
            {prewarm && (
              <div className="quiz-play-stage-placeholder" style={{ minHeight: '10rem' }} />
            )}
            {!prewarm && (
            <div
              className={cn('quiz-play-stage', answeredThis && 'quiz-play-answered')}
            >
              <div className="quiz-play-stage-content">
                <div className="quiz-play-question">
                  <QuizQuestionTypewriter
                    questionKey={current.id}
                    text={questionText}
                    onTypingComplete={onQuestionTypingComplete}
                  />
                </div>

                <div className="relative">
                  <div
                    className="quiz-play-options"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                      gap: '0.625rem',
                      marginTop: '0.75rem',
                    }}
                    inert={picked !== null}
                    onClick={(e) => {
                      const el = (e.target as HTMLElement | null)?.closest?.(
                        '[data-option-index]',
                      ) as HTMLElement | null;
                      const raw = el?.dataset?.optionIndex;
                      const idx = raw === undefined ? NaN : Number.parseInt(raw, 10);
                      if (!Number.isInteger(idx) || idx < 0 || idx > 3) return;
                      onPickOption(idx);
                    }}
                  >
                    {current.options.map((opt, i) => {
                  const label = cleanOption(opt);
                  const decor = emojiForOptionText(label);
                  const isSel = picked === i;
                  const showTruth = answeredThis;
                  const isAns = i === Number(current.correct_index);
                  const optColors = getQuizOptionColors(themeId, i);
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
                      data-opt={String(i)}
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
                      <span className="flex flex-1 items-center gap-1.5">
                        {decor && <span className="quiz-play-opt-emoji">{decor}</span>}
                        <span className="quiz-play-opt-label quiz-cute-stroke-text">{label}</span>
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
                  {!optionsAnswerable && (
                    <div
                      className="absolute inset-0 z-10 cursor-wait touch-none"
                      aria-hidden
                    />
                  )}
                </div>
              </div>

            </div>
            )}

            {!prewarm && (
            <footer className="mt-4 text-center">
              <div
                className="flex flex-wrap justify-center gap-1"
                aria-label={`${starsCompleted}/${total}`}
              >
                {Array.from({ length: total }, (_, i) => {
                  const filled = i < starsCompleted;
                  const color = theme.starFilled[i % theme.starFilled.length];
                  return (
                    <QuizProgressStar
                      key={i}
                      filled={filled}
                      correct={filled && starsCorrect[i] === true}
                      fillColor={color}
                      className="size-6 sm:size-7"
                    />
                  );
                })}
              </div>
              <p className="quiz-play-footer-text">Keep going, Super Star! ⭐</p>
            </footer>
            )}
            </div>
          </div>
        </div>

        {answerPopupPortal}

        <QuizQuestionMascots
          sceneRef={sceneRef}
          boardRef={boardRef}
          characterMood={displayMood}
          bearBubble={
            prewarm ? null : bearBubble(characterMood, isCorrect, cursor * 11 + (picked ?? 0))
          }
          boyBubble={prewarm ? null : boyBubble(characterMood, isCorrect)}
          girlBubble={prewarm ? null : girlBubble(characterMood)}
        />

        </div>
      )}
    </div>
  );
}

export { PREWARM_PLACEHOLDER_QUESTION };

/** @deprecated 使用 ThemedQuizPlay */
export const SuperFunQuizPlay = ThemedQuizPlay;
export type SuperFunQuizPlayProps = ThemedQuizPlayProps;
