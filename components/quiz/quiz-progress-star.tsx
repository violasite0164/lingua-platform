'use client';

import { Star } from 'lucide-react';

import { cn } from '@/lib/utils';

type Props = {
  filled: boolean;
  /** 該題曾答對（顯示白金圍邊與閃爍） */
  correct: boolean;
  fillColor?: string;
  className?: string;
};

export function QuizProgressStar({ filled, correct, fillColor, className }: Props) {
  const platinum = filled && correct;

  const star = (
    <Star
      className={cn(
        'quiz-play-progress-star',
        className,
        filled ? 'quiz-play-progress-star--filled' : 'quiz-play-progress-star--empty',
        platinum && 'quiz-play-progress-star--platinum-core',
      )}
      style={filled && fillColor ? { fill: fillColor, color: fillColor } : undefined}
      strokeWidth={platinum ? 1.75 : filled ? 0 : 2}
      stroke={platinum ? '#ffffff' : undefined}
      aria-hidden
    />
  );

  if (!platinum) return star;

  return (
    <span className="quiz-play-progress-star-slot quiz-play-progress-star-slot--platinum" aria-hidden>
      {star}
    </span>
  );
}
