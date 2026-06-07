/** 課堂測驗音量（使用者本機偏好，與全站英語大冒險分開） */

import {
  QUIZ_GAME_AUDIO_PCT_MAX,
  QUIZ_GAME_AUDIO_PCT_MIN,
  defaultQuizGameAudioMix,
  normalizeQuizGameAudioMix,
  type QuizGameAudioMix,
} from '@/lib/quiz/game-audio-settings';

const STORAGE_KEY = 'lingua-classroom-quiz-audio-mix';
const BGM_MUTED_KEY = 'lingua-classroom-quiz-bgm-muted';

export type ClassroomQuizAudioMix = QuizGameAudioMix;

export function getClassroomQuizAudioMix(): ClassroomQuizAudioMix {
  if (typeof window === 'undefined') return defaultQuizGameAudioMix();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultQuizGameAudioMix();
    return normalizeQuizGameAudioMix(JSON.parse(raw) as ClassroomQuizAudioMix);
  } catch {
    return defaultQuizGameAudioMix();
  }
}

export function setClassroomQuizAudioMix(mix: ClassroomQuizAudioMix): ClassroomQuizAudioMix {
  const normalized = normalizeQuizGameAudioMix(mix);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    } catch {
      /* ignore */
    }
    window.dispatchEvent(
      new CustomEvent('classroom-quiz-audio-mix-change', { detail: normalized }),
    );
  }
  return normalized;
}

export function getClassroomQuizBgmVolumeScale(): number {
  if (isClassroomQuizBgmMuted()) return 0;
  return getClassroomQuizAudioMix().bgmVolumePct / 100;
}

export function getClassroomQuizSfxVolumeScale(): number {
  return getClassroomQuizAudioMix().sfxVolumePct / 100;
}

export function isClassroomQuizBgmMuted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(BGM_MUTED_KEY) === '1';
  } catch {
    return false;
  }
}

export function setClassroomQuizBgmMuted(muted: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(BGM_MUTED_KEY, muted ? '1' : '0');
  } catch {
    /* ignore */
  }
  window.dispatchEvent(
    new CustomEvent('classroom-quiz-bgm-mute-change', { detail: muted }),
  );
}

export { QUIZ_GAME_AUDIO_PCT_MIN, QUIZ_GAME_AUDIO_PCT_MAX };
