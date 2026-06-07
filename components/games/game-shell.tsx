'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, Maximize2, Minimize2 } from 'lucide-react';
import { Press_Start_2P } from 'next/font/google';

import { GameAudioMixControl } from '@/components/games/game-audio-mix-control';
import { GameStaminaBattery } from '@/components/games/game-stamina-battery';
import { GamesBrandCorner } from '@/components/games/games-brand-corner';
import { Button } from '@/components/ui/button';
import {
  isElementFullscreen,
  supportsDomFullscreen,
  toggleElementFullscreen,
} from '@/lib/dom-fullscreen';
import { tryLockLandscapeOrientation } from '@/lib/games/mobile-landscape';
import { getQuizGameAudioSettings } from '@/lib/quiz/game-audio-actions';
import {
  applyQuizGameAudioMix,
  stopAllQuizBgm,
} from '@/lib/quiz/rpg-audio';
import { cn } from '@/lib/utils';

const pressStart2p = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-press-start-2p',
});

export function GameShell({
  title,
  onBack,
  pixelFont,
  headerActions,
  headerToolbarExtra,
  cornerControl,
  isAdmin = false,
  children,
}: {
  title: string;
  onBack: () => void;
  pixelFont?: boolean;
  /** 標題右側（例如管理員 Stage 2 / Stage 3 直達） */
  headerActions?: React.ReactNode;
  /** 全螢幕按鈕左側（例如課堂測驗音量） */
  headerToolbarExtra?: React.ReactNode;
  /** 右下角控制（預設為遊戲靜音） */
  cornerControl?: React.ReactNode;
  isAdmin?: boolean;
  children: React.ReactNode;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const [fullscreenCapable, setFullscreenCapable] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    setFullscreenCapable(supportsDomFullscreen());

    void getQuizGameAudioSettings().then((mix) => {
      applyQuizGameAudioMix(mix);
    });

    const syncFs = () => {
      setIsFullscreen(isElementFullscreen(shellRef.current));
    };

    syncFs();
    document.addEventListener('fullscreenchange', syncFs);
    document.addEventListener('webkitfullscreenchange', syncFs);

    return () => {
      document.removeEventListener('fullscreenchange', syncFs);
      document.removeEventListener('webkitfullscreenchange', syncFs);
    };
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    const el = shellRef.current;
    if (!el) return;
    void toggleElementFullscreen(el).then(() => {
      if (isElementFullscreen(el)) {
        void tryLockLandscapeOrientation();
      }
    });
  }, []);

  const handleBack = useCallback(() => {
    stopAllQuizBgm(true);
    const el = shellRef.current;
    if (el && isElementFullscreen(el)) {
      void toggleElementFullscreen(el);
    }
    onBack();
  }, [onBack]);

  return (
    <div
      ref={shellRef}
      data-game-shell
      className={cn(
        'relative isolate flex min-h-0 w-full flex-1 flex-col bg-background',
      )}
    >
      <div className="sticky top-0 z-[200] flex shrink-0 items-center gap-2 border-b border-border/80 bg-muted/30 px-2 py-1.5 sm:px-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 shrink-0 gap-1 px-2 text-xs"
          onClick={handleBack}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          選單
        </Button>
        <span className="min-w-0 truncate text-xs font-medium text-muted-foreground">{title}</span>
        {headerActions ? (
          <div className="flex shrink-0 items-center gap-1">{headerActions}</div>
        ) : null}
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <GameAudioMixControl isAdmin={isAdmin} />
          <GameStaminaBattery />
          {headerToolbarExtra}
          {fullscreenCapable && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => void handleToggleFullscreen()}
              aria-label={isFullscreen ? '離開遊戲全螢幕' : '遊戲全螢幕'}
              title={isFullscreen ? '離開遊戲全螢幕' : '遊戲全螢幕'}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" aria-hidden />
              ) : (
                <Maximize2 className="h-4 w-4" aria-hidden />
              )}
            </Button>
          )}
        </div>
      </div>
      <div
        className={cn(
          'relative z-0 flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto',
          pixelFont && [
            pressStart2p.variable,
            pressStart2p.className,
            'quiz-font-pixel quiz-disable-highlight',
          ],
        )}
      >
        <div className="flex min-h-0 w-full flex-1 flex-col">{children}</div>
      </div>
      {cornerControl ?? (
        <GamesBrandCorner className="pointer-events-auto absolute bottom-3 right-3 z-[500] sm:bottom-4 sm:right-4" />
      )}
    </div>
  );
}
