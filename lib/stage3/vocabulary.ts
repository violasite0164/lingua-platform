import { STAGE3_ENGLISH_DICTIONARY } from '@/lib/stage3/english-dictionary';

export const STAGE3_WORD_LENGTHS = [4, 5, 8, 9] as const;
export type Stage3WordLength = (typeof STAGE3_WORD_LENGTHS)[number];

export const STAGE3_WORDS_PER_LENGTH = 100;

const MAX_DICT_SCAN_INDEX = 6500;

function isValidStage3Word(word: string): word is string {
  if (!/^[a-z]+$/.test(word)) return false;
  if (!STAGE3_WORD_LENGTHS.includes(word.length as Stage3WordLength)) return false;
  if (word.endsWith('s') || word.endsWith('ed')) return false;
  return true;
}

function buildVocabularyPools(): Record<Stage3WordLength, string[]> {
  const pools: Record<Stage3WordLength, string[]> = { 4: [], 5: [], 8: [], 9: [] };

  for (let i = 0; i < STAGE3_ENGLISH_DICTIONARY.length; i++) {
    const word = STAGE3_ENGLISH_DICTIONARY[i]!;
    if (i > MAX_DICT_SCAN_INDEX && Object.values(pools).every((p) => p.length >= STAGE3_WORDS_PER_LENGTH)) {
      break;
    }
    if (!isValidStage3Word(word)) continue;
    const bucket = pools[word.length as Stage3WordLength];
    if (bucket && bucket.length < STAGE3_WORDS_PER_LENGTH) {
      bucket.push(word);
    }
  }

  for (const len of STAGE3_WORD_LENGTHS) {
    if (pools[len].length < STAGE3_WORDS_PER_LENGTH) {
      for (const word of STAGE3_ENGLISH_DICTIONARY) {
        if (pools[len].length >= STAGE3_WORDS_PER_LENGTH) break;
        if (!isValidStage3Word(word) || word.length !== len) continue;
        if (!pools[len].includes(word)) pools[len].push(word);
      }
    }
  }

  return pools;
}

let vocabularyPools: Record<Stage3WordLength, string[]> | null = null;

export function getStage3VocabularyPool(length: Stage3WordLength): readonly string[] {
  if (!vocabularyPools) vocabularyPools = buildVocabularyPools();
  return vocabularyPools[length];
}

export function pickStage3Word(length: Stage3WordLength, exclude: Set<string> = new Set()): string {
  const pool = getStage3VocabularyPool(length);
  const available = pool.filter((w) => !exclude.has(w));
  const source = available.length > 0 ? available : pool;
  return source[Math.floor(Math.random() * source.length)]!;
}
