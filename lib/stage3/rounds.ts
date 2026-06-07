import { STAGE3_TOTAL_ROUNDS } from '@/lib/stage3/constants';
import { buildStage3KeyLayout, type Stage3KeyLayout } from '@/lib/stage3/key-layout';
import { pickStage3Word, type Stage3WordLength } from '@/lib/stage3/vocabulary';

export type Stage3InputSide = 'boy' | 'girl' | 'both';

export type Stage3InputMode = 'boy' | 'girl' | 'boy-boss' | 'girl-boss' | 'both' | 'all';

export type Stage3RoundSpec = {
  roundIndex: number;
  inputMode: Stage3InputMode;
  word: string;
  keyLayout: Stage3KeyLayout;
};

export type Stage3Session = {
  rounds: Stage3RoundSpec[];
};

const ROUND_LAYOUT: Array<{ inputMode: Stage3InputMode; wordLength: Stage3WordLength }> = [
  { inputMode: 'boy', wordLength: 4 },
  { inputMode: 'girl', wordLength: 4 },
  { inputMode: 'boy-boss', wordLength: 5 },
  { inputMode: 'girl-boss', wordLength: 5 },
  { inputMode: 'both', wordLength: 8 },
  { inputMode: 'both', wordLength: 8 },
  { inputMode: 'all', wordLength: 9 },
  { inputMode: 'all', wordLength: 9 },
];

export function buildStage3Session(): Stage3Session {
  const used = new Set<string>();
  const rounds: Stage3RoundSpec[] = [];

  for (let i = 0; i < STAGE3_TOTAL_ROUNDS; i++) {
    const layout = ROUND_LAYOUT[i]!;
    const word = pickStage3Word(layout.wordLength, used);
    used.add(word);

    rounds.push({
      roundIndex: i,
      inputMode: layout.inputMode,
      word,
      keyLayout: buildStage3KeyLayout(word, layout.inputMode),
    });
  }

  return { rounds };
}
