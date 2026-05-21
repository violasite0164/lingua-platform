import type { QuizDifficultyLevel } from '@/types/database.types';
import type { QuizQuestionPayload } from '@/lib/quiz/types';

/** 去掉前後空白、NBSP／全形空白，並把連續空白壓成單一空格（題幹／選項顯示用） */
function normalizeInlineWhitespace(text: string): string {
  // 題庫文字可能含 NBSP、全形空白、零寬空白/連字等；先做一次「可見化」處理
  const cleaned = text
    .replace(/\u00a0/g, ' ')
    .replace(/[\u2000-\u200f\u202f\u205f\u3000\uFEFF]/g, ' ')
    // 零寬字元直接移除（不應變成空格）
    .replace(/[\u200b\u2060\u180e]/g, '');
  return cleaned
    .replace(
      /^[\s\u00a0\u2000-\u200f\u202f\u205f\u3000\uFEFF]+|[\s\u00a0\u2000-\u200f\u202f\u205f\u3000\uFEFF]+$/g,
      '',
    )
    .replace(/\s+/g, ' ');
}

/** 題庫文字常已含「A. xxx」；UI 左側另有 A–D 徽章，顯示時可去掉重複前綴 */
export function stripChoiceLetterPrefix(text: string): string {
  let s = text;
  // 反覆剝掉前綴，避免「 /  A. xxx」這類疊加
  for (let i = 0; i < 6; i++) {
    const next = s
      // 1) A. / B) / D．（最常見）
      .replace(/^\s*[A-Da-d][\.\)\uff0e]\s*/u, '')
      // 2) 題庫/匯入資料偶爾會出現其他字母前綴（例如：p. / b) / g．）
      .replace(/^\s*[A-Za-z][\.\)\uff0e]\s*/u, '')
      // 3) bullet / 分隔符（例如：- xxx / • xxx / / xxx）
      .replace(/^\s*[-–—•\u2022\/]+\s*/u, '');
    if (next === s) break;
    s = next;
  }
  return normalizeInlineWhitespace(s);
}

/**
 * 題庫有時會在題幹前加題號（例如：`3. ...` / `4) ...` / `三、...`）。
 * UI 已經有「第 N 題」資訊，因此顯示時可去掉這類前綴。
 *
 * 變更規則時請同步跑 `python3 supabase/audit_question_bank.py`（DISPLAY_STRIP 與此函式對齊）。
 */
export function stripQuestionNumberPrefix(text: string): string {
  let s = normalizeInlineWhitespace(text);
  // 反覆剝掉題號前綴，避免「（四） 四、...」這類疊加或混用格式
  for (let i = 0; i < 6; i++) {
    const next = s
      // 0) 【四】 / [四] / 【4】 這類括號題號
      .replace(
        /^\s*[【\[]\s*(?:\d+|[一二三四五六七八九十]+)\s*[】\]]\s*/u,
        '',
      )
      // 1) 3. / 3) / 3、 / 3． / 3: / 3：
      //    標點必填：若允許「只有數字+空白」會誤傷「12 minus 5…」這類數學題幹。
      //    亦不將 ASCII／長橫線視為題號標點，避免吃掉「12 - 5」。
      .replace(/^\s*\d+\s*[\.)\uff0e\u3001:：]\s*/u, '')
    // 2) (3) / （3）
      .replace(/^\s*[\(\uff08]\s*\d+\s*[\)\uff09]\s*/u, '')
      // 3) 三、 / 四. / 四 / 四題 / 四)（後面可能只有空格或沒有標點）
      .replace(
        /^\s*[一二三四五六七八九十]+\s*(?:題\s*)?(?:[\.\)\uff0e\u3001:：\-–—])?\s*/u,
        '',
      )
      // 4) 第三題 / 第四題
      .replace(/^\s*第\s*[一二三四五六七八九十]+\s*題\s*/u, '');
    if (next === s) break;
    s = next;
  }

  const out = normalizeInlineWhitespace(s);
  return out.length > 0 ? out : normalizeInlineWhitespace(text);
}

function normalizeOptionsRaw(raw: unknown): [string, string, string, string] | null {
  if (Array.isArray(raw) && raw.length === 4) {
    const parts = raw.map((x) => (typeof x === 'string' ? x : String(x ?? '')));
    return [parts[0]!, parts[1]!, parts[2]!, parts[3]!];
  }
  /** JSON 有時以物件 {"0":"…","1":"…"} 存四選項 */
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    const out: string[] = [];
    for (let i = 0; i < 4; i++) {
      const v = o[String(i)] ?? (o as Record<number, unknown>)[i];
      if (v === undefined) return null;
      out.push(typeof v === 'string' ? v : String(v ?? ''));
    }
    return [out[0]!, out[1]!, out[2]!, out[3]!];
  }
  return null;
}

/** PostgREST／JSON 有時會把 smallint 當字串；統一成 0–3 整數 */
function normalizeCorrectIndexRaw(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > 3) return null;
  return n;
}

export function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/**
 * 隨機打亂四選項順序，並同步更新 correct_index。
 * 注意：options 常已帶「A. ...」字首；打亂後字首會失真，因此這裡也一併去掉字首。
 */
export function shuffleQuestionOptions(q: QuizQuestionPayload): QuizQuestionPayload {
  const baseOptions = q.options.map(stripChoiceLetterPrefix) as [
    string,
    string,
    string,
    string,
  ];

  const idxs: [number, number, number, number] = [0, 1, 2, 3];
  const shuffledIdxs = shuffle(idxs) as [number, number, number, number];
  const newOptions = shuffledIdxs.map((i) => baseOptions[i]!) as [
    string,
    string,
    string,
    string,
  ];
  const newCorrectIndex = shuffledIdxs.indexOf(q.correct_index);
  return {
    ...q,
    options: newOptions,
    correct_index: newCorrectIndex,
  };
}

export function toPayload(row: {
  id: string;
  difficulty: QuizDifficultyLevel;
  question_text: string;
  options: unknown;
  correct_index: unknown;
  explanation: string;
}): QuizQuestionPayload | null {
  const opts = normalizeOptionsRaw(row.options);
  const ci = normalizeCorrectIndexRaw(row.correct_index);
  if (!opts || ci === null) return null;

  // 題庫可能存在「表面上四選項，但某些選項其實是空白 / 只有不可見字元」的髒資料；
  // 若不在這裡擋掉，UI 會出現空白選項按鈕。
  const normQ = normalizeInlineWhitespace(row.question_text ?? '');
  const normOpts = opts.map(normalizeInlineWhitespace) as [
    string,
    string,
    string,
    string,
  ];
  if (!normQ) return null;
  if (normOpts.some((s) => !s)) return null;

  return {
    id: row.id,
    difficulty: row.difficulty,
    question_text: normQ,
    options: normOpts,
    correct_index: ci,
    explanation: row.explanation,
  };
}
