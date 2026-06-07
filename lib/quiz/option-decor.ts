/** 從選項文字猜測裝飾用 emoji（無題目圖片時使用） */
const KEYWORD_EMOJI: [RegExp, string][] = [
  [/\bfox\b|狐狸/i, '🦊'],
  [/\blion\b|獅子/i, '🦁'],
  [/\brabbit\b|bunny|兔子/i, '🐰'],
  [/\belephant\b|大象/i, '🐘'],
  [/\bcat\b|貓/i, '🐱'],
  [/\bdog\b|狗/i, '🐶'],
  [/\bbird\b|鳥/i, '🐦'],
  [/\bfish\b|魚/i, '🐟'],
  [/\bbear\b|熊/i, '🐻'],
  [/\bmonkey\b|猴子/i, '🐵'],
  [/\bpanda\b|熊貓/i, '🐼'],
  [/\btiger\b|老虎/i, '🐯'],
  [/\bhorse\b|馬/i, '🐴'],
  [/\bcow\b|牛/i, '🐮'],
  [/\bpig\b|豬/i, '🐷'],
  [/\bapple\b|蘋果/i, '🍎'],
  [/\bbook\b|書/i, '📚'],
  [/\bschool\b|學校/i, '🏫'],
  [/\bsun\b|太陽/i, '☀️'],
];

export function emojiForOptionText(text: string): string | null {
  const t = text.trim();
  if (!t) return null;
  for (const [re, emoji] of KEYWORD_EMOJI) {
    if (re.test(t)) return emoji;
  }
  return null;
}

export function guessQuestionIllustrationEmoji(
  questionText: string,
  options: readonly string[],
): string {
  const fromQ = emojiForOptionText(questionText);
  if (fromQ) return fromQ;
  for (const opt of options) {
    const e = emojiForOptionText(opt);
    if (e) return e;
  }
  return '✨';
}
