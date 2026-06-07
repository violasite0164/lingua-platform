/** 英語大冒險全站 BGM／音效音量（存於 homepage_config） */

export const QUIZ_GAME_AUDIO_BGM_PCT_DEFAULT = 100;
export const QUIZ_GAME_AUDIO_SFX_PCT_DEFAULT = 100;
export const QUIZ_GAME_AUDIO_PCT_MIN = 0;
export const QUIZ_GAME_AUDIO_PCT_MAX = 200;

export type QuizGameAudioMix = {
  bgmVolumePct: number;
  sfxVolumePct: number;
};

export function defaultQuizGameAudioMix(): QuizGameAudioMix {
  return {
    bgmVolumePct: QUIZ_GAME_AUDIO_BGM_PCT_DEFAULT,
    sfxVolumePct: QUIZ_GAME_AUDIO_SFX_PCT_DEFAULT,
  };
}

function clampPct(value: number): number {
  if (!Number.isFinite(value)) return QUIZ_GAME_AUDIO_BGM_PCT_DEFAULT;
  return Math.min(
    QUIZ_GAME_AUDIO_PCT_MAX,
    Math.max(QUIZ_GAME_AUDIO_PCT_MIN, Math.round(value)),
  );
}

export function normalizeQuizGameAudioMix(raw: {
  bgmVolumePct?: unknown;
  sfxVolumePct?: unknown;
}): QuizGameAudioMix {
  const bgm =
    typeof raw.bgmVolumePct === 'number'
      ? raw.bgmVolumePct
      : QUIZ_GAME_AUDIO_BGM_PCT_DEFAULT;
  const sfx =
    typeof raw.sfxVolumePct === 'number'
      ? raw.sfxVolumePct
      : QUIZ_GAME_AUDIO_SFX_PCT_DEFAULT;
  return {
    bgmVolumePct: clampPct(bgm),
    sfxVolumePct: clampPct(sfx),
  };
}

export function parseQuizGameAudioMixFromRow(row: {
  quiz_game_bgm_volume_pct?: unknown;
  quiz_game_sfx_volume_pct?: unknown;
} | null): QuizGameAudioMix {
  if (!row) return defaultQuizGameAudioMix();
  return normalizeQuizGameAudioMix({
    bgmVolumePct:
      typeof row.quiz_game_bgm_volume_pct === 'number'
        ? row.quiz_game_bgm_volume_pct
        : QUIZ_GAME_AUDIO_BGM_PCT_DEFAULT,
    sfxVolumePct:
      typeof row.quiz_game_sfx_volume_pct === 'number'
        ? row.quiz_game_sfx_volume_pct
        : QUIZ_GAME_AUDIO_SFX_PCT_DEFAULT,
  });
}
