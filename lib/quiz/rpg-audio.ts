/**
 * RPG 風打字音效（Web Audio API，無外部檔）
 * 瀏覽器需在使用者手勢後才能 resume AudioContext（於開始遊戲／答題時呼叫 ensureQuizAudio）
 */

let audioCtx: AudioContext | null = null;

export function ensureQuizAudio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!audioCtx) audioCtx = new AudioCtx();
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume();
  }
  return audioCtx;
}

/** 每個字元「嘀」一聲（空白略過） */
export function playRpgTypeBlip(): void {
  const ctx = ensureQuizAudio();
  if (!ctx || ctx.state !== 'running') return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(770, ctx.currentTime);
  gain.gain.setValueAtTime(0.035, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.04);
}

/** 該句題幹打完時短琶音 */
export function playRpgLineDone(): void {
  const ctx = ensureQuizAudio();
  if (!ctx || ctx.state !== 'running') return;

  const freqs = [523.25, 659.25];
  freqs.forEach((freq, i) => {
    const t = ctx.currentTime + i * 0.06;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.045, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.09);
  });
}

/** 8-bit 風：答對（上行大三和弦琶音） */
export function playQuizAnswerCorrect(): void {
  const ctx = ensureQuizAudio();
  if (!ctx || ctx.state !== 'running') return;

  const freqs = [523.25, 659.25, 783.99];
  const step = 0.065;
  freqs.forEach((freq, i) => {
    const t = ctx.currentTime + i * step;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.052, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.12);
  });
}

/** 8-bit 風：答錯（低頻下滑長音） */
export function playQuizAnswerWrong(): void {
  const ctx = ensureQuizAudio();
  if (!ctx || ctx.state !== 'running') return;

  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(195, t0);
  osc.frequency.linearRampToValueAtTime(88, t0 + 0.3);
  gain.gain.setValueAtTime(0.068, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.34);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + 0.35);
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
  gain.gain.setValueAtTime(peakGain, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duration + 0.02);
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
  const ctx = ensureQuizAudio();
  if (!ctx || ctx.state !== 'running') return;
  playResultTier(ctx, tierFromHomeScore(correct, total));
}

/** /quiz 結算：依百分制總分 */
export function playQuizResultFull(score100: number): void {
  const ctx = ensureQuizAudio();
  if (!ctx || ctx.state !== 'running') return;
  playResultTier(ctx, tierFromScore100(score100));
}
