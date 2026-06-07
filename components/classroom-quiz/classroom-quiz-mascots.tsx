'use client';

import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { ClassroomQuizBoyMascotRive } from '@/components/classroom-quiz/classroom-quiz-boy-mascot-rive';
import { ClassroomQuizGirlMascotRive } from '@/components/classroom-quiz/classroom-quiz-girl-mascot-rive';
import { ClassroomQuizStaticMascot } from '@/components/classroom-quiz/classroom-quiz-static-mascot';
import type { QuizCharacterMood } from '@/lib/games/quiz-play-engine';
import { cn } from '@/lib/utils';

type MascotPositions = {
  /** 視窗座標（配合 position: fixed） */
  boyLeft: number;
  girlLeft: number;
  width: number;
};

type BubblePos = {
  /** 視窗座標（配合 position: fixed，與吉祥物一致） */
  left: number;
  top: number;
};

/** 氣泡錨點：角色頭頂中央（與 fixed 吉祥物同一座標系） */
function measureBubble(anchor: HTMLElement): BubblePos {
  const r = anchor.getBoundingClientRect();
  return {
    left: r.left + r.width / 2,
    top: r.top + Math.min(r.height * 0.1, 28),
  };
}

function computeMascotPositions(
  sceneRect: DOMRect,
  stageRect: DOMRect,
  videoRect: DOMRect,
  boardRect: DOMRect,
  widthScale = 1,
): MascotPositions | null {
  if (sceneRect.width <= 0 || stageRect.height <= 0) return null;

  const leftGutter = stageRect.left - sceneRect.left;
  const rightGutter = sceneRect.right - stageRect.right;

  const gutterMin = Math.min(
    leftGutter > 0 ? leftGutter : Number.POSITIVE_INFINITY,
    rightGutter > 0 ? rightGutter : Number.POSITIVE_INFINITY,
  );

  let mascotWidth: number;
  let boyLeft: number;
  let girlLeft: number;

  const scale = Math.max(1, widthScale);

  if (gutterMin >= 56 && Number.isFinite(gutterMin)) {
    mascotWidth = Math.min(400 * scale, Math.max(120, gutterMin * 0.92 * scale));
    const boyCenter = leftGutter / 2;
    const girlCenter = stageRect.right - sceneRect.left + rightGutter / 2;
    boyLeft = boyCenter - mascotWidth / 2;
    girlLeft = girlCenter - mascotWidth / 2;
  } else {
    const innerLeft = videoRect.left - sceneRect.left;
    const innerRight = videoRect.right - sceneRect.left;
    const boardLeft = boardRect.left - sceneRect.left;
    const boardRight = boardRect.right - sceneRect.left;
    mascotWidth = Math.min(
      280 * scale,
      Math.max(96, Math.min(boardLeft - innerLeft, innerRight - boardRight) * 0.82 * scale),
    );
    const boyCenter = (innerLeft + boardLeft) / 2;
    const girlCenter = (boardRight + innerRight) / 2;
    boyLeft = boyCenter - mascotWidth / 2;
    girlLeft = girlCenter - mascotWidth / 2;
  }

  return {
    boyLeft: boyLeft + sceneRect.left,
    girlLeft: girlLeft + sceneRect.left,
    width: mascotWidth,
  };
}

export function ClassroomQuizMascots({
  sceneRef,
  stageRef,
  videoRef,
  boardRef,
  characterMood,
  boyBubble,
  girlBubble,
  useStaticMascots = false,
  mascotBoyImageUrl,
  mascotGirlImageUrl,
  mascotWidthScale = 1,
  dialogueTone = 'play',
  outcomeBubbleVariant,
}: {
  sceneRef: React.RefObject<HTMLElement | null>;
  stageRef: React.RefObject<HTMLElement | null>;
  videoRef: React.RefObject<HTMLElement | null>;
  boardRef: React.RefObject<HTMLElement | null>;
  characterMood: QuizCharacterMood;
  boyBubble?: string | null;
  girlBubble?: string | null;
  useStaticMascots?: boolean;
  mascotBoyImageUrl?: string | null;
  mascotGirlImageUrl?: string | null;
  mascotWidthScale?: number;
  /** play＝小提示；thinking＝答題逾時提示；outcome＝WELL DONE / NICE TRY 後 */
  dialogueTone?: 'play' | 'thinking' | 'outcome';
  outcomeBubbleVariant?: 'celebrate' | 'encourage';
}) {
  const [positions, setPositions] = useState<MascotPositions | null>(null);
  const [boyAnchor, setBoyAnchor] = useState<HTMLElement | null>(null);
  const [girlAnchor, setGirlAnchor] = useState<HTMLElement | null>(null);
  const [boyPos, setBoyPos] = useState<BubblePos | null>(null);
  const [girlPos, setGirlPos] = useState<BubblePos | null>(null);

  useLayoutEffect(() => {
    let cancelled = false;
    let raf = 0;
    let ro: ResizeObserver | null = null;

    const update = () => {
      const scene = sceneRef.current;
      const stage = stageRef.current;
      const video = videoRef.current;
      const board = boardRef.current;
      if (!scene || !stage || !video || !board) return;

      const sceneRect = scene.getBoundingClientRect();
      const stageRect = stage.getBoundingClientRect();
      const videoRect = video.getBoundingClientRect();
      const boardRect = board.getBoundingClientRect();

      const next = computeMascotPositions(
        sceneRect,
        stageRect,
        videoRect,
        boardRect,
        mascotWidthScale,
      );
      if (!next) return;

      setPositions((prev) =>
        prev &&
        prev.boyLeft === next.boyLeft &&
        prev.girlLeft === next.girlLeft &&
        prev.width === next.width
          ? prev
          : next,
      );

      setBoyPos(boyAnchor && boyBubble ? measureBubble(boyAnchor) : null);
      setGirlPos(girlAnchor && girlBubble ? measureBubble(girlAnchor) : null);
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
      const stage = stageRef.current;
      const video = videoRef.current;
      const board = boardRef.current;
      if (stage) ro.observe(stage);
      if (video) ro.observe(video);
      if (board) ro.observe(board);
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
    stageRef,
    videoRef,
    boardRef,
    boyAnchor,
    girlAnchor,
    boyBubble,
    girlBubble,
    mascotWidthScale,
  ]);

  const sceneEl = sceneRef.current;
  const bubbleHost = typeof document !== 'undefined' ? document.body : null;
  const isLargeBubble = dialogueTone === 'outcome' || dialogueTone === 'thinking';

  const bubblesPortal =
    bubbleHost &&
    (boyBubble || girlBubble) &&
    createPortal(
      <div
        className={cn(
          'classroom-quiz-mascot-bubbles-layer',
          dialogueTone === 'outcome' && 'classroom-quiz-mascot-bubbles-layer--outcome',
        )}
        aria-hidden
      >
        {boyBubble && boyPos ? (
          <div
            className={cn(
              'classroom-quiz-mascot-bubble classroom-quiz-mascot-bubble--boy',
              isLargeBubble && 'classroom-quiz-mascot-bubble--large',
              dialogueTone === 'outcome' && 'classroom-quiz-mascot-bubble--outcome',
              dialogueTone === 'thinking' && 'classroom-quiz-mascot-bubble--thinking',
              outcomeBubbleVariant === 'encourage' &&
                'classroom-quiz-mascot-bubble--outcome-encourage',
            )}
            style={{ left: boyPos.left, top: boyPos.top, position: 'fixed' }}
          >
            {boyBubble}
          </div>
        ) : null}
        {girlBubble && girlPos ? (
          <div
            className={cn(
              'classroom-quiz-mascot-bubble classroom-quiz-mascot-bubble--girl',
              isLargeBubble && 'classroom-quiz-mascot-bubble--large',
              dialogueTone === 'outcome' && 'classroom-quiz-mascot-bubble--outcome',
              dialogueTone === 'thinking' && 'classroom-quiz-mascot-bubble--thinking',
              outcomeBubbleVariant === 'encourage' &&
                'classroom-quiz-mascot-bubble--outcome-encourage',
            )}
            style={{ left: girlPos.left, top: girlPos.top, position: 'fixed' }}
          >
            {girlBubble}
          </div>
        ) : null}
      </div>,
      bubbleHost,
    );

  const mascotsPortal =
    sceneEl &&
    createPortal(
      <>
        <div
          className={cn(
            'classroom-quiz-mascot-side classroom-quiz-mascot-side--left',
            !positions && 'invisible pointer-events-none',
          )}
          style={
            positions
              ? {
                  width: positions.width,
                  left: positions.boyLeft,
                }
              : { width: 140, left: 0 }
          }
          aria-hidden
        >
          <div className={cn('classroom-quiz-mascot', 'classroom-quiz-mascot--boy')}>
            {useStaticMascots && mascotBoyImageUrl ? (
              <ClassroomQuizStaticMascot
                ref={setBoyAnchor}
                src={mascotBoyImageUrl}
                alt="男孩角色"
              />
            ) : (
              <ClassroomQuizBoyMascotRive ref={setBoyAnchor} mood={characterMood} />
            )}
          </div>
        </div>

        <div
          className={cn(
            'classroom-quiz-mascot-side classroom-quiz-mascot-side--right',
            !positions && 'invisible pointer-events-none',
          )}
          style={
            positions
              ? {
                  width: positions.width,
                  left: positions.girlLeft,
                }
              : { width: 140, left: 0 }
          }
          aria-hidden
        >
          <div className={cn('classroom-quiz-mascot', 'classroom-quiz-mascot--girl')}>
            {useStaticMascots && mascotGirlImageUrl ? (
              <ClassroomQuizStaticMascot
                ref={setGirlAnchor}
                src={mascotGirlImageUrl}
                alt="女孩角色"
              />
            ) : (
              <ClassroomQuizGirlMascotRive ref={setGirlAnchor} mood={characterMood} />
            )}
          </div>
        </div>
      </>,
      sceneEl,
    );

  return (
    <>
      {bubblesPortal}
      {mascotsPortal}
    </>
  );
}
