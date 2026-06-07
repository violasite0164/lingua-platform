'use client';

import { Fredoka } from 'next/font/google';
import { useCallback, useEffect, useRef, useState } from 'react';

import '@/app/quiz-play-themes.css';

import { QUIZ_TYPEWRITER_MS_PER_CHAR } from '@/lib/quiz/constants';
import {
  playStageClear,
  playStageNiceTry,
  playStageStart,
  recoverQuizAudio,
} from '@/lib/quiz/rpg-audio';
import { cn } from '@/lib/utils';

const fredoka = Fredoka({
  subsets: ['latin'],
  weight: ['600', '700'],
  display: 'swap',
});

/** 打字完成後停留時間（略長於 STAGE START 預設 900ms） */
const HOLD_AFTER_TYPE_MS = 1_500;

function playOutcomeAnnounceSfx(correct: boolean): void {
  void recoverQuizAudio().then(() => {
    if (correct) playStageClear();
    else playStageNiceTry();
  });
}

export type ClassroomQuizAnnounceSfx = 'outcome' | 'start' | 'none';

/** 答題結果：影片區 STAGE START 風格打字提示，播完自動消失 */
export function ClassroomQuizOutcomeAnnounce({
  text,
  correct,
  onDone,
  sfxMode = 'outcome',
  holdAfterTypeMs = HOLD_AFTER_TYPE_MS,
  typewriterMsPerChar = QUIZ_TYPEWRITER_MS_PER_CHAR,
}: {
  text: string;
  /** outcome 音效時使用（答對／答錯） */
  correct?: boolean;
  onDone: () => void;
  /** outcome＝WELL DONE/NICE TRY；start＝STAGE START 風格 */
  sfxMode?: ClassroomQuizAnnounceSfx;
  /** 打字完成後停留毫秒 */
  holdAfterTypeMs?: number;
  /** 每字打字間隔毫秒 */
  typewriterMsPerChar?: number;
}) {
  const [typed, setTyped] = useState('');
  const [typingDone, setTypingDone] = useState(false);
  const soundPlayedRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    soundPlayedRef.current = false;
    setTyped('');
    setTypingDone(false);

    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setTyped(text.slice(0, i));
      if (i >= text.length) {
        window.clearInterval(id);
        setTypingDone(true);
      }
    }, typewriterMsPerChar);

    return () => window.clearInterval(id);
  }, [text, typewriterMsPerChar]);

  useEffect(() => {
    if (!typingDone || soundPlayedRef.current) return;
    soundPlayedRef.current = true;
    void recoverQuizAudio().then(() => {
      if (sfxMode === 'start') playStageStart();
      else if (sfxMode === 'outcome' && correct !== undefined) {
        playOutcomeAnnounceSfx(correct);
      }
    });
  }, [typingDone, correct, sfxMode]);

  useEffect(() => {
    if (!typingDone) return;
    const done = window.setTimeout(() => onDoneRef.current(), holdAfterTypeMs);
    return () => window.clearTimeout(done);
  }, [typingDone, holdAfterTypeMs]);

  const skip = useCallback(() => {
    if (!typingDone) {
      setTyped(text);
      setTypingDone(true);
      return;
    }
    onDoneRef.current();
  }, [typingDone, text]);

  return (
    <div
      className={cn(fredoka.className, 'classroom-quiz-outcome-announce')}
      role="button"
      tabIndex={0}
      onClick={skip}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          skip();
        }
      }}
      aria-live="assertive"
      aria-atomic
    >
      <p className="classroom-quiz-outcome-announce-text quiz-status-stroke-text">
        {typed}
        {!typingDone ? (
          <span className="quiz-stage-announce-caret" aria-hidden>
            ▌
          </span>
        ) : null}
      </p>
    </div>
  );
}
