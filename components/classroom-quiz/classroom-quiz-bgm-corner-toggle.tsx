'use client';

import { useCallback, useEffect, useState } from 'react';
import { Music, Music2 } from 'lucide-react';

import '@/app/games-hub.css';

import {
  isClassroomQuizBgmMuted,
  setClassroomQuizBgmMuted,
} from '@/lib/course-quiz/classroom-quiz-audio-settings';
import { cn } from '@/lib/utils';

type Props = {
  className?: string;
};

/** 右下角：只控制 Classroom Quiz 背景音樂（不影響其他音效） */
export function ClassroomQuizBgmCornerToggle({ className }: Props) {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    setMuted(isClassroomQuizBgmMuted());
    const onMutedChange = (e: Event) => {
      const detail = (e as CustomEvent<boolean>).detail;
      setMuted(typeof detail === 'boolean' ? detail : isClassroomQuizBgmMuted());
    };
    window.addEventListener('classroom-quiz-bgm-mute-change', onMutedChange);
    return () =>
      window.removeEventListener('classroom-quiz-bgm-mute-change', onMutedChange);
  }, []);

  const onToggle = useCallback(() => {
    const next = !isClassroomQuizBgmMuted();
    setClassroomQuizBgmMuted(next);
    setMuted(next);
  }, []);

  const Icon = muted ? Music2 : Music;

  return (
    <button
      type="button"
      className={cn(
        'games-brand-corner games-brand-corner__mute',
        muted && 'games-brand-corner__mute--active',
        className,
      )}
      onClick={onToggle}
      aria-label={muted ? '開啟課堂測驗背景音樂' : '靜音課堂測驗背景音樂'}
      aria-pressed={muted}
      title={muted ? '開啟背景音樂' : '背景音樂靜音'}
    >
      <Icon className="h-[1.15rem] w-[1.15rem]" aria-hidden strokeWidth={2.25} />
    </button>
  );
}

