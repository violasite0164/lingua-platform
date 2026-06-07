'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { RiveStage } from '@/components/games/rive-stage';
import { isRiveQuizEnabled, prefersReducedMotion } from '@/lib/games/flags';
import { SUPER_FUN_RIVE, type SuperFunRiveSlot } from '@/lib/games/super-fun-rive-manifest';
import type { QuizCharacterMood } from '@/lib/games/quiz-play-engine';
import { cn } from '@/lib/utils';

function moodToRive(mood: QuizCharacterMood): number {
  return SUPER_FUN_RIVE.moodValues[mood];
}

export function RiveMascotSlot({
  slot,
  mood,
  fallbackEmoji,
  fallbackLabel,
  className,
  bubbleText,
  bubbleSide = 'top',
}: {
  slot: SuperFunRiveSlot;
  mood: QuizCharacterMood;
  fallbackEmoji: string;
  fallbackLabel: string;
  className?: string;
  bubbleText?: string | null;
  bubbleSide?: 'top' | 'left' | 'right';
}) {
  const tryRive = isRiveQuizEnabled() && !prefersReducedMotion();
  const [useFallback, setUseFallback] = useState(!tryRive);
  const src = useMemo(() => SUPER_FUN_RIVE.assets[slot].src(), [slot]);

  const [reactNonce, setReactNonce] = useState(0);
  const prevMoodRef = useRef(mood);

  useEffect(() => {
    const prev = prevMoodRef.current;
    prevMoodRef.current = mood;
    if (
      (mood === 'correct' || mood === 'wrong') &&
      prev !== mood &&
      (prev === 'thinking' || prev === 'idle')
    ) {
      setReactNonce((n) => n + 1);
    }
  }, [mood]);

  const fireTriggers = useMemo(() => {
    if (reactNonce === 0) return [];
    if (mood === 'correct' || mood === 'wrong') return [SUPER_FUN_RIVE.inputs.react];
    return [];
  }, [reactNonce, mood]);

  const bubblePos =
    bubbleSide === 'left'
      ? 'right-full top-2 mr-1'
      : bubbleSide === 'right'
        ? 'left-full top-2 ml-1'
        : 'bottom-full left-1/2 mb-1 -translate-x-1/2';

  return (
    <div className={cn('relative flex flex-col items-center', className)}>
      {bubbleText && (
        <div
          className={cn(
            'pointer-events-none absolute z-20 max-w-[120px] rounded-xl border-2 border-slate-900 bg-white px-2 py-1 text-center text-xs font-bold text-slate-800 shadow-md',
            bubblePos,
          )}
          aria-hidden
        >
          {bubbleText}
        </div>
      )}
      {useFallback ? (
        <div
          className="flex flex-col items-center gap-1"
          role="img"
          aria-label={fallbackLabel}
        >
          <span
            className={cn(
              'select-none text-5xl drop-shadow-md transition-transform duration-300 sm:text-6xl',
              mood === 'correct' && 'animate-bounce',
              mood === 'wrong' && 'opacity-90',
            )}
          >
            {fallbackEmoji}
          </span>
        </div>
      ) : (
        <div className="h-full min-h-[88px] w-full min-w-[72px] sm:min-h-[100px]">
          <RiveStage
            src={src}
            stateMachine={SUPER_FUN_RIVE.stateMachine}
            numberInputs={{ mood: moodToRive(mood) }}
            fireTriggers={fireTriggers}
            className="h-full w-full"
            onFailed={() => setUseFallback(true)}
          />
        </div>
      )}
    </div>
  );
}
