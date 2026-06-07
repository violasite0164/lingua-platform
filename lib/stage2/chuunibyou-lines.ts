/** Purple ninja lines when casting clone jutsu each round */
export const STAGE2_JUTSU_CAST_LINES = [
  'Shadow Clone Jutsu!',
  'Watch this—clone jutsu!',
  'Clone jutsu—go!',
  'Only the real one wins!',
  'Guess which clone is real?',
  'Fake words, real skill!',
  'Many me, one right spelling!',
  'Shadow clones—here!',
  'Pick the real spelling!',
  'One answer, many clones!',
  'Look closely before you pick!',
  'Behold—shadow clone!',
  'Tell the real clone apart!',
  'Eyes up—find the right word!',
  'Clones are out—which is true?',
  'Jutsu complete—your turn!',
  "Don't fall for the fake spellings!",
  'The real one hides in the crowd!',
] as const;

/** Fake hints: misdirection */
const FAKE_LEFT_LINES = [
  'Pick left—that one is the hint!',
  'Trust me, left is correct, go!',
  'Left! The timer waits for no one',
  'Hint: far left, believe me',
  "Don't read the word—pick left",
  'The spelling is fake—left is right',
  'Left side first, think later',
  'Left has the answer, hurry',
  "Can't you see? It's on the left",
  'Go left before time runs out',
] as const;

const FAKE_RIGHT_LINES = [
  'Pick right—that one is the hint!',
  'Right side is the way, go!',
  'Right! Hurry up',
  'Hint: far right, trust me',
  'The line below lies—pick right',
  'Right second from the end—that one',
  'Right is faster—just pick it',
  'Spelling trap—go right',
  'Timer is biting—right now',
  'Right pick or you lose',
] as const;

const FAKE_MIDDLE_LINES = [
  'Secret: the middle one, no doubt',
  'Middle-left, stop spacing out',
  'Middle-right is the hint, go',
  "Don't trust the spelling—middle",
  'Middle is the decoy—pick it anyway',
  'All others are smoke—middle',
  'Hint: middle, try it',
  'The word is lying—center wins',
] as const;

const FAKE_URGENT_LINES = [
  'Pick me—hint said once only!',
  'Hurry! Three seconds left!',
  'Pick fast—no time to think',
  "Don't hesitate—just tap",
  'Quick pick or you miss!',
  'I checked the left one already',
  'Pros always pick right',
  'Fast! The hint expires now',
] as const;

export const STAGE2_FAKE_HINT_LINES = [
  ...FAKE_LEFT_LINES,
  ...FAKE_RIGHT_LINES,
  ...FAKE_MIDDLE_LINES,
  ...FAKE_URGENT_LINES,
] as const;

const CORRECT_SELF_LINES = [
  'Pick me! This spelling is real',
  'Trust me—the word is right',
  "It's me—pick now",
  'Real hint this time—choose me',
  'Pick me! I am the answer',
  'The spelling is true—go',
  'Believe me once—pick me',
  'Correct answer is here—fast',
] as const;

const TRUTH_LEFT_LINES = [
  'Left one! For real this time',
  'Far left—not lying',
  'Hint: left—accurate',
  'Trust me, left is correct',
  'Left side—the word is real',
] as const;

const TRUTH_RIGHT_LINES = [
  'Right one! For real this time',
  'Far right—not lying',
  'Hint: right—accurate',
  'Trust me, right is correct',
  'Right side—the word is real',
] as const;

const TRUTH_MIDDLE_LINES = [
  'Middle one! For real this time',
  'Center—not lying',
  'Hint: middle—accurate',
  'Trust me, middle is correct',
  'Middle—the word is real',
] as const;

const TRUTH_SOLO_LINES = [
  'Pick fast—hint is true',
  'This one—the word is real',
  'Trust me—pick now',
] as const;

/** @deprecated */
export const STAGE2_CHUUNIBYOU_LINES = STAGE2_FAKE_HINT_LINES;

function hashSeed(seed: string): number {
  return Array.from(seed).reduce((acc, ch) => (acc * 33 + ch.charCodeAt(0)) >>> 0, 5381);
}

function pickFromPool(pool: readonly string[], seed: string, exclude?: string): string {
  const filtered = exclude ? pool.filter((line) => line !== exclude) : [...pool];
  const use = filtered.length > 0 ? filtered : [...pool];
  if (use.length === 0) return STAGE2_FAKE_HINT_LINES[0]!;
  if (seed) {
    return use[hashSeed(seed) % use.length]!;
  }
  return use[Math.floor(Math.random() * use.length)]!;
}

export type CloneHintPosition = 'solo' | 'left' | 'right' | 'middle';

export function getCloneHintPosition(cloneIndex: number, total: number): CloneHintPosition {
  if (total <= 1) return 'solo';
  if (cloneIndex === 0) return 'left';
  if (cloneIndex === total - 1) return 'right';
  return 'middle';
}

function truthPoolForPosition(pos: CloneHintPosition): readonly string[] {
  switch (pos) {
    case 'left':
      return TRUTH_LEFT_LINES;
    case 'right':
      return TRUTH_RIGHT_LINES;
    case 'middle':
      return TRUTH_MIDDLE_LINES;
    default:
      return TRUTH_SOLO_LINES;
  }
}

function fakePoolForPosition(pos: CloneHintPosition): readonly string[] {
  switch (pos) {
    case 'left':
      return FAKE_LEFT_LINES;
    case 'right':
      return FAKE_RIGHT_LINES;
    case 'middle':
      return FAKE_MIDDLE_LINES;
    default:
      return FAKE_URGENT_LINES;
  }
}

export function pickFakeHintLine(
  cloneIndex: number,
  totalClones: number,
  exclude?: string,
): string {
  const pos = getCloneHintPosition(cloneIndex, totalClones);
  return pickFromPool(fakePoolForPosition(pos), `${cloneIndex}-${totalClones}-fake`, exclude);
}

export function pickTruthfulHintLine(
  speakerIndex: number,
  correctIndex: number,
  totalClones: number,
  exclude?: string,
): string {
  if (speakerIndex === correctIndex) {
    return pickFromPool(CORRECT_SELF_LINES, `${speakerIndex}-self`, exclude);
  }
  const targetPos = getCloneHintPosition(correctIndex, totalClones);
  return pickFromPool(
    truthPoolForPosition(targetPos),
    `${speakerIndex}-to-${correctIndex}`,
    exclude,
  );
}

export function pickCloneTauntLine(args: {
  speakerIndex: number;
  correctIndex: number;
  totalClones: number;
  truthful: boolean;
  exclude?: string;
}): string {
  if (args.truthful) {
    return pickTruthfulHintLine(
      args.speakerIndex,
      args.correctIndex,
      args.totalClones,
      args.exclude,
    );
  }
  return pickFakeHintLine(args.speakerIndex, args.totalClones, args.exclude);
}

export function rollTauntWaveIsTruthful(truthChance: number): boolean {
  return Math.random() < truthChance;
}

/** @deprecated Use pickFakeHintLine */
export function pickChuunibyouLine(seed: string, exclude?: string): string {
  return pickFromPool(STAGE2_FAKE_HINT_LINES, seed, exclude);
}

export function pickRandomChuunibyouLine(exclude?: string): string {
  return pickFromPool(STAGE2_FAKE_HINT_LINES, '', exclude);
}

export function pickJutsuCastLine(roundIndex: number, exclude?: string): string {
  return pickFromPool(STAGE2_JUTSU_CAST_LINES, `jutsu-${roundIndex}`, exclude);
}

export function pickRandomTauntBatchSize(cloneCount: number): number {
  if (cloneCount <= 1) return 1;
  const options = [1, 2, 3].filter((n) => n <= cloneCount);
  return options[Math.floor(Math.random() * options.length)]!;
}

export function pickRandomCloneIndices(cloneCount: number, batchSize: number): number[] {
  const indices = Array.from({ length: cloneCount }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j]!, indices[i]!];
  }
  return indices.slice(0, batchSize);
}

export function pickTauntSpeakerIndices(
  cloneCount: number,
  batchSize: number,
  correctIndex: number,
  forceIncludeCorrect: boolean,
): number[] {
  let indices = pickRandomCloneIndices(cloneCount, batchSize);
  if (forceIncludeCorrect && !indices.includes(correctIndex)) {
    if (indices.length >= batchSize) {
      indices[Math.floor(Math.random() * indices.length)] = correctIndex;
    } else {
      indices = [...indices, correctIndex];
    }
    indices = [...new Set(indices)].slice(0, batchSize);
  }
  return indices;
}
