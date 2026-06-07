import { stripChoiceLetterPrefix } from '@/lib/quiz/question-utils';
import type { CourseQuizQuestion } from '@/types/database.types';

/** 將題目／選項文字整理為適合 Azure 英文朗讀的內容 */
export function textForQuizSpeech(raw: string): string {
  const stripped =
    stripChoiceLetterPrefix(raw) ||
    raw.replace(/^\s*[A-Da-d][\.\)\uff0e]\s*/u, '').trim() ||
    raw.trim();
  return stripped.replace(/\s+/g, ' ').trim();
}

/** 產生「問題語音」時使用的朗讀稿：有填 question_speech_text 則只用該欄，否則才用 question_text */
export function questionSpeechSource(question: {
  question_speech_text?: string | null;
  question_text: string;
}): string {
  const dedicated = (question.question_speech_text ?? '').trim();
  if (dedicated) {
    return textForQuizSpeech(dedicated);
  }
  return textForQuizSpeech(question.question_text);
}
