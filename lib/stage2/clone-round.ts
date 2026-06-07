import { generateWrongSpellings, shuffleArray } from '@/lib/stage2/wrong-spellings';

export type CloneOption = {
  id: string;
  label: string;
  isCorrect: boolean;
};

export function buildCloneOptionsForRound(
  roundIndex: number,
  correctWord: string,
  cloneCount: number,
): CloneOption[] {
  const wrongs = generateWrongSpellings(correctWord, cloneCount - 1);
  const correctSlot = Math.floor(Math.random() * cloneCount);
  const options: CloneOption[] = [];
  let wrongIdx = 0;

  for (let i = 0; i < cloneCount; i++) {
    if (i === correctSlot) {
      options.push({
        id: `r${roundIndex}-c${i}`,
        label: correctWord,
        isCorrect: true,
      });
    } else {
      options.push({
        id: `r${roundIndex}-c${i}`,
        label: wrongs[wrongIdx]!,
        isCorrect: false,
      });
      wrongIdx += 1;
    }
  }

  return shuffleArray(options);
}
