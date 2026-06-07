'use client';

import { forwardRef, useEffect, useRef, useState } from 'react';
import { Alignment, Fit, Layout, useRive } from '@rive-app/react-canvas';

import {
  CLASSROOM_QUIZ_MASCOT_BOY_RIVE_SRC,
  CLASSROOM_QUIZ_MASCOT_BOY_SRC,
} from '@/lib/course-quiz/mascot-assets';
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

export const ClassroomQuizBoyMascotRive = forwardRef<HTMLDivElement, Props>(
  function ClassroomQuizBoyMascotRive({ mood, className }, ref) {
    const [usePngFallback, setUsePngFallback] = useState(false);
    const [mediaReady, setMediaReady] = useState(false);
    const [cheerNonce, setCheerNonce] = useState(0);
    const [wrongReactNonce, setWrongReactNonce] = useState(0);
    const prevMoodRef = useRef(mood);
    const reducedMotion = prefersReducedMotion();

    const { rive, RiveComponent } = useRive(
      {
        src: CLASSROOM_QUIZ_MASCOT_BOY_RIVE_SRC,
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
            'classroom-quiz-mascot-rive-fallback',
            mediaReady && 'classroom-quiz-mascot-rive--ready',
            className,
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={CLASSROOM_QUIZ_MASCOT_BOY_SRC}
            alt=""
            width={220}
            height={320}
            className="classroom-quiz-mascot-img"
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
          'classroom-quiz-mascot-rive',
          mediaReady && 'classroom-quiz-mascot-rive--ready',
          className,
        )}
      >
        <RiveComponent className="classroom-quiz-mascot-rive-canvas" aria-hidden />
      </div>
    );
  },
);
