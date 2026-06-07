export const STAGE3_ANNOUNCE_TEXT = {
  start: 'STAGE 3 START!',
  clear: 'STAGE CLEAR!',
  fail: 'STAGE FAIL....',
} as const;

/** 同回合多個生字：BOSS 與輸入泡泡的顯示分隔 */
export const STAGE3_ROUND_WORD_SEP = ' , ';

export function formatStage3RoundWordsDisplay(words: readonly string[]): string {
  return words.map((w) => w.toUpperCase()).join(STAGE3_ROUND_WORD_SEP);
}

/** 全螢幕走馬燈文案 */
export const STAGE3_MARQUEE_TEXT = {
  opening: "LET'S DANCE!",
  /** 第 5 回合 */
  feverTime: 'FEVER TIME',
} as const;
