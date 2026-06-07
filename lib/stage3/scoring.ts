export type Stage3CharResult = 'pending' | 'correct' | 'wrong';

/** 回合得分 = 正確輸入的字母數 */
export function scoreStage3Round(charResults: readonly Stage3CharResult[]): number {
  return charResults.filter((s) => s === 'correct').length;
}

export function sumStage3RoundScores(roundScores: readonly number[]): number {
  return roundScores.reduce((a, b) => a + b, 0);
}
