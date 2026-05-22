export type LessonCueType = 'sentence' | 'multiple_choice' | 'text_input';

export type SentenceCuePayload = {
  text: string;
};

export type MultipleChoiceCuePayload = {
  prompt: string;
  options: [string, string, string, string];
  correct_index: number;
  explanation?: string;
};

export type TextInputCuePayload = {
  prompt: string;
  acceptable_answers: string[];
  case_sensitive?: boolean;
  explanation?: string;
};

export type LessonCuePayload =
  | SentenceCuePayload
  | MultipleChoiceCuePayload
  | TextInputCuePayload;

export const LESSON_CUE_TYPE_LABELS: Record<LessonCueType, string> = {
  sentence: '句字',
  multiple_choice: '四選一',
  text_input: '輸入作答',
};

export function defaultPayloadForType(type: LessonCueType): LessonCuePayload {
  switch (type) {
    case 'sentence':
      return { text: '' };
    case 'multiple_choice':
      return {
        prompt: '',
        options: ['', '', '', ''],
        correct_index: 0,
      };
    case 'text_input':
      return { prompt: '', acceptable_answers: [''], case_sensitive: false };
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function parseCuePayload(
  type: LessonCueType,
  raw: unknown,
): LessonCuePayload | null {
  if (!isRecord(raw)) return null;

  if (type === 'sentence') {
    const text = typeof raw.text === 'string' ? raw.text.trim() : '';
    if (!text) return null;
    return { text };
  }

  if (type === 'multiple_choice') {
    const prompt = typeof raw.prompt === 'string' ? raw.prompt.trim() : '';
    if (!prompt) return null;
    if (!Array.isArray(raw.options) || raw.options.length !== 4) return null;
    const options = raw.options.map((o) =>
      typeof o === 'string' ? o.trim() : '',
    ) as [string, string, string, string];
    if (options.some((o) => !o)) return null;
    const correct_index =
      typeof raw.correct_index === 'number' ? raw.correct_index : 0;
    if (correct_index < 0 || correct_index > 3) return null;
    const explanation =
      typeof raw.explanation === 'string' ? raw.explanation.trim() : undefined;
    return {
      prompt,
      options,
      correct_index,
      ...(explanation ? { explanation } : {}),
    };
  }

  const prompt = typeof raw.prompt === 'string' ? raw.prompt.trim() : '';
  if (!prompt) return null;
  const answers = Array.isArray(raw.acceptable_answers)
    ? raw.acceptable_answers
        .filter((a): a is string => typeof a === 'string')
        .map((a) => a.trim())
        .filter(Boolean)
    : [];
  if (answers.length === 0) return null;
  return {
    prompt,
    acceptable_answers: answers,
    case_sensitive: raw.case_sensitive === true,
    explanation:
      typeof raw.explanation === 'string' ? raw.explanation.trim() : undefined,
  };
}

export function getCueDisplayText(
  type: LessonCueType,
  payload: LessonCuePayload,
): string {
  if (type === 'sentence' && 'text' in payload) return payload.text;
  if ('prompt' in payload) return payload.prompt;
  return '';
}
