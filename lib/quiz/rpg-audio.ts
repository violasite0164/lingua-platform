/**
 * RPG 風打字音效（Web Audio API，無外部檔）
 * 瀏覽器需在使用者手勢後才能 resume AudioContext（於開始遊戲／答題時呼叫 ensureQuizAudio）
 */

import { STAGE1_BGM_TRACK } from '@/lib/stage1/stage1-bgm-track';
import type { QuizGameAudioMix } from '@/lib/quiz/game-audio-settings';
import {
  STAGE2_BGM_TRACK,
  stage2BgmGridTimeSec,
  stage2BgmQuarterBeatMs,
} from '@/lib/stage2/stage2-bgm-track';
import {
  getStage3DiscoBgmPresetById,
  STAGE3_DISCO_BGM_PRESETS,
  STAGE3_DISCO_LOOP_STEPS,
  STAGE3_DISCO_STEPS_PER_BAR,
  type Stage3DiscoBgmPreset,
  type Stage3DiscoBgmPresetId,
} from '@/lib/stage3/disco-bgm-presets';
import {
  getStage3DiscoBgmPresetIdOrDefault,
  setStage3DiscoBgmPresetId,
} from '@/lib/stage3/disco-bgm-selection';
import {
  STAGE3_BGM_TRACK,
  stage3BgmGridTimeSec,
  stage3BgmQuarterBeatMs,
  stage3BgmQuarterBeatSec,
} from '@/lib/stage3/stage3-bgm-track';

export { STAGE3_DISCO_BGM_PRESETS };
export type { Stage3DiscoBgmPreset, Stage3DiscoBgmPresetId };
export {
  getStage3DiscoBgmPresetId,
  getStage3DiscoBgmPresetIdOrDefault,
  setStage3DiscoBgmPresetId,
  hasStage3DiscoBgmSelection,
  clearStage3DiscoBgmSelection,
} from '@/lib/stage3/disco-bgm-selection';

let audioCtx: AudioContext | null = null;

/** 答題／關卡進行中應播放的 BGM（AudioContext 被 suspend 後用來自動恢復） */
let tensionBgmDesired = false;
let stage2BattleBgmDesired = false;
let victoryBgmDesired = false;
let defeatBgmDesired = false;

let quizAudioWatchInitialized = false;
let quizAudioContextWatchBound = false;
let recoverQuizAudioInFlight: Promise<void> | null = null;
let lastRecoverQuizAudioMs = 0;

const RECOVER_QUIZ_AUDIO_DEBOUNCE_MS = 350;

const QUIZ_AUDIO_MUTED_STORAGE_KEY = 'lingua-quiz-audio-muted';

let quizAudioMuted = false;

function readStoredQuizAudioMuted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(QUIZ_AUDIO_MUTED_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

if (typeof window !== 'undefined') {
  quizAudioMuted = readStoredQuizAudioMuted();
}

export function isQuizAudioMuted(): boolean {
  return quizAudioMuted;
}

/** 英語大冒險關卡影片（開局／過關）；不註冊站內其他影片 */
const quizGameVideoElements = new Set<HTMLVideoElement>();

function applyMuteToQuizGameVideos(): void {
  for (const el of quizGameVideoElements) {
    el.muted = quizAudioMuted;
  }
}

/** 註冊遊戲關卡影片；卸載時呼叫回傳函式 */
export function registerQuizGameVideo(el: HTMLVideoElement): () => void {
  quizGameVideoElements.add(el);
  el.muted = quizAudioMuted;
  return () => {
    quizGameVideoElements.delete(el);
  };
}

let applyQuizBgmMuteState: () => void = () => {};

export function setQuizAudioMuted(muted: boolean): void {
  quizAudioMuted = muted;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(QUIZ_AUDIO_MUTED_STORAGE_KEY, muted ? '1' : '0');
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new CustomEvent('quiz-audio-mute-change', { detail: muted }));
  }
  applyMuteToQuizGameVideos();
  applyQuizBgmMuteState();
}

/** 短音效（打字、答題、STAGE 提示）— 基準增益 */
const QUIZ_SFX_VOLUME_BASE = 0.48;
/** 循環 BGM 主音量 — 基準增益 */
const QUIZ_BGM_TENSION_MASTER_BASE = 0.34;
const QUIZ_BGM_STAGE2_BATTLE_MASTER_BASE = 0.34;
const QUIZ_BGM_STAGE3_DISCO_MASTER_BASE = 0.4;
const QUIZ_BGM_VICTORY_MASTER_BASE = 0.27;
const QUIZ_BGM_DEFEAT_MASTER_BASE = 0.3;

export type { QuizGameAudioMix };

let quizGameBgmScale = 1;
let quizGameSfxScale = 1;
/** 課堂測驗頁覆寫音效比例（null = 使用全站 quizGameSfxScale） */
let classroomQuizSfxScaleOverride: number | null = null;

export function setClassroomQuizSfxScaleOverride(scale: number | null) {
  classroomQuizSfxScaleOverride =
    scale === null ? null : Math.min(2, Math.max(0, scale));
}

function effectiveQuizSfxScale(): number {
  return classroomQuizSfxScaleOverride ?? quizGameSfxScale;
}

export function getQuizGameAudioMix(): QuizGameAudioMix {
  return {
    bgmVolumePct: Math.round(quizGameBgmScale * 100),
    sfxVolumePct: Math.round(quizGameSfxScale * 100),
  };
}

export function applyQuizGameAudioMix(mix: QuizGameAudioMix): void {
  quizGameBgmScale = Math.min(2, Math.max(0, mix.bgmVolumePct / 100));
  quizGameSfxScale = Math.min(2, Math.max(0, mix.sfxVolumePct / 100));
  applyQuizBgmMuteState();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('quiz-audio-mix-change', { detail: getQuizGameAudioMix() }),
    );
  }
}

function effectiveBgmMaster(base: number): number {
  return base * quizGameBgmScale;
}

function sfxVol(gain: number): number {
  if (quizAudioMuted) return 0;
  return gain * QUIZ_SFX_VOLUME_BASE * effectiveQuizSfxScale();
}

function bgmNoteVol(gain: number): number {
  if (quizAudioMuted) return 0;
  return gain;
}

/** 先 await resume，再播放音效／避免 suspended 時靜音 */
export function runWithQuizAudio(fn: (ctx: AudioContext) => void): void {
  void resumeQuizAudio().then((ctx) => {
    if (!ctx) return;
    if (ctx.state !== 'running') {
      const onRunning = () => {
        if (ctx.state !== 'running') return;
        ctx.removeEventListener('statechange', onRunning);
        try {
          fn(ctx);
        } catch {
          /* ignore */
        }
      };
      ctx.addEventListener('statechange', onRunning);
      return;
    }
    try {
      fn(ctx);
    } catch {
      /* ignore */
    }
  });
}

function initQuizAudioWatch(): void {
  if (quizAudioWatchInitialized || typeof window === 'undefined') return;
  quizAudioWatchInitialized = true;

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void recoverQuizAudio();
    }
  });

  window.addEventListener(
    'pointerdown',
    () => {
      void recoverQuizAudio();
    },
    { capture: true, passive: true },
  );
}

function bindQuizAudioContextWatch(ctx: AudioContext): void {
  if (quizAudioContextWatchBound) return;
  quizAudioContextWatchBound = true;
  ctx.addEventListener('statechange', () => {
    if (ctx.state === 'running') {
      void recoverQuizBgmAfterResume();
    }
  });
}

export function ensureQuizAudio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  initQuizAudioWatch();
  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!audioCtx) {
    audioCtx = new AudioCtx();
    bindQuizAudioContextWatch(audioCtx);
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume();
  }
  return audioCtx;
}

/** 在使用者手勢後 await resume，BGM 需用此函式解鎖音訊 */
export async function resumeQuizAudio(): Promise<AudioContext | null> {
  const ctx = ensureQuizAudio();
  if (!ctx) return null;
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      return ctx;
    }
  }
  return ctx;
}

let lastTypeBlipPerfMs = 0;
const TYPE_BLIP_MIN_INTERVAL_MS = 72;

/** 每個字元「嘀」一聲（空白略過；節流避免打字時主執行緒過載） */
export function playRpgTypeBlip(): void {
  const now = performance.now();
  if (now - lastTypeBlipPerfMs < TYPE_BLIP_MIN_INTERVAL_MS) return;
  lastTypeBlipPerfMs = now;

  runWithQuizAudio((ctx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(770, ctx.currentTime);
    gain.gain.setValueAtTime(sfxVol(0.035), ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.04);
  });
}

/** 該句題幹打完時短琶音 */
export function playRpgLineDone(): void {
  runWithQuizAudio((ctx) => {
    const freqs = [523.25, 659.25];
    freqs.forEach((freq, i) => {
      const t = ctx.currentTime + i * 0.06;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(sfxVol(0.045), t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.09);
    });
  });
}

/** 答對：日式 RPG 開寶箱／獲得寶物音效 */
export function playQuizAnswerCorrect(): void {
  runWithQuizAudio((ctx) => playQuizTreasureOpenSfx(ctx, ctx.currentTime));
}

/** 8-bit 風：答錯（低頻下滑長音） */
export function playQuizAnswerWrong(): void {
  runWithQuizAudio((ctx) => {
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(195, t0);
    osc.frequency.linearRampToValueAtTime(88, t0 + 0.3);
    gain.gain.setValueAtTime(sfxVol(0.068), t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.34);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.35);
  });
}

/** 課堂測驗單字模式：撿起立體字母（短促上揚 + 亮點） */
export function playQuizVocabPickup(): void {
  runWithQuizAudio((ctx) => {
    const t0 = ctx.currentTime;
    squareBlip(ctx, t0, 392, 0.055, 0.05);
    squareBlip(ctx, t0 + 0.045, 523.25, 0.065, 0.054);
    treasureSparkle(ctx, t0 + 0.035, 784, 0.038);
  });
}

/** 字母開始掉落（錯開登場音） */
export function playQuizVocabLettersDrop(letterCount: number): void {
  playStage2ClonesSpawn(Math.min(Math.max(1, letterCount), 7));
}

/** 字母碰撞（牆／地面／彼此） */
export function playQuizVocabCollision(
  kind: 'body' | 'floor' | 'wall',
  strength: number,
): void {
  const s = Math.min(1, Math.max(0, strength));
  if (s < 0.06) return;

  runWithQuizAudio((ctx) => {
    const t0 = ctx.currentTime;
    const peak = sfxVol(0.018 + s * 0.04);
    if (kind === 'floor') {
      squareBlip(ctx, t0, 88 + s * 28, 0.07, peak);
      squareBlip(ctx, t0 + 0.04, 130 + s * 20, 0.05, peak * 0.7);
      return;
    }
    if (kind === 'wall') {
      squareBlip(ctx, t0, 140 + s * 60, 0.065, peak * 1.12);
      squareBlip(ctx, t0 + 0.03, 200 + s * 40, 0.04, peak * 0.65);
      return;
    }
    squareBlip(ctx, t0, 220 + s * 140, 0.05, peak);
    if (s > 0.42) {
      treasureSparkle(ctx, t0 + 0.02, 480 + s * 80, peak * 0.55);
    }
  });
}

type ResultTier = 1 | 2 | 3 | 4 | 5;

function squareBlip(
  ctx: AudioContext,
  t: number,
  freq: number,
  duration: number,
  peakGain: number,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(sfxVol(peakGain), t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

function treasureSparkle(ctx: AudioContext, t: number, centerHz: number, peak: number): void {
  const sampleRate = ctx.sampleRate;
  const lengthSec = 0.05;
  const len = Math.floor(sampleRate * lengthSec);
  const buffer = ctx.createBuffer(1, len, sampleRate);
  const data = buffer.getChannelData(0);
  for (let s = 0; s < len; s++) {
    data[s] = (Math.random() * 2 - 1) * Math.exp(-s / (len * 0.18));
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.setValueAtTime(centerHz * 0.65, t);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(centerHz, t);
  bp.Q.setValueAtTime(2.2, t);
  const g = ctx.createGain();
  g.gain.setValueAtTime(sfxVol(peak), t);
  g.gain.exponentialRampToValueAtTime(0.001, t + lengthSec);
  src.connect(hp);
  hp.connect(bp);
  bp.connect(g);
  g.connect(ctx.destination);
  src.start(t);
}

function treasureChimeNote(
  ctx: AudioContext,
  t: number,
  freq: number,
  peak: number,
  duration: number,
): void {
  const osc = ctx.createOscillator();
  const harm = ctx.createOscillator();
  const gain = ctx.createGain();
  const harmGain = ctx.createGain();
  osc.type = 'triangle';
  harm.type = 'sine';
  osc.frequency.setValueAtTime(freq, t);
  harm.frequency.setValueAtTime(freq * 2, t);
  gain.gain.setValueAtTime(0.001, t);
  gain.gain.linearRampToValueAtTime(sfxVol(peak), t + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  harmGain.gain.setValueAtTime(0.001, t);
  harmGain.gain.linearRampToValueAtTime(sfxVol(peak * 0.35), t + 0.006);
  harmGain.gain.exponentialRampToValueAtTime(0.001, t + duration * 0.85);
  osc.connect(gain);
  harm.connect(harmGain);
  gain.connect(ctx.destination);
  harmGain.connect(ctx.destination);
  osc.start(t);
  harm.start(t);
  osc.stop(t + duration + 0.02);
  harm.stop(t + duration + 0.02);
}

/** 日式 RPG 開箱：箱蓋聲 + 上行晶亮琶音 + 收尾閃光 */
function playQuizTreasureOpenSfx(ctx: AudioContext, t0: number): void {
  const lid = ctx.createOscillator();
  const lidGain = ctx.createGain();
  lid.type = 'triangle';
  lid.frequency.setValueAtTime(220, t0);
  lid.frequency.exponentialRampToValueAtTime(110, t0 + 0.09);
  lidGain.gain.setValueAtTime(sfxVol(0.09), t0);
  lidGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.1);
  lid.connect(lidGain);
  lidGain.connect(ctx.destination);
  lid.start(t0);
  lid.stop(t0 + 0.11);

  const jingleStart = t0 + 0.07;
  const notes = [392.0, 523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];
  const step = 0.052;
  notes.forEach((freq, i) => {
    treasureChimeNote(ctx, jingleStart + i * step, freq, 0.062 - i * 0.003, 0.16);
  });

  const fanfareT = jingleStart + notes.length * step + 0.02;
  treasureChimeNote(ctx, fanfareT, 2093.0, 0.075, 0.28);
  treasureChimeNote(ctx, fanfareT + 0.04, 2637.02, 0.05, 0.22);

  for (let i = 0; i < 8; i++) {
    treasureSparkle(ctx, fanfareT + i * 0.038, 2800 + (i % 4) * 420, 0.032);
  }
}

/** 依分級播放結算 fanfare／低沉結尾（8-bit） */
function playResultTier(ctx: AudioContext, tier: ResultTier): void {
  const t0 = ctx.currentTime;

  if (tier === 5) {
    const notes = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
    notes.forEach((f, i) => squareBlip(ctx, t0 + i * 0.072, f, 0.11, 0.054));
    squareBlip(ctx, t0 + notes.length * 0.072 + 0.05, 1318.51, 0.22, 0.048);
    return;
  }

  if (tier === 4) {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => squareBlip(ctx, t0 + i * 0.078, f, 0.1, 0.052));
    return;
  }

  if (tier === 3) {
    const notes = [440, 554.37, 659.25];
    notes.forEach((f, i) => squareBlip(ctx, t0 + i * 0.095, f, 0.11, 0.048));
    return;
  }

  if (tier === 2) {
    squareBlip(ctx, t0, 349.23, 0.16, 0.044);
    squareBlip(ctx, t0 + 0.2, 329.63, 0.16, 0.041);
    return;
  }

  [146.83, 130.81, 110.0].forEach((f, i) => {
    squareBlip(ctx, t0 + i * 0.17, f, 0.22, 0.056);
  });
}

function tierFromHomeScore(correct: number, total: number): ResultTier {
  if (total <= 0) return 1;
  const pct = correct / total;
  if (correct >= total) return 5;
  if (pct >= 0.8) return 4;
  if (pct >= 0.5) return 3;
  if (pct >= 0.3) return 2;
  return 1;
}

function tierFromScore100(score100: number): ResultTier {
  if (score100 >= 90) return 5;
  if (score100 >= 75) return 4;
  if (score100 >= 55) return 3;
  if (score100 >= 35) return 2;
  return 1;
}

/** 首頁小遊戲結算：依答對題數／總題數 */
export function playQuizResultHome(correct: number, total: number): void {
  runWithQuizAudio((ctx) => playResultTier(ctx, tierFromHomeScore(correct, total)));
}

/** /quiz 結算：依百分制總分 */
export function playQuizResultFull(score100: number): void {
  runWithQuizAudio((ctx) => playResultTier(ctx, tierFromScore100(score100)));
}

/** STAGE N START! 打字完成 */
export function playStageStart(): void {
  runWithQuizAudio((ctx) => {
    const t0 = ctx.currentTime;
    const notes = [392.0, 523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => squareBlip(ctx, t0 + i * 0.07, f, 0.1, 0.05));
  });
}

/** /games 選單 GAME START 按鈕 */
export function playGameHubStart(): void {
  runWithQuizAudio((ctx) => {
    const t0 = ctx.currentTime;
    [261.63, 392.0, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      squareBlip(ctx, t0 + i * 0.058, f, 0.11, 0.058);
    });
    squareBlip(ctx, t0 + 0.42, 1318.51, 0.18, 0.05);
  });
}

/** STAGE CLEAR! 過關 */
export function playStageClear(): void {
  runWithQuizAudio((ctx) => {
    const t0 = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 987.77, 1174.66, 1318.51];
    notes.forEach((f, i) => squareBlip(ctx, t0 + i * 0.065, f, 0.11, 0.052));
    squareBlip(ctx, t0 + notes.length * 0.065 + 0.04, 1567.98, 0.2, 0.046);
  });
}

/** STAGE CLEAR + 滿分：加強版過關 fanfare */
export function playStageClearFullMark(): void {
  runWithQuizAudio((ctx) => {
    const t0 = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 987.77, 1174.66, 1318.51, 1567.98, 1760.0, 2093.0];
    notes.forEach((f, i) => squareBlip(ctx, t0 + i * 0.055, f, 0.12, 0.056));
    [2093.0, 2637.02, 3135.96].forEach((f, i) => {
      squareBlip(ctx, t0 + 0.52 + i * 0.08, f, 0.16, 0.048);
    });
  });
}

/** STAGE FAIL.... 未過關 */
export function playStageFail(): void {
  runWithQuizAudio((ctx) => {
    const t0 = ctx.currentTime;
    [196.0, 174.61, 155.56, 130.81, 110.0].forEach((f, i) => {
      squareBlip(ctx, t0 + i * 0.14, f, 0.24, 0.058);
    });
  });
}

function softTriangleBlip(
  ctx: AudioContext,
  t: number,
  freq: number,
  duration: number,
  peakGain: number,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(sfxVol(peakGain), t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

/** 課堂測驗 NICE TRY：輕快上行加油音（非失敗下滑） */
export function playStageNiceTry(): void {
  runWithQuizAudio((ctx) => {
    const t0 = ctx.currentTime;
    const notes = [392.0, 523.25, 659.25, 783.99];
    notes.forEach((f, i) => softTriangleBlip(ctx, t0 + i * 0.085, f, 0.1, 0.046));
    softTriangleBlip(ctx, t0 + 0.38, 987.77, 0.14, 0.038);
  });
}

/** 課堂測驗答錯：短促、正面的「再試試」提示音 */
export function playQuizAnswerEncourage(): void {
  runWithQuizAudio((ctx) => {
    const t0 = ctx.currentTime;
    softTriangleBlip(ctx, t0, 440, 0.07, 0.04);
    softTriangleBlip(ctx, t0 + 0.09, 554.37, 0.09, 0.045);
    softTriangleBlip(ctx, t0 + 0.2, 659.25, 0.11, 0.042);
  });
}

let stage2LowHealthPulseTimer: ReturnType<typeof setInterval> | null = null;

/** 殘血：進入僅剩 1 顆心時的警示音 */
export function playStage2LowHealthAlert(): void {
  runWithQuizAudio((ctx) => {
    const t0 = ctx.currentTime;
    [880, 740].forEach((f, i) => squareBlip(ctx, t0 + i * 0.09, f, 0.09, 0.055));
    const rumble = ctx.createOscillator();
    const rumbleGain = ctx.createGain();
    rumble.type = 'sine';
    rumble.frequency.setValueAtTime(92, t0 + 0.12);
    rumble.frequency.exponentialRampToValueAtTime(58, t0 + 0.38);
    rumbleGain.gain.setValueAtTime(sfxVol(0.07), t0 + 0.12);
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.42);
    rumble.connect(rumbleGain);
    rumbleGain.connect(ctx.destination);
    rumble.start(t0 + 0.12);
    rumble.stop(t0 + 0.44);
  });
}

/** 殘血：週期性心跳（與畫面閃紅節奏對齊） */
export function playStage2LowHealthHeartbeat(): void {
  runWithQuizAudio((ctx) => {
    const t0 = ctx.currentTime;
    const thump = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    thump.type = 'triangle';
    thump.frequency.setValueAtTime(72, t0);
    thump.frequency.exponentialRampToValueAtTime(48, t0 + 0.14);
    thumpGain.gain.setValueAtTime(sfxVol(0.085), t0);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.16);
    thump.connect(thumpGain);
    thumpGain.connect(ctx.destination);
    thump.start(t0);
    thump.stop(t0 + 0.18);
    squareBlip(ctx, t0 + 0.04, 220, 0.06, 0.028);
  });
}

const STAGE2_LOW_HEALTH_PULSE_MS = 1100;

/** 開始殘血環境音（進入 1 顆心時呼叫一次） */
export function startStage2LowHealthAmbience(): void {
  void recoverQuizAudio();
  stopStage2LowHealthAmbience();
  playStage2LowHealthAlert();
  playStage2LowHealthHeartbeat();
  stage2LowHealthPulseTimer = setInterval(() => {
    playStage2LowHealthHeartbeat();
  }, STAGE2_LOW_HEALTH_PULSE_MS);
}

/** 停止殘血環境音（回血不可能；離開殘血或離開關卡時） */
export function stopStage2LowHealthAmbience(): void {
  if (stage2LowHealthPulseTimer !== null) {
    clearInterval(stage2LowHealthPulseTimer);
    stage2LowHealthPulseTimer = null;
  }
}

/* ─── BGM 排程：以 AudioContext 時間軸排程，避免 setInterval 在主執行緒忙碌時節拍漂移 ─── */

const BGM_SCHEDULE_AHEAD_SEC = 0.12;
const BGM_SCHEDULER_TICK_MS = 25;

type BgmSchedulerState = {
  active: boolean;
  schedulerTimer: ReturnType<typeof setTimeout> | null;
  masterGain: GainNode | null;
  step: number;
  nextStepTime: number;
};

type BgmScheduleAt = (
  ctx: AudioContext,
  when: number,
  step: number,
  dest: AudioNode,
) => void;

let cachedNoiseBuffers: {
  ctx: AudioContext;
  snare: AudioBuffer;
  cymbal: AudioBuffer;
} | null = null;

function getCachedNoiseBuffers(ctx: AudioContext): { snare: AudioBuffer; cymbal: AudioBuffer } {
  if (cachedNoiseBuffers?.ctx === ctx) {
    return { snare: cachedNoiseBuffers.snare, cymbal: cachedNoiseBuffers.cymbal };
  }
  const snareLen = Math.floor(ctx.sampleRate * 0.06);
  const snare = ctx.createBuffer(1, snareLen, ctx.sampleRate);
  const snareData = snare.getChannelData(0);
  for (let i = 0; i < snareLen; i++) {
    snareData[i] = (Math.random() * 2 - 1) * (1 - i / snareLen) ** 1.2;
  }
  const cymbalLen = Math.floor(ctx.sampleRate * 0.12);
  const cymbal = ctx.createBuffer(1, cymbalLen, ctx.sampleRate);
  const cymbalData = cymbal.getChannelData(0);
  for (let i = 0; i < cymbalLen; i++) {
    cymbalData[i] = (Math.random() * 2 - 1) * (1 - i / cymbalLen) ** 1.4;
  }
  cachedNoiseBuffers = { ctx, snare, cymbal };
  return { snare, cymbal };
}

function clearBgmSchedulerTimer(state: BgmSchedulerState): void {
  if (state.schedulerTimer !== null) {
    clearTimeout(state.schedulerTimer);
    state.schedulerTimer = null;
  }
}

function scheduleNextBgmSchedulerTick(
  state: BgmSchedulerState,
  loopSteps: number,
  stepSec: number,
  scheduleAt: BgmScheduleAt,
): void {
  if (state.schedulerTimer !== null) return;
  state.schedulerTimer = setTimeout(() => {
    state.schedulerTimer = null;
    runBgmSchedulerTick(state, loopSteps, stepSec, scheduleAt);
  }, BGM_SCHEDULER_TICK_MS);
}

function runBgmSchedulerTick(
  state: BgmSchedulerState,
  loopSteps: number,
  stepSec: number,
  scheduleAt: BgmScheduleAt,
): void {
  if (!state.active) return;
  const ctx = audioCtx;
  const dest = state.masterGain;
  if (!ctx || ctx.state !== 'running' || !dest) {
    scheduleNextBgmSchedulerTick(state, loopSteps, stepSec, scheduleAt);
    return;
  }

  const horizon = ctx.currentTime + BGM_SCHEDULE_AHEAD_SEC;
  while (state.nextStepTime < horizon) {
    const loopStep = state.step % loopSteps;
    scheduleAt(ctx, state.nextStepTime, loopStep, dest);
    state.step += 1;
    state.nextStepTime += stepSec;
  }

  scheduleNextBgmSchedulerTick(state, loopSteps, stepSec, scheduleAt);
}

function beginBgmScheduler(
  ctx: AudioContext,
  state: BgmSchedulerState,
  loopSteps: number,
  stepSec: number,
  scheduleAt: BgmScheduleAt,
): void {
  if (!state.active || !state.masterGain) return;
  if (ctx.state !== 'running') return;
  if (state.schedulerTimer !== null) return;
  state.nextStepTime = ctx.currentTime + 0.06;
  runBgmSchedulerTick(state, loopSteps, stepSec, scheduleAt);
}

/* ─── STAGE 1 BGM：幻夢舞曲（MP3）─── */

type TensionMusicRuntime = {
  active: boolean;
  masterGain: GainNode | null;
  onContextRunning: (() => void) | null;
};

const tensionMusic: TensionMusicRuntime = {
  active: false,
  masterGain: null,
  onContextRunning: null,
};

let stage1BgmAudioEl: HTMLAudioElement | null = null;
let stage1BgmMediaSource: MediaElementAudioSourceNode | null = null;

function recreateBgmAudioElement(
  current: HTMLAudioElement | null,
  url: string,
): HTMLAudioElement {
  if (current) {
    current.pause();
    current.removeAttribute('src');
    current.load();
  }
  const el = new Audio(url);
  el.preload = 'auto';
  el.loop = true;
  return el;
}

function ensureStage1BgmAudioElement(): HTMLAudioElement {
  if (!stage1BgmAudioEl) {
    stage1BgmAudioEl = recreateBgmAudioElement(null, STAGE1_BGM_TRACK.url);
  }
  return stage1BgmAudioEl;
}

function resetStage1BgmAudioElement(): HTMLAudioElement {
  stage1BgmAudioEl = recreateBgmAudioElement(stage1BgmAudioEl, STAGE1_BGM_TRACK.url);
  stage1BgmMediaSource = null;
  return stage1BgmAudioEl;
}

function connectStage1BgmMediaSource(ctx: AudioContext): void {
  const gain = tensionMusic.masterGain;
  if (!gain) return;

  let audio = ensureStage1BgmAudioElement();
  if (!stage1BgmMediaSource) {
    try {
      stage1BgmMediaSource = ctx.createMediaElementSource(audio);
    } catch {
      stage1BgmMediaSource = null;
      audio = resetStage1BgmAudioElement();
      stage1BgmMediaSource = ctx.createMediaElementSource(audio);
    }
  } else {
    try {
      stage1BgmMediaSource.disconnect();
    } catch {
      /* already disconnected */
    }
  }
  stage1BgmMediaSource.connect(gain);
}

function beginStage1Mp3Playback(ctx: AudioContext): void {
  connectStage1BgmMediaSource(ctx);
  const audio = ensureStage1BgmAudioElement();
  if (audio.currentTime < 0.01 || audio.ended) {
    audio.currentTime = 0;
  }
  void audio.play().catch(() => {
    /* autoplay blocked until user gesture */
  });
}

function pauseStage1BgmAudio(reset = false): void {
  if (!stage1BgmAudioEl) return;
  stage1BgmAudioEl.pause();
  if (reset) {
    stage1BgmAudioEl.currentTime = 0;
  }
}

function clearTensionContextListener(): void {
  const ctx = audioCtx;
  if (ctx && tensionMusic.onContextRunning) {
    ctx.removeEventListener('statechange', tensionMusic.onContextRunning);
  }
  tensionMusic.onContextRunning = null;
}

function connectThroughLowpass(
  ctx: AudioContext,
  osc: OscillatorNode,
  gain: GainNode,
  dest: AudioNode,
  cutoffHz: number,
): void {
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(cutoffHz, ctx.currentTime);
  filter.Q.setValueAtTime(0.8, ctx.currentTime);
  osc.connect(gain);
  gain.connect(filter);
  filter.connect(dest);
}

/* ─── STAGE 2 BGM：影鴉任務（MP3）─── */

type Stage2BattleMusicRuntime = {
  active: boolean;
  masterGain: GainNode | null;
  onContextRunning: (() => void) | null;
};

const stage2BattleMusic: Stage2BattleMusicRuntime = {
  active: false,
  masterGain: null,
  onContextRunning: null,
};

let stage2BgmAudioEl: HTMLAudioElement | null = null;
let stage2BgmMediaSource: MediaElementAudioSourceNode | null = null;

function ensureStage2BgmAudioElement(): HTMLAudioElement {
  if (!stage2BgmAudioEl) {
    stage2BgmAudioEl = recreateBgmAudioElement(null, STAGE2_BGM_TRACK.url);
  }
  return stage2BgmAudioEl;
}

function resetStage2BgmAudioElement(): HTMLAudioElement {
  stage2BgmAudioEl = recreateBgmAudioElement(stage2BgmAudioEl, STAGE2_BGM_TRACK.url);
  stage2BgmMediaSource = null;
  return stage2BgmAudioEl;
}

function applyStage2BgmPlaybackRate(): void {
  const audio = stage2BgmAudioEl;
  if (!audio) return;
  audio.playbackRate = 1;
}

function connectStage2BgmMediaSource(ctx: AudioContext): void {
  const gain = stage2BattleMusic.masterGain;
  if (!gain) return;

  let audio = ensureStage2BgmAudioElement();
  if (!stage2BgmMediaSource) {
    try {
      stage2BgmMediaSource = ctx.createMediaElementSource(audio);
    } catch {
      stage2BgmMediaSource = null;
      audio = resetStage2BgmAudioElement();
      stage2BgmMediaSource = ctx.createMediaElementSource(audio);
    }
  } else {
    try {
      stage2BgmMediaSource.disconnect();
    } catch {
      /* already disconnected */
    }
  }
  stage2BgmMediaSource.connect(gain);
}

function beginStage2Mp3Playback(ctx: AudioContext): void {
  connectStage2BgmMediaSource(ctx);
  const audio = ensureStage2BgmAudioElement();
  applyStage2BgmPlaybackRate();
  if (audio.currentTime < 0.01 || audio.ended) {
    audio.currentTime = 0;
  }
  void audio.play().catch(() => {
    /* autoplay blocked until user gesture */
  });
}

function pauseStage2BgmAudio(reset = false): void {
  if (!stage2BgmAudioEl) return;
  stage2BgmAudioEl.pause();
  if (reset) {
    stage2BgmAudioEl.currentTime = 0;
  }
}

function clearStage2BattleContextListener(): void {
  const ctx = audioCtx;
  if (ctx && stage2BattleMusic.onContextRunning) {
    ctx.removeEventListener('statechange', stage2BattleMusic.onContextRunning);
  }
  stage2BattleMusic.onContextRunning = null;
}

function playWafuTaikoSoft(ctx: AudioContext, when: number, dest: AudioNode): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(78, when);
  osc.frequency.exponentialRampToValueAtTime(42, when + 0.1);
  gain.gain.setValueAtTime(sfxVol(0.04), when);
  gain.gain.exponentialRampToValueAtTime(0.001, when + 0.14);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(when);
  osc.stop(when + 0.15);
}

function playWafuCountdownPluck(
  ctx: AudioContext,
  when: number,
  freq: number,
  peak: number,
  duration: number,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, when);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.linearRampToValueAtTime(sfxVol(peak), when + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.001, when + duration);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2800, when);
  osc.connect(gain);
  gain.connect(filter);
  filter.connect(ctx.destination);
  osc.start(when);
  osc.stop(when + duration + 0.02);
}

/** 五聲音階：分身登場音高（由低到高） */
const STAGE2_CLONE_SPAWN_PITCHES = [293.66, 329.63, 349.23, 392, 440, 493.88, 523.25] as const;

/** STAGE 2 單個分身登場（對齊 BGM 拍點） */
export function playStage2CloneSpawnAt(cloneIndex: number): void {
  const i = Math.min(Math.max(0, cloneIndex), 6);
  runWithQuizAudio((ctx) => {
    const t0 = ctx.currentTime;
    const freq = STAGE2_CLONE_SPAWN_PITCHES[i] ?? STAGE2_CLONE_SPAWN_PITCHES[0];
    const peak = Math.max(0.06, 0.11 - i * 0.007);
    playWafuCountdownPluck(ctx, t0, freq, peak, 0.1);
    if (i === 0) {
      playWafuTaikoSoft(ctx, t0, ctx.destination);
    }
  });
}

/** 一拍內全部分身登場（音效微錯開，總長不超過 0.75 拍） */
export function playStage2ClonesSpawn(cloneCount: number): void {
  const count = Math.min(Math.max(1, cloneCount), 7);
  const beatMs = getStage2QuarterBeatMs();
  const staggerS = (beatMs * 0.1) / 1000;
  const maxSpreadS = (beatMs * 0.75) / 1000;
  runWithQuizAudio((ctx) => {
    const t0 = ctx.currentTime;
    for (let i = 0; i < count; i++) {
      const when = t0 + Math.min(i * staggerS, maxSpreadS);
      const freq = STAGE2_CLONE_SPAWN_PITCHES[i] ?? STAGE2_CLONE_SPAWN_PITCHES[0];
      const peak = Math.max(0.06, 0.11 - i * 0.007);
      playWafuCountdownPluck(ctx, when, freq, peak, 0.1);
      if (i === 0) {
        playWafuTaikoSoft(ctx, when, ctx.destination);
      }
    }
  });
}

/** STAGE 2 回合倒數滴答（木魚／箏撥弦感；最後一秒略急） */
export function playStage2RoundCountdownTick(remaining: number): void {
  runWithQuizAudio((ctx) => {
    const t0 = ctx.currentTime;
    const urgent = remaining <= 1;
    const freq = urgent ? 587.33 : remaining === 2 ? 440 : 329.63;
    playWafuCountdownPluck(ctx, t0, freq, urgent ? 0.12 : 0.095, urgent ? 0.11 : 0.09);
    if (urgent) {
      playWafuCountdownPluck(ctx, t0 + 0.11, 659.25, 0.08, 0.08);
    }
  });
}

/** STAGE 2 倒數歸零（低沉和風警示） */
export function playStage2RoundCountdownExpire(): void {
  runWithQuizAudio((ctx) => {
    const t0 = ctx.currentTime;
    playWafuTaikoSoft(ctx, t0, ctx.destination);
    playWafuCountdownPluck(ctx, t0 + 0.05, 196, 0.1, 0.22);
  });
}

/** 手裏劍命中：短促木質「ト」— 圓滑包絡、無破音感 */
function playStage2ShurikenImpact(ctx: AudioContext, when: number, dest: AudioNode): void {
  const tap = ctx.createOscillator();
  const tapGain = ctx.createGain();
  tap.type = 'triangle';
  tap.frequency.setValueAtTime(392, when);
  tap.frequency.exponentialRampToValueAtTime(330, when + 0.045);
  tapGain.gain.setValueAtTime(0.0001, when);
  tapGain.gain.linearRampToValueAtTime(sfxVol(0.038), when + 0.014);
  tapGain.gain.exponentialRampToValueAtTime(0.001, when + 0.085);
  connectThroughLowpass(ctx, tap, tapGain, dest, 1500);

  const body = ctx.createOscillator();
  const bodyGain = ctx.createGain();
  body.type = 'sine';
  body.frequency.setValueAtTime(155, when + 0.022);
  bodyGain.gain.setValueAtTime(0.0001, when + 0.022);
  bodyGain.gain.linearRampToValueAtTime(sfxVol(0.022), when + 0.036);
  bodyGain.gain.exponentialRampToValueAtTime(0.001, when + 0.1);
  connectThroughLowpass(ctx, body, bodyGain, dest, 420);

  tap.start(when);
  tap.stop(when + 0.09);
  body.start(when + 0.022);
  body.stop(when + 0.105);
}

/** STAGE 2 手裏劍命中分身 */
export function playStage2ShurikenHit(): void {
  runWithQuizAudio((ctx) => {
    playStage2ShurikenImpact(ctx, ctx.currentTime, ctx.destination);
  });
}

/* ─── STAGE 3 迪斯可 BGM（10 首預設 · 程序合成）─── */

function activeStage3DiscoPreset(): Stage3DiscoBgmPreset {
  const id = stage3DiscoPreviewPresetId ?? getStage3DiscoBgmPresetIdOrDefault();
  return getStage3DiscoBgmPresetById(id);
}

let stage3DiscoPlayingPresetId: Stage3DiscoBgmPresetId | null = null;
/** 選曲試聽用（尚未寫入 localStorage） */
let stage3DiscoPreviewPresetId: Stage3DiscoBgmPresetId | null = null;

function stage3DiscoBarIndex(step: number): number {
  return Math.floor(step / STAGE3_DISCO_STEPS_PER_BAR) % 4;
}

function stage3DiscoPosInBar(step: number): number {
  return step % STAGE3_DISCO_STEPS_PER_BAR;
}

function stage3DiscoBassHz(preset: Stage3DiscoBgmPreset, bar: number, pos: number, step: number): number {
  const groove = preset.bassGroove;
  const idx = groove.length > STAGE3_DISCO_STEPS_PER_BAR ? step % groove.length : pos;
  const mult = groove[idx];
  if (!mult) return 0;
  return preset.barRoots[bar % 4]! * mult;
}

function stage3DiscoHookNoteDurationSec(step: number, stepDur: number, hook: readonly number[]): number {
  const next = hook[(step + 2) % hook.length] ?? 0;
  return next > 0 ? stepDur * 1.92 : stepDur * 1.05;
}

function stage3DiscoStepDurationSec(preset: Stage3DiscoBgmPreset): number {
  return 60 / preset.bpm / 4;
}

let stage3DiscoBgmDesired = false;

type Stage3DiscoMusicRuntime = BgmSchedulerState & {
  onContextRunning: (() => void) | null;
};

const stage3DiscoMusic: Stage3DiscoMusicRuntime = {
  active: false,
  schedulerTimer: null,
  masterGain: null,
  step: 0,
  nextStepTime: 0,
  onContextRunning: null,
};

let stage3BgmAudioEl: HTMLAudioElement | null = null;
let stage3BgmMediaSource: MediaElementAudioSourceNode | null = null;

function ensureStage3BgmAudioElement(): HTMLAudioElement {
  if (!stage3BgmAudioEl) {
    stage3BgmAudioEl = recreateBgmAudioElement(null, STAGE3_BGM_TRACK.url);
  }
  return stage3BgmAudioEl;
}

function resetStage3BgmAudioElement(): HTMLAudioElement {
  stage3BgmAudioEl = recreateBgmAudioElement(stage3BgmAudioEl, STAGE3_BGM_TRACK.url);
  stage3BgmMediaSource = null;
  return stage3BgmAudioEl;
}

function connectStage3BgmMediaSource(ctx: AudioContext): void {
  const gain = stage3DiscoMusic.masterGain;
  if (!gain) return;

  let audio = ensureStage3BgmAudioElement();
  if (!stage3BgmMediaSource) {
    try {
      stage3BgmMediaSource = ctx.createMediaElementSource(audio);
    } catch {
      stage3BgmMediaSource = null;
      audio = resetStage3BgmAudioElement();
      stage3BgmMediaSource = ctx.createMediaElementSource(audio);
    }
  } else {
    try {
      stage3BgmMediaSource.disconnect();
    } catch {
      /* already disconnected */
    }
  }
  stage3BgmMediaSource.connect(gain);
}

function beginStage3Mp3Playback(ctx: AudioContext): void {
  const preset = activeStage3DiscoPreset();
  stage3DiscoPlayingPresetId = preset.id;

  connectStage3BgmMediaSource(ctx);
  const audio = ensureStage3BgmAudioElement();
  if (audio.currentTime < 0.01 || audio.ended) {
    audio.currentTime = 0;
  }
  void audio.play().catch(() => {
    /* autoplay blocked until user gesture */
  });
}

function pauseStage3BgmAudio(reset = false): void {
  if (!stage3BgmAudioEl) return;
  stage3BgmAudioEl.pause();
  if (reset) {
    stage3BgmAudioEl.currentTime = 0;
  }
}

function playStage3DiscoKickBgm(
  ctx: AudioContext,
  when: number,
  dest: AudioNode,
  peak: number,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(165, when);
  osc.frequency.exponentialRampToValueAtTime(48, when + 0.1);
  gain.gain.setValueAtTime(bgmNoteVol(peak), when);
  gain.gain.exponentialRampToValueAtTime(0.001, when + 0.16);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(when);
  osc.stop(when + 0.17);

  const click = ctx.createOscillator();
  const cG = ctx.createGain();
  click.type = 'square';
  click.frequency.setValueAtTime(1200, when);
  cG.gain.setValueAtTime(bgmNoteVol(peak * 0.14), when);
  cG.gain.exponentialRampToValueAtTime(0.001, when + 0.012);
  click.connect(cG);
  cG.connect(dest);
  click.start(when);
  click.stop(when + 0.014);
}

function playStage3DiscoHatBgm(
  ctx: AudioContext,
  when: number,
  dest: AudioNode,
  open: boolean,
  peak: number,
): void {
  const { snare } = getCachedNoiseBuffers(ctx);
  const src = ctx.createBufferSource();
  src.buffer = snare;
  const g = ctx.createGain();
  g.gain.setValueAtTime(bgmNoteVol(open ? peak * 1.25 : peak), when);
  g.gain.exponentialRampToValueAtTime(0.001, when + (open ? 0.09 : 0.035));
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.setValueAtTime(open ? 6200 : 7500, when);
  src.connect(hp);
  hp.connect(g);
  g.connect(dest);
  src.start(when);
  src.stop(when + (open ? 0.095 : 0.04));
}

function playStage3DiscoSnareBgm(
  ctx: AudioContext,
  when: number,
  dest: AudioNode,
  peak: number,
): void {
  const { snare } = getCachedNoiseBuffers(ctx);
  const src = ctx.createBufferSource();
  src.buffer = snare;
  const g = ctx.createGain();
  g.gain.setValueAtTime(bgmNoteVol(peak), when);
  g.gain.exponentialRampToValueAtTime(0.001, when + 0.1);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(1650, when);
  bp.Q.setValueAtTime(0.85, when);
  src.connect(bp);
  bp.connect(g);
  g.connect(dest);
  src.start(when);
  src.stop(when + 0.105);

  const clap = ctx.createBufferSource();
  clap.buffer = snare;
  const cG = ctx.createGain();
  cG.gain.setValueAtTime(bgmNoteVol(peak * 0.42), when + 0.012);
  cG.gain.exponentialRampToValueAtTime(0.001, when + 0.07);
  const bp2 = ctx.createBiquadFilter();
  bp2.type = 'bandpass';
  bp2.frequency.setValueAtTime(2400, when + 0.012);
  clap.connect(bp2);
  bp2.connect(cG);
  cG.connect(dest);
  clap.start(when + 0.012);
  clap.stop(when + 0.075);
}

function playStage3DiscoBassBgm(
  ctx: AudioContext,
  when: number,
  freq: number,
  duration: number,
  dest: AudioNode,
  peak: number,
  cutoffHz: number,
): void {
  const osc = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const mix = ctx.createGain();
  mix.gain.setValueAtTime(0.55, when);
  const flt = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc2.type = 'square';
  osc.frequency.setValueAtTime(freq, when);
  osc2.frequency.setValueAtTime(freq * 2, when);
  osc2.detune.setValueAtTime(4, when);
  flt.type = 'lowpass';
  flt.frequency.setValueAtTime(cutoffHz, when);
  flt.Q.setValueAtTime(2.8, when);
  gain.gain.setValueAtTime(bgmNoteVol(peak), when);
  gain.gain.exponentialRampToValueAtTime(0.001, when + duration * 0.92);
  osc.connect(mix);
  osc2.connect(mix);
  mix.connect(flt);
  flt.connect(gain);
  gain.connect(dest);
  osc.start(when);
  osc2.start(when);
  osc.stop(when + duration + 0.02);
  osc2.stop(when + duration + 0.02);
}

function playStage3DiscoGuitarChop(
  ctx: AudioContext,
  when: number,
  rootHz: number,
  duration: number,
  dest: AudioNode,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(rootHz * 2, when);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.linearRampToValueAtTime(bgmNoteVol(0.024), when + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.001, when + duration * 0.55);
  const flt = ctx.createBiquadFilter();
  flt.type = 'lowpass';
  flt.frequency.setValueAtTime(2200, when);
  flt.Q.setValueAtTime(1.2, when);
  osc.connect(gain);
  gain.connect(flt);
  flt.connect(dest);
  osc.start(when);
  osc.stop(when + duration * 0.6);
}

function playStage3DiscoStringStab(
  ctx: AudioContext,
  when: number,
  chord: number[],
  duration: number,
  dest: AudioNode,
  peak: number,
): void {
  for (const freq of chord) {
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const mix = ctx.createGain();
    mix.gain.setValueAtTime(0.42, when);
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, when);
    osc2.frequency.setValueAtTime(freq * 1.003, when);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(bgmNoteVol(peak), when + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, when + duration);
    const flt = ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.setValueAtTime(2400, when);
    flt.frequency.exponentialRampToValueAtTime(900, when + duration * 0.85);
    osc.connect(mix);
    osc2.connect(mix);
    mix.connect(flt);
    flt.connect(gain);
    gain.connect(dest);
    osc.start(when);
    osc2.start(when);
    osc.stop(when + duration + 0.02);
    osc2.stop(when + duration + 0.02);
  }
}

function playStage3DiscoHookLead(
  ctx: AudioContext,
  when: number,
  freq: number,
  duration: number,
  dest: AudioNode,
  peak: number,
): void {
  const osc = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const mix = ctx.createGain();
  mix.gain.setValueAtTime(0.5, when);
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc2.type = 'triangle';
  osc.frequency.setValueAtTime(freq, when);
  osc2.frequency.setValueAtTime(freq, when);
  osc2.detune.setValueAtTime(4, when);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.linearRampToValueAtTime(bgmNoteVol(peak), when + 0.006);
  gain.gain.setValueAtTime(bgmNoteVol(peak * 0.82), when + duration * 0.35);
  gain.gain.exponentialRampToValueAtTime(0.001, when + duration);
  const flt = ctx.createBiquadFilter();
  flt.type = 'lowpass';
  flt.frequency.setValueAtTime(5200, when);
  flt.frequency.exponentialRampToValueAtTime(2800, when + duration * 0.9);
  flt.Q.setValueAtTime(1.4, when);
  osc.connect(mix);
  osc2.connect(mix);
  mix.connect(flt);
  flt.connect(gain);
  gain.connect(dest);
  osc.start(when);
  osc2.start(when);
  osc.stop(when + duration + 0.02);
  osc2.stop(when + duration + 0.02);
}

function stage3DiscoShouldKick(preset: Stage3DiscoBgmPreset, pos: number): boolean {
  if (preset.drumStyle === 'funky') {
    return pos === 0 || pos === 6 || pos === 8 || pos === 14;
  }
  return pos % 4 === 0;
}

function stage3DiscoShouldSnare(pos: number): boolean {
  return pos === 4 || pos === 12;
}

function stage3DiscoShouldHatClosed(preset: Stage3DiscoBgmPreset, pos: number, step: number): boolean {
  if (preset.drumStyle === 'hihat16') {
    return step % 2 === 1;
  }
  if (preset.drumStyle === 'minimal') {
    return pos === 2 || pos === 10;
  }
  return pos % 4 === 2;
}

function playStage3DiscoShaker(ctx: AudioContext, when: number, dest: AudioNode): void {
  const { snare } = getCachedNoiseBuffers(ctx);
  const src = ctx.createBufferSource();
  src.buffer = snare;
  const g = ctx.createGain();
  g.gain.setValueAtTime(bgmNoteVol(0.014), when);
  g.gain.exponentialRampToValueAtTime(0.001, when + 0.028);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.setValueAtTime(6800, when);
  src.connect(hp);
  hp.connect(g);
  g.connect(dest);
  src.start(when);
  src.stop(when + 0.032);
}

function playStage3DiscoCowbell(ctx: AudioContext, when: number, dest: AudioNode): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(1240, when);
  gain.gain.setValueAtTime(bgmNoteVol(0.022), when);
  gain.gain.exponentialRampToValueAtTime(0.001, when + 0.045);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(2200, when);
  bp.Q.setValueAtTime(5, when);
  osc.connect(bp);
  bp.connect(gain);
  gain.connect(dest);
  osc.start(when);
  osc.stop(when + 0.05);
}

function playStage3DiscoRhodesStab(
  ctx: AudioContext,
  when: number,
  chord: number[],
  duration: number,
  dest: AudioNode,
): void {
  for (const freq of chord) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, when);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(bgmNoteVol(0.016), when + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.001, when + duration);
    const flt = ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.setValueAtTime(3200, when);
    osc.connect(gain);
    gain.connect(flt);
    flt.connect(dest);
    osc.start(when);
    osc.stop(when + duration + 0.02);
  }
}

function playStage3DiscoStringPad(
  ctx: AudioContext,
  when: number,
  chord: number[],
  duration: number,
  dest: AudioNode,
): void {
  for (const freq of chord) {
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const mix = ctx.createGain();
    mix.gain.setValueAtTime(0.38, when);
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, when);
    osc2.frequency.setValueAtTime(freq * 1.004, when);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(bgmNoteVol(0.011), when + 0.12);
    gain.gain.setValueAtTime(bgmNoteVol(0.009), when + duration * 0.55);
    gain.gain.exponentialRampToValueAtTime(0.001, when + duration);
    const flt = ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.setValueAtTime(1400, when);
    flt.frequency.linearRampToValueAtTime(900, when + duration);
    osc.connect(mix);
    osc2.connect(mix);
    mix.connect(flt);
    flt.connect(gain);
    gain.connect(dest);
    osc.start(when);
    osc2.start(when);
    osc.stop(when + duration + 0.02);
    osc2.stop(when + duration + 0.02);
  }
}

function scheduleStage3DiscoAt(
  ctx: AudioContext,
  when: number,
  step: number,
  dest: AudioNode,
): void {
  const preset = activeStage3DiscoPreset();
  const stepDur = stage3DiscoStepDurationSec(preset);
  const bar = stage3DiscoBarIndex(step);
  const pos = stage3DiscoPosInBar(step);
  const chord = preset.chordVoicings[bar] ?? preset.chordVoicings[0]!;
  const { mix, layers } = preset;

  if (stage3DiscoShouldKick(preset, pos)) {
    playStage3DiscoKickBgm(ctx, when, dest, mix.kick);
  }
  if (stage3DiscoShouldSnare(pos)) {
    playStage3DiscoSnareBgm(ctx, when, dest, mix.snare);
  }
  if (stage3DiscoShouldHatClosed(preset, pos, step)) {
    playStage3DiscoHatBgm(ctx, when, dest, false, mix.hat);
  }
  if (pos === 15 && preset.drumStyle !== 'minimal') {
    playStage3DiscoHatBgm(ctx, when, dest, true, mix.hat);
  }
  if (layers.shaker && step % 2 === 1) {
    playStage3DiscoShaker(ctx, when, dest);
  }
  if (layers.cowbell && pos === 8) {
    playStage3DiscoCowbell(ctx, when, dest);
  }

  const bassFreq = stage3DiscoBassHz(preset, bar, pos, step);
  if (bassFreq > 0) {
    playStage3DiscoBassBgm(ctx, when, bassFreq, stepDur * 1.02, dest, mix.bass, preset.bassCutoffHz);
  }

  if (layers.guitarChop && (pos === 2 || pos === 6 || pos === 10 || pos === 14)) {
    playStage3DiscoGuitarChop(ctx, when, chord[0]!, stepDur * 0.38, dest);
  }
  if (layers.rhodes && (pos === 3 || pos === 11)) {
    playStage3DiscoRhodesStab(ctx, when, chord, stepDur * 0.48, dest);
  }
  if (layers.pad && pos === 0) {
    playStage3DiscoStringPad(ctx, when, chord, stepDur * 15.5, dest);
  }
  if (layers.strings && pos === 0) {
    playStage3DiscoStringStab(ctx, when, chord, stepDur * 0.62, dest, mix.strings);
  }
  if (layers.strings && pos === 8) {
    playStage3DiscoStringStab(ctx, when, chord, stepDur * 0.5, dest, mix.strings);
  }
  if (layers.strings && (pos === 4 || pos === 12)) {
    playStage3DiscoStringStab(ctx, when, chord, stepDur * 0.38, dest, mix.strings * 0.9);
  }

  const hookFreq = preset.hookPattern[step] ?? 0;
  if (layers.hook && hookFreq > 0) {
    playStage3DiscoHookLead(
      ctx,
      when,
      hookFreq,
      stage3DiscoHookNoteDurationSec(step, stepDur, preset.hookPattern),
      dest,
      mix.hook,
    );
  }
}

function clearStage3DiscoContextListener(): void {
  const ctx = audioCtx;
  if (ctx && stage3DiscoMusic.onContextRunning) {
    ctx.removeEventListener('statechange', stage3DiscoMusic.onContextRunning);
  }
  stage3DiscoMusic.onContextRunning = null;
}

function beginStage3DiscoLoop(ctx: AudioContext): void {
  const preset = activeStage3DiscoPreset();
  stage3DiscoPlayingPresetId = preset.id;
  beginBgmScheduler(
    ctx,
    stage3DiscoMusic,
    STAGE3_DISCO_LOOP_STEPS,
    stage3DiscoStepDurationSec(preset),
    scheduleStage3DiscoAt,
  );
}

function isStage3DiscoBgmHealthy(): boolean {
  return (
    stage3DiscoBgmDesired &&
    stage3DiscoMusic.active &&
    stage3BgmAudioEl !== null &&
    !stage3BgmAudioEl.paused &&
    stage3DiscoMusic.masterGain !== null
  );
}

function haltStage3DiscoMusic(immediate = false): void {
  if (
    !stage3DiscoMusic.active &&
    !stage3BgmAudioEl &&
    !stage3DiscoMusic.masterGain
  ) {
    return;
  }

  stage3DiscoMusic.active = false;
  clearStage3DiscoContextListener();
  clearBgmSchedulerTimer(stage3DiscoMusic);
  pauseStage3BgmAudio(immediate);

  const gain = stage3DiscoMusic.masterGain;
  stage3DiscoMusic.masterGain = null;
  if (immediate) {
    disconnectMasterGainImmediate(gain);
  } else {
    fadeOutMasterGain(gain);
  }
}

/** STAGE 3 迪斯可循環 BGM（使用已選預設） */
export async function startStage3DiscoBgm(opts?: { forceRestart?: boolean }): Promise<void> {
  if (typeof window === 'undefined') return;

  const presetId = stage3DiscoPreviewPresetId ?? getStage3DiscoBgmPresetIdOrDefault();
  stage3DiscoBgmDesired = true;
  initQuizAudioWatch();

  const ctx = await resumeQuizAudio();
  if (!ctx) return;

  const presetChanged = stage3DiscoPlayingPresetId !== presetId;

  if (isStage3DiscoBgmHealthy() && !opts?.forceRestart && !presetChanged) {
    applyQuizBgmMuteState();
    if (ctx.state === 'running' && stage3BgmAudioEl?.paused) {
      beginStage3Mp3Playback(ctx);
    }
    return;
  }

  haltStage3DiscoMusic(true);

  stage3DiscoMusic.active = true;
  stage3DiscoMusic.step = 0;
  stage3DiscoMusic.nextStepTime = 0;
  stage3DiscoMusic.masterGain = ctx.createGain();
  stage3DiscoMusic.masterGain.gain.setValueAtTime(0.0001, ctx.currentTime);
  stage3DiscoMusic.masterGain.gain.linearRampToValueAtTime(
    effectiveBgmMaster(QUIZ_BGM_STAGE3_DISCO_MASTER_BASE),
    ctx.currentTime + 0.32,
  );
  stage3DiscoMusic.masterGain.connect(ctx.destination);
  applyQuizBgmMuteState();

  if (ctx.state === 'running') {
    beginStage3Mp3Playback(ctx);
    return;
  }

  clearStage3DiscoContextListener();
  const onRunning = () => {
    if (ctx.state !== 'running' || !stage3DiscoMusic.active) return;
    clearStage3DiscoContextListener();
    beginStage3Mp3Playback(ctx);
  };
  stage3DiscoMusic.onContextRunning = onRunning;
  ctx.addEventListener('statechange', onRunning);
}

export function stopStage3DiscoBgm(immediate = false): void {
  stage3DiscoBgmDesired = false;
  stage3DiscoPreviewPresetId = null;
  stage3DiscoPlayingPresetId = null;
  haltStage3DiscoMusic(immediate);
}

/** 離開遊戲選單時停止所有循環 BGM */
export function stopAllQuizBgm(immediate = true): void {
  stopStage3DiscoBgm(immediate);
  stopQuizTensionMusic(immediate);
  stopQuizStage2BattleMusic(immediate);
  stopQuizVictoryMusic(immediate);
  stopQuizDefeatMusic(immediate);
  stopStage2LowHealthAmbience();
}

/** 試聽指定預設（選曲畫面用，不寫入 localStorage） */
export async function previewStage3DiscoBgm(id: Stage3DiscoBgmPresetId): Promise<void> {
  stage3DiscoPreviewPresetId = id;
  await startStage3DiscoBgm({ forceRestart: true });
}

/** 確認選曲並持久化 */
export function commitStage3DiscoBgmPreset(id: Stage3DiscoBgmPresetId): void {
  stage3DiscoPreviewPresetId = null;
  setStage3DiscoBgmPresetId(id);
}

/** @deprecated 使用 startStage3DiscoBgm；保留舊名稱相容 */
export async function startStage3DiscoDrums(): Promise<void> {
  await startStage3DiscoBgm();
}

/** @deprecated 使用 stopStage3DiscoBgm */
export function stopStage3DiscoDrums(immediate = false): void {
  stopStage3DiscoBgm(immediate);
}

/** 開局走馬燈／迪斯可場景 BGM */
export async function startStage3LetsDanceMusic(): Promise<void> {
  await startStage3DiscoBgm();
}

export function stopStage3LetsDanceMusic(immediate = false): void {
  stopStage3DiscoBgm(immediate);
}

/** BGM 四分音符（秒）— 與 MP3 downbeat 對齊 */
export function getStage3DiscoQuarterBeatSec(): number {
  return stage3BgmQuarterBeatSec();
}

export function getStage3DiscoQuarterBeatMs(): number {
  return stage3BgmQuarterBeatMs();
}

/** 排程拍點時的最小間隔，避免 setTimeout(0) 在同一 downbeat 連發 */
const STAGE3_BEAT_SCHEDULE_MIN_MS = 48;

/** 距離下一個 BGM 四分音符（downbeat）的毫秒 */
export function msUntilNextStage3Kick(): number {
  const quarterMs = getStage3DiscoQuarterBeatMs();
  const audio = stage3BgmAudioEl;
  if (!audio || audio.paused || !stage3DiscoMusic.active) {
    return quarterMs;
  }

  const quarterSec = quarterMs / 1000;
  const gridT = stage3BgmGridTimeSec(audio.currentTime);
  const phase = gridT % quarterSec;
  // 已在 downbeat：等下一個完整四分音，勿回傳 0（會造成拍點迴圈瘋狂連發）
  const msUntilDownbeat = phase < 0.02 ? quarterMs : (quarterSec - phase) * 1000;
  return Math.max(STAGE3_BEAT_SCHEDULE_MIN_MS, msUntilDownbeat);
}

/** 在下一個 BGM 四分音符（kick）觸發 callback；回傳取消函式 */
export function scheduleStage3QuarterBeat(onBeat: () => void): () => void {
  const delayMs = msUntilNextStage3Kick();
  const timeoutId = window.setTimeout(onBeat, delayMs);
  return () => window.clearTimeout(timeoutId);
}

/**
 * 連續對齊 BGM 四分音符的拍點迴圈（不在拍間用固定 ms 推進，避免漂移）。
 * onBeat 回傳 false 時結束；回傳 void/true 則排下一拍。
 */
export function runStage3QuarterBeatLoop(onBeat: () => boolean | void): () => void {
  let cancelled = false;
  let cancelPending: (() => void) | null = null;

  const tick = () => {
    if (cancelled) return;
    const keepGoing = onBeat();
    if (cancelled || keepGoing === false) return;
    cancelPending = scheduleStage3QuarterBeat(tick);
  };

  cancelPending = scheduleStage3QuarterBeat(tick);

  return () => {
    cancelled = true;
    cancelPending?.();
    cancelPending = null;
  };
}

/** 排程固定拍數後結束；onBeat(beatIndex) 從 0 起算 */
export function scheduleStage3Beats(
  beatCount: number,
  onBeat: (beatIndex: number) => void,
): () => void {
  let beat = 0;
  return runStage3QuarterBeatLoop(() => {
    onBeat(beat);
    beat += 1;
    return beat < beatCount;
  });
}

/** 石板落地：小調五聲音階（迪斯可 synth stab 用） */
const STAGE3_SLAB_PITCHES_HZ = [
  523.25, // C5
  622.25, // Eb5
  698.46, // F5
  783.99, // G5
  932.33, // Bb5
  1046.5, // C6
  1244.51, // Eb6
  1396.91, // F6
  1567.98, // G6
  1864.66, // Bb6
  2093.0, // C7
  2489.02, // Eb7
] as const;

function stage3SlabPitchHz(pitchIndex: number): number {
  const n = STAGE3_SLAB_PITCHES_HZ.length;
  const i = ((Math.floor(pitchIndex) % n) + n) % n;
  return STAGE3_SLAB_PITCHES_HZ[i]!;
}

/** 迪斯可 synth pluck：鋸齒 + 共鳴濾波掃頻 + 電子 click */
function playStage3SlabSynthStab(ctx: AudioContext, when: number, freq: number): void {
  const dur = 0.12;
  const peak = sfxVol(0.095);

  const oscA = ctx.createOscillator();
  const oscB = ctx.createOscillator();
  oscA.type = 'sawtooth';
  oscB.type = 'sawtooth';
  oscA.frequency.setValueAtTime(freq, when);
  oscB.frequency.setValueAtTime(freq * 1.008, when);
  oscA.detune.setValueAtTime(-6, when);
  oscB.detune.setValueAtTime(6, when);

  const mix = ctx.createGain();
  mix.gain.setValueAtTime(0.48, when);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.setValueAtTime(9, when);
  filter.Q.exponentialRampToValueAtTime(1.4, when + dur);
  filter.frequency.setValueAtTime(Math.min(freq * 7.5, 12000), when);
  filter.frequency.exponentialRampToValueAtTime(Math.max(freq * 1.15, 180), when + dur * 0.9);

  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, when);
  amp.gain.linearRampToValueAtTime(peak, when + 0.002);
  amp.gain.exponentialRampToValueAtTime(0.001, when + dur);

  oscA.connect(mix);
  oscB.connect(mix);
  mix.connect(filter);
  filter.connect(amp);
  amp.connect(ctx.destination);
  oscA.start(when);
  oscB.start(when);
  oscA.stop(when + dur + 0.02);
  oscB.stop(when + dur + 0.02);

  const sq = ctx.createOscillator();
  const sqG = ctx.createGain();
  sq.type = 'square';
  sq.frequency.setValueAtTime(freq * 2, when);
  sqG.gain.setValueAtTime(sfxVol(0.032), when);
  sqG.gain.exponentialRampToValueAtTime(0.001, when + 0.045);
  const sqF = ctx.createBiquadFilter();
  sqF.type = 'bandpass';
  sqF.frequency.setValueAtTime(freq * 2.2, when);
  sqF.Q.setValueAtTime(4, when);
  sq.connect(sqF);
  sqF.connect(sqG);
  sqG.connect(ctx.destination);
  sq.start(when);
  sq.stop(when + 0.05);

  const { snare } = getCachedNoiseBuffers(ctx);
  const click = ctx.createBufferSource();
  click.buffer = snare;
  const cG = ctx.createGain();
  cG.gain.setValueAtTime(sfxVol(0.048), when);
  cG.gain.exponentialRampToValueAtTime(0.001, when + 0.028);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(4200, when);
  bp.Q.setValueAtTime(1.8, when);
  click.connect(bp);
  bp.connect(cG);
  cG.connect(ctx.destination);
  click.start(when);
  click.stop(when + 0.032);
}

/** 石板字／虛擬鍵落地（pitchIndex 遞增 → 不同 synth 音高） */
export function playStage3SlabLand(pitchIndex = 0): void {
  runWithQuizAudio((ctx) => {
    playStage3SlabSynthStab(ctx, ctx.currentTime, stage3SlabPitchHz(pitchIndex));
  });
}

/** 拼字輸入：很細的打字 tick（石板落下時播放） */
function playStage3TypeTickSynth(ctx: AudioContext, when: number, pitchIndex: number): void {
  const freq = 920 + (pitchIndex % 6) * 36;

  const tap = ctx.createOscillator();
  const tapGain = ctx.createGain();
  tap.type = 'triangle';
  tap.frequency.setValueAtTime(freq, when);
  tap.frequency.exponentialRampToValueAtTime(freq * 0.9, when + 0.028);
  tapGain.gain.setValueAtTime(0.0001, when);
  tapGain.gain.linearRampToValueAtTime(sfxVol(0.018), when + 0.002);
  tapGain.gain.exponentialRampToValueAtTime(0.001, when + 0.04);
  tap.connect(tapGain);
  tapGain.connect(ctx.destination);
  tap.start(when);
  tap.stop(when + 0.045);

  const { snare } = getCachedNoiseBuffers(ctx);
  const click = ctx.createBufferSource();
  click.buffer = snare;
  const clickGain = ctx.createGain();
  clickGain.gain.setValueAtTime(sfxVol(0.01), when);
  clickGain.gain.exponentialRampToValueAtTime(0.001, when + 0.016);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.setValueAtTime(3400, when);
  hp.Q.setValueAtTime(0.7, when);
  click.connect(hp);
  hp.connect(clickGain);
  clickGain.connect(ctx.destination);
  click.start(when);
  click.stop(when + 0.02);
}

export function playStage3TypeTick(pitchIndex = 0): void {
  runWithQuizAudio((ctx) => {
    playStage3TypeTickSynth(ctx, ctx.currentTime, pitchIndex);
  });
}

export function playStage3Great(): void {
  runWithQuizAudio((ctx) => {
    const t0 = ctx.currentTime;
    treasureChimeNote(ctx, t0, 698.46, 0.062, 0.09);
    squareBlip(ctx, t0 + 0.045, 987.77, 0.055, 0.036);
  });
}

export function playStage3Miss(): void {
  runWithQuizAudio((ctx) => {
    const t0 = ctx.currentTime;
    squareBlip(ctx, t0, 185, 0.11, 0.052);
    squareBlip(ctx, t0 + 0.085, 140, 0.13, 0.046);
  });
}

export function playStage3ComboHit(combo: number): void {
  runWithQuizAudio((ctx) => {
    const t0 = ctx.currentTime;
    const lift = Math.min(combo, 16);
    const root = 523.25 + lift * 14;
    treasureChimeNote(ctx, t0, root, 0.052, 0.1);
    treasureChimeNote(ctx, t0 + 0.065, root * 1.259, 0.048, 0.095);
    if (combo >= 4) {
      treasureChimeNote(ctx, t0 + 0.13, root * 1.498, 0.05, 0.11);
    }
  });
}

export function playStage3Perfect(): void {
  runWithQuizAudio((ctx) => {
    const t0 = ctx.currentTime;
    const arp = [261.63, 392, 523.25, 659.25, 783.99, 987.77, 1174.66, 1567.98];
    arp.forEach((freq, i) => {
      treasureChimeNote(ctx, t0 + i * 0.048, freq, 0.055 + i * 0.006, 0.1 + i * 0.018);
    });
    treasureChimeNote(ctx, t0, 130.81, 0.07, 0.16);
    treasureSparkle(ctx, t0 + 0.12, 880, 0.14);
    treasureSparkle(ctx, t0 + 0.22, 1320, 0.16);
    treasureSparkle(ctx, t0 + 0.34, 1760, 0.12);
    squareBlip(ctx, t0 + 0.18, 1975.53, 0.1, 0.065);
    squareBlip(ctx, t0 + 0.26, 2349.32, 0.11, 0.07);
    squareBlip(ctx, t0 + 0.36, 2793.83, 0.12, 0.075);
  });
}

export function playStage3InputError(): void {
  runWithQuizAudio((ctx) => {
    const t0 = ctx.currentTime;
    squareBlip(ctx, t0, 180, 0.08, 0.045);
  });
}

export function playStage3SpellFail(): void {
  runWithQuizAudio((ctx) => {
    const t0 = ctx.currentTime;
    squareBlip(ctx, t0, 140, 0.1, 0.05);
  });
}

export function playStage3RoundFail(): void {
  runWithQuizAudio((ctx) => {
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(165, t0);
    osc.frequency.linearRampToValueAtTime(75, t0 + 0.28);
    gain.gain.setValueAtTime(sfxVol(0.07), t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.32);
  });
}

let stage3AwardDrumRollCancel: (() => void) | null = null;

function playStage3AwardRollTap(ctx: AudioContext, when: number, urgency: number): void {
  const dest = ctx.destination;
  const hatPeak = 0.08 + urgency * 0.14;
  const kickPeak = 0.1 + urgency * 0.38;
  playStage3DiscoHatBgm(ctx, when, dest, urgency > 0.72, hatPeak);
  playStage3DiscoKickBgm(ctx, when, dest, kickPeak);
  if (urgency > 0.35) {
    playStage3DiscoSnareBgm(ctx, when + 0.01, dest, 0.12 + urgency * 0.28);
  }
  if (urgency > 0.55) {
    playStage3DiscoKickBgm(ctx, when + 0.055, dest, kickPeak * 0.72);
  }
}

/** 頒獎長鼓：加速至分數定格；回傳 cancel */
export function startStage3AwardDrumRoll(): () => void {
  stopStage3AwardDrumRoll();
  let cancelled = false;
  let timeoutId: number | null = null;
  const startMs = performance.now();

  const scheduleNext = () => {
    if (cancelled) return;
    const elapsed = performance.now() - startMs;
    const urgency = Math.min(1, elapsed / 2600);
    runWithQuizAudio((ctx) => {
      playStage3AwardRollTap(ctx, ctx.currentTime, urgency);
    });
    const interval = Math.max(46, 210 - urgency * 155);
    timeoutId = window.setTimeout(scheduleNext, interval);
  };

  scheduleNext();

  const cancel = () => {
    cancelled = true;
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (stage3AwardDrumRollCancel === cancel) {
      stage3AwardDrumRollCancel = null;
    }
  };

  stage3AwardDrumRollCancel = cancel;
  return cancel;
}

export function stopStage3AwardDrumRoll(): void {
  stage3AwardDrumRollCancel?.();
  stage3AwardDrumRollCancel = null;
}

/** 分數定格：重鼓一擊 */
export function playStage3AwardScoreRevealHit(): void {
  stopStage3AwardDrumRoll();
  runWithQuizAudio((ctx) => {
    const t0 = ctx.currentTime;
    const dest = ctx.destination;
    playStage3DiscoKickBgm(ctx, t0, dest, 1.2);
    playStage3DiscoSnareBgm(ctx, t0 + 0.02, dest, 1.05);
    playStage3DiscoSnareBgm(ctx, t0 + 0.055, dest, 0.88);
    playStage3DiscoHatBgm(ctx, t0 + 0.04, dest, true, 0.42);

    const { cymbal } = getCachedNoiseBuffers(ctx);
    const crash = ctx.createBufferSource();
    crash.buffer = cymbal;
    const g = ctx.createGain();
    g.gain.setValueAtTime(sfxVol(0.22), t0 + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.55);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(2800, t0);
    crash.connect(hp);
    hp.connect(g);
    g.connect(dest);
    crash.start(t0 + 0.03);
    crash.stop(t0 + 0.56);
  });
}

function isStage2BattleBgmHealthy(): boolean {
  return (
    stage2BattleBgmDesired &&
    stage2BattleMusic.active &&
    stage2BgmAudioEl !== null &&
    !stage2BgmAudioEl.paused &&
    stage2BattleMusic.masterGain !== null
  );
}

function isTensionBgmHealthy(): boolean {
  return (
    tensionBgmDesired &&
    tensionMusic.active &&
    stage1BgmAudioEl !== null &&
    !stage1BgmAudioEl.paused &&
    tensionMusic.masterGain !== null
  );
}

function isVictoryBgmHealthy(): boolean {
  return (
    victoryBgmDesired &&
    victoryMusic.active &&
    victoryMusic.schedulerTimer !== null &&
    victoryMusic.masterGain !== null &&
    audioCtx?.state === 'running'
  );
}

function isDefeatBgmHealthy(): boolean {
  return (
    defeatBgmDesired &&
    defeatMusic.active &&
    defeatMusic.schedulerTimer !== null &&
    defeatMusic.masterGain !== null &&
    audioCtx?.state === 'running'
  );
}

async function recoverQuizBgmAfterResume(forceRestart = false): Promise<void> {
  const ctx = audioCtx;
  if (!ctx || ctx.state !== 'running') return;

  if (stage2BattleBgmDesired && (forceRestart || !isStage2BattleBgmHealthy())) {
    await startQuizStage2BattleMusic();
  }
  if (tensionBgmDesired && (forceRestart || !isTensionBgmHealthy())) {
    await startQuizTensionMusic();
  }
  if (victoryBgmDesired && (forceRestart || !isVictoryBgmHealthy())) {
    await startQuizVictoryMusic();
  }
  if (defeatBgmDesired && (forceRestart || !isDefeatBgmHealthy())) {
    await startQuizDefeatMusic();
  }
  if (stage3DiscoBgmDesired && (forceRestart || !isStage3DiscoBgmHealthy())) {
    await startStage3DiscoBgm();
  }
}

type RecoverQuizAudioOptions = {
  forceRestartBgm?: boolean;
};

/**
 * 恢復被瀏覽器 suspend 的 AudioContext，並在需要時重啟 BGM 排程。
 * 切換分頁回來、點擊畫面、或 BGM 排程異常時呼叫。
 */
export async function recoverQuizAudio(opts?: RecoverQuizAudioOptions): Promise<void> {
  const now = performance.now();
  if (
    recoverQuizAudioInFlight &&
    now - lastRecoverQuizAudioMs < RECOVER_QUIZ_AUDIO_DEBOUNCE_MS
  ) {
    return recoverQuizAudioInFlight;
  }

  lastRecoverQuizAudioMs = now;
  recoverQuizAudioInFlight = (async () => {
    initQuizAudioWatch();
    const ctx = await resumeQuizAudio();
    if (!ctx) return;
    if (ctx.state === 'running') {
      await recoverQuizBgmAfterResume(Boolean(opts?.forceRestartBgm));
      return;
    }
    // Context 仍 suspended 時仍重新掛載 BGM 啟動邏輯，待使用者手勢解鎖後播放
    const force = Boolean(opts?.forceRestartBgm);
    if (stage2BattleBgmDesired && (force || !isStage2BattleBgmHealthy())) {
      await startQuizStage2BattleMusic();
    }
    if (tensionBgmDesired && (force || !isTensionBgmHealthy())) {
      await startQuizTensionMusic();
    }
    if (victoryBgmDesired && (force || !isVictoryBgmHealthy())) {
      await startQuizVictoryMusic();
    }
    if (defeatBgmDesired && (force || !isDefeatBgmHealthy())) {
      await startQuizDefeatMusic();
    }
    if (stage3DiscoBgmDesired && (force || !isStage3DiscoBgmHealthy())) {
      await startStage3DiscoBgm();
    }
  })();

  try {
    await recoverQuizAudioInFlight;
  } finally {
    recoverQuizAudioInFlight = null;
  }
}

/** 答題進行中定期檢查 BGM／AudioContext 是否仍正常 */
export function maintainQuizPlayAudio(): void {
  initQuizAudioWatch();
  void recoverQuizAudio();
}

/** 答題階段背景：Stage 1 幻夢舞曲（需先 resumeQuizAudio） */
export async function startQuizTensionMusic(): Promise<void> {
  if (typeof window === 'undefined') return;

  tensionBgmDesired = true;
  stage2BattleBgmDesired = false;
  initQuizAudioWatch();

  haltStage2BattleMusic(true);

  const ctx = await resumeQuizAudio();
  if (!ctx) return;

  if (isTensionBgmHealthy()) {
    applyQuizBgmMuteState();
    if (ctx.state === 'running' && stage1BgmAudioEl?.paused) {
      beginStage1Mp3Playback(ctx);
    }
    return;
  }

  haltTensionMusic(true);

  tensionMusic.active = true;
  tensionMusic.masterGain = ctx.createGain();
  tensionMusic.masterGain.gain.setValueAtTime(0.0001, ctx.currentTime);
  tensionMusic.masterGain.gain.linearRampToValueAtTime(
    effectiveBgmMaster(QUIZ_BGM_TENSION_MASTER_BASE),
    ctx.currentTime + 0.3,
  );
  tensionMusic.masterGain.connect(ctx.destination);
  applyQuizBgmMuteState();

  if (ctx.state === 'running') {
    beginStage1Mp3Playback(ctx);
    return;
  }

  clearTensionContextListener();
  const onRunning = () => {
    if (ctx.state !== 'running' || !tensionMusic.active) return;
    clearTensionContextListener();
    beginStage1Mp3Playback(ctx);
  };
  tensionMusic.onContextRunning = onRunning;
  ctx.addEventListener('statechange', onRunning);
}

function fadeOutMasterGain(gain: GainNode | null, fadeSec = 0.22): void {
  const ctx = audioCtx;
  if (!ctx || !gain) return;
  const t = ctx.currentTime;
  try {
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(gain.gain.value, t);
    gain.gain.linearRampToValueAtTime(0.0001, t + fadeSec);
    gain.disconnect();
  } catch {
    try {
      gain.disconnect();
    } catch {
      /* ignore */
    }
  }
}

function disconnectMasterGainImmediate(gain: GainNode | null): void {
  const ctx = audioCtx;
  if (!gain) return;
  const t = ctx?.currentTime ?? 0;
  try {
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(0, t);
    gain.disconnect();
  } catch {
    try {
      gain.disconnect();
    } catch {
      /* ignore */
    }
  }
}

function haltTensionMusic(immediate = false): void {
  if (!tensionMusic.active && !stage1BgmAudioEl && !tensionMusic.masterGain) {
    return;
  }

  tensionMusic.active = false;
  clearTensionContextListener();
  pauseStage1BgmAudio(immediate);

  const gain = tensionMusic.masterGain;
  tensionMusic.masterGain = null;
  if (immediate) {
    disconnectMasterGainImmediate(gain);
  } else {
    fadeOutMasterGain(gain);
  }
}

/** 停止答題 BGM（@param immediate 立刻切斷，避免重啟時兩軌疊加） */
export function stopQuizTensionMusic(immediate = false): void {
  tensionBgmDesired = false;
  haltTensionMusic(immediate);
}

function haltStage2BattleMusic(immediate = false): void {
  if (
    !stage2BattleMusic.active &&
    !stage2BgmAudioEl &&
    !stage2BattleMusic.masterGain
  ) {
    return;
  }

  stage2BattleMusic.active = false;
  clearStage2BattleContextListener();
  pauseStage2BgmAudio(immediate);

  const gain = stage2BattleMusic.masterGain;
  stage2BattleMusic.masterGain = null;
  if (immediate) {
    disconnectMasterGainImmediate(gain);
  } else {
    fadeOutMasterGain(gain);
  }
}

/** 停止 STAGE 2 戰鬥 BGM */
export function stopQuizStage2BattleMusic(immediate = false): void {
  stage2BattleBgmDesired = false;
  haltStage2BattleMusic(immediate);
}

/** BGM 四分音符（毫秒）— 與 MP3 downbeat 對齊 */
export function getStage2QuarterBeatMs(): number {
  return stage2BgmQuarterBeatMs();
}

const STAGE2_BEAT_SCHEDULE_MIN_MS = 48;

/** 距離下一個 STAGE 2 BGM 四分音符（downbeat）的毫秒 */
export function msUntilNextStage2Kick(): number {
  const quarterMs = getStage2QuarterBeatMs();
  const audio = stage2BgmAudioEl;
  if (!audio || audio.paused || !stage2BattleMusic.active) {
    return quarterMs;
  }

  const quarterSec = quarterMs / 1000;
  const gridT = stage2BgmGridTimeSec(audio.currentTime);
  const phase = gridT % quarterSec;
  const msUntilDownbeat = phase < 0.02 ? quarterMs : (quarterSec - phase) * 1000;
  return Math.max(STAGE2_BEAT_SCHEDULE_MIN_MS, msUntilDownbeat);
}

export function scheduleStage2QuarterBeat(onBeat: () => void): () => void {
  const delayMs = msUntilNextStage2Kick();
  const timeoutId = window.setTimeout(onBeat, delayMs);
  return () => window.clearTimeout(timeoutId);
}

export function runStage2QuarterBeatLoop(onBeat: () => boolean | void): () => void {
  let cancelled = false;
  let cancelPending: (() => void) | null = null;

  const tick = () => {
    if (cancelled) return;
    const keepGoing = onBeat();
    if (cancelled || keepGoing === false) return;
    cancelPending = scheduleStage2QuarterBeat(tick);
  };

  cancelPending = scheduleStage2QuarterBeat(tick);

  return () => {
    cancelled = true;
    cancelPending?.();
    cancelPending = null;
  };
}

export function scheduleStage2Beats(
  beatCount: number,
  onBeat: (beatIndex: number) => void,
): () => void {
  let beat = 0;
  return runStage2QuarterBeatLoop(() => {
    onBeat(beat);
    beat += 1;
    return beat < beatCount;
  });
}

/** STAGE 2 分身術：影鴉任務 BGM */
export async function startQuizStage2BattleMusic(): Promise<void> {
  if (typeof window === 'undefined') return;

  stage2BattleBgmDesired = true;
  tensionBgmDesired = false;
  initQuizAudioWatch();

  haltTensionMusic(true);

  const ctx = await resumeQuizAudio();
  if (!ctx) return;

  if (isStage2BattleBgmHealthy()) {
    applyQuizBgmMuteState();
    applyStage2BgmPlaybackRate();
    if (ctx.state === 'running' && stage2BgmAudioEl?.paused) {
      beginStage2Mp3Playback(ctx);
    }
    return;
  }

  haltStage2BattleMusic(true);

  stage2BattleMusic.active = true;
  stage2BattleMusic.masterGain = ctx.createGain();
  stage2BattleMusic.masterGain.gain.setValueAtTime(0.0001, ctx.currentTime);
  stage2BattleMusic.masterGain.gain.linearRampToValueAtTime(
    effectiveBgmMaster(QUIZ_BGM_STAGE2_BATTLE_MASTER_BASE),
    ctx.currentTime + 0.28,
  );
  stage2BattleMusic.masterGain.connect(ctx.destination);
  applyQuizBgmMuteState();

  if (ctx.state === 'running') {
    beginStage2Mp3Playback(ctx);
    return;
  }

  clearStage2BattleContextListener();
  const onRunning = () => {
    if (ctx.state !== 'running' || !stage2BattleMusic.active) return;
    clearStage2BattleContextListener();
    beginStage2Mp3Playback(ctx);
  };
  stage2BattleMusic.onContextRunning = onRunning;
  ctx.addEventListener('statechange', onRunning);
}

/* ─── 結果頁勝利 BGM（原創；DQ 勝利號角 + FF 勝利 fanfare 風）─── */

const VICTORY_BPM = 148;
const VICTORY_LOOP_STEPS = 32;

/** C 大調：行進低音（勇者鬥惡龍勝利曲風） */
const VICTORY_BASS_PATTERN: number[] = [
  130.81, 0, 130.81, 0, 98, 0, 98, 0, 130.81, 0, 146.83, 0, 164.81, 0, 196, 0,
  130.81, 0, 164.81, 0, 196, 0, 261.63, 0, 196, 0, 164.81, 0, 130.81, 0, 98, 0,
];

/** 上行 fanfare 主旋律（Final Fantasy 勝利主題式句型，原創） */
const VICTORY_MELODY_PATTERN: number[] = [
  523.25, 0, 659.25, 0, 783.99, 0, 1046.5, 0, 1318.51, 0, 1046.5, 0, 783.99, 0, 1046.5, 0,
  1174.66, 0, 1318.51, 0, 1567.98, 0, 1760, 0, 1567.98, 0, 1318.51, 0, 1046.5, 0, 783.99, 0,
];

/** 裝飾琶音（主旋律休止處） */
const VICTORY_ARP_PATTERN: number[] = [
  0, 392, 0, 523.25, 0, 659.25, 0, 523.25, 0, 392, 0, 523.25, 0, 659.25, 0, 783.99,
  0, 659.25, 0, 523.25, 0, 392, 0, 493.88, 0, 587.33, 0, 783.99, 0, 987.77, 0, 783.99,
];

/** 小節頭銅管式和弦（C → G） */
const VICTORY_BRASS_CHORDS: number[][] = [
  [261.63, 329.63, 392, 523.25, 659.25],
  [196, 246.94, 293.66, 392, 493.88],
];

type VictoryMusicRuntime = BgmSchedulerState & {
  onContextRunning: (() => void) | null;
};

const victoryMusic: VictoryMusicRuntime = {
  active: false,
  schedulerTimer: null,
  masterGain: null,
  step: 0,
  nextStepTime: 0,
  onContextRunning: null,
};

function clearVictoryContextListener(): void {
  const ctx = audioCtx;
  if (ctx && victoryMusic.onContextRunning) {
    ctx.removeEventListener('statechange', victoryMusic.onContextRunning);
  }
  victoryMusic.onContextRunning = null;
}

function beginVictoryLoop(ctx: AudioContext): void {
  beginBgmScheduler(
    ctx,
    victoryMusic,
    VICTORY_LOOP_STEPS,
    victoryStepDurationSec(),
    scheduleVictoryAt,
  );
}

function victoryStepDurationSec(): number {
  return 60 / VICTORY_BPM / 4;
}

function playVictoryBass(
  ctx: AudioContext,
  when: number,
  freq: number,
  duration: number,
  dest: AudioNode,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(freq, when);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.linearRampToValueAtTime(0.058, when + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.001, when + duration);
  connectThroughLowpass(ctx, osc, gain, dest, 720);
  osc.start(when);
  osc.stop(when + duration + 0.02);
}

/** 號角式主音：方波 + 微 detune（RPG 勝利銅管感） */
function playVictoryLead(
  ctx: AudioContext,
  when: number,
  freq: number,
  duration: number,
  dest: AudioNode,
): void {
  const osc = ctx.createOscillator();
  const detune = ctx.createOscillator();
  const mix = ctx.createGain();
  mix.gain.setValueAtTime(1, when);
  const gain = ctx.createGain();
  osc.type = 'square';
  detune.type = 'square';
  osc.frequency.setValueAtTime(freq, when);
  detune.frequency.setValueAtTime(freq, when);
  detune.detune.setValueAtTime(12, when);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.linearRampToValueAtTime(0.05, when + 0.008);
  gain.gain.setValueAtTime(0.044, when + duration * 0.5);
  gain.gain.exponentialRampToValueAtTime(0.001, when + duration * 1.05);
  osc.connect(mix);
  detune.connect(mix);
  mix.connect(gain);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(3800, when);
  filter.Q.setValueAtTime(0.6, when);
  gain.connect(filter);
  filter.connect(dest);
  osc.start(when);
  detune.start(when);
  osc.stop(when + duration + 0.04);
  detune.stop(when + duration + 0.04);
}

function playVictoryArp(
  ctx: AudioContext,
  when: number,
  freq: number,
  duration: number,
  dest: AudioNode,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, when);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.linearRampToValueAtTime(0.02, when + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.001, when + duration * 0.75);
  connectThroughLowpass(ctx, osc, gain, dest, 3200);
  osc.start(when);
  osc.stop(when + duration + 0.02);
}

function playVictoryBrassHit(
  ctx: AudioContext,
  when: number,
  freq: number,
  dest: AudioNode,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(freq, when);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.linearRampToValueAtTime(0.028, when + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.001, when + 0.14);
  connectThroughLowpass(ctx, osc, gain, dest, 2400);
  osc.start(when);
  osc.stop(when + 0.16);
}

function playVictoryCymbal(ctx: AudioContext, when: number, dest: AudioNode): void {
  const { cymbal } = getCachedNoiseBuffers(ctx);
  const src = ctx.createBufferSource();
  src.buffer = cymbal;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.02, when);
  gain.gain.exponentialRampToValueAtTime(0.001, when + 0.12);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.setValueAtTime(4200, when);
  src.connect(hp);
  hp.connect(gain);
  gain.connect(dest);
  src.start(when);
  src.stop(when + 0.13);
}

function playVictoryKick(ctx: AudioContext, when: number, dest: AudioNode): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(90, when);
  osc.frequency.exponentialRampToValueAtTime(48, when + 0.08);
  gain.gain.setValueAtTime(0.055, when);
  gain.gain.exponentialRampToValueAtTime(0.001, when + 0.09);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(when);
  osc.stop(when + 0.1);
}

function scheduleVictoryAt(
  ctx: AudioContext,
  when: number,
  step: number,
  dest: AudioNode,
): void {
  const dur = victoryStepDurationSec();

  const bassFreq = VICTORY_BASS_PATTERN[step] ?? 0;
  if (bassFreq > 0) {
    playVictoryBass(ctx, when, bassFreq, dur * 0.88, dest);
  }

  const melodyFreq = VICTORY_MELODY_PATTERN[step] ?? 0;
  if (melodyFreq > 0) {
    playVictoryLead(ctx, when, melodyFreq, dur * 1.0, dest);
  } else {
    const arpFreq = VICTORY_ARP_PATTERN[step] ?? 0;
    if (arpFreq > 0) {
      playVictoryArp(ctx, when, arpFreq, dur * 0.6, dest);
    }
  }

  if (step === 0 || step === 16) {
    const chord = VICTORY_BRASS_CHORDS[step === 0 ? 0 : 1] ?? VICTORY_BRASS_CHORDS[0]!;
    chord.forEach((freq, i) => {
      playVictoryBrassHit(ctx, when + i * 0.018, freq, dest);
    });
    playVictoryCymbal(ctx, when, dest);
  }

  if (step % 8 === 0) {
    playVictoryKick(ctx, when, dest);
  }
}

/** 結果頁背景：勝利 16-bit 循環（過關時使用） */
export async function startQuizVictoryMusic(): Promise<void> {
  if (typeof window === 'undefined') return;

  stopQuizTensionMusic(true);
  stopQuizStage2BattleMusic(true);
  stopQuizDefeatMusic(true);

  victoryBgmDesired = true;
  initQuizAudioWatch();

  const ctx = await resumeQuizAudio();
  if (!ctx) return;

  if (isVictoryBgmHealthy()) {
    return;
  }

  haltVictoryMusic(true);

  victoryMusic.active = true;
  victoryMusic.step = 0;
  victoryMusic.nextStepTime = 0;
  victoryMusic.masterGain = ctx.createGain();
  victoryMusic.masterGain.gain.setValueAtTime(0.0001, ctx.currentTime);
  victoryMusic.masterGain.gain.linearRampToValueAtTime(
    effectiveBgmMaster(QUIZ_BGM_VICTORY_MASTER_BASE),
    ctx.currentTime + 0.25,
  );
  victoryMusic.masterGain.connect(ctx.destination);
  applyQuizBgmMuteState();

  if (ctx.state === 'running') {
    beginVictoryLoop(ctx);
    return;
  }

  clearVictoryContextListener();
  const onRunning = () => {
    if (ctx.state !== 'running' || !victoryMusic.active) return;
    clearVictoryContextListener();
    beginVictoryLoop(ctx);
  };
  victoryMusic.onContextRunning = onRunning;
  ctx.addEventListener('statechange', onRunning);
}

function haltVictoryMusic(immediate = false): void {
  if (!victoryMusic.active && !victoryMusic.schedulerTimer && !victoryMusic.masterGain) {
    return;
  }

  victoryMusic.active = false;
  clearVictoryContextListener();
  clearBgmSchedulerTimer(victoryMusic);

  const gain = victoryMusic.masterGain;
  victoryMusic.masterGain = null;
  if (immediate) {
    disconnectMasterGainImmediate(gain);
  } else {
    fadeOutMasterGain(gain);
  }
}

/** 停止勝利 BGM（@param immediate 立刻切斷） */
export function stopQuizVictoryMusic(immediate = false): void {
  victoryBgmDesired = false;
  haltVictoryMusic(immediate);
}

/* ─── 結果頁失敗 BGM（原創；FF Game Over + DQ 敗北曲風）─── */

const DEFEAT_BPM = 92;
const DEFEAT_LOOP_STEPS = 32;

const DEFEAT_BASS_PATTERN: number[] = [
  110, 0, 0, 0, 0, 0, 0, 0, 98, 0, 0, 0, 0, 0, 0, 0,
  87.31, 0, 0, 0, 0, 0, 0, 0, 82.41, 0, 0, 0, 0, 0, 0, 0,
];

const DEFEAT_MELODY_PATTERN: number[] = [
  440, 0, 0, 0, 415.3, 0, 0, 0, 392, 0, 0, 0, 369.99, 0, 0, 0,
  349.23, 0, 0, 0, 329.63, 0, 0, 0, 293.66, 0, 0, 0, 261.63, 0, 0, 0,
];

const DEFEAT_ARP_PATTERN: number[] = [
  0, 220, 0, 261.63, 0, 329.63, 0, 261.63, 0, 220, 0, 207.65, 0, 246.94, 0, 220,
  0, 207.65, 0, 196, 0, 246.94, 0, 293.66, 0, 261.63, 0, 220, 0, 196, 0, 174.61,
];

type DefeatMusicRuntime = BgmSchedulerState & {
  onContextRunning: (() => void) | null;
};

const defeatMusic: DefeatMusicRuntime = {
  active: false,
  schedulerTimer: null,
  masterGain: null,
  step: 0,
  nextStepTime: 0,
  onContextRunning: null,
};

applyQuizBgmMuteState = () => {
  const ctx = audioCtx;
  const t = ctx?.currentTime ?? 0;
  const setMaster = (gain: GainNode | null, level: number) => {
    if (!gain) return;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(quizAudioMuted ? 0.0001 : level, t);
  };
  setMaster(tensionMusic.masterGain, effectiveBgmMaster(QUIZ_BGM_TENSION_MASTER_BASE));
  setMaster(stage2BattleMusic.masterGain, effectiveBgmMaster(QUIZ_BGM_STAGE2_BATTLE_MASTER_BASE));
  setMaster(stage3DiscoMusic.masterGain, effectiveBgmMaster(QUIZ_BGM_STAGE3_DISCO_MASTER_BASE));
  setMaster(victoryMusic.masterGain, effectiveBgmMaster(QUIZ_BGM_VICTORY_MASTER_BASE));
  setMaster(defeatMusic.masterGain, effectiveBgmMaster(QUIZ_BGM_DEFEAT_MASTER_BASE));
};

function clearDefeatContextListener(): void {
  const ctx = audioCtx;
  if (ctx && defeatMusic.onContextRunning) {
    ctx.removeEventListener('statechange', defeatMusic.onContextRunning);
  }
  defeatMusic.onContextRunning = null;
}

function defeatStepDurationSec(): number {
  return 60 / DEFEAT_BPM / 4;
}

function beginDefeatLoop(ctx: AudioContext): void {
  beginBgmScheduler(
    ctx,
    defeatMusic,
    DEFEAT_LOOP_STEPS,
    defeatStepDurationSec(),
    scheduleDefeatAt,
  );
}

function playDefeatLead(
  ctx: AudioContext,
  when: number,
  freq: number,
  duration: number,
  dest: AudioNode,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, when);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.linearRampToValueAtTime(0.04, when + 0.02);
  gain.gain.setValueAtTime(0.034, when + duration * 0.55);
  gain.gain.exponentialRampToValueAtTime(0.001, when + duration * 1.1);
  connectThroughLowpass(ctx, osc, gain, dest, 2800);
  osc.start(when);
  osc.stop(when + duration + 0.04);
}

function playDefeatBass(
  ctx: AudioContext,
  when: number,
  freq: number,
  duration: number,
  dest: AudioNode,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(freq, when);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.linearRampToValueAtTime(0.042, when + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, when + duration * 1.2);
  connectThroughLowpass(ctx, osc, gain, dest, 420);
  osc.start(when);
  osc.stop(when + duration + 0.05);
}

function playDefeatArp(
  ctx: AudioContext,
  when: number,
  freq: number,
  duration: number,
  dest: AudioNode,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, when);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.linearRampToValueAtTime(0.014, when + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, when + duration * 0.85);
  connectThroughLowpass(ctx, osc, gain, dest, 2000);
  osc.start(when);
  osc.stop(when + duration + 0.02);
}

function playDefeatPulse(ctx: AudioContext, when: number, dest: AudioNode): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(65, when);
  gain.gain.setValueAtTime(0.03, when);
  gain.gain.exponentialRampToValueAtTime(0.001, when + 0.12);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(when);
  osc.stop(when + 0.13);
}

function scheduleDefeatAt(
  ctx: AudioContext,
  when: number,
  step: number,
  dest: AudioNode,
): void {
  const dur = defeatStepDurationSec();

  const bassFreq = DEFEAT_BASS_PATTERN[step] ?? 0;
  if (bassFreq > 0) {
    playDefeatBass(ctx, when, bassFreq, dur * 3.5, dest);
  }

  const melodyFreq = DEFEAT_MELODY_PATTERN[step] ?? 0;
  if (melodyFreq > 0) {
    playDefeatLead(ctx, when, melodyFreq, dur * 1.4, dest);
  } else {
    const arpFreq = DEFEAT_ARP_PATTERN[step] ?? 0;
    if (arpFreq > 0) {
      playDefeatArp(ctx, when, arpFreq, dur * 0.9, dest);
    }
  }

  if (step === 0 || step === 16) {
    playDefeatPulse(ctx, when, dest);
  }
}

/** 結果頁背景：失敗 16-bit 循環（STAGE FAIL 後、未過關結果） */
export async function startQuizDefeatMusic(): Promise<void> {
  if (typeof window === 'undefined') return;

  stopQuizTensionMusic(true);
  stopQuizStage2BattleMusic(true);
  stopQuizVictoryMusic(true);

  defeatBgmDesired = true;
  initQuizAudioWatch();

  const ctx = await resumeQuizAudio();
  if (!ctx) return;

  if (isDefeatBgmHealthy()) {
    return;
  }

  haltDefeatMusic(true);

  defeatMusic.active = true;
  defeatMusic.step = 0;
  defeatMusic.nextStepTime = 0;
  defeatMusic.masterGain = ctx.createGain();
  defeatMusic.masterGain.gain.setValueAtTime(0.0001, ctx.currentTime);
  defeatMusic.masterGain.gain.linearRampToValueAtTime(
    effectiveBgmMaster(QUIZ_BGM_DEFEAT_MASTER_BASE),
    ctx.currentTime + 0.45,
  );
  defeatMusic.masterGain.connect(ctx.destination);
  applyQuizBgmMuteState();

  if (ctx.state === 'running') {
    beginDefeatLoop(ctx);
    return;
  }

  clearDefeatContextListener();
  const onRunning = () => {
    if (ctx.state !== 'running' || !defeatMusic.active) return;
    clearDefeatContextListener();
    beginDefeatLoop(ctx);
  };
  defeatMusic.onContextRunning = onRunning;
  ctx.addEventListener('statechange', onRunning);
}

function haltDefeatMusic(immediate = false): void {
  if (!defeatMusic.active && !defeatMusic.schedulerTimer && !defeatMusic.masterGain) {
    return;
  }

  defeatMusic.active = false;
  clearDefeatContextListener();
  clearBgmSchedulerTimer(defeatMusic);

  const gain = defeatMusic.masterGain;
  defeatMusic.masterGain = null;
  if (immediate) {
    disconnectMasterGainImmediate(gain);
  } else {
    fadeOutMasterGain(gain);
  }
}

/** 停止失敗 BGM */
export function stopQuizDefeatMusic(immediate = false): void {
  defeatBgmDesired = false;
  haltDefeatMusic(immediate);
}
