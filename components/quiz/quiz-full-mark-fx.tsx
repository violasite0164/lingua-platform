'use client';

import { cn } from '@/lib/utils';

type Props = {
  active: boolean;
  /** 較大彈窗（關卡通關全螢幕提示） */
  prominent?: boolean;
  className?: string;
  /** 彈窗內副標（預設顯示滿分通關） */
  showSubtitle?: boolean;
};

export function QuizFullMarkFx({
  active,
  prominent = false,
  className,
  showSubtitle = true,
}: Props) {
  if (!active) return null;

  return (
    <div
      className={cn('quiz-full-mark-fx', prominent && 'quiz-full-mark-fx--prominent', className)}
      aria-hidden
    >
      <div className="quiz-full-mark-fx-backdrop" />
      <div className="quiz-full-mark-fx-popup-shake">
        <div className="quiz-full-mark-fx-popup">
          <p className="quiz-full-mark-fx-popup-title">FULL MARK!</p>
          {showSubtitle ? <p className="quiz-full-mark-fx-popup-sub">滿分通關</p> : null}
        </div>
      </div>
    </div>
  );
}
