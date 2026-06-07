/** Fisher–Yates shuffle (in-place copy) */
export function shuffleArray<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function swapAdjacentLetters(w: string): string | null {
  if (w.length < 2) return null;
  const i = Math.floor(Math.random() * (w.length - 1));
  const chars = w.split('');
  [chars[i], chars[i + 1]] = [chars[i + 1]!, chars[i]!];
  return chars.join('');
}

function omitLetter(w: string): string | null {
  if (w.length < 3) return null;
  const i = Math.floor(Math.random() * w.length);
  return w.slice(0, i) + w.slice(i + 1);
}

function doubleLetter(w: string): string | null {
  const i = Math.floor(Math.random() * w.length);
  return w.slice(0, i) + w[i] + w.slice(i);
}

function replaceVowel(w: string): string | null {
  const vowels = 'aeiou';
  const idx = [...w].findIndex((c) => vowels.includes(c));
  if (idx < 0) return null;
  const alt = vowels.replace(w[idx]!, '') || 'a';
  const pick = alt[Math.floor(Math.random() * alt.length)]!;
  return w.slice(0, idx) + pick + w.slice(idx + 1);
}

function dropSilentE(w: string): string | null {
  if (w.endsWith('e') && w.length > 3) return w.slice(0, -1);
  return null;
}

const MUTATORS = [swapAdjacentLetters, omitLetter, doubleLetter, replaceVowel, dropSilentE];

/**
 * 產生與正確拼字不同、且彼此不重複的錯誤拼字。
 */
export function generateWrongSpellings(correct: string, count: number): string[] {
  const normalized = correct.trim().toLowerCase();
  const used = new Set<string>([normalized]);
  const out: string[] = [];
  let guard = 0;

  while (out.length < count && guard < count * 40) {
    guard += 1;
    const mutator = MUTATORS[Math.floor(Math.random() * MUTATORS.length)]!;
    let candidate = mutator(normalized);
    if (!candidate || candidate === normalized || used.has(candidate)) {
      const suffix = String.fromCharCode(97 + (out.length % 26));
      candidate = normalized + suffix;
    }
    if (used.has(candidate)) continue;
    used.add(candidate);
    out.push(candidate);
  }

  while (out.length < count) {
    const filler = `${normalized}x${out.length + 1}`;
    if (!used.has(filler)) {
      used.add(filler);
      out.push(filler);
    }
  }

  return out;
}
