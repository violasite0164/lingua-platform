'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { QuAizBot } from '@/components/quiz/qu-aiz-bot';
import { RiveStage } from '@/components/games/rive-stage';
import { isRiveQuizEnabled, prefersReducedMotion } from '@/lib/games/flags';
import {
  mapPersonalityToRive,
  type QuizCharacterMood,
} from '@/lib/games/quiz-play-engine';
import {
  getQuizBotRiveSrc,
  QUIZ_BOT_RIVE_MANIFEST,
} from '@/lib/games/quiz-rive-manifest';
import type { QuizEditorPersonality } from '@/types/database.types';
import { cn } from '@/lib/utils';

function moodToBot(mood: QuizCharacterMood): 'idle' | 'correct' | 'wrong' {
  if (mood === 'correct' || mood === 'celebrate') return 'correct';
  if (mood === 'wrong') return 'wrong';
  return 'idle';
}

function moodToRiveValue(mood: QuizCharacterMood): number {
  return QUIZ_BOT_RIVE_MANIFEST.moodValues[mood];
}

export function QuizCharacterStage({
  mood,
  personality,
  text,
  className,
  onRiveFailed,
}: {
  mood: QuizCharacterMood;
  personality?: QuizEditorPersonality | null;
  text?: string | null;
  className?: string;
  onRiveFailed?: () => void;
}) {
  const tryRive = isRiveQuizEnabled() && !prefersReducedMotion();
  const [useFallback, setUseFallback] = useState(!tryRive);

  const src = useMemo(() => getQuizBotRiveSrc(), []);
  const numberInputs = useMemo(
    () => ({
      mood: moodToRiveValue(mood),
      personality: mapPersonalityToRive(personality),
    }),
    [mood, personality],
  );

  const [reactNonce, setReactNonce] = useState(0);
  const prevMoodRef = useRef<QuizCharacterMood>(mood);

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
    if (mood === 'correct' || mood === 'wrong') {
      return [QUIZ_BOT_RIVE_MANIFEST.inputs.react];
    }
    return [];
  }, [reactNonce, mood]);

  if (useFallback) {
    return (
      <div className={cn('flex justify-center', className)}>
        <QuAizBot mood={moodToBot(mood)} text={text} />
      </div>
    );
  }

  return (
    <div className={cn('relative mx-auto h-[168px] w-full max-w-[220px]', className)}>
      <RiveStage
        src={src}
        stateMachine={QUIZ_BOT_RIVE_MANIFEST.stateMachine}
        numberInputs={numberInputs}
        fireTriggers={fireTriggers}
        className="h-full w-full"
        onFailed={() => {
          setUseFallback(true);
          onRiveFailed?.();
        }}
      />
      {text && (
        <p
          className="quiz-font-site-default pointer-events-none absolute -top-1 left-1/2 z-10 max-w-[min(100%,280px)] -translate-x-1/2 -translate-y-full rounded-md border border-border/60 bg-background/90 px-2 py-1 text-center text-xs leading-snug shadow-sm backdrop-blur-sm"
          aria-hidden
        >
          {text}
        </p>
      )}
    </div>
  );
}
