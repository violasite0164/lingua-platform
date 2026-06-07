import type { Stage3LetterGroup } from '@/lib/stage3/constants';

/** 詞典未收錄但常用的補充單詞（仍須符合字母池） */
export const STAGE3_CURATED_SINGLE: Record<Stage3LetterGroup, readonly string[]> = {
  astr: ['strata', 'tarts'],
  eino: [],
  bulu: ['bulbul', 'bulb', 'bull', 'blue', 'lull'],
  dump: ['dump', 'pump', 'dumdum'],
};

function combinedKey(a: Stage3LetterGroup, b: Stage3LetterGroup): string {
  return [a, b].sort().join('|');
}

/** 合併兩組字母時的補充真實單詞（8+ 字元） */
export const STAGE3_CURATED_COMBINED: Partial<Record<string, readonly string[]>> = {
  [combinedKey('astr', 'bulu')]: [
    'subastral',
    'substratal',
    'subballast',
    'blastular',
  ],
  [combinedKey('astr', 'dump')]: ['apparatus'],
  [combinedKey('eino', 'bulu')]: ['nonillion', 'linolenin'],
  [combinedKey('eino', 'dump')]: ['opinioned', 'unpinioned'],
};

export function getCuratedCombined(
  boyGroup: Stage3LetterGroup,
  girlGroup: Stage3LetterGroup,
): readonly string[] {
  return STAGE3_CURATED_COMBINED[combinedKey(boyGroup, girlGroup)] ?? [];
}
