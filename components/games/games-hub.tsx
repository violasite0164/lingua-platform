'use client';

import { useState } from 'react';
import { ChevronLeft, Gamepad2 } from 'lucide-react';
import { Press_Start_2P } from 'next/font/google';

import { QuizApp } from '@/components/quiz/quiz-app';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const pressStart2p = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-press-start-2p',
});

type ActiveGame = 'quiz' | null;

/** 遊戲區外框：手機直式約 9:19.5；md+ 為 4:3（以明確寬高計算，避免 aspect-ratio + absolute 塌成 0） */
const VIEWPORT_CLASS = cn(
  'games-viewport mx-auto flex w-full flex-col overflow-hidden rounded-xl border-2 border-border bg-background shadow-lg',
  'min-h-[360px] min-w-[240px]',
);

function GameMenu({ onSelectQuiz }: { onSelectQuiz: () => void }) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col" aria-label="遊戲選單">
      <button
        type="button"
        onClick={onSelectQuiz}
        className={cn(
          'flex min-h-0 flex-1 flex-col items-center justify-center gap-2 border-b border-border/80 px-4 text-center transition-colors',
          'hover:bg-accent/40 active:bg-accent/60',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
        )}
      >
        <Gamepad2 className="h-8 w-8 text-primary md:h-10 md:w-10" aria-hidden />
        <span className="text-base font-semibold tracking-tight md:text-lg">AI英語鬥</span>
        <span className="text-xs text-muted-foreground md:text-sm">點擊開始</span>
      </button>

      <div
        className="flex min-h-0 flex-1 items-center justify-center border-b border-border/80 bg-muted/20"
        aria-hidden
      />

      <div className="flex min-h-0 flex-1 items-center justify-center bg-muted/10" aria-hidden />
    </div>
  );
}

function GameShell({
  title,
  onBack,
  pixelFont,
  children,
}: {
  title: string;
  onBack: () => void;
  pixelFont?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-1 border-b border-border/80 bg-muted/30 px-2 py-1.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1 px-2 text-xs"
          onClick={onBack}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          選單
        </Button>
        <span className="truncate text-xs font-medium text-muted-foreground">{title}</span>
      </div>
      <div
        className={cn(
          'min-h-0 flex-1 overflow-y-auto overflow-x-hidden',
          pixelFont && [
            pressStart2p.variable,
            pressStart2p.className,
            'quiz-font-pixel quiz-disable-highlight',
          ],
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function GamesHub() {
  const [activeGame, setActiveGame] = useState<ActiveGame>(null);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 py-6 md:py-8">
      <section className={VIEWPORT_CLASS} aria-label="遊戲區">
        {activeGame === 'quiz' ? (
          <GameShell title="AI英語鬥" pixelFont onBack={() => setActiveGame(null)}>
            <QuizApp embedded />
          </GameShell>
        ) : (
          <GameMenu onSelectQuiz={() => setActiveGame('quiz')} />
        )}
      </section>
    </div>
  );
}
