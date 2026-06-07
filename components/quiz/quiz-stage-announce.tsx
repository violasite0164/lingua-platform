'use client';

import { Fredoka } from 'next/font/google';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import '@/app/quiz-play-themes.css';
import '@/app/stage2-scene.css';
import '@/app/stage3-disco.css';

import { getQuizStageNumber, QUIZ_TYPEWRITER_MS_PER_CHAR } from '@/lib/quiz/constants';
import { STAGE2_ANNOUNCE_TEXT } from '@/lib/stage2/stage2-messages';
import { Stage2SceneBackdrop } from '@/components/stage2/stage2-scene-backdrop';
import { STAGE3_ANNOUNCE_TEXT } from '@/lib/stage3/stage3-messages';
import { STAGE3_ASSETS } from '@/lib/stage3/constants';
import { QuizFullMarkFx } from '@/components/quiz/quiz-full-mark-fx';
import {
  ensureQuizAudio,
  recoverQuizAudio,
  playStageClear,
  playStageClearFullMark,
  playStageFail,
  playStageStart,
} from '@/lib/quiz/rpg-audio';
import { getQuizStageBackgroundSrc, preloadQuizStageBackground } from '@/lib/quiz/stage-backgrounds';
import type { QuizDifficultyLevel } from '@/types/database.types';
import { cn } from '@/lib/utils';

const fredoka = Fredoka({
  subsets: ['latin'],
  weight: ['600', '700'],
  display: 'swap',
});

const HOLD_AFTER_TYPE_MS = 900;

export type StageAnnounceKind = 'start' | 'clear' | 'fail';

function getAnnounceText(
  kind: StageAnnounceKind,
  stageNumber: number,
  difficulty: QuizDifficultyLevel,
): string {
  if (difficulty === 'junior') {
    return STAGE2_ANNOUNCE_TEXT[kind];
  }
  if (difficulty === 'college') {
    return STAGE3_ANNOUNCE_TEXT[kind];
  }
  switch (kind) {
    case 'start':
      return `STAGE ${stageNumber} START!`;
    case 'clear':
      return 'STAGE CLEAR!';
    case 'fail':
      return 'STAGE FAIL....';
  }
}

type Props = {
  difficulty: QuizDifficultyLevel;
  kind: StageAnnounceKind;
  /** 自訂全文（課程測驗 Pop-up）；有值時取代內建 STAGE START 文案 */
  customText?: string;
  /** 總分 100/100 時加強慶祝 */
  fullMark?: boolean;
  embedded?: boolean;
  /** 固定全螢幕（掛在 body 上層） */
  portal?: boolean;
  onDone: () => void;
};

export function QuizStageAnnounce({
  difficulty,
  kind,
  customText,
  fullMark = false,
  embedded = false,
  portal = false,
  onDone,
}: Props) {
  const stageNumber = getQuizStageNumber(difficulty);
  const fullText = useMemo(() => {
    const trimmed = customText?.trim();
    if (trimmed) return trimmed;
    return getAnnounceText(kind, stageNumber, difficulty);
  }, [customText, kind, stageNumber, difficulty]);
  const bgUrl = getQuizStageBackgroundSrc(difficulty);
  const isStage2 = difficulty === 'junior';
  const isStage3 = difficulty === 'college';

  const [bgReady, setBgReady] = useState(false);
  const [typed, setTyped] = useState('');
  const [typingDone, setTypingDone] = useState(false);
  const stageSoundPlayedRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const playStageAnnounceSound = useCallback(() => {
    if (stageSoundPlayedRef.current) return;
    stageSoundPlayedRef.current = true;
    ensureQuizAudio();
    void recoverQuizAudio().then(() => {
      if (kind === 'start') playStageStart();
      else if (kind === 'clear') {
        if (fullMark) playStageClearFullMark();
        else playStageClear();
      } else {
        playStageFail();
      }
    });
  }, [kind, fullMark]);

  useEffect(() => {
    let cancelled = false;
    stageSoundPlayedRef.current = false;
    setBgReady(false);
    setTyped('');
    setTypingDone(false);

    void preloadQuizStageBackground(difficulty).then(() => {
      if (!cancelled) setBgReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [difficulty, kind, fullText]);

  useEffect(() => {
    if (!bgReady) return;

    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setTyped(fullText.slice(0, i));
      if (i >= fullText.length) {
        window.clearInterval(id);
        setTypingDone(true);
      }
    }, QUIZ_TYPEWRITER_MS_PER_CHAR);

    return () => window.clearInterval(id);
  }, [bgReady, fullText]);

  useEffect(() => {
    if (!typingDone) return;
    playStageAnnounceSound();
  }, [typingDone, playStageAnnounceSound]);

  useEffect(() => {
    if (!typingDone) return;
    const done = window.setTimeout(() => onDoneRef.current(), HOLD_AFTER_TYPE_MS);
    return () => window.clearTimeout(done);
  }, [typingDone]);

  const skipToNext = useCallback(() => {
    if (!bgReady) return;
    if (!typingDone) {
      setTyped(fullText);
      setTypingDone(true);
      return;
    }
    playStageAnnounceSound();
    onDoneRef.current();
  }, [bgReady, typingDone, fullText, playStageAnnounceSound]);

  return (
    <div
      className={cn(
        fredoka.className,
        'quiz-stage-announce-root',
        (isStage2 || isStage3) && 'select-none',
        embedded && 'quiz-stage-announce-root--embedded',
        portal && 'quiz-stage-announce-root--portal',
        kind === 'fail' && 'quiz-stage-announce-root--fail',
        kind === 'clear' && 'quiz-stage-announce-root--clear',
        (kind === 'start' || customText) && 'cursor-pointer',
      )}
      role={kind === 'start' || customText ? 'button' : undefined}
      tabIndex={kind === 'start' || customText ? 0 : undefined}
      onClick={kind === 'start' || customText ? skipToNext : undefined}
      onKeyDown={
        kind === 'start' || customText
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                skipToNext();
              }
            }
          : undefined
      }
      aria-live="assertive"
      aria-atomic
    >
      <div
        className={cn(
          'quiz-stage-announce-scene',
          isStage2 && 'quiz-stage-announce-scene--stage2 stage2-scene-shell',
          isStage3 && 'quiz-stage-announce-scene--stage3 stage3-scene-shell',
        )}
        style={
          isStage2
            ? undefined
            : isStage3
              ? { ['--stage3-bg-url' as string]: `url("${STAGE3_ASSETS.discoBg}")` }
              : { ['--quiz-stage-bg' as string]: `url("${bgUrl}")` }
        }
      >
        {isStage2 ? <Stage2SceneBackdrop /> : null}
        {isStage3 ? <div className="stage3-bg" aria-hidden /> : null}
        <div className="quiz-stage-announce-scrim" aria-hidden />
        {kind === 'clear' && fullMark && typingDone ? (
          <QuizFullMarkFx active prominent />
        ) : null}
        <div className="quiz-stage-announce-center">
          {!bgReady ? (
            <p className="quiz-stage-announce-loading quiz-status-stroke-text">載入中…</p>
          ) : (
            <div className="quiz-stage-announce-text-block">
              <p className="quiz-stage-announce-text quiz-status-stroke-text">
                {typed}
                {!typingDone ? (
                  <span className="quiz-stage-announce-caret" aria-hidden>
                    ▌
                  </span>
                ) : null}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
