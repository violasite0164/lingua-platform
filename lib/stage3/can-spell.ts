/** 單詞是否僅由字母池內字母拼成（字母可重複使用） */
export function canSpellWithLetterPool(word: string, letterPool: string): boolean {
  const allowed = new Set(letterPool.toLowerCase());
  for (const ch of word.toLowerCase()) {
    if (!allowed.has(ch)) return false;
  }
  return true;
}

export function mergeLetterPools(a: string, b: string): string {
  return [...new Set(`${a}${b}`.toLowerCase().split(''))].sort().join('');
}

/** 下一個待輸入字元（已打完則 undefined） */
export function nextExpectedLetter(targetWord: string, typedLength: number): string | undefined {
  return targetWord[typedLength]?.toLowerCase();
}

/** 該字是否可用本回合操作鍵拼出（Boy/Girl 四鍵 + Boss 空白鍵） */
export function canTypeWordWithControls(
  word: string,
  opts: {
    inputSide: 'boy' | 'girl' | 'both';
    boyLetters: string;
    girlLetters: string;
    bonusLetter: string;
  },
): boolean {
  const bonus = opts.bonusLetter.toLowerCase().slice(0, 1);
  const boy = new Set(opts.boyLetters.toLowerCase().split(''));
  const girl = new Set(opts.girlLetters.toLowerCase().split(''));

  for (const ch of word.toLowerCase()) {
    if (opts.inputSide === 'boy') {
      if (!boy.has(ch) && ch !== bonus) return false;
    } else if (opts.inputSide === 'girl') {
      if (!girl.has(ch) && ch !== bonus) return false;
    } else if (!boy.has(ch) && !girl.has(ch) && ch !== bonus) {
      return false;
    }
  }
  return true;
}
