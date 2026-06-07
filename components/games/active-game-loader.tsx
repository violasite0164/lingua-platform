'use client';

import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { GameShell } from '@/components/games/game-shell';
import { getGameModule, preloadQuizMascotAssets } from '@/lib/games/registry';
import type { GameId } from '@/lib/games/types';

export function ActiveGameLoader({
  gameId,
  onBack,
  isAdmin = false,
  onAdminGoStage2,
  onAdminGoStage3,
  quizInitialDifficulty,
  quizStageJumpKey = 0,
}: {
  gameId: GameId;
  onBack: () => void;
  isAdmin?: boolean;
  onAdminGoStage2?: () => void;
  onAdminGoStage3?: () => void;
  quizInitialDifficulty?: import('@/types/database.types').QuizDifficultyLevel;
  quizStageJumpKey?: number;
}) {
  useEffect(() => {
    if (gameId === 'quiz') void preloadQuizMascotAssets();
  }, [gameId]);

  let gameModule;
  try {
    gameModule = getGameModule(gameId);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '無法載入遊戲';
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-4 text-center">
        <p className="text-sm text-destructive">{message}</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          若按鈕完全沒反應，請關閉 DevTools 的「Disable cache」、刪除 .next 後執行 npm run dev:clean。
        </p>
        <button type="button" className="text-sm text-primary underline" onClick={onBack}>
          返回選單
        </button>
      </div>
    );
  }

  const GameComponent = gameModule.Component;

  const showAdminShortcuts = isAdmin && gameId === 'quiz';

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <GameShell
        title={gameModule.title}
        pixelFont={gameModule.pixelFont}
        onBack={onBack}
        isAdmin={isAdmin}
        headerActions={
          showAdminShortcuts ? (
            <div className="flex items-center gap-1">
              {onAdminGoStage2 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 border-violet-500/50 bg-violet-500/10 px-2 text-[11px] font-semibold text-violet-700 hover:bg-violet-500/20 dark:text-violet-200"
                  onClick={onAdminGoStage2}
                >
                  Stage 2
                </Button>
              ) : null}
              {onAdminGoStage3 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 border-fuchsia-500/50 bg-fuchsia-500/10 px-2 text-[11px] font-semibold text-fuchsia-700 hover:bg-fuchsia-500/20 dark:text-fuchsia-200"
                  onClick={onAdminGoStage3}
                >
                  Stage 3
                </Button>
              ) : null}
            </div>
          ) : undefined
        }
      >
        <GameComponent
          key={gameId === 'quiz' ? `quiz-${quizStageJumpKey}` : gameId}
          embedded
          initialDifficulty={quizInitialDifficulty}
          stageJumpKey={quizStageJumpKey}
        />
      </GameShell>
    </div>
  );
}
