import { ELEMENTARY_WORD_MEANINGS_ZH } from '@/lib/stage2/elementary-word-meanings';
import { JUNIOR_NOUN_MEANINGS_ZH } from '@/lib/stage2/junior-noun-meanings';
import type { Stage2VocabGrade } from '@/lib/stage2/vocab-grade';

export type Stage2SessionWord = {
  word: string;
  meaningZh: string | null;
  vocabGrade: Stage2VocabGrade;
};

/** MISS 時顯示的正確答案說明 */
export function formatStage2CorrectExplanation(entry: Stage2SessionWord): string {
  const word = entry.word.trim();
  const meaning =
    entry.meaningZh?.trim() ||
    ELEMENTARY_WORD_MEANINGS_ZH[word] ||
    JUNIOR_NOUN_MEANINGS_ZH[word];
  if (meaning) {
    return `正確答案：${word}\n${meaning}`;
  }
  return `正確拼法：${word}`;
}

export type HeroineVocabHint = {
  lead: string;
  answer: string;
};

/** 女主角提示：標題行 + 答案及解釋 */
export function formatHeroineVocabHint(entry: Stage2SessionWord): HeroineVocabHint {
  const word = entry.word.trim();
  const meaning =
    entry.meaningZh?.trim() ||
    ELEMENTARY_WORD_MEANINGS_ZH[word] ||
    JUNIOR_NOUN_MEANINGS_ZH[word];
  return {
    lead: '真身應該是',
    answer: meaning ? `${word}：${meaning}` : word,
  };
}
