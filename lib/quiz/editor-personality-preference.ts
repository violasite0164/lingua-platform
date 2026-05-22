import type { QuizEditorPersonality } from '@/types/database.types';

export type HoldMessageTier = 'release' | 'cheat' | 'broken' | 'bye';

export const QUIZ_EDITOR_PERSONALITY_STORAGE_KEY = 'lingua_quiz_editor_personality';

export const QUIZ_EDITOR_PERSONALITY_OPTIONS: {
  id: QuizEditorPersonality;
  label: string;
  description: string;
}[] = [
  {
    id: 'toxic',
    label: '毒舌小編',
    description: '幽默嘲諷、火力全開，適合想被「鞭策」的你。',
  },
  {
    id: 'gentle',
    label: '溫柔治癒',
    description: '鼓勵陪伴、輕柔提醒，答錯也會陪你慢慢來。',
  },
];

export function isQuizEditorPersonality(
  value: string | null | undefined,
): value is QuizEditorPersonality {
  return value === 'toxic' || value === 'gentle';
}

export function readQuizEditorPersonalityFromStorage(): QuizEditorPersonality | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(QUIZ_EDITOR_PERSONALITY_STORAGE_KEY);
    return isQuizEditorPersonality(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function writeQuizEditorPersonalityToStorage(
  personality: QuizEditorPersonality,
): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(QUIZ_EDITOR_PERSONALITY_STORAGE_KEY, personality);
  } catch {
    /* ignore quota / private mode */
  }
}

export function resolveQuizEditorPersonality(
  fromProfile: string | null | undefined,
  fromStorage?: QuizEditorPersonality | null,
): QuizEditorPersonality | null {
  if (isQuizEditorPersonality(fromProfile)) return fromProfile;
  if (fromStorage) return fromStorage;
  return readQuizEditorPersonalityFromStorage();
}
