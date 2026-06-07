/** Boy 四鍵 → 字母索引（對應 lettersForGroup 順序） */
export const STAGE3_BOY_KEY_BINDINGS = ['w', 'a', 's', 'd'] as const;

/** Girl 四鍵 → 字母索引 */
export const STAGE3_GIRL_KEY_BINDINGS = [
  'ArrowUp',
  'ArrowLeft',
  'ArrowDown',
  'ArrowRight',
] as const;

export const STAGE3_BOSS_BONUS_KEY = ' ';

const BOY_KEYS_LOWER = new Set<string>(STAGE3_BOY_KEY_BINDINGS);
const GIRL_KEYS = new Set<string>(STAGE3_GIRL_KEY_BINDINGS);

export function stage3BoyKeyIndex(key: string): number | null {
  const lower = key.toLowerCase();
  const idx = STAGE3_BOY_KEY_BINDINGS.indexOf(lower as (typeof STAGE3_BOY_KEY_BINDINGS)[number]);
  return idx >= 0 ? idx : null;
}

export function stage3GirlKeyIndex(key: string): number | null {
  const idx = STAGE3_GIRL_KEY_BINDINGS.indexOf(key as (typeof STAGE3_GIRL_KEY_BINDINGS)[number]);
  return idx >= 0 ? idx : null;
}

/** 輸入階段需攔截預設行為的按鍵（避免捲動、方向鍵捲頁等） */
export function isStage3GameKey(
  key: string,
  opts: { boyActive: boolean; girlActive: boolean; bossBonusActive: boolean },
): boolean {
  if (opts.boyActive && BOY_KEYS_LOWER.has(key.toLowerCase())) {
    return true;
  }
  if (opts.girlActive && GIRL_KEYS.has(key)) return true;
  if (opts.bossBonusActive && key === STAGE3_BOSS_BONUS_KEY) return true;
  return false;
}

export const STAGE3_BOY_KEY_HINTS = ['W', 'A', 'S', 'D'] as const;
export const STAGE3_GIRL_KEY_HINTS = ['↑', '←', '↓', '→'] as const;
