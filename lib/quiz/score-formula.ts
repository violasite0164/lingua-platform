/**
 * 英語測驗總分（滿分 100）
 * - 答對率佔 65 分
 * - 作答速度佔 35 分（平均每題秒數愈短愈高分）
 */

export type Stage3QuizScoreDetails = {
  comboPoints: number;
  perfectPoints: number;
  letterPoints: number;
  comboHits: number;
  perfectCount: number;
  correctLetters: number;
  maxCombo: number;
  feverMultiplier: number;
};

export type QuizScoreBreakdown = {
  score100: number;
  /** 答對率得分，最高 65 */
  accuracyPoints: number;
  /** 速度得分，最高 35 */
  speedPoints: number;
  /** 速度係數 0~1 */
  speedFactor: number;
  /** 平均每題作答秒數（秒） */
  avgSecondsPerQuestion: number;
  /** Stage 3 迪斯可專用計分細項 */
  stage3?: Stage3QuizScoreDetails;
};

const ACCURACY_MAX = 65;
const SPEED_MAX = 35;
/** 平均而言「很快」的秒數／題 → 速度滿分 */
const FAST_SEC_PER_Q = 5;
/** 平均而言「很慢」的秒數／題 → 速度 0 分 */
const SLOW_SEC_PER_Q = 55;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * 結算時答對題數（避免最後一題 state 尚未同步導致過關判定錯誤）。
 */
export function resolveQuizCorrectCountForFinish(input: {
  starsCorrect: boolean[];
  correctTotal: number;
  cursor: number;
  picked: number | null;
  correctIndex: number;
}): number {
  const { starsCorrect, correctTotal, cursor, picked, correctIndex } = input;
  let count = Math.max(correctTotal, starsCorrect.filter(Boolean).length);
  const lastIsCorrect =
    picked !== null &&
    picked === correctIndex &&
    cursor >= 0 &&
    cursor < starsCorrect.length &&
    !starsCorrect[cursor];
  if (lastIsCorrect) count += 1;
  return count;
}

/**
 * @param correctCount 答對題數
 * @param totalQuestions 總題數
 * @param totalAnswerSeconds 各題「看到題目 → 選擇答案」秒數加總
 */
export function computeQuizScore100(
  correctCount: number,
  totalQuestions: number,
  totalAnswerSeconds: number,
): QuizScoreBreakdown {
  if (totalQuestions < 1 || correctCount < 0 || correctCount > totalQuestions) {
    return {
      score100: 0,
      accuracyPoints: 0,
      speedPoints: 0,
      speedFactor: 0,
      avgSecondsPerQuestion: 0,
    };
  }

  const ratio = correctCount / totalQuestions;
  const accuracyPoints = ACCURACY_MAX * ratio;

  const avgSecondsPerQuestion = totalAnswerSeconds / totalQuestions;
  const speedFactor = clamp(
    (SLOW_SEC_PER_Q - avgSecondsPerQuestion) / (SLOW_SEC_PER_Q - FAST_SEC_PER_Q),
    0,
    1,
  );
  const speedPoints = SPEED_MAX * speedFactor;

  const score100 = clamp(Math.round(accuracyPoints + speedPoints), 0, 100);

  return {
    score100,
    accuracyPoints,
    speedPoints,
    speedFactor,
    avgSecondsPerQuestion,
  };
}

/** 作答進行中：依已作答題目即時估算總分（滿分 100） */
export function computeLiveQuizScore100(
  correctCount: number,
  totalQuestions: number,
  questionAnswerSeconds: readonly (number | undefined)[],
): number {
  if (totalQuestions < 1 || correctCount < 0) return 0;

  let answered = 0;
  let totalAnswerSeconds = 0;
  for (let i = 0; i < totalQuestions; i++) {
    const t = questionAnswerSeconds[i];
    if (typeof t !== 'number' || !Number.isFinite(t)) continue;
    answered++;
    totalAnswerSeconds += clamp(t, 0.25, 180);
  }

  if (answered === 0) return 0;
  return computeQuizScore100(correctCount, answered, totalAnswerSeconds).score100;
}

/** Server Action 用：防作弊的作答總秒數合理範圍 */
export function isPlausibleTotalAnswerTime(
  totalQuestions: number,
  totalAnswerSeconds: number,
): boolean {
  if (totalQuestions < 1) return false;
  const minSec = totalQuestions * 0.25;
  const maxSec = totalQuestions * 180;
  return totalAnswerSeconds >= minSec && totalAnswerSeconds <= maxSec;
}
