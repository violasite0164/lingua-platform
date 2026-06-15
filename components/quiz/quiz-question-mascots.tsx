'use client';

import { useLayoutEffect, useState } from 'react';

import { QuizBearMascotRive } from '@/components/quiz/quiz-bear-mascot-rive';
import { QuizBoyMascotRive } from '@/components/quiz/quiz-boy-mascot-rive';
import { QuizGirlMascotRive } from '@/components/quiz/quiz-girl-mascot-rive';
import type { QuizCharacterMood } from '@/lib/games/quiz-play-engine';
import { cn } from '@/lib/utils';

type MascotLayout = {
  leftInset: number;
  rightInset: number;
};

type BubblePos = {
  left: number;
  top: number;
};

export function QuizQuestionMascots({
  sceneRef,
  boardRef,
  characterMood,
  bearBubble,
  boyBubble,
  girlBubble,
}: {
  sceneRef: React.RefObject<HTMLElement | null>;
  boardRef: React.RefObject<HTMLElement | null>;
  characterMood: QuizCharacterMood;
  bearBubble?: string | null;
  boyBubble?: string | null;
  girlBubble?: string | null;
}) {
  const [layout, setLayout] = useState<MascotLayout | null>(null);
  const [bearAnchor, setBearAnchor] = useState<HTMLElement | null>(null);
  const [boyAnchor, setBoyAnchor] = useState<HTMLElement | null>(null);
  const [girlAnchor, setGirlAnchor] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    let cancelled = false;
    let raf = 0;
    let ro: ResizeObserver | null = null;

    const update = () => {
      const scene = sceneRef.current;
      if (!scene) return;

      const sceneRect = scene.getBoundingClientRect();
      if (sceneRect.width <= 0) return;

      const board = boardRef.current;
      const boardRect = board?.getBoundingClientRect();
      const leftGutter = boardRect
        ? Math.max(0, boardRect.left - sceneRect.left)
        : sceneRect.width * 0.12;
      const rightGutter = boardRect
        ? Math.max(0, sceneRect.right - boardRect.right)
        : sceneRect.width * 0.12;

      const nextLayout = {
        // Stage 1 layout tuning:
        // - Bear further left
        // - Boy/Girl further right
        leftInset: Math.max(2, leftGutter * 0.3),
        rightInset: Math.max(1, rightGutter * 0.08),
      };
      setLayout((prev) =>
        prev &&
        prev.leftInset === nextLayout.leftInset &&
        prev.rightInset === nextLayout.rightInset
          ? prev
          : nextLayout,
      );

    };

    const attach = () => {
      if (cancelled) return;
      const scene = sceneRef.current;
      if (!scene) {
        raf = requestAnimationFrame(attach);
        return;
      }

      update();
      ro = new ResizeObserver(update);
      ro.observe(scene);
      const board = boardRef.current;
      if (board) ro.observe(board);
      if (bearAnchor) ro.observe(bearAnchor);
      if (boyAnchor) ro.observe(boyAnchor);
      if (girlAnchor) ro.observe(girlAnchor);
      window.addEventListener('resize', update);
      window.addEventListener('scroll', update, true);
    };

    attach();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [
    sceneRef,
    boardRef,
    bearAnchor,
    boyAnchor,
    girlAnchor,
    bearBubble,
    boyBubble,
    girlBubble,
  ]);

  if (!layout) return null;

  return (
    <>
      <div
        className="quiz-play-mascot-side quiz-play-mascot-side--left"
        style={{ left: layout.leftInset }}
        aria-hidden
      >
        <div className={cn('quiz-play-mascot', 'quiz-play-mascot--bear')}>
          {bearBubble ? (
            <div
              className="quiz-play-mascot-bubble quiz-play-mascot-bubble--bear quiz-play-mascot-bubble--inline"
              style={{ left: '56%', top: '14%' }}
            >
              {bearBubble}
            </div>
          ) : null}
          <QuizBearMascotRive ref={setBearAnchor} mood={characterMood} />
        </div>
      </div>

      <div
        className="quiz-play-mascot-side quiz-play-mascot-side--right"
        style={{ right: layout.rightInset }}
        aria-hidden
      >
        <div className={cn('quiz-play-mascot', 'quiz-play-mascot--boy')}>
          {boyBubble ? (
            <div
              className="quiz-play-mascot-bubble quiz-play-mascot-bubble--boy quiz-play-mascot-bubble--inline"
              style={{ left: '50%', top: '16%' }}
            >
              {boyBubble}
            </div>
          ) : null}
          <QuizBoyMascotRive ref={setBoyAnchor} mood={characterMood} />
        </div>
        <div className={cn('quiz-play-mascot', 'quiz-play-mascot--girl')}>
          {girlBubble ? (
            <div
              className="quiz-play-mascot-bubble quiz-play-mascot-bubble--girl quiz-play-mascot-bubble--inline"
              style={{ left: '50%', top: '16%' }}
            >
              {girlBubble}
            </div>
          ) : null}
          <QuizGirlMascotRive ref={setGirlAnchor} mood={characterMood} />
        </div>
      </div>
    </>
  );
}
