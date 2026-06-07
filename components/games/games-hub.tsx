'use client';

import { useCallback, useEffect, useRef, useState, Suspense } from 'react';
import { flushSync } from 'react-dom';
import { useSearchParams } from 'next/navigation';

import { GamesStaminaCheckoutToast } from '@/components/billing/games-stamina-checkout-toast';
import { ActiveGameLoader } from '@/components/games/active-game-loader';
import { GamesHubLanding } from '@/components/games/games-hub-landing';
import {
  GAME_STAMINA_COST_START,
  isGameFreePlay,
  staminaShopHintForCharge,
} from '@/lib/game/stamina';
import { GameStaminaProvider, useGameStamina } from '@/lib/game/stamina-context';
import {
  preloadGamesHubBgm,
  retainGamesHubBgmSurface,
  startGamesHubBgm,
  stopGamesHubBgmImmediate,
  unlockAndStartGamesHubBgm,
} from '@/lib/games/games-hub-bgm';
import {
  GAME_CATALOG,
  GAMES_HUB_BACKGROUND_SRC,
  preloadGameAssets,
} from '@/lib/games/registry';
import type { GameId } from '@/lib/games/types';
import { requestElementFullscreen } from '@/lib/dom-fullscreen';
import { tryLockLandscapeOrientation } from '@/lib/games/mobile-landscape';
import { playGameHubStart, resumeQuizAudio } from '@/lib/quiz/rpg-audio';
import { createClient } from '@/lib/supabase/client';
import type { QuizDifficultyLevel } from '@/types/database.types';

function GamesHubContent() {
  const staminaCtx = useGameStamina();
  const searchParams = useSearchParams();
  const stageParam = searchParams?.get('stage') ?? null;
  const autoLaunchFromUrl =
    stageParam === 'junior' ||
    stageParam === 'college' ||
    stageParam === '2' ||
    stageParam === '3';
  const [activeGame, setActiveGame] = useState<GameId | null>(null);
  const [launching, setLaunching] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [quizInitialDifficulty, setQuizInitialDifficulty] = useState<
    QuizDifficultyLevel | undefined
  >(undefined);
  const [quizStageJumpKey, setQuizStageJumpKey] = useState(0);

  useEffect(() => {
    void preloadGameAssets('quiz');
    const img = new Image();
    img.src = GAMES_HUB_BACKGROUND_SRC;
    preloadGamesHubBgm();
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return;
      supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()
        .then(({ data }) => setIsAdmin(data?.role === 'admin'));
    });
  }, []);

  const hubBgmEnabled = !autoLaunchFromUrl && activeGame === null;
  const hubBgmEnabledRef = useRef(hubBgmEnabled);
  hubBgmEnabledRef.current = hubBgmEnabled;

  useEffect(() => retainGamesHubBgmSurface(), []);

  useEffect(() => {
    if (!hubBgmEnabled) {
      stopGamesHubBgmImmediate();
      return;
    }

    startGamesHubBgm();
    return () => {
      requestAnimationFrame(() => {
        if (!hubBgmEnabledRef.current) {
          stopGamesHubBgmImmediate();
        }
      });
    };
  }, [hubBgmEnabled]);

  const activateHubBgm = useCallback(() => {
    if (!hubBgmEnabled) return;
    void unlockAndStartGamesHubBgm();
  }, [hubBgmEnabled]);

  useEffect(() => {
    if (stageParam === 'junior' || stageParam === '2') {
      setQuizInitialDifficulty('junior');
      setQuizStageJumpKey((k) => k + 1);
      setActiveGame('quiz');
      return;
    }
    if (stageParam === 'college' || stageParam === '3') {
      setQuizInitialDifficulty('college');
      setQuizStageJumpKey((k) => k + 1);
      setActiveGame('quiz');
    }
  }, [stageParam]);

  const handleStartQuiz = useCallback(() => {
    void (async () => {
      const quizId = GAME_CATALOG.find((g) => g.status === 'live')?.id ?? 'quiz';
      setLaunching(true);
      try {
        const state =
          staminaCtx.stamina ??
          (await staminaCtx.refreshStamina());
        if (
          state &&
          !isGameFreePlay(state) &&
          state.stamina < GAME_STAMINA_COST_START
        ) {
          staminaCtx.openStaminaShop({
            hintMessage:
              staminaShopHintForCharge('start') ?? '開始遊戲需要 1 點體力',
            requiredAmount: GAME_STAMINA_COST_START,
          });
          return;
        }

        stopGamesHubBgmImmediate();
        await resumeQuizAudio();
        playGameHubStart();
        flushSync(() => {
          setActiveGame(quizId);
        });
        const shell = document.querySelector('[data-game-shell]');
        if (shell instanceof HTMLElement) {
          void requestElementFullscreen(shell).then(() => {
            void tryLockLandscapeOrientation();
          });
        }
        await preloadGameAssets(quizId);
      } finally {
        setLaunching(false);
      }
    })();
  }, [staminaCtx]);

  const handleAdminGoStage2 = useCallback(() => {
    stopGamesHubBgmImmediate();
    void resumeQuizAudio();
    setQuizInitialDifficulty('junior');
    setQuizStageJumpKey((k) => k + 1);
    setActiveGame('quiz');
  }, []);

  const handleAdminGoStage3 = useCallback(() => {
    stopGamesHubBgmImmediate();
    void resumeQuizAudio();
    setQuizInitialDifficulty('college');
    setQuizStageJumpKey((k) => k + 1);
    setActiveGame('quiz');
  }, []);

  return (
    <section
      className="relative flex min-h-0 w-full flex-1 flex-col bg-transparent"
      aria-label="英語大冒險"
    >
      {activeGame ? (
        <ActiveGameLoader
          gameId={activeGame}
          onBack={() => {
            setActiveGame(null);
            setQuizInitialDifficulty(undefined);
            void resumeQuizAudio().then(() => unlockAndStartGamesHubBgm());
          }}
          isAdmin={isAdmin}
          onAdminGoStage2={handleAdminGoStage2}
          onAdminGoStage3={handleAdminGoStage3}
          quizInitialDifficulty={quizInitialDifficulty}
          quizStageJumpKey={quizStageJumpKey}
        />
      ) : (
        <GamesHubLanding
          onStart={handleStartQuiz}
          disabled={launching}
          onActivateAudio={activateHubBgm}
        />
      )}
    </section>
  );
}

export function GamesHub() {
  return (
    <GameStaminaProvider>
      <Suspense fallback={null}>
        <GamesStaminaCheckoutToast />
      </Suspense>
      <GamesHubContent />
    </GameStaminaProvider>
  );
}
