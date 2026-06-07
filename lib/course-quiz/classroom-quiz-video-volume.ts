/** 課堂測驗：依 Cloudflare Stream UID 記憶各影片音量（本機） */

import {
  QUIZ_GAME_AUDIO_PCT_MAX,
  QUIZ_GAME_AUDIO_PCT_MIN,
} from '@/lib/course-quiz/classroom-quiz-audio-settings';

const STORAGE_KEY = 'lingua-classroom-quiz-video-volumes';
const DEFAULT_PCT = 100;

export type ClassroomQuizVideoVolumeMap = Record<string, number>;

function clampPct(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_PCT;
  return Math.min(
    QUIZ_GAME_AUDIO_PCT_MAX,
    Math.max(QUIZ_GAME_AUDIO_PCT_MIN, Math.round(value)),
  );
}

function readMap(): ClassroomQuizVideoVolumeMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return {};
    const out: ClassroomQuizVideoVolumeMap = {};
    for (const [uid, pct] of Object.entries(parsed)) {
      if (typeof uid === 'string' && uid.trim() && typeof pct === 'number') {
        out[uid.trim()] = clampPct(pct);
      }
    }
    return out;
  } catch {
    return {};
  }
}

function writeMap(map: ClassroomQuizVideoVolumeMap): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(
    new CustomEvent('classroom-quiz-video-volume-change', {
      detail: { map: { ...map } },
    }),
  );
}

export function getClassroomQuizVideoVolumePct(videoUid: string | null | undefined): number {
  if (!videoUid?.trim()) return DEFAULT_PCT;
  const map = readMap();
  return map[videoUid.trim()] ?? DEFAULT_PCT;
}

export function getClassroomQuizVideoVolumeScale(videoUid: string | null | undefined): number {
  return getClassroomQuizVideoVolumePct(videoUid) / 100;
}

export function setClassroomQuizVideoVolumePct(
  videoUid: string,
  volumePct: number,
): number {
  const uid = videoUid.trim();
  if (!uid) return DEFAULT_PCT;
  const normalized = clampPct(volumePct);
  const map = readMap();
  map[uid] = normalized;
  writeMap(map);
  return normalized;
}

export function getAllClassroomQuizVideoVolumes(): ClassroomQuizVideoVolumeMap {
  return readMap();
}

export { QUIZ_GAME_AUDIO_PCT_MIN, QUIZ_GAME_AUDIO_PCT_MAX, DEFAULT_PCT as CLASSROOM_QUIZ_VIDEO_VOLUME_DEFAULT_PCT };
