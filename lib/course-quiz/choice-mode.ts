import type { CourseQuizChoiceMode } from '@/types/database.types';

export function choiceCountForMode(mode: CourseQuizChoiceMode): 3 | 4 {
  return mode === 'three' ? 3 : 4;
}

export function optionLabelsForMode(mode: CourseQuizChoiceMode): readonly string[] {
  const n = choiceCountForMode(mode);
  return ['A', 'B', 'C', 'D'].slice(0, n);
}

export function choiceModeLabel(mode: CourseQuizChoiceMode): string {
  return mode === 'three' ? '三選一' : '四選一';
}
