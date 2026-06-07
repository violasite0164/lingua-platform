'use client';

import { Repeat2 } from 'lucide-react';

import { isLikelyPlayableMediaUrl } from '@/lib/media/play-abort';
import { cn } from '@/lib/utils';

type Props = {
  url: string | null | undefined;
  onPlay: (url: string) => void;
  className?: string;
};

/** 重播題目語音（置於「第 x/x 題」右側） */
export function ClassroomQuizRepeatQuestionButton({ url, onPlay, className }: Props) {
  const trimmed = url?.trim() ?? '';
  if (!isLikelyPlayableMediaUrl(trimmed)) return null;

  return (
    <span
      role="button"
      tabIndex={0}
      className={cn('classroom-quiz-repeat-question-btn', className)}
      aria-label="Repeat question"
      title="Repeat question"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void onPlay(trimmed);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          void onPlay(trimmed);
        }
      }}
    >
      <Repeat2 className="classroom-quiz-repeat-question-btn__icon" aria-hidden />
      <span className="classroom-quiz-repeat-question-btn__label">Repeat question</span>
    </span>
  );
}
