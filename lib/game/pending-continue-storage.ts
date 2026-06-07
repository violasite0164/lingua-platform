const STORAGE_KEY = 'games-pending-continue-v1';
const TTL_MS = 2 * 60 * 60 * 1000;

/** Stage 2 續關：從 STAGE 2 開頭重玩（非回合 checkpoint） */
export type PendingStage2RestartContinue = {
  kind: 'stage2-restart';
  savedAt: number;
};

/** Stage 3 續關：從 STAGE 3 開頭重玩（非回合 checkpoint） */
export type PendingStage3RestartContinue = {
  kind: 'stage3-restart';
  savedAt: number;
};

export type PendingContinuePayload =
  | PendingStage2RestartContinue
  | PendingStage3RestartContinue;

export type PendingContinueInput =
  | Omit<PendingStage2RestartContinue, 'savedAt'>
  | Omit<PendingStage3RestartContinue, 'savedAt'>;

export function savePendingContinue(payload: PendingContinueInput): void {
  if (typeof window === 'undefined') return;
  try {
    const full = { ...payload, savedAt: Date.now() } as PendingContinuePayload;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(full));
  } catch {
    /* ignore */
  }
}

export function loadPendingContinue(): PendingContinuePayload | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingContinuePayload;
    if (!parsed?.kind || typeof parsed.savedAt !== 'number') return null;
    if (Date.now() - parsed.savedAt > TTL_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (parsed.kind === 'stage2-restart' || parsed.kind === 'stage2') {
      return { kind: 'stage2-restart', savedAt: parsed.savedAt };
    }
    if (parsed.kind === 'stage3-restart') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearPendingContinue(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function hasPendingContinue(): boolean {
  return loadPendingContinue() != null;
}

export const GAMES_CONTINUE_AFTER_STAMINA_EVENT = 'games-continue-after-stamina';

export function signalContinueAfterStamina(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(GAMES_CONTINUE_AFTER_STAMINA_EVENT));
}
