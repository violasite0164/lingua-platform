/**
 * 首頁行銷快測 — 柔和、專業感 UI 音效（Web Audio API，無外部檔案）
 * 於使用者點擊「開始快測」或選項後解鎖 AudioContext。
 */

let audioCtx: AudioContext | null = null;

export function ensureHomeQuizAudio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return null;
  if (!audioCtx) audioCtx = new AudioCtor();
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume();
  }
  return audioCtx;
}

/** 在使用者手勢後 await resume，確保首個音效能播出 */
export async function resumeHomeQuizAudio(): Promise<AudioContext | null> {
  const ctx = ensureHomeQuizAudio();
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

type ToneOpts = {
  frequency: number;
  startTime: number;
  duration: number;
  peakGain?: number;
  type?: OscillatorType;
  attackSec?: number;
};

/** 經低通柔化，避免刺耳高頻 */
function connectWarmOutput(ctx: AudioContext, osc: OscillatorNode, gain: GainNode): void {
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(3200, ctx.currentTime);
  filter.Q.setValueAtTime(0.7, ctx.currentTime);
  osc.connect(gain);
  gain.connect(filter);
  filter.connect(ctx.destination);
}

function playTone(ctx: AudioContext, opts: ToneOpts): void {
  if (ctx.state !== 'running') return;

  const {
    frequency,
    startTime,
    duration,
    peakGain = 0.07,
    type = 'sine',
    attackSec = 0.012,
  } = opts;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(peakGain, startTime + attackSec);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  connectWarmOutput(ctx, osc, gain);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

function playSequence(
  ctx: AudioContext,
  notes: Array<{ freq: number; at: number; dur: number; gain?: number }>,
): void {
  for (const n of notes) {
    playTone(ctx, {
      frequency: n.freq,
      startTime: ctx.currentTime + n.at,
      duration: n.dur,
      peakGain: n.gain ?? 0.065,
    });
  }
}

/** 開始快測：輕柔上行提示音 */
export function playHomeQuizStart(): void {
  const ctx = ensureHomeQuizAudio();
  if (!ctx || ctx.state !== 'running') return;
  playSequence(ctx, [
    { freq: 392.0, at: 0, dur: 0.1, gain: 0.055 },
    { freq: 523.25, at: 0.1, dur: 0.12, gain: 0.06 },
    { freq: 659.25, at: 0.22, dur: 0.16, gain: 0.065 },
  ]);
}

/** 題幹打字：極輕觸鍵感（非每字必播，由呼叫端節流） */
export function playHomeQuizTypeTick(): void {
  const ctx = ensureHomeQuizAudio();
  if (!ctx || ctx.state !== 'running') return;
  playTone(ctx, {
    frequency: 880,
    startTime: ctx.currentTime,
    duration: 0.028,
    peakGain: 0.018,
    attackSec: 0.004,
  });
}

/** 題幹顯示完成：雙音確認 */
export function playHomeQuizQuestionReady(): void {
  const ctx = ensureHomeQuizAudio();
  if (!ctx || ctx.state !== 'running') return;
  playSequence(ctx, [
    { freq: 523.25, at: 0, dur: 0.09, gain: 0.05 },
    { freq: 659.25, at: 0.09, dur: 0.11, gain: 0.055 },
  ]);
}

/** 選擇選項：短促 UI 點擊 */
export function playHomeQuizSelect(): void {
  const ctx = ensureHomeQuizAudio();
  if (!ctx || ctx.state !== 'running') return;
  playTone(ctx, {
    frequency: 620,
    startTime: ctx.currentTime,
    duration: 0.04,
    peakGain: 0.035,
    attackSec: 0.006,
  });
}

/** 答對：明亮但不刺眼的和弦琶音 */
export function playHomeQuizCorrect(): void {
  const ctx = ensureHomeQuizAudio();
  if (!ctx || ctx.state !== 'running') return;
  playSequence(ctx, [
    { freq: 523.25, at: 0, dur: 0.1, gain: 0.06 },
    { freq: 659.25, at: 0.07, dur: 0.1, gain: 0.062 },
    { freq: 783.99, at: 0.14, dur: 0.14, gain: 0.065 },
  ]);
}

/** 答錯：柔和下行，避免懲罰感過強 */
export function playHomeQuizWrong(): void {
  const ctx = ensureHomeQuizAudio();
  if (!ctx || ctx.state !== 'running') return;
  const t0 = ctx.currentTime;
  playTone(ctx, { frequency: 349.23, startTime: t0, duration: 0.14, peakGain: 0.05 });
  playTone(ctx, { frequency: 293.66, startTime: t0 + 0.12, duration: 0.18, peakGain: 0.048 });
}

type ResultTier = 1 | 2 | 3 | 4 | 5;

function tierFromScore(correct: number, total: number): ResultTier {
  if (total <= 0) return 1;
  const pct = correct / total;
  if (correct >= total) return 5;
  if (pct >= 0.8) return 4;
  if (pct >= 0.5) return 3;
  if (pct >= 0.3) return 2;
  return 1;
}

function playResultTier(ctx: AudioContext, tier: ResultTier): void {
  const t0 = ctx.currentTime;

  if (tier === 5) {
    playSequence(ctx, [
      { freq: 523.25, at: 0, dur: 0.11, gain: 0.058 },
      { freq: 659.25, at: 0.1, dur: 0.11, gain: 0.06 },
      { freq: 783.99, at: 0.2, dur: 0.11, gain: 0.062 },
      { freq: 1046.5, at: 0.3, dur: 0.18, gain: 0.065 },
    ]);
    return;
  }

  if (tier === 4) {
    playSequence(ctx, [
      { freq: 440, at: 0, dur: 0.1, gain: 0.055 },
      { freq: 554.37, at: 0.09, dur: 0.1, gain: 0.058 },
      { freq: 659.25, at: 0.18, dur: 0.14, gain: 0.06 },
    ]);
    return;
  }

  if (tier === 3) {
    playSequence(ctx, [
      { freq: 392, at: 0, dur: 0.12, gain: 0.052 },
      { freq: 523.25, at: 0.11, dur: 0.14, gain: 0.055 },
    ]);
    return;
  }

  if (tier === 2) {
    playSequence(ctx, [
      { freq: 349.23, at: 0, dur: 0.14, gain: 0.05 },
      { freq: 392, at: 0.13, dur: 0.16, gain: 0.052 },
    ]);
    return;
  }

  playSequence(ctx, [
    { freq: 329.63, at: 0, dur: 0.16, gain: 0.048 },
    { freq: 293.66, at: 0.15, dur: 0.2, gain: 0.046 },
  ]);
}

/** 快測結算：依答對比例播放不同長度的完成音 */
export function playHomeQuizResult(correct: number, total: number): void {
  const ctx = ensureHomeQuizAudio();
  if (!ctx || ctx.state !== 'running') return;
  playResultTier(ctx, tierFromScore(correct, total));
}
