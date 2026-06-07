import { JUNIOR_NOUNS_100 } from '@/lib/stage2/junior-nouns-100';

export type Stage2VocabGrade = 'elementary' | 'junior';

const JUNIOR_VOCAB_SET = new Set<string>(JUNIOR_NOUNS_100);

export function isJuniorStage2VocabWord(word: string): boolean {
  return JUNIOR_VOCAB_SET.has(word.trim().toLowerCase());
}

export function resolveStage2VocabGrade(
  word: string,
  gradeLevel?: string | null,
): Stage2VocabGrade {
  if (gradeLevel === 'junior') return 'junior';
  if (gradeLevel === 'elementary') return 'elementary';
  return isJuniorStage2VocabWord(word) ? 'junior' : 'elementary';
}
