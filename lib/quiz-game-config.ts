import { QUIZ_DIFFICULTY_ORDER } from '@/lib/quiz/constants';
import type { HomepageConfig } from '@/types/database.types';
import type { QuizDifficultyLevel } from '@/types/database.types';

export type QuizLevelVideos = {
  startVideoUrl: string | null;
  completeVideoUrl: string | null;
};

export type QuizCinemaConfig = Record<QuizDifficultyLevel, QuizLevelVideos>;

export const QUIZ_CINEMA_LEVEL_META: {
  id: QuizDifficultyLevel;
  label: string;
  stageNumber: number;
}[] = [
  { id: 'elementary', label: '初級', stageNumber: 1 },
  { id: 'junior', label: '中級', stageNumber: 2 },
  { id: 'college', label: '進階', stageNumber: 3 },
  { id: 'professor', label: '教授級', stageNumber: 4 },
];

/** 表單／DB 欄位名（homepage_config） */
export const QUIZ_CINEMA_FORM_FIELDS: Record<
  QuizDifficultyLevel,
  { start: keyof HomepageConfig; complete: keyof HomepageConfig }
> = {
  elementary: {
    start: 'quiz_elementary_start_video_url',
    complete: 'quiz_elementary_complete_video_url',
  },
  junior: {
    start: 'quiz_junior_start_video_url',
    complete: 'quiz_junior_complete_video_url',
  },
  college: {
    start: 'quiz_college_start_video_url',
    complete: 'quiz_college_complete_video_url',
  },
  professor: {
    start: 'quiz_professor_start_video_url',
    complete: 'quiz_professor_complete_video_url',
  },
};

function trimUrl(value: string | null | undefined): string | null {
  const s = value?.trim();
  return s || null;
}

export function emptyQuizCinemaConfig(): QuizCinemaConfig {
  return Object.fromEntries(
    QUIZ_DIFFICULTY_ORDER.map((id) => [
      id,
      { startVideoUrl: null, completeVideoUrl: null },
    ]),
  ) as QuizCinemaConfig;
}

export function parseQuizCinemaConfig(
  row: Partial<HomepageConfig> | null,
): QuizCinemaConfig {
  const empty = emptyQuizCinemaConfig();
  if (!row) return empty;

  const legacyStart = trimUrl(row.quiz_stage_start_video_url);
  const legacyComplete = trimUrl(row.quiz_stage_complete_video_url);

  for (const { id } of QUIZ_CINEMA_LEVEL_META) {
    const fields = QUIZ_CINEMA_FORM_FIELDS[id];
    const start = trimUrl(row[fields.start] as string | null | undefined);
    const complete = trimUrl(row[fields.complete] as string | null | undefined);
    empty[id] = {
      startVideoUrl:
        start ?? (id === 'elementary' ? legacyStart : null),
      completeVideoUrl:
        complete ?? (id === 'elementary' ? legacyComplete : null),
    };
  }

  return empty;
}

export function getQuizVideosForDifficulty(
  config: QuizCinemaConfig,
  level: QuizDifficultyLevel,
): QuizLevelVideos {
  return config[level] ?? { startVideoUrl: null, completeVideoUrl: null };
}
