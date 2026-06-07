'use client';

import { memo, useEffect, useRef, useState } from 'react';

import { QUIZ_TYPEWRITER_MS_PER_CHAR } from '@/lib/quiz/constants';
import { playRpgTypeBlip } from '@/lib/quiz/rpg-audio';

type Props = {
  questionKey: string;
  text: string;
  onTypingComplete: () => void;
};

/**
 * 題幹打字機：直接更新 DOM 文字，避免每字觸發整棵 React 樹重繪。
 */
export const QuizQuestionTypewriter = memo(function QuizQuestionTypewriter({
  questionKey,
  text,
  onTypingComplete,
}: Props) {
  const textRef = useRef<HTMLSpanElement>(null);
  const onCompleteRef = useRef(onTypingComplete);
  onCompleteRef.current = onTypingComplete;
  const [typingDone, setTypingDone] = useState(false);

  useEffect(() => {
    setTypingDone(false);
    const el = textRef.current;
    if (!el) return;

    let i = 0;
    el.textContent = '';

    if (!text.length) {
      setTypingDone(true);
      onCompleteRef.current();
      return;
    }

    const timerId = window.setInterval(() => {
      i += 1;
      el.textContent = text.slice(0, i);
      const ch = text[i - 1];
      if (ch && /\S/.test(ch)) playRpgTypeBlip();

      if (i >= text.length) {
        window.clearInterval(timerId);
        setTypingDone(true);
        onCompleteRef.current();
      }
    }, QUIZ_TYPEWRITER_MS_PER_CHAR);

    return () => window.clearInterval(timerId);
  }, [questionKey, text]);

  return (
    <p className="quiz-play-question-text">
      <span ref={textRef} />
      {!typingDone ? (
        <span className="ml-0.5 inline-block animate-pulse opacity-80" aria-hidden>
          ▌
        </span>
      ) : null}
    </p>
  );
});
