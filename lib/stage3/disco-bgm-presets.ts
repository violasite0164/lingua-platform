/** Stage 3 迪斯可 BGM：自訂 MP3（見 stage3-bgm-track.ts） */

import { STAGE3_BGM_TRACK } from '@/lib/stage3/stage3-bgm-track';

export const STAGE3_DISCO_LOOP_STEPS = 64;
export const STAGE3_DISCO_STEPS_PER_BAR = 16;

export type Stage3DiscoBgmPresetId = 1;

export const DEFAULT_STAGE3_DISCO_BGM_PRESET_ID: Stage3DiscoBgmPresetId = 1;

export function isStage3DiscoBgmPresetId(n: number): n is Stage3DiscoBgmPresetId {
  return n === 1;
}

export type Stage3DiscoDrumStyle = 'classic' | 'funky' | 'minimal' | 'hihat16';

export type Stage3DiscoBgmLayers = {
  guitarChop: boolean;
  rhodes: boolean;
  strings: boolean;
  pad: boolean;
  cowbell: boolean;
  shaker: boolean;
  hook: boolean;
};

export type Stage3DiscoBgmMix = {
  kick: number;
  snare: number;
  hat: number;
  bass: number;
  hook: number;
  strings: number;
};

export type Stage3DiscoBgmPreset = {
  id: Stage3DiscoBgmPresetId;
  title: string;
  subtitle: string;
  bpm: number;
  chordVoicings: number[][];
  barRoots: readonly number[];
  /** 每 16 分音符一步；長度 16（每小節相同）或 64（每小節不同） */
  bassGroove: readonly number[];
  /** 主旋律：64 步（4 小節），0 為休止 */
  hookPattern: readonly number[];
  drumStyle: Stage3DiscoDrumStyle;
  layers: Stage3DiscoBgmLayers;
  mix: Stage3DiscoBgmMix;
  bassCutoffHz: number;
};

function hook4(
  a: readonly number[],
  b: readonly number[],
  c: readonly number[],
  d: readonly number[],
): number[] {
  return [...a, ...b, ...c, ...d];
}

const HOOK_BAR_1: readonly number[] = [
  523.25, 0, 622.25, 0, 783.99, 0, 932.33, 0, 783.99, 0, 622.25, 0, 523.25, 0, 0, 0,
];

const HOOK_BAR_2: readonly number[] = [
  523.25, 0, 622.25, 0, 783.99, 0, 932.33, 0, 1046.5, 0, 932.33, 0, 783.99, 0, 622.25, 0,
];

const HOOK_BAR_3: readonly number[] = [
  622.25, 0, 783.99, 0, 932.33, 0, 1046.5, 0, 932.33, 0, 783.99, 0, 622.25, 0, 523.25, 0,
];

const HOOK_BAR_4: readonly number[] = [
  523.25, 0, 622.25, 0, 783.99, 0, 932.33, 0, 783.99, 0, 622.25, 0, 523.25, 0, 0, 0,
];

const HOOK_I_FEEL_LOVE = hook4(HOOK_BAR_1, HOOK_BAR_2, HOOK_BAR_3, HOOK_BAR_4);

const GROOVE_MORODER = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0] as const;

const CM_EB_Bb_G_VOICINGS: number[][] = [
  [261.63, 311.13, 392, 466.16],
  [207.65, 261.63, 311.13, 415.3],
  [233.08, 293.66, 349.23, 466.16],
  [196, 246.94, 293.66, 392],
];

const CM_ROOTS = [65.41, 51.91, 58.27, 49] as const;

const LAYERS_ELECTRO: Stage3DiscoBgmLayers = {
  guitarChop: false,
  rhodes: false,
  strings: false,
  pad: true,
  cowbell: false,
  shaker: false,
  hook: true,
};

export const STAGE3_DISCO_BGM_PRESETS: readonly Stage3DiscoBgmPreset[] = [
  {
    id: 1,
    title: STAGE3_BGM_TRACK.title,
    subtitle: `${STAGE3_BGM_TRACK.bpm} BPM`,
    bpm: STAGE3_BGM_TRACK.bpm,
    chordVoicings: CM_EB_Bb_G_VOICINGS,
    barRoots: CM_ROOTS,
    bassGroove: GROOVE_MORODER,
    hookPattern: HOOK_I_FEEL_LOVE,
    drumStyle: 'hihat16',
    layers: LAYERS_ELECTRO,
    mix: { kick: 0.138, snare: 0.055, hat: 0.036, bass: 0.1, hook: 0.048, strings: 0.01 },
    bassCutoffHz: 780,
  },
] as const;

const PRESET_BY_ID = new Map(STAGE3_DISCO_BGM_PRESETS.map((p) => [p.id, p]));

export function getStage3DiscoBgmPresetById(id: Stage3DiscoBgmPresetId): Stage3DiscoBgmPreset {
  return PRESET_BY_ID.get(id) ?? STAGE3_DISCO_BGM_PRESETS[0]!;
}
