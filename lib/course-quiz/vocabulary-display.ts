import type { CourseQuizVocabularyDisplay } from '@/types/database.types';
import { stripChoiceLetterPrefix } from '@/lib/quiz/question-utils';

/** 圖形模式撿起時顯示的選項文字（去掉 A. / B. 前綴） */
export function vocabularyShapeOptionLabel(optionText: string): string {
  return stripChoiceLetterPrefix(optionText) || optionText.trim();
}

export const COURSE_QUIZ_VOCABULARY_DISPLAYS: Record<
  CourseQuizVocabularyDisplay,
  { label: string; description: string }
> = {
  character: {
    label: '字元',
    description: '掉落立體單字母（如答案為 H 則顯示擠出立體字 H）。',
  },
  shape: {
    label: '圖形',
    description:
      '掉落立體圖形（三角、正方、圓、長方、五角、六角、星形）或各選項專屬圖片；全螢幕 3D 互動。',
  },
};

export function resolveCourseQuizVocabularyDisplay(
  raw: string | null | undefined,
): CourseQuizVocabularyDisplay {
  if (raw === 'shape' || raw === 'card') return 'shape';
  return 'character';
}

export function isVocabularyThreeDDisplay(
  display: CourseQuizVocabularyDisplay,
): boolean {
  return display === 'character' || display === 'shape';
}

/** 單字模式字元顯示：取答案內容的主要字元（非選項編號） */
export function vocabularyCharacterGlyph(optionText: string): string {
  const cleaned =
    stripChoiceLetterPrefix(optionText) ||
    optionText.replace(/^\s*[A-Da-d][\.\)\uff0e]\s*/u, '').trim() ||
    optionText.trim();
  const compact = cleaned.replace(/\s+/g, '');
  if (!compact) return '?';
  return compact.charAt(0).toUpperCase();
}

export function vocabularyChipLabel(
  optionText: string,
  display: CourseQuizVocabularyDisplay,
): string {
  if (display === 'character') {
    return vocabularyCharacterGlyph(optionText);
  }
  if (display === 'shape') {
    return vocabularyCharacterGlyph(optionText);
  }
  return (
    stripChoiceLetterPrefix(optionText) ||
    optionText.replace(/^\s*[A-Da-d][\.\)\uff0e]\s*/u, '').trim() ||
    optionText.trim()
  );
}
