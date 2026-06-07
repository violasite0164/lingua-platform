import {
  STAGE3_COMBO_MIN_HITS,
  STAGE3_FEVER_MARQUEE_ROUND_INDEX,
  STAGE3_FEVER_STAT_MULTIPLIER,
  STAGE3_PASS_MIN_SCORE100,
  STAGE3_SCORE_WEIGHT_COMBO,
  STAGE3_SCORE_WEIGHT_LETTERS,
  STAGE3_SCORE_WEIGHT_PERFECT,
  STAGE3_TOTAL_ROUNDS,
} from '@/lib/stage3/constants';

/** 單局累積（含 FEVER 回合加權前的原始計數） */
export type Stage3RunStats = {
  comboHits: number;
  comboHitsFever: number;
  perfectCount: number;
  perfectCountFever: number;
  correctLetters: number;
  correctLettersFever: number;
  maxCombo: number;
};

export function createEmptyStage3RunStats(): Stage3RunStats {
  return {
    comboHits: 0,
    comboHitsFever: 0,
    perfectCount: 0,
    perfectCountFever: 0,
    correctLetters: 0,
    correctLettersFever: 0,
    maxCombo: 0,
  };
}

export function isStage3FeverRound(roundIndex: number): boolean {
  return roundIndex >= STAGE3_FEVER_MARQUEE_ROUND_INDEX;
}

export function recordStage3CorrectKeystroke(
  stats: Stage3RunStats,
  roundIndex: number,
  comboAfter: number,
): void {
  const fever = isStage3FeverRound(roundIndex);
  stats.correctLetters += 1;
  if (fever) stats.correctLettersFever += 1;
  if (comboAfter > stats.maxCombo) stats.maxCombo = comboAfter;
  if (comboAfter >= STAGE3_COMBO_MIN_HITS) {
    stats.comboHits += 1;
    if (fever) stats.comboHitsFever += 1;
  }
}

export function recordStage3Perfect(stats: Stage3RunStats, roundIndex: number): void {
  stats.perfectCount += 1;
  if (isStage3FeverRound(roundIndex)) stats.perfectCountFever += 1;
}

/** 單回合：正確字母數達字長即視為 PERFECT（完整拼對該詞） */
export function isStage3RoundPerfect(roundScore: number, wordLength: number): boolean {
  return wordLength > 0 && roundScore >= wordLength;
}

/**
 * 依各回合得分與字長重算 PERFECT（結算前呼叫，避免遊玩中漏計）
 */
/** 依已完成回合得分重建統計（續關還原進度用） */
export function rebuildStage3RunStatsFromRoundScores(
  session: { rounds: readonly { word: string }[] },
  roundScores: readonly number[],
): Stage3RunStats {
  const stats = createEmptyStage3RunStats();
  syncStage3PerfectCountFromRounds(stats, session.rounds, roundScores);

  for (let i = 0; i < roundScores.length; i++) {
    const score = roundScores[i] ?? 0;
    const wordLen = session.rounds[i]?.word.length ?? 0;
    const fever = isStage3FeverRound(i);

    stats.correctLetters += score;
    if (fever) stats.correctLettersFever += score;

    if (isStage3RoundPerfect(score, wordLen)) {
      const comboHitsThisRound = Math.max(0, wordLen - 1);
      stats.comboHits += comboHitsThisRound;
      if (fever) stats.comboHitsFever += comboHitsThisRound;
      if (comboHitsThisRound > stats.maxCombo) stats.maxCombo = comboHitsThisRound;
    }
  }

  return stats;
}

export function syncStage3PerfectCountFromRounds(
  stats: Stage3RunStats,
  rounds: readonly { word: string }[],
  roundScores: readonly number[],
): void {
  let perfectCount = 0;
  let perfectCountFever = 0;
  for (let i = 0; i < roundScores.length; i++) {
    const wordLen = rounds[i]?.word.length ?? 0;
    const score = roundScores[i] ?? 0;
    if (!isStage3RoundPerfect(score, wordLen)) continue;
    perfectCount += 1;
    if (isStage3FeverRound(i)) perfectCountFever += 1;
  }
  stats.perfectCount = perfectCount;
  stats.perfectCountFever = perfectCountFever;
}

export type Stage3ScoreBreakdown = {
  score100: number;
  comboPoints: number;
  perfectPoints: number;
  letterPoints: number;
  weightedCombo: number;
  weightedPerfect: number;
  weightedLetters: number;
  maxWeightedCombo: number;
  maxWeightedPerfect: number;
  maxWeightedLetters: number;
};

export type Stage3FinalScoreResult = {
  score100: number;
  passed: boolean;
  breakdown: Stage3ScoreBreakdown;
  stats: Stage3RunStats;
};

/** 各項目加權後理論上限（FEVER 回合 × {@link STAGE3_FEVER_STAT_MULTIPLIER}） */
export function stage3TheoreticalWeightedCaps(): {
  combo: number;
  perfect: number;
  letters: number;
} {
  const wordLengths = [4, 4, 5, 5, 8, 8, 9, 9];
  let maxCombo = 0;
  let maxPerfect = 0;
  let maxLetters = 0;

  for (let i = 0; i < STAGE3_TOTAL_ROUNDS; i++) {
    const len = wordLengths[i] ?? 0;
    const mult = isStage3FeverRound(i) ? STAGE3_FEVER_STAT_MULTIPLIER : 1;
    maxLetters += len * mult;
    maxPerfect += 1 * mult;
    const comboHitsThisRound = Math.max(0, len - 1);
    maxCombo += comboHitsThisRound * mult;
  }

  return { combo: maxCombo, perfect: maxPerfect, letters: maxLetters };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function weightedTotals(stats: Stage3RunStats): {
  combo: number;
  perfect: number;
  letters: number;
} {
  const f = STAGE3_FEVER_STAT_MULTIPLIER;
  const comboNormal = stats.comboHits - stats.comboHitsFever;
  const perfectNormal = stats.perfectCount - stats.perfectCountFever;
  const lettersNormal = stats.correctLetters - stats.correctLettersFever;

  return {
    combo: comboNormal + stats.comboHitsFever * f,
    perfect: perfectNormal + stats.perfectCountFever * f,
    letters: lettersNormal + stats.correctLettersFever * f,
  };
}

export function computeStage3FinalScore(stats: Stage3RunStats): Stage3FinalScoreResult {
  const caps = stage3TheoreticalWeightedCaps();
  const weighted = weightedTotals(stats);

  const comboNorm = caps.combo > 0 ? clamp(weighted.combo / caps.combo, 0, 1) : 0;
  const perfectNorm = caps.perfect > 0 ? clamp(weighted.perfect / caps.perfect, 0, 1) : 0;
  const letterNorm = caps.letters > 0 ? clamp(weighted.letters / caps.letters, 0, 1) : 0;

  const comboPoints = STAGE3_SCORE_WEIGHT_COMBO * comboNorm;
  const perfectPoints = STAGE3_SCORE_WEIGHT_PERFECT * perfectNorm;
  const letterPoints = STAGE3_SCORE_WEIGHT_LETTERS * letterNorm;

  const score100 = clamp(
    Math.round(comboPoints + perfectPoints + letterPoints),
    0,
    100,
  );

  return {
    score100,
    passed: score100 >= STAGE3_PASS_MIN_SCORE100,
    breakdown: {
      score100,
      comboPoints,
      perfectPoints,
      letterPoints,
      weightedCombo: weighted.combo,
      weightedPerfect: weighted.perfect,
      weightedLetters: weighted.letters,
      maxWeightedCombo: caps.combo,
      maxWeightedPerfect: caps.perfect,
      maxWeightedLetters: caps.letters,
    },
    stats: { ...stats },
  };
}
