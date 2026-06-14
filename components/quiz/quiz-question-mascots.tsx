'use client';

import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

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

function measureBubble(
  anchor: HTMLElement,
  sceneRect: DOMRect,
  side: 'bear' | 'boy' | 'girl',
): BubblePos {
  const r = anchor.getBoundingClientRect();
  const top = r.top - sceneRect.top + r.height * 0.06;

  if (side === 'bear') {
    return {
      left: r.left - sceneRect.left + r.width * 0.58,
      top: r.top - sceneRect.top + r.height * 0.04,
    };
  }

  if (side === 'girl') {
    return {
      left: r.left - sceneRect.left,
      top,
    };
  }

  return {
    left: r.right - sceneRect.left,
    top,
  };
}

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
  const [bearPos, setBearPos] = useState<BubblePos | null>(null);
  const [boyPos, setBoyPos] = useState<BubblePos | null>(null);
  const [girlPos, setGirlPos] = useState<BubblePos | null>(null);

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

      setBearPos(bearAnchor && bearBubble ? measureBubble(bearAnchor, sceneRect, 'bear') : null);
      setBoyPos(boyAnchor && boyBubble ? measureBubble(boyAnchor, sceneRect, 'boy') : null);
      setGirlPos(girlAnchor && girlBubble ? measureBubble(girlAnchor, sceneRect, 'girl') : null);

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

  const sceneEl = sceneRef.current;
  const bubblesPortal =
    sceneEl &&
    (bearBubble || boyBubble || girlBubble) &&
    createPortal(
      <div className="quiz-play-mascot-bubbles-layer" aria-hidden>
        {bearBubble && bearPos ? (
          <div
            className="quiz-play-mascot-bubble quiz-play-mascot-bubble--bear"
            style={{ left: bearPos.left, top: bearPos.top }}
          >
            {bearBubble}
          </div>
        ) : null}
        {boyBubble && boyPos ? (
          <div
            className="quiz-play-mascot-bubble quiz-play-mascot-bubble--boy"
            style={{ left: boyPos.left, top: boyPos.top }}
          >
            {boyBubble}
          </div>
        ) : null}
        {girlBubble && girlPos ? (
          <div
            className="quiz-play-mascot-bubble quiz-play-mascot-bubble--girl"
            style={{ left: girlPos.left, top: girlPos.top }}
          >
            {girlBubble}
          </div>
        ) : null}
      </div>,
      sceneEl,
    );

  if (!layout) return null;

  return (
    <>
      {bubblesPortal}
      <div
        className="quiz-play-mascot-side quiz-play-mascot-side--left"
        style={{ left: layout.leftInset }}
        aria-hidden
      >
        <div className={cn('quiz-play-mascot', 'quiz-play-mascot--bear')}>
          <QuizBearMascotRive ref={setBearAnchor} mood={characterMood} />
        </div>
      </div>

      <div
        className="quiz-play-mascot-side quiz-play-mascot-side--right"
        style={{ right: layout.rightInset }}
        aria-hidden
      >
        <div className={cn('quiz-play-mascot', 'quiz-play-mascot--boy')}>
          <QuizBoyMascotRive ref={setBoyAnchor} mood={characterMood} />
        </div>
        <div className={cn('quiz-play-mascot', 'quiz-play-mascot--girl')}>
          <QuizGirlMascotRive ref={setGirlAnchor} mood={characterMood} />
        </div>
      </div>
    </>
  );
}
