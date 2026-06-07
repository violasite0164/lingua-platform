/** 體力上限 */
export const GAME_STAMINA_MAX = 10;

/** 每小時回復 1 點（毫秒） */
export const GAME_STAMINA_REGEN_MS = 60 * 60 * 1000;

/** 開始一局遊戲 */
export const GAME_STAMINA_COST_START = 1;

/** 通關失敗後再玩一次 */
export const GAME_STAMINA_COST_RETRY = 1;

/** Stage 2 通關失敗後續關 */
export const GAME_STAMINA_COST_CONTINUE = 3;

export type GameStaminaState = {
  stamina: number;
  max: number;
  isAdmin: boolean;
  /** 訂閱方案開啟 FREE PLAY 或管理員 */
  freePlay?: boolean;
  nextRegenAt: string | null;
};

/** 遊戲不扣體力（管理員或有效訂閱 FREE PLAY） */
export function isGameFreePlay(state: GameStaminaState | null | undefined): boolean {
  if (!state) return false;
  return state.isAdmin === true || state.freePlay === true;
}

export type GameStaminaSpendResult =
  | ({ ok: true; spent: number } & GameStaminaState)
  | {
      ok: false;
      message: string;
      stamina?: number;
      max?: number;
      nextRegenAt?: string | null;
    };

export type StaminaChargeKind = 'none' | 'start' | 'retry' | 'continue';

export function canAffordStaminaCharge(
  state: GameStaminaState | null | undefined,
  kind: StaminaChargeKind,
): boolean {
  const cost = staminaCostForCharge(kind);
  if (cost <= 0) return true;
  if (!state) return false;
  if (isGameFreePlay(state)) return true;
  return state.stamina >= cost;
}

export function staminaCostForCharge(kind: StaminaChargeKind): number {
  switch (kind) {
    case 'start':
      return GAME_STAMINA_COST_START;
    case 'retry':
      return GAME_STAMINA_COST_RETRY;
    case 'continue':
      return GAME_STAMINA_COST_CONTINUE;
    default:
      return 0;
  }
}

/** 體力不足彈窗的說明（依開局類型） */
export function staminaShopHintForCharge(kind: StaminaChargeKind): string | undefined {
  switch (kind) {
    case 'continue':
      return `續關需要 ${GAME_STAMINA_COST_CONTINUE} 點體力`;
    case 'retry':
      return `再玩一次需要 ${GAME_STAMINA_COST_RETRY} 點體力`;
    case 'start':
      return `開始遊戲需要 ${GAME_STAMINA_COST_START} 點體力`;
    default:
      return undefined;
  }
}

/** 距離下次體力回復的毫秒數；已滿或無計時則 null */
export function msUntilStaminaRegen(
  nextRegenAt: string | null,
  nowMs: number = Date.now(),
): number | null {
  if (!nextRegenAt) return null;
  const target = new Date(nextRegenAt).getTime();
  if (!Number.isFinite(target)) return null;
  return Math.max(0, target - nowMs);
}

/** 體力回復倒數（MM:SS 或 H:MM:SS） */
export function formatStaminaRegenCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
