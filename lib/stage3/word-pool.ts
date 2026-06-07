import type { Stage3LetterGroup } from '@/lib/stage3/constants';
import {
  STAGE3_COMBINED_WORD_MAX_LEN,
  STAGE3_COMBINED_WORD_MIN_LEN,
  STAGE3_LETTER_GROUPS,
  STAGE3_SINGLE_WORD_MAX_LEN,
  STAGE3_SINGLE_WORD_MIN_LEN,
} from '@/lib/stage3/constants';
import {
  canSpellWithLetterPool,
  canTypeWordWithControls,
  mergeLetterPools,
} from '@/lib/stage3/can-spell';
import type { Stage3InputSide } from '@/lib/stage3/rounds';
import { getCuratedCombined, STAGE3_CURATED_SINGLE } from '@/lib/stage3/curated-words';
import { STAGE3_ENGLISH_DICTIONARY } from '@/lib/stage3/english-dictionary';

const MIN_COMBINED_POOL_SIZE = 4;
const MIN_SINGLE_POOL_SIZE = 3;

function uniqueSorted(words: Iterable<string>): string[] {
  return [...new Set([...words].map((w) => w.toLowerCase()))].sort(
    (a, b) => a.length - b.length || a.localeCompare(b),
  );
}

function filterDictionaryWords(
  letterPool: string,
  minLen: number,
  maxLen: number,
): string[] {
  return STAGE3_ENGLISH_DICTIONARY.filter(
    (w) =>
      w.length >= minLen &&
      w.length <= maxLen &&
      canSpellWithLetterPool(w, letterPool),
  );
}

function buildSingleGroupPool(group: Stage3LetterGroup): string[] {
  const letters = group.toLowerCase();
  const curated = STAGE3_CURATED_SINGLE[group].filter((w) =>
    canSpellWithLetterPool(w, letters),
  );

  let pool = uniqueSorted([
    ...filterDictionaryWords(letters, STAGE3_SINGLE_WORD_MIN_LEN, STAGE3_SINGLE_WORD_MAX_LEN),
    ...curated.filter((w) => w.length >= STAGE3_SINGLE_WORD_MIN_LEN),
  ]);

  return pool;
}

function letterPoolWithBonus(basePool: string, bonusLetter: string): string {
  return [...new Set(`${basePool}${bonusLetter.toLowerCase()}`.split(''))].sort().join('');
}

function buildCombinedPoolFromLetters(
  boyGroup: Stage3LetterGroup,
  girlGroup: Stage3LetterGroup,
  letters: string,
): string[] {
  const curated = getCuratedCombined(boyGroup, girlGroup).filter((w) =>
    canSpellWithLetterPool(w, letters),
  );

  const pool = uniqueSorted([
    ...filterDictionaryWords(letters, STAGE3_COMBINED_WORD_MIN_LEN, STAGE3_COMBINED_WORD_MAX_LEN),
    ...curated,
  ]);

  return pool.filter((w) => w.length >= STAGE3_COMBINED_WORD_MIN_LEN);
}

function buildCombinedPool(boyGroup: Stage3LetterGroup, girlGroup: Stage3LetterGroup): string[] {
  return buildCombinedPoolFromLetters(boyGroup, girlGroup, mergeLetterPools(boyGroup, girlGroup));
}

/** Boss 每回合隨機加一個字母（a–z） */
export function pickBossBonusLetter(): string {
  const code = 97 + Math.floor(Math.random() * 26);
  return String.fromCharCode(code);
}

const poolsByGroup: Partial<Record<Stage3LetterGroup, string[]>> = {};

let singlePoolsReady = false;

/** 延遲建池：避免 import 時掃描整份字典（不影響 dev Starting，僅優化進入 Stage 3 當下） */
function ensureSingleGroupPools(): void {
  if (singlePoolsReady) return;
  singlePoolsReady = true;
  for (const g of STAGE3_LETTER_GROUPS) {
    poolsByGroup[g] = buildSingleGroupPool(g);
  }
}

const combinedPoolCache = new Map<string, string[]>();

function combinedPoolKey(a: Stage3LetterGroup, b: Stage3LetterGroup): string {
  return [a, b].sort().join('|');
}

/** bulu + dump 無法組成足夠長度的真實英文單詞 */
export function isValidBoyGirlPair(
  boyGroup: Stage3LetterGroup,
  girlGroup: Stage3LetterGroup,
): boolean {
  const pair = new Set([boyGroup, girlGroup]);
  if (pair.has('bulu') && pair.has('dump')) return false;
  return (
    getSingleGroupPool(boyGroup).length >= MIN_SINGLE_POOL_SIZE &&
    getSingleGroupPool(girlGroup).length >= MIN_SINGLE_POOL_SIZE &&
    getCombinedPool(boyGroup, girlGroup).length >= MIN_COMBINED_POOL_SIZE
  );
}

export function getSingleGroupPool(group: Stage3LetterGroup): string[] {
  ensureSingleGroupPools();
  return poolsByGroup[group] ?? [];
}

function filterTypeableWords(
  words: string[],
  opts: {
    inputSide: Stage3InputSide;
    boyGroup: Stage3LetterGroup;
    girlGroup: Stage3LetterGroup;
    bonusLetter: string;
  },
): string[] {
  return words.filter((w) =>
    canTypeWordWithControls(w, {
      inputSide: opts.inputSide,
      boyLetters: opts.boyGroup,
      girlLetters: opts.girlGroup,
      bonusLetter: opts.bonusLetter,
    }),
  );
}

export function getSingleGroupPoolWithBonus(
  group: Stage3LetterGroup,
  bonusLetter: string,
  inputSide: 'boy' | 'girl',
): string[] {
  const bonus = bonusLetter.toLowerCase().slice(0, 1);
  const key = `${group}|${inputSide}|${bonus}`;
  let pool = combinedPoolCache.get(key);
  if (!pool) {
    const letters = letterPoolWithBonus(group.toLowerCase(), bonus);
    const curated = STAGE3_CURATED_SINGLE[group].filter((w) =>
      canSpellWithLetterPool(w, letters),
    );
    pool = uniqueSorted([
      ...filterDictionaryWords(letters, STAGE3_SINGLE_WORD_MIN_LEN, STAGE3_SINGLE_WORD_MAX_LEN),
      ...curated.filter((w) => w.length >= STAGE3_SINGLE_WORD_MIN_LEN),
    ]);
    pool = filterTypeableWords(pool, {
      inputSide,
      boyGroup: inputSide === 'boy' ? group : 'astr',
      girlGroup: inputSide === 'girl' ? group : 'eino',
      bonusLetter: bonus,
    });
    combinedPoolCache.set(key, pool);
  }
  return pool;
}

export function getCombinedPool(boyGroup: Stage3LetterGroup, girlGroup: Stage3LetterGroup): string[] {
  const key = combinedPoolKey(boyGroup, girlGroup);
  let pool = combinedPoolCache.get(key);
  if (!pool) {
    pool = buildCombinedPool(boyGroup, girlGroup);
    combinedPoolCache.set(key, pool);
  }
  return pool;
}

export function getCombinedPoolWithBonus(
  boyGroup: Stage3LetterGroup,
  girlGroup: Stage3LetterGroup,
  bonusLetter: string,
): string[] {
  const bonus = bonusLetter.toLowerCase().slice(0, 1);
  const key = `${combinedPoolKey(boyGroup, girlGroup)}|${bonus}`;
  let pool = combinedPoolCache.get(key);
  if (!pool) {
    const letters = letterPoolWithBonus(mergeLetterPools(boyGroup, girlGroup), bonus);
    pool = buildCombinedPoolFromLetters(boyGroup, girlGroup, letters);
    pool = filterTypeableWords(pool, {
      inputSide: 'both',
      boyGroup,
      girlGroup,
      bonusLetter: bonus,
    });
    combinedPoolCache.set(key, pool);
  }
  return pool;
}

export function pickRandomWords(pool: string[], count: number, exclude: Set<string> = new Set()): string[] {
  const candidates = pool.filter((w) => !exclude.has(w));
  const picked: string[] = [];
  const used = new Set(exclude);

  for (let i = 0; i < count; i++) {
    const available = candidates.filter((w) => !used.has(w));
    const source = available.length > 0 ? available : candidates.length > 0 ? candidates : pool;
    if (source.length === 0) break;
    const word = source[Math.floor(Math.random() * source.length)]!;
    picked.push(word);
    used.add(word);
  }

  return picked;
}

export function assignBoyGirlGroups(): {
  boyGroup: Stage3LetterGroup;
  girlGroup: Stage3LetterGroup;
} {
  for (let attempt = 0; attempt < 80; attempt++) {
    const shuffled = [...STAGE3_LETTER_GROUPS].sort(() => Math.random() - 0.5);
    const boyGroup = shuffled[0]!;
    const girlGroup = shuffled[1]!;
    if (isValidBoyGirlPair(boyGroup, girlGroup)) {
      return { boyGroup, girlGroup };
    }
  }

  return { boyGroup: 'astr', girlGroup: 'eino' };
}

export function lettersForGroup(group: Stage3LetterGroup): string[] {
  return group.toLowerCase().split('');
}
