'use client';

import { useCallback, useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

import '@/app/games-hub.css';

import {
  isQuizAudioMuted,
  setQuizAudioMuted,
} from '@/lib/quiz/rpg-audio';
import { cn } from '@/lib/utils';

type Props = {
  className?: string;
};

/** /games 右下角：靜音圖示按鈕 */
export function GamesBrandCorner({ className }: Props) {
  const [audioMuted, setAudioMuted] = useState(false);

  useEffect(() => {
    setAudioMuted(isQuizAudioMuted());

    const onMuteChange = (e: Event) => {
      const detail = (e as CustomEvent<boolean>).detail;
      setAudioMuted(typeof detail === 'boolean' ? detail : isQuizAudioMuted());
    };

    window.addEventListener('quiz-audio-mute-change', onMuteChange);
    return () => window.removeEventListener('quiz-audio-mute-change', onMuteChange);
  }, []);

  const handleToggleMute = useCallback(() => {
    const next = !isQuizAudioMuted();
    setQuizAudioMuted(next);
    setAudioMuted(next);
  }, []);

  const Icon = audioMuted ? VolumeX : Volume2;

  return (
    <button
      type="button"
      className={cn(
        'games-brand-corner games-brand-corner__mute',
        audioMuted && 'games-brand-corner__mute--active',
        className,
      )}
      onClick={handleToggleMute}
      aria-label={audioMuted ? '開啟遊戲音效' : '遊戲靜音'}
      aria-pressed={audioMuted}
      title={audioMuted ? '開啟音效' : '靜音'}
    >
      <Icon className="h-[1.15rem] w-[1.15rem]" aria-hidden strokeWidth={2.25} />
    </button>
  );
}
