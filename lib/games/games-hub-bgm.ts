/**
 * /games 選單背景音樂（獨立 HTML Audio，不經 rpg-audio，避免影響關卡 BGM／音效）
 */

import { swallowMediaPlayError, waitMediaCanPlay } from '@/lib/media/play-abort';

export const GAMES_HUB_BGM_URL = '/games/games-hub-bgm.mp3';

const QUIZ_AUDIO_MUTED_STORAGE_KEY = 'lingua-quiz-audio-muted';
const HUB_BGM_SESSION_UNLOCK_KEY = 'lingua-games-hub-bgm-unlocked';
const HUB_BGM_MASTER_BASE = 0.23;
const FADE_IN_MS = 1400;
const FADE_OUT_MS = 1000;

let audioEl: HTMLAudioElement | null = null;
let fadeRaf = 0;
let fadeGeneration = 0;
/** 遞增以作廢進行中的 playGamesHubBgmNow */
let playGeneration = 0;
let desiredPlaying = false;
let hubBgmVolumeScale = 1;
let listenersBound = false;
/** GamesHub 掛載次數（Strict Mode 假卸載時不誤停 BGM） */
let hubSurfaceMountCount = 0;

function readQuizAudioMuted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(QUIZ_AUDIO_MUTED_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function hubBgmTargetVolume(): number {
  if (readQuizAudioMuted()) return 0;
  return HUB_BGM_MASTER_BASE * hubBgmVolumeScale;
}

function cancelHubBgmFade(): void {
  if (fadeRaf) {
    cancelAnimationFrame(fadeRaf);
    fadeRaf = 0;
  }
}

function rampHubBgmVolume(to: number, durationMs: number, onDone?: () => void): void {
  if (!audioEl) {
    onDone?.();
    return;
  }
  cancelHubBgmFade();
  const gen = ++fadeGeneration;
  const startVol = audioEl.volume;
  const start = performance.now();

  const tick = (now: number) => {
    if (!audioEl || gen !== fadeGeneration) return;
    const t = Math.min(1, (now - start) / durationMs);
    const eased = t * t * (3 - 2 * t);
    audioEl.volume = startVol + (to - startVol) * eased;
    if (t < 1) {
      fadeRaf = requestAnimationFrame(tick);
      return;
    }
    fadeRaf = 0;
    onDone?.();
  };

  fadeRaf = requestAnimationFrame(tick);
}

function applyHubBgmMute(): void {
  if (!audioEl) return;
  audioEl.muted = readQuizAudioMuted();
}

function bindHubBgmListeners(): void {
  if (listenersBound || typeof window === 'undefined') return;
  listenersBound = true;

  const onMute = () => {
    applyHubBgmMute();
    if (!desiredPlaying) return;
    const target = hubBgmTargetVolume();
    if (target <= 0) {
      stopGamesHubBgmImmediate();
      return;
    }
    void playGamesHubBgmNow();
  };

  const onMix = (event: Event) => {
    const detail = (event as CustomEvent<{ bgmVolumePct?: number }>).detail;
    if (typeof detail?.bgmVolumePct === 'number') {
      hubBgmVolumeScale = Math.min(2, Math.max(0, detail.bgmVolumePct / 100));
    }
    if (desiredPlaying && audioEl && !audioEl.paused) {
      rampHubBgmVolume(hubBgmTargetVolume(), 280);
    }
  };

  window.addEventListener('quiz-audio-mute-change', onMute);
  window.addEventListener('quiz-audio-mix-change', onMix);
}

function ensureHubBgmAudio(): HTMLAudioElement {
  if (!audioEl) {
    audioEl = new Audio(GAMES_HUB_BGM_URL);
    audioEl.loop = true;
    audioEl.preload = 'auto';
    audioEl.volume = 0;
    audioEl.onerror = () => {
      stopGamesHubBgmImmediate();
    };
  }
  return audioEl;
}

function hubBgmPlayStillWanted(gen: number): boolean {
  return desiredPlaying && gen === playGeneration;
}

function markHubBgmSessionUnlocked(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(HUB_BGM_SESSION_UNLOCK_KEY, '1');
  } catch {
    /* ignore */
  }
}

/** 掛載 /games 選單表面；cleanup 在真正離開頁面時才 stop */
export function retainGamesHubBgmSurface(): () => void {
  hubSurfaceMountCount += 1;
  return () => {
    hubSurfaceMountCount = Math.max(0, hubSurfaceMountCount - 1);
    requestAnimationFrame(() => {
      if (hubSurfaceMountCount === 0) {
        stopGamesHubBgmImmediate();
      }
    });
  };
}

async function playGamesHubBgmNow(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const target = hubBgmTargetVolume();
  if (target <= 0) {
    stopGamesHubBgmImmediate();
    return false;
  }

  const gen = ++playGeneration;
  bindHubBgmListeners();
  const audio = ensureHubBgmAudio();
  applyHubBgmMute();

  const ready = await waitMediaCanPlay(audio);
  if (!hubBgmPlayStillWanted(gen)) {
    if (!desiredPlaying) stopGamesHubBgmImmediate();
    return false;
  }
  if (!ready) return false;

  if (audio.paused) {
    await swallowMediaPlayError(audio.play());
  }
  if (!hubBgmPlayStillWanted(gen)) {
    if (!desiredPlaying) stopGamesHubBgmImmediate();
    return false;
  }
  if (audio.paused) return false;

  markHubBgmSessionUnlocked();
  rampHubBgmVolume(target, FADE_IN_MS);
  return true;
}

/** 使用者手勢後嘗試播放 */
export async function unlockAndStartGamesHubBgm(): Promise<boolean> {
  desiredPlaying = true;
  return playGamesHubBgmNow();
}

/** 進入選單：標記應播放（同 session 曾解鎖後再進選單較易自動播） */
export function startGamesHubBgm(): void {
  if (typeof window === 'undefined') return;
  desiredPlaying = true;
  bindHubBgmListeners();
  void playGamesHubBgmNow();
}

/** 立刻停止（開始遊戲時用，避免與關卡 BGM 搶佔） */
export function stopGamesHubBgmImmediate(): void {
  desiredPlaying = false;
  playGeneration += 1;
  cancelHubBgmFade();
  fadeGeneration += 1;
  if (!audioEl) return;
  audioEl.pause();
  audioEl.volume = 0;
  audioEl.currentTime = 0;
}

/** 離開選單：淡出 */
export function stopGamesHubBgm(): void {
  desiredPlaying = false;
  playGeneration += 1;
  if (!audioEl) return;

  cancelHubBgmFade();
  fadeGeneration += 1;
  const audio = audioEl;
  if (audio.paused) {
    audio.volume = 0;
    audio.currentTime = 0;
    return;
  }

  const gen = fadeGeneration;
  rampHubBgmVolume(0, FADE_OUT_MS, () => {
    if (gen !== fadeGeneration) return;
    audio.pause();
    audio.currentTime = 0;
    audio.volume = 0;
  });
}

export function preloadGamesHubBgm(): void {
  if (typeof window === 'undefined') return;
  const audio = ensureHubBgmAudio();
  audio.load();
}
