import type { Stage3InputMode } from '@/lib/stage3/rounds';

export type Stage3KeyLayout = {
  boyKeys: string[];
  girlKeys: string[];
  bossLetter: string | null;
};

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export function stage3ModeUsesBoy(mode: Stage3InputMode): boolean {
  return mode === 'boy' || mode === 'boy-boss' || mode === 'both' || mode === 'all';
}

export function stage3ModeUsesGirl(mode: Stage3InputMode): boolean {
  return mode === 'girl' || mode === 'girl-boss' || mode === 'both' || mode === 'all';
}

export function stage3ModeUsesBoss(mode: Stage3InputMode): boolean {
  return mode === 'boy-boss' || mode === 'girl-boss' || mode === 'all';
}

export function buildStage3KeyLayout(word: string, mode: Stage3InputMode): Stage3KeyLayout {
  const letters = shuffle(word.toLowerCase().split(''));

  switch (mode) {
    case 'boy':
      return { boyKeys: letters.slice(0, 4), girlKeys: [], bossLetter: null };
    case 'girl':
      return { boyKeys: [], girlKeys: letters.slice(0, 4), bossLetter: null };
    case 'boy-boss':
      return { boyKeys: letters.slice(0, 4), girlKeys: [], bossLetter: letters[4] ?? null };
    case 'girl-boss':
      return { boyKeys: [], girlKeys: letters.slice(0, 4), bossLetter: letters[4] ?? null };
    case 'both':
      return {
        boyKeys: letters.slice(0, 4),
        girlKeys: letters.slice(4, 8),
        bossLetter: null,
      };
    case 'all':
      return {
        boyKeys: letters.slice(0, 4),
        girlKeys: letters.slice(4, 8),
        bossLetter: letters[8] ?? null,
      };
    default:
      return { boyKeys: [], girlKeys: [], bossLetter: null };
  }
}

export type Stage3KeyRevealTarget =
  | { side: 'boy'; keyIndex: number }
  | { side: 'girl'; keyIndex: number }
  | { side: 'boss' };

export type Stage3KeyVisibility = {
  boy: [boolean, boolean, boolean, boolean];
  girl: [boolean, boolean, boolean, boolean];
  boss: boolean;
};

const HIDDEN_KEY_VISIBILITY: Stage3KeyVisibility = {
  boy: [false, false, false, false],
  girl: [false, false, false, false],
  boss: false,
};

export type Stage3KeySide = 'boss' | 'boy' | 'girl';

export type Stage3KeySidesRevealed = {
  boss: boolean;
  boy: boolean;
  girl: boolean;
};

export const STAGE3_KEY_SIDES_HIDDEN: Stage3KeySidesRevealed = {
  boss: false,
  boy: false,
  girl: false,
};

/** 回合開場鍵盤順序：Boss → Boy → Girl；該回合無此角色則跳過 */
export function buildStage3KeyRevealSequence(mode: Stage3InputMode): Stage3KeySide[] {
  const seq: Stage3KeySide[] = [];
  if (stage3ModeUsesBoss(mode)) seq.push('boss');
  if (stage3ModeUsesBoy(mode)) seq.push('boy');
  if (stage3ModeUsesGirl(mode)) seq.push('girl');
  return seq;
}

export function computeStage3KeyVisibilityFromSides(
  revealed: Stage3KeySidesRevealed,
): Stage3KeyVisibility {
  return {
    boss: revealed.boss,
    boy: revealed.boy
      ? [true, true, true, true]
      : [false, false, false, false],
    girl: revealed.girl
      ? [true, true, true, true]
      : [false, false, false, false],
  };
}

/** @deprecated 改為 buildStage3KeyRevealSequence + computeStage3KeyVisibilityFromSides */
export function buildStage3KeyRevealPlan(
  word: string,
  layout: Stage3KeyLayout,
  mode: Stage3InputMode,
): Stage3KeyRevealTarget[] {
  const plan: Stage3KeyRevealTarget[] = [];
  const usedBoy = new Set<number>();
  const usedGirl = new Set<number>();
  let bossUsed = false;

  for (const ch of word.toLowerCase()) {
    let matched = false;

    if (stage3ModeUsesBoss(mode) && layout.bossLetter === ch && !bossUsed) {
      plan.push({ side: 'boss' });
      bossUsed = true;
      matched = true;
    }

    if (!matched && stage3ModeUsesBoy(mode)) {
      const idx = layout.boyKeys.findIndex((letter, i) => letter === ch && !usedBoy.has(i));
      if (idx >= 0) {
        usedBoy.add(idx);
        plan.push({ side: 'boy', keyIndex: idx });
        matched = true;
      }
    }

    if (!matched && stage3ModeUsesGirl(mode)) {
      const idx = layout.girlKeys.findIndex((letter, i) => letter === ch && !usedGirl.has(i));
      if (idx >= 0) {
        usedGirl.add(idx);
        plan.push({ side: 'girl', keyIndex: idx });
        matched = true;
      }
    }

    if (!matched && stage3ModeUsesBoss(mode) && layout.bossLetter === ch && !bossUsed) {
      plan.push({ side: 'boss' });
      bossUsed = true;
      matched = true;
    }

    if (!matched && stage3ModeUsesBoy(mode)) {
      const fallback = layout.boyKeys.findIndex((_, i) => !usedBoy.has(i));
      if (fallback >= 0) {
        usedBoy.add(fallback);
        plan.push({ side: 'boy', keyIndex: fallback });
        matched = true;
      }
    }

    if (!matched && stage3ModeUsesGirl(mode)) {
      const fallback = layout.girlKeys.findIndex((_, i) => !usedGirl.has(i));
      if (fallback >= 0) {
        usedGirl.add(fallback);
        plan.push({ side: 'girl', keyIndex: fallback });
      }
    }
  }

  return plan;
}

export function computeStage3KeyVisibility(
  plan: readonly Stage3KeyRevealTarget[],
  revealedCharCount: number,
): Stage3KeyVisibility {
  if (revealedCharCount <= 0) return HIDDEN_KEY_VISIBILITY;

  const boy: [boolean, boolean, boolean, boolean] = [false, false, false, false];
  const girl: [boolean, boolean, boolean, boolean] = [false, false, false, false];
  let boss = false;

  for (let i = 0; i < Math.min(revealedCharCount, plan.length); i++) {
    const step = plan[i]!;
    if (step.side === 'boy') boy[step.keyIndex] = true;
    else if (step.side === 'girl') girl[step.keyIndex] = true;
    else boss = true;
  }

  return { boy, girl, boss };
}

export function resolveStage3KeyLetter(
  layout: Stage3KeyLayout,
  opts: { boyKeyIndex?: number | null; girlKeyIndex?: number | null; boss?: boolean },
): string | null {
  if (opts.boss && layout.bossLetter) return layout.bossLetter;
  if (opts.boyKeyIndex != null && opts.boyKeyIndex >= 0) {
    return layout.boyKeys[opts.boyKeyIndex] ?? null;
  }
  if (opts.girlKeyIndex != null && opts.girlKeyIndex >= 0) {
    return layout.girlKeys[opts.girlKeyIndex] ?? null;
  }
  return null;
}
