'use client';

import { forwardRef, useEffect, useRef, useState } from 'react';
import { Alignment, Fit, Layout, useRive } from '@rive-app/react-canvas';

import { QUIZ_MASCOT_BEAR_RIVE_SRC, QUIZ_MASCOT_BEAR_SRC } from '@/lib/games/registry';
import { fireRiveTrigger } from '@/lib/games/rive-trigger';
import { SUPER_FUN_RIVE } from '@/lib/games/super-fun-rive-manifest';
import type { QuizCharacterMood } from '@/lib/games/quiz-play-engine';
import { prefersReducedMotion } from '@/lib/games/flags';
import { cn } from '@/lib/utils';

function moodToRive(mood: QuizCharacterMood): number {
  return SUPER_FUN_RIVE.moodValues[mood];
}

type Props = {
  mood: QuizCharacterMood;
  className?: string;
};

/**
 * 答題場景熊吉祥物：優先 Rive（bear_idle），失敗時回退 PNG。
 * 答對觸發 `cheer`、答錯觸發 `stupid`（State Machine 建議命名 `Main`）。
 */
export const QuizBearMascotRive = forwardRef<HTMLDivElement, Props>(function QuizBearMascotRive(
  { mood, className },
  ref,
) {
  const [usePngFallback, setUsePngFallback] = useState(false);
  const [mediaReady, setMediaReady] = useState(false);
  const [cheerNonce, setCheerNonce] = useState(0);
  const [wrongReactNonce, setWrongReactNonce] = useState(0);
  const prevMoodRef = useRef(mood);
  const reducedMotion = prefersReducedMotion();

  const { rive, RiveComponent } = useRive(
    {
      src: QUIZ_MASCOT_BEAR_RIVE_SRC,
      stateMachines: SUPER_FUN_RIVE.stateMachine,
      autoplay: !reducedMotion,
      layout: new Layout({
        fit: Fit.Contain,
        alignment: Alignment.BottomCenter,
      }),
      onLoad: () => setMediaReady(true),
      onLoadError: () => setUsePngFallback(true),
    },
    { shouldResizeCanvasToContainer: true },
  );

  useEffect(() => {
    const prev = prevMoodRef.current;
    prevMoodRef.current = mood;
    if (mood === 'correct' && prev !== 'correct') {
      setCheerNonce((n) => n + 1);
    }
    if (mood === 'wrong' && prev !== 'wrong') {
      setWrongReactNonce((n) => n + 1);
    }
  }, [mood]);

  useEffect(() => {
    if (!rive || usePngFallback) return;
    const sm = SUPER_FUN_RIVE.stateMachine;
    const inputs = rive.stateMachineInputs(sm);
    if (!inputs?.length) return;
    const moodInput = inputs.find((i) => i.name === SUPER_FUN_RIVE.inputs.mood);
    if (moodInput && 'value' in moodInput) {
      moodInput.value = moodToRive(mood);
    }
  }, [rive, mood, usePngFallback]);

  useEffect(() => {
    if (!rive || usePngFallback || cheerNonce === 0) return;
    fireRiveTrigger(rive, SUPER_FUN_RIVE.inputs.cheer);
  }, [rive, usePngFallback, cheerNonce]);

  useEffect(() => {
    if (!rive || usePngFallback || wrongReactNonce === 0) return;
    fireRiveTrigger(rive, SUPER_FUN_RIVE.inputs.stupid);
  }, [rive, usePngFallback, wrongReactNonce]);

  if (usePngFallback || reducedMotion) {
    return (
      <div
        ref={ref}
        className={cn(
          'quiz-play-mascot-rive-fallback quiz-play-mascot-rive--bear',
          mediaReady && 'quiz-play-mascot-rive--ready',
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={QUIZ_MASCOT_BEAR_SRC}
          alt=""
          width={280}
          height={240}
          className="quiz-play-mascot-img"
          draggable={false}
          onLoad={() => setMediaReady(true)}
        />
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={cn(
        'quiz-play-mascot-rive quiz-play-mascot-rive--bear',
        mediaReady && 'quiz-play-mascot-rive--ready',
        className,
      )}
    >
      <RiveComponent className="quiz-play-mascot-rive-canvas" aria-hidden />
    </div>
  );
});
