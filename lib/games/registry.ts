import type { GameCatalogEntry, GameId, GameModule } from '@/lib/games/types';
import { quizGameModule } from '@/lib/games/modules/quiz';
import { preloadRiveAsset } from '@/lib/games/asset-loader';
import { isRiveQuizEnabled } from '@/lib/games/flags';
import { SUPER_FUN_RIVE } from '@/lib/games/super-fun-rive-manifest';
import { QUIZ_STAGE_BACKGROUND_SRC } from '@/lib/quiz/stage-backgrounds';
import { STAGE3_ASSETS } from '@/lib/stage3/constants';

/** /games 選單主視覺背景 */
export const GAMES_HUB_BACKGROUND_SRC = '/games/english-quiz-adventure-hub-bg.png';

/** /games 選單背景音樂（暁の遠征） */
export { GAMES_HUB_BGM_URL as GAMES_HUB_BGM_SRC } from '@/lib/games/games-hub-bgm';

/** 遊玩畫面全屏背景（Magic Whisper Woods） */
export const QUIZ_PLAY_BACKGROUND_SRC = '/games/quiz-magic-woods-bg.png';

export const QUIZ_MASCOT_BOY_SRC = '/games/quiz-mascot-boy.png';
/** 答題場景男孩 Rive（public/rive/quiz-mascot-boy.riv） */
export const QUIZ_MASCOT_BOY_RIVE_SRC = '/rive/quiz-mascot-boy.riv';
export const QUIZ_MASCOT_GIRL_SRC = '/games/quiz-mascot-girl.png';
/** 答題場景女孩 Rive（public/rive/quiz-mascot-girl.riv） */
export const QUIZ_MASCOT_GIRL_RIVE_SRC = '/rive/quiz-mascot-girl.riv';
export const QUIZ_MASCOT_BEAR_SRC = '/games/quiz-mascot-bear.png';
/** 答題場景熊 Rive（public/rive/quiz-mascot-bear.riv） */
export const QUIZ_MASCOT_BEAR_RIVE_SRC = '/rive/quiz-mascot-bear.riv';

export const GAME_CATALOG: GameCatalogEntry[] = [
  {
    id: 'quiz',
    title: '英語大冒險',
    description: '四選一英語測驗，累積 XP 與排行榜',
    status: 'live',
    pixelFont: true,
  },
];

const GAME_MODULES: Record<GameId, GameModule> = {
  quiz: quizGameModule,
};

export function getGameCatalogEntry(id: GameId): GameCatalogEntry | undefined {
  return GAME_CATALOG.find((g) => g.id === id);
}

/** 同步取得遊戲模組（與 /games 同 bundle，避免點擊時再載入失敗的 chunk） */
export function getGameModule(id: GameId): GameModule {
  const mod = GAME_MODULES[id];
  if (!mod) throw new Error(`Unknown game: ${id}`);
  return mod;
}

export async function loadGameModule(id: GameId): Promise<GameModule> {
  return getGameModule(id);
}

/** 進入遊戲選單時可選呼叫，預熱即將使用的 .riv */
function preloadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });
}

/** 答題男孩／女孩／熊 Rive 與 PNG fallback（開場影片期間呼叫） */
export async function preloadQuizMascotAssets(): Promise<void> {
  await Promise.all([
    preloadImage(QUIZ_MASCOT_BOY_SRC),
    preloadImage(QUIZ_MASCOT_GIRL_SRC),
    preloadImage(QUIZ_MASCOT_BEAR_SRC),
    preloadRiveAsset(QUIZ_MASCOT_BOY_RIVE_SRC).then(() => undefined),
    preloadRiveAsset(QUIZ_MASCOT_GIRL_RIVE_SRC).then(() => undefined),
    preloadRiveAsset(QUIZ_MASCOT_BEAR_RIVE_SRC).then(() => undefined),
  ]);
}

export async function preloadGameAssets(id: GameId): Promise<void> {
  if (id !== 'quiz') return;
  const tasks: Promise<void>[] = [
    preloadImage(GAMES_HUB_BACKGROUND_SRC),
    preloadImage(QUIZ_PLAY_BACKGROUND_SRC),
    ...[...new Set(Object.values(QUIZ_STAGE_BACKGROUND_SRC))].map((src) =>
      preloadImage(src),
    ),
    preloadQuizMascotAssets(),
    ...Object.values(STAGE3_ASSETS).map((src) => preloadImage(src)),
  ];
  if (isRiveQuizEnabled()) {
    tasks.push(
      preloadRiveAsset(SUPER_FUN_RIVE.assets.prop.src()).then(() => undefined),
    );
  }
  await Promise.all(tasks);
}
