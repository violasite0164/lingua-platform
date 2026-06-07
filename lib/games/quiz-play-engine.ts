import type { QuizQuestionPayload } from '@/lib/quiz/types';
import type { QuizEditorPersonality } from '@/types/database.types';

/** Quiz 遊玩階段（與 UI phase 對齊的子集） */
export type QuizFlowPhase =
  | 'loading'
  | 'play'
  | 'result';

export type QuizCharacterMood =
  | 'idle'
  | 'thinking'
  | 'correct'
  | 'wrong'
  | 'celebrate';

export type QuizPlaySnapshot = {
  phase: QuizFlowPhase;
  cursor: number;
  total: number;
  picked: number | null;
  optionsAnswerable: boolean;
  correctTotal: number;
};

export function resolveQuizCharacterMood(input: {
  phase: QuizFlowPhase;
  answeredThis: boolean;
  isCorrect: boolean | null;
  optionsAnswerable: boolean;
}): QuizCharacterMood {
  if (input.phase === 'result') return 'celebrate';
  if (input.phase !== 'play') return 'idle';
  if (input.answeredThis) {
    return input.isCorrect ? 'correct' : 'wrong';
  }
  if (!input.optionsAnswerable) return 'thinking';
  return 'idle';
}

export function canPickQuizOption(input: {
  current: QuizQuestionPayload | null | undefined;
  picked: number | null;
  optionsAnswerable: boolean;
  optionIndex: number;
}): boolean {
  if (!input.current || input.picked !== null || !input.optionsAnswerable) {
    return false;
  }
  return (
    Number.isInteger(input.optionIndex) &&
    input.optionIndex >= 0 &&
    input.optionIndex <= 3
  );
}

export function computeQuizPlayProgress(input: {
  cursor: number;
  total: number;
  answeredThis: boolean;
}): number {
  if (!input.total) return 0;
  return ((input.cursor + (input.answeredThis ? 1 : 0)) / input.total) * 100;
}

export function mapPersonalityToRive(
  personality: QuizEditorPersonality | null | undefined,
): number {
  if (personality === 'gentle') return 1;
  return 0;
}
