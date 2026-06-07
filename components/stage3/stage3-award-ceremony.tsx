'use client';

import { useEffect, useRef, useState } from 'react';
import { Monoton } from 'next/font/google';

import { STAGE3_AWARD_SLOT_SPIN_MS } from '@/lib/stage3/constants';
import { cn } from '@/lib/utils';

const monoton = Monoton({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
});

type Props = {
  score100: number;
  /** 老虎機定格、重鼓與主角反應的起點 */
  onScoreReveal?: () => void;
};

function clampScore(score: number): number {
  return Math.max(0, Math.min(999, Math.round(score)));
}

function digitsFromScore(score: number): [number, number, number] {
  const n = clampScore(score);
  return [Math.floor(n / 100) % 10, Math.floor(n / 10) % 10, n % 10];
}

export function Stage3AwardCeremony({ score100, onScoreReveal }: Props) {
  const [digits, setDigits] = useState<[number, number, number]>([0, 0, 0]);
  const [settled, setSettled] = useState(false);
  const revealedRef = useRef(false);
  const onScoreRevealRef = useRef(onScoreReveal);
  onScoreRevealRef.current = onScoreReveal;

  useEffect(() => {
    const target = digitsFromScore(score100);
    revealedRef.current = false;
    setSettled(false);
    setDigits([0, 0, 0]);
    const start = performance.now();
    let frame = 0;
    let rafId = 0;

    const tick = () => {
      const elapsed = performance.now() - start;
      const t = Math.min(1, elapsed / STAGE3_AWARD_SLOT_SPIN_MS);

      if (t < 1) {
        const spinSpeed = 42 + t * 38;
        const spin = Math.floor(elapsed / spinSpeed) + frame;
        setDigits([
          (spin + 3) % 10,
          (spin + 7) % 10,
          (spin + 1) % 10,
        ]);
        frame += 1;
        rafId = requestAnimationFrame(tick);
        return;
      }

      setDigits(target);
      setSettled(true);
      if (!revealedRef.current) {
        revealedRef.current = true;
        onScoreRevealRef.current?.();
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [score100]);

  return (
    <div className="stage3-award-ceremony" role="status" aria-live="polite">
      <div className="stage3-award-ceremony__lights" aria-hidden />
      <p className={cn(monoton.className, 'stage3-award-ceremony__disco')}>DISCO</p>
      <p className={cn(monoton.className, 'stage3-award-ceremony__label')}>YOUR SCORE</p>
      <div
        className={cn(
          'stage3-award-slot',
          settled && 'stage3-award-slot--settled',
        )}
        aria-label={`得分 ${clampScore(score100)}`}
      >
        {digits.map((d, i) => (
          <span key={i} className="stage3-award-slot__digit-wrap">
            <span className={cn(monoton.className, 'stage3-award-slot__digit')}>{d}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
