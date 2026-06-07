import type { ComponentType } from 'react';

/** 遊戲在 hub 與路由中的識別碼 */
export type GameId = 'quiz';

export type GameComponentProps = {
  /** 嵌入遊戲區 viewport（無全頁標題） */
  embedded?: boolean;
  /** 管理員直達指定關卡（與 stageJumpKey 搭配可重複觸發） */
  initialDifficulty?: import('@/types/database.types').QuizDifficultyLevel;
  /** 遞增時重新載入 initialDifficulty 關卡 */
  stageJumpKey?: number;
};

/** 動態載入的遊戲模組契約 */
export type GameModule = {
  id: GameId;
  title: string;
  description?: string;
  /** 是否使用像素字體（如 Press Start 2P） */
  pixelFont?: boolean;
  Component: ComponentType<GameComponentProps>;
};

/** Hub 選單用的靜態中繼資料 */
export type GameCatalogEntry = {
  id: GameId;
  title: string;
  description: string;
  status: 'live' | 'coming_soon';
  pixelFont?: boolean;
};
