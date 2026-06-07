import { getClassroomQuizBgmVolumeScale } from '@/lib/course-quiz/classroom-quiz-audio-settings';
import { isLikelyPlayableMediaUrl, swallowMediaPlayError, waitMediaCanPlay } from '@/lib/media/play-abort';

const BGM_DEFAULT_VOLUME_BASE = 0.42;
const BGM_FADE_MS = 600;
const BGM_FADE_IN_MS = 900;

let bgmAudio: HTMLAudioElement | null = null;
let fadeRaf = 0;
let fadeGeneration = 0;
let videoDucked = false;
let bgmVolumeBase = BGM_DEFAULT_VOLUME_BASE;
let desiredPlaying = false;
let gestureUnlockUnbind: (() => void) | null = null;

function targetBgmVolume(): number {
  if (videoDucked) return 0;
  return bgmVolumeBase * getClassroomQuizBgmVolumeScale();
}

function cancelBgmFade() {
  if (fadeRaf) {
    cancelAnimationFrame(fadeRaf);
    fadeRaf = 0;
  }
}

function fadeBgmTo(targetVolume: number, durationMs = BGM_FADE_MS): void {
  if (!bgmAudio) return;
  cancelBgmFade();
  const gen = ++fadeGeneration;
  const startVol = bgmAudio.volume;
  const start = performance.now();

  const tick = (now: number) => {
    if (!bgmAudio || gen !== fadeGeneration) return;
    const t = Math.min(1, (now - start) / durationMs);
    const eased = t * t * (3 - 2 * t);
    bgmAudio.volume = startVol + (targetVolume - startVol) * eased;
    if (t < 1) {
      fadeRaf = requestAnimationFrame(tick);
      return;
    }
    bgmAudio.volume = targetVolume;
    fadeRaf = 0;
  };

  fadeRaf = requestAnimationFrame(tick);
}

function isBgmAudible(): boolean {
  return Boolean(
    bgmAudio && !bgmAudio.paused && !bgmAudio.ended && bgmAudio.volume > 0.01,
  );
}

async function playClassroomQuizBgmNow(): Promise<boolean> {
  if (!bgmAudio) return false;

  const target = targetBgmVolume();
  if (target <= 0) {
    bgmAudio.pause();
    bgmAudio.volume = 0;
    return false;
  }

  bgmAudio.muted = false;

  const ready = await waitMediaCanPlay(bgmAudio);
  if (!ready) return false;

  if (bgmAudio.paused) {
    await swallowMediaPlayError(bgmAudio.play());
  }
  if (bgmAudio.paused) return false;

  fadeBgmTo(target, BGM_FADE_IN_MS);
  return true;
}

/** 使用者手勢後重試播放 */
function disposeBgmAudioElement(): void {
  cancelBgmFade();
  fadeGeneration += 1;
  if (!bgmAudio) return;
  bgmAudio.pause();
  bgmAudio.removeAttribute('src');
  bgmAudio.load();
  bgmAudio = null;
}

function ensureBgmAudioElement(url: string): HTMLAudioElement {
  const absolute = new URL(url, window.location.href).href;
  if (bgmAudio && bgmAudio.src === absolute) {
    return bgmAudio;
  }
  disposeBgmAudioElement();
  const audio = new Audio(url);
  audio.loop = true;
  audio.preload = 'auto';
  audio.volume = 0;
  audio.muted = false;
  audio.onerror = () => {
    stopClassroomQuizBgm();
  };
  bgmAudio = audio;
  return audio;
}

export async function unlockAndStartClassroomQuizBgm(
  url: string,
  volumeBase = BGM_DEFAULT_VOLUME_BASE,
): Promise<boolean> {
  if (typeof window === 'undefined' || !isLikelyPlayableMediaUrl(url)) return false;

  desiredPlaying = true;
  bgmVolumeBase = Math.max(0, Math.min(1, volumeBase));
  ensureBgmAudioElement(url);

  return playClassroomQuizBgmNow();
}

export function startClassroomQuizBgm(
  url: string,
  volumeBase = BGM_DEFAULT_VOLUME_BASE,
) {
  if (typeof window === 'undefined' || !isLikelyPlayableMediaUrl(url)) return;
  desiredPlaying = true;
  void unlockAndStartClassroomQuizBgm(url, volumeBase);
}

/** 持續監聽手勢直到 BGM 成功播放 */
export function bindClassroomQuizBgmGestureUnlock(
  url: string,
  volumeBase: number,
): () => void {
  if (typeof window === 'undefined') return () => {};

  gestureUnlockUnbind?.();

  const tryUnlock = () => {
    if (!desiredPlaying || isBgmAudible()) return;
    void unlockAndStartClassroomQuizBgm(url, volumeBase).then((ok) => {
      if (ok) gestureUnlockUnbind?.();
    });
  };

  const unbind = () => {
    window.removeEventListener('pointerdown', tryUnlock, true);
    window.removeEventListener('keydown', tryUnlock, true);
    if (gestureUnlockUnbind === unbind) {
      gestureUnlockUnbind = null;
    }
  };

  window.addEventListener('pointerdown', tryUnlock, true);
  window.addEventListener('keydown', tryUnlock, true);
  gestureUnlockUnbind = unbind;

  tryUnlock();

  return unbind;
}

export function stopClassroomQuizBgm() {
  desiredPlaying = false;
  gestureUnlockUnbind?.();
  gestureUnlockUnbind = null;
  videoDucked = false;
  disposeBgmAudioElement();
}

export function resumeClassroomQuizBgmIfPaused() {
  if (!desiredPlaying || !bgmAudio) return;
  void playClassroomQuizBgmNow();
}

/** 影片播放中：背景音樂淡出至靜音 */
export function duckClassroomQuizBgmForVideo() {
  if (!bgmAudio || videoDucked) return;
  videoDucked = true;
  fadeBgmTo(0, BGM_FADE_MS);
}

/** 影片結束：背景音樂淡入恢復 */
export function restoreClassroomQuizBgmAfterVideo() {
  if (!bgmAudio) return;
  videoDucked = false;
  fadeBgmTo(targetBgmVolume(), BGM_FADE_MS);
  if (bgmAudio.paused) {
    void playClassroomQuizBgmNow();
  }
}

let mixListenerBound = false;

export function syncClassroomQuizBgmVolume() {
  if (!bgmAudio || videoDucked) return;
  const target = targetBgmVolume();
  if (target <= 0) {
    bgmAudio.pause();
    bgmAudio.volume = 0;
    return;
  }
  if (bgmAudio.paused) {
    void playClassroomQuizBgmNow();
    return;
  }
  fadeBgmTo(target, 280);
}

export function ensureClassroomQuizBgmMuteListener() {
  if (typeof window === 'undefined' || mixListenerBound) return;
  mixListenerBound = true;
  window.addEventListener('classroom-quiz-audio-mix-change', syncClassroomQuizBgmVolume);
  window.addEventListener('classroom-quiz-bgm-mute-change', syncClassroomQuizBgmVolume);
}
