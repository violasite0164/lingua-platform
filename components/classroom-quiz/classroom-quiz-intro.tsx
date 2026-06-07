'use client';

import { Fredoka } from 'next/font/google';
import { useCallback, useEffect, useRef, useState } from 'react';

import '@/app/quiz-play-themes.css';

import { playStageStart, recoverQuizAudio } from '@/lib/quiz/rpg-audio';
import { cn } from '@/lib/utils';

const fredoka = Fredoka({
  subsets: ['latin'],
  weight: ['600', '700'],
  display: 'swap',
});

/** QUIZ START 單獨顯示（無 cut-in） */
const QUIZ_START_MS = 1_500;
/** READY? + cut-in 維持時間 */
const READY_CUTIN_MS = 2_000;
const CUTIN_EXIT_MS = 1_100;

type IntroStep = 'quiz_start' | 'ready' | 'exit';

export function ClassroomQuizIntro({
  boyImageUrl,
  girlImageUrl,
  onComplete,
}: {
  boyImageUrl: string;
  girlImageUrl: string;
  onComplete: () => void;
}) {
  const [step, setStep] = useState<IntroStep>('quiz_start');
  const [cutinVisible, setCutinVisible] = useState(false);
  const [cutinExit, setCutinExit] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    void recoverQuizAudio().then(() => playStageStart());
  }, []);

  const beginExit = useCallback(() => {
    setCutinExit(true);
    setStep('exit');
    window.setTimeout(() => onCompleteRef.current(), CUTIN_EXIT_MS);
  }, []);

  useEffect(() => {
    const readyTimer = window.setTimeout(() => {
      setStep('ready');
    }, QUIZ_START_MS);

    const exitTimer = window.setTimeout(() => {
      beginExit();
    }, QUIZ_START_MS + READY_CUTIN_MS);

    return () => {
      window.clearTimeout(readyTimer);
      window.clearTimeout(exitTimer);
    };
  }, [beginExit]);

  useEffect(() => {
    if (step !== 'ready') return;
    setCutinVisible(false);
    const id = requestAnimationFrame(() => setCutinVisible(true));
    return () => cancelAnimationFrame(id);
  }, [step]);

  const announceText = step === 'quiz_start' ? 'QUIZ START!' : step === 'ready' ? 'READY?' : '';

  return (
    <div className="classroom-quiz-intro" aria-live="polite">
      {step === 'ready' || step === 'exit' ? (
        <>
          <div
            className={cn(
              'classroom-quiz-intro-cutin classroom-quiz-intro-cutin--boy',
              cutinVisible && !cutinExit && 'classroom-quiz-intro-cutin--in',
              cutinExit && 'classroom-quiz-intro-cutin--out',
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={boyImageUrl}
              alt=""
              draggable={false}
              className="classroom-quiz-intro-cutin-img"
            />
          </div>

          <div
            className={cn(
              'classroom-quiz-intro-cutin classroom-quiz-intro-cutin--girl',
              cutinVisible && !cutinExit && 'classroom-quiz-intro-cutin--in',
              cutinExit && 'classroom-quiz-intro-cutin--out',
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={girlImageUrl}
              alt=""
              draggable={false}
              className="classroom-quiz-intro-cutin-img"
            />
          </div>
        </>
      ) : null}

      {step !== 'exit' ? (
        <div className={cn(fredoka.className, 'classroom-quiz-intro-announce')}>
          <p className="classroom-quiz-intro-announce-text quiz-status-stroke-text">{announceText}</p>
        </div>
      ) : null}
    </div>
  );
}

/** 開場結束後，延遲多久才允許播放題目影片 */
export const CLASSROOM_QUIZ_POST_INTRO_VIDEO_DELAY_MS = 1_000;
