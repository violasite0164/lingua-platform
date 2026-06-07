'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Fredoka, Noto_Sans_TC, Press_Start_2P } from 'next/font/google';

import type { ClassroomQuizVideoTextPayload } from '@/lib/course-quiz/types';
import { fontClassName, fontFamilyCss } from '@/lib/course-quiz/video-text';
import { cn } from '@/lib/utils';

const fredoka = Fredoka({ subsets: ['latin'], weight: ['600', '700'], display: 'swap' });
const notoSansTc = Noto_Sans_TC({
  subsets: ['latin'],
  weight: ['700'],
  display: 'swap',
});
const pressStart = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
});

const AUTO_CONTINUE_MS = 1000;

function fontWrapperClass(id: ClassroomQuizVideoTextPayload['font_family']): string {
  switch (id) {
    case 'fredoka':
      return fredoka.className;
    case 'noto-sans-tc':
      return notoSansTc.className;
    case 'press-start':
      return pressStart.className;
    default:
      return '';
  }
}

function TypewriterText({ text, onDone }: { text: string; onDone?: () => void }) {
  const [len, setLen] = useState(0);

  useEffect(() => {
    setLen(0);
    if (!text) return;
    let i = 0;
    const t = window.setInterval(() => {
      i += 1;
      setLen(i);
      if (i >= text.length) {
        window.clearInterval(t);
        onDone?.();
      }
    }, 45);
    return () => window.clearInterval(t);
  }, [text, onDone]);

  return <span>{text.slice(0, len)}</span>;
}

export function ClassroomQuizVideoOverlay({
  overlay,
  onContinue,
}: {
  overlay: ClassroomQuizVideoTextPayload;
  onContinue: () => void;
}) {
  const isTypewriter = overlay.text_animation === 'typewriter';
  const [typewriterComplete, setTypewriterComplete] = useState(false);
  const autoTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setTypewriterComplete(false);
  }, [overlay.id]);

  const onTypewriterDone = useCallback(() => {
    setTypewriterComplete(true);
  }, []);

  const clearAutoTimer = useCallback(() => {
    if (autoTimerRef.current !== null) {
      window.clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isTypewriter && !typewriterComplete) return;

    clearAutoTimer();
    autoTimerRef.current = window.setTimeout(() => {
      autoTimerRef.current = null;
      onContinue();
    }, AUTO_CONTINUE_MS);

    return clearAutoTimer;
  }, [overlay.id, isTypewriter, typewriterComplete, onContinue, clearAutoTimer]);

  const alignClass =
    overlay.text_align === 'left'
      ? 'text-left items-start'
      : overlay.text_align === 'right'
        ? 'text-right items-end'
        : 'text-center items-center';

  const animClass = `cq-text-anim--${overlay.text_animation}`;

  return (
    <div
      className="classroom-quiz-video-overlay"
      role="status"
      aria-live="polite"
      aria-label={overlay.text_content}
    >
      <div
        className={cn(
          'classroom-quiz-video-overlay-inner',
          alignClass,
          fontWrapperClass(overlay.font_family),
          fontClassName(overlay.font_family),
          animClass,
        )}
        style={{
          fontFamily: fontFamilyCss(overlay.font_family),
          fontSize: `${overlay.font_size_px}px`,
          color: overlay.text_color,
        }}
      >
        {isTypewriter ? (
          <TypewriterText text={overlay.text_content} onDone={onTypewriterDone} />
        ) : (
          overlay.text_content
        )}
      </div>
    </div>
  );
}
