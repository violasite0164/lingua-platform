import { stage2BgmQuarterBeatMs } from '@/lib/stage2/stage2-bgm-track';

/** 每回合分身數：首 3 回各 3、第 4–7 回各 5、第 8–10 回各 7 */
export const STAGE2_CLONE_COUNTS = [3, 3, 3, 5, 5, 5, 5, 7, 7, 7] as const;

export const STAGE2_TOTAL_ROUNDS = STAGE2_CLONE_COUNTS.length;

export const STAGE2_MAX_HEARTS = 3;

/** 每回合選擇分身的秒數 */
export const STAGE2_ROUND_TIME_SECONDS = 3;
/** 7 分身回合選擇秒數 */
export const STAGE2_ROUND_TIME_SECONDS_CLONES_7 = 4;

export function stage2RoundTimeSeconds(cloneCount: number): number {
  return cloneCount >= 7 ? STAGE2_ROUND_TIME_SECONDS_CLONES_7 : STAGE2_ROUND_TIME_SECONDS;
}

/** BGM 四分音符週期（毫秒），與 {@link stage2BgmQuarterBeatMs} 同步 */
export const STAGE2_BEAT_MS = stage2BgmQuarterBeatMs();

/** 開場「分身術」對齊 BGM 的拍數 */
export const STAGE2_JUTSU_INTRO_BEATS = 3;

/** 最後一拍分身全出現後，再等幾拍才開始洗牌 */
export const STAGE2_CLONE_SHUFFLE_DELAY_BEATS = 1;

/** 同一拍內各分身 CSS／音效微錯開（佔拍長比例） */
export const STAGE2_CLONE_SPAWN_IN_BEAT_STAGGER_RATIO = 0.1;

export function stage2CloneSpawnStaggerMs(cloneIndex: number): number {
  return Math.round(STAGE2_BEAT_MS * STAGE2_CLONE_SPAWN_IN_BEAT_STAGGER_RATIO * cloneIndex);
}

/** 洗牌動畫各段時長（皆為拍長倍率，隨 BGM BPM 變） */
export const STAGE2_CLONE_SHUFFLE_ANTICIPATION_MS = Math.round(STAGE2_BEAT_MS * 0.4);
export const STAGE2_CLONE_SHUFFLE_FLIGHT_MS = Math.round(STAGE2_BEAT_MS * 0.85);
export const STAGE2_CLONE_SHUFFLE_STAGGER_MS = Math.round(STAGE2_BEAT_MS * 0.12);
export const STAGE2_CLONE_SHUFFLE_SETTLE_MS = Math.round(STAGE2_BEAT_MS * 0.15);
export const STAGE2_CLONE_SHUFFLE_WINDUP_STAGGER_MS = Math.round(STAGE2_BEAT_MS * 0.05);

/** 5 分身：首次登場前 Boss 台詞 */
export const STAGE2_BOSS_CALLOUT_LINE_5 =
  'Not bad. I should get a little serious too.';

/** 7 分身：首次登場前 Boss 台詞 */
export const STAGE2_BOSS_CALLOUT_LINE_7 =
  "I acknowledge your skill—let's give it our all together!";

/** 首次 Boss 台詞顯示拍數（分身出現前） */
export const STAGE2_BOSS_CALLOUT_BEATS = 2;

export type Stage2ShuffleIntensity = 'normal' | 'boost' | 'extreme' | 'finale';

const STAGE2_SHUFFLE_INTENSITY_TIME_SCALE: Record<Stage2ShuffleIntensity, number> = {
  normal: 1,
  boost: 0.82,
  extreme: 0.68,
  /** 第十回合：洗牌動畫大幅提速 */
  finale: 0.36,
};

export const STAGE2_FINAL_ROUND_INDEX = STAGE2_TOTAL_ROUNDS - 1;

export function stage2ShuffleCountForClones(cloneCount: number): number {
  if (cloneCount >= 7) return 3;
  if (cloneCount >= 5) return 2;
  return 1;
}

export function stage2ShuffleCountForRound(
  _roundIndex: number,
  cloneCount: number,
): number {
  return stage2ShuffleCountForClones(cloneCount);
}

export function stage2ShuffleIntensityForClones(
  cloneCount: number,
): Stage2ShuffleIntensity {
  if (cloneCount >= 7) return 'extreme';
  if (cloneCount >= 5) return 'boost';
  return 'normal';
}

/** 第 8 回合起（0-based index 7）才播全幅旋轉光暈 */
export const STAGE2_ROUND_POWER_FX_MIN_ROUND_INDEX = 7;

export function stage2RoundShowsPowerFx(roundIndex: number): boolean {
  void roundIndex;
  return false;
}

/** 第 8 回合：Boss 台詞播完後才開旋轉光暈 */
export function stage2RoundPowerFxWaitsForBossCallout(roundIndex: number): boolean {
  return roundIndex === STAGE2_ROUND_POWER_FX_MIN_ROUND_INDEX;
}

export function stage2ShuffleIntensityForRound(
  roundIndex: number,
  cloneCount: number,
): Stage2ShuffleIntensity {
  if (roundIndex === STAGE2_FINAL_ROUND_INDEX) return 'finale';
  return stage2ShuffleIntensityForClones(cloneCount);
}

export function stage2BossCalloutLineForClones(cloneCount: number): string | null {
  if (cloneCount >= 7) return STAGE2_BOSS_CALLOUT_LINE_7;
  if (cloneCount >= 5) return STAGE2_BOSS_CALLOUT_LINE_5;
  return null;
}

export type Stage2BossCalloutUsed = { line5: boolean; line7: boolean };

export const STAGE2_BOSS_CALLOUT_USED_INITIAL: Stage2BossCalloutUsed = {
  line5: false,
  line7: false,
};

/** 本局每句 Boss 台詞僅出現一次（5 分身／7 分身各一次） */
/**
 * @deprecated Stage 2 續關已改為從 STAGE 2 開頭重玩，不再使用回合 checkpoint。
 */
export function stage2ContinueCheckpointRoundIndex(deathRoundIndex: number): number {
  const death = Math.max(0, Math.min(deathRoundIndex, STAGE2_TOTAL_ROUNDS - 1));
  for (let i = death; i >= 1; i--) {
    const prev = STAGE2_CLONE_COUNTS[i - 1] ?? 3;
    const curr = STAGE2_CLONE_COUNTS[i] ?? 3;
    if (curr > prev) return i;
  }
  return 0;
}

export function stage2BossCalloutLineOncePerGame(
  cloneCount: number,
  alreadyUsed: { line5: boolean; line7: boolean },
): { line: string | null; useLine5: boolean; useLine7: boolean } {
  if (cloneCount >= 7 && !alreadyUsed.line7) {
    return {
      line: STAGE2_BOSS_CALLOUT_LINE_7,
      useLine5: false,
      useLine7: true,
    };
  }
  if (cloneCount >= 5 && !alreadyUsed.line5) {
    return {
      line: STAGE2_BOSS_CALLOUT_LINE_5,
      useLine5: true,
      useLine7: false,
    };
  }
  return { line: null, useLine5: false, useLine7: false };
}

/** @deprecated 使用 {@link stage2BossCalloutLineForClones} */
export const stage2BossShuffleLineForClones = stage2BossCalloutLineForClones;

/** @deprecated 使用 {@link stage2BossCalloutLineOncePerGame} */
export const stage2BossShuffleLineOncePerGame = stage2BossCalloutLineOncePerGame;

export type Stage2CloneShuffleMotion = {
  anticipationMs: number;
  durationMs: number;
  staggerMs: number;
  settleMs: number;
  windupStaggerMs: number;
};

export function stage2CloneShuffleMotion(
  intensity: Stage2ShuffleIntensity = 'normal',
): Stage2CloneShuffleMotion {
  const scale = STAGE2_SHUFFLE_INTENSITY_TIME_SCALE[intensity];
  const durationMs = Math.max(420, Math.round(STAGE2_CLONE_SHUFFLE_FLIGHT_MS * scale));
  const anticipationMs = Math.max(80, Math.round(STAGE2_CLONE_SHUFFLE_ANTICIPATION_MS * scale));
  const staggerMs = Math.max(22, Math.round(STAGE2_CLONE_SHUFFLE_STAGGER_MS * scale));
  const settleMs = Math.max(70, Math.round(STAGE2_CLONE_SHUFFLE_SETTLE_MS * scale));
  const windupStaggerMs = Math.max(
    12,
    Math.round(STAGE2_CLONE_SHUFFLE_WINDUP_STAGGER_MS * scale),
  );
  return {
    anticipationMs,
    durationMs,
    staggerMs,
    settleMs,
    windupStaggerMs,
  };
}

/** BINGO 提示顯示時長（毫秒） */
export const STAGE2_FEEDBACK_MS = 900;

/** MISS（含正確答案解釋）提示顯示時長（毫秒）；比 BINGO 多 0.5 秒 */
export const STAGE2_MISS_FEEDBACK_MS = STAGE2_FEEDBACK_MS + 500;

/** 每次 MISS 解釋視窗僅可長按延長一次，延長顯示時間（毫秒） */
export const STAGE2_MISS_HOLD_EXTEND_MS = 3000;

/** 判定為長按的最短按住時間（毫秒） */
export const STAGE2_MISS_LONG_PRESS_MS = 400;

/** 本局遇到初中生字時，女主角提示正確答案的機率（每局最多觸發一次） */
export const STAGE2_HEROINE_HINT_CHANCE = 0.5;

/** 女主角觸發提示時，該回合倒數額外加秒（秒） */
export const STAGE2_HEROINE_HINT_TIME_BONUS_SECONDS = 2;

/** 分身提示每波最少停留（毫秒）後才換下一波 */
export const STAGE2_TAUNT_WAVE_MIN_MS = 2200;

/** 分身提示每波最多停留（毫秒）後才換下一波 */
export const STAGE2_TAUNT_WAVE_MAX_MS = 3600;

/** 該波提示指向正確答案的機率（0–1） */
export const STAGE2_TAUNT_TRUTH_CHANCE = 0.38;

/** 同波分身錯開出現（毫秒） */
export const STAGE2_TAUNT_STAGGER_MS = 280;

/** 手裏劍飛行動畫時長（毫秒） */
export const STAGE2_SHURIKEN_FLY_MS = 280;

/** 手裏劍命中後結算延遲（毫秒） */
export const STAGE2_SHURIKEN_HIT_MS = 300;

/** 生字庫每字最少英文字母數 */
export const STAGE2_MIN_WORD_LENGTH = 6;

export const STAGE2_ASSETS = {
  bgm: '/games/stage2/stage2-bgm.mp3',
  castleBg: '/games/stage2/castle-bg.png',
  purpleNinja: '/games/stage2/purple-ninja.png',
  ninjaRive: '/games/stage2/ninja.riv',
  redNinja: '/games/stage2/red-ninja.png',
  blueKimono: '/games/stage2/blue-kimono.png',
  redBoyRive: '/games/stage2/red_boy.riv',
  blueGirlRive: '/games/stage2/blue_girl.riv',
  shuriken: '/games/stage2/shuriken.png',
} as const;

/** Stage 2 紅衣男孩 Rive（State Machine 1 · trigger `throw`） */
export const STAGE2_RED_BOY_RIVE = {
  src: STAGE2_ASSETS.redBoyRive,
  stateMachine: 'State Machine 1',
  inputs: { throw: 'throw' },
} as const;

/** Stage 2 藍衣女孩 Rive（State Machine 1 · idle） */
export const STAGE2_BLUE_GIRL_RIVE = {
  src: STAGE2_ASSETS.blueGirlRive,
  stateMachine: 'State Machine 1',
  inputs: {},
} as const;

/** Stage 2 紫忍者 Rive（State Machine 1 · triggers `cast` / `miss` / `hit`） */
export const STAGE2_NINJA_RIVE = {
  src: STAGE2_ASSETS.ninjaRive,
  stateMachine: 'State Machine 1',
  inputs: { cast: 'cast', miss: 'miss', hit: 'hit' },
  /** `cast` trigger one-shot 動畫時長（毫秒） */
  castAnimMs: 900,
  /** cast 播畢後淡出時長（毫秒） */
  castFadeMs: 480,
  /** `miss` trigger one-shot 動畫時長（毫秒），播完後隱藏錯誤分身 */
  missAnimMs: 850,
} as const;
