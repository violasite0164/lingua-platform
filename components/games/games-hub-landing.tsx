'use client';

import { Fredoka } from 'next/font/google';

import '@/app/games-hub.css';

import { cn } from '@/lib/utils';
import { GamesBrandCorner } from '@/components/games/games-brand-corner';

const fredoka = Fredoka({
  subsets: ['latin'],
  weight: ['700'],
  display: 'swap',
});

export function GamesHubLanding({
  onStart,
  disabled,
  onActivateAudio,
}: {
  onStart: () => void;
  disabled?: boolean;
  /** 使用者手勢後解鎖選單 BGM（瀏覽器 autoplay 政策） */
  onActivateAudio?: () => void;
}) {
  return (
    <div
      className="games-hub-landing"
      aria-label="英語大冒險"
      onPointerDownCapture={() => onActivateAudio?.()}
    >
      <div className="games-hub-landing__bg" aria-hidden />
      <div className="games-hub-landing__shade" aria-hidden />

      <div className={cn(fredoka.className, 'games-hub-landing__content')}>
        <h1 className="games-hub-title">
          <span className="games-hub-title__line games-hub-title__line--quiz">ENGLISH QUIZ</span>
          <span className="games-hub-title__line games-hub-title__line--adventure">ADVENTURE</span>
        </h1>

        <button
          type="button"
          className={cn(fredoka.className, 'games-hub-start')}
          disabled={disabled}
          onClick={onStart}
        >
          {'GAME\u00A0START'}
        </button>
      </div>

      <p className="games-hub-age-notice">適合 8 歲以上兒童遊玩</p>

      <GamesBrandCorner />
    </div>
  );
}
