import type { LessonTimedCue } from '@/types/database.types';

/** 需作答才算完成單元的互動類型 */
export const REQUIRED_CUE_TYPES = ['multiple_choice', 'text_input'] as const;

export function isRequiredCueType(
  type: LessonTimedCue['cue_type'],
): type is (typeof REQUIRED_CUE_TYPES)[number] {
  return (REQUIRED_CUE_TYPES as readonly string[]).includes(type);
}

export function getRequiredTimedCues(cues: LessonTimedCue[]): LessonTimedCue[] {
  return cues.filter((c) => c.is_enabled && isRequiredCueType(c.cue_type));
}

export function getRequiredCueIds(cues: LessonTimedCue[]): string[] {
  return getRequiredTimedCues(cues).map((c) => c.id);
}

export function allRequiredCuesAnswered(
  requiredIds: string[],
  answeredIds: Iterable<string>,
): boolean {
  if (requiredIds.length === 0) return true;
  const answered = new Set(answeredIds);
  return requiredIds.every((id) => answered.has(id));
}
