'use server';

import { createClient } from '@/lib/supabase/server';
import { ELEMENTARY_WORDS_300 } from '@/lib/stage2/elementary-words-300';
import { ELEMENTARY_WORD_MEANINGS_ZH } from '@/lib/stage2/elementary-word-meanings';
import { JUNIOR_NOUNS_100 } from '@/lib/stage2/junior-nouns-100';
import { JUNIOR_NOUN_MEANINGS_ZH } from '@/lib/stage2/junior-noun-meanings';
import { STAGE2_MIN_WORD_LENGTH, STAGE2_TOTAL_ROUNDS } from '@/lib/stage2/constants';
import type { Stage2SessionWord } from '@/lib/stage2/session-word';
import { resolveStage2VocabGrade } from '@/lib/stage2/vocab-grade';
import { shuffleArray } from '@/lib/stage2/wrong-spellings';

export type FetchStage2WordsResult =
  | { ok: true; words: Stage2SessionWord[] }
  | { ok: false; message: string };

function isValidStage2Word(w: string): boolean {
  return w.length >= STAGE2_MIN_WORD_LENGTH && /^[a-z]+$/.test(w);
}

const STAGE2_VOCABULARY_MEANINGS_ZH: Record<string, string> = {
  ...ELEMENTARY_WORD_MEANINGS_ZH,
  ...JUNIOR_NOUN_MEANINGS_ZH,
};

const STAGE2_FALLBACK_WORDS = [...ELEMENTARY_WORDS_300, ...JUNIOR_NOUNS_100];

function toSessionWord(
  word: string,
  meaningZh?: string | null,
  gradeLevel?: string | null,
): Stage2SessionWord {
  const trimmed = word.trim().toLowerCase();
  const fromDb = meaningZh?.trim();
  const fromMap = STAGE2_VOCABULARY_MEANINGS_ZH[trimmed];
  const meaning = fromDb || fromMap;
  return {
    word: trimmed,
    meaningZh: meaning ? meaning : null,
    vocabGrade: resolveStage2VocabGrade(trimmed, gradeLevel),
  };
}

function pickFromFallback(count: number): Stage2SessionWord[] {
  const pool = STAGE2_FALLBACK_WORDS.filter(isValidStage2Word);
  return shuffleArray([...pool]).slice(0, count).map((word) => toSessionWord(word));
}

function dedupeSessionWords(entries: Stage2SessionWord[]): Stage2SessionWord[] {
  const seen = new Set<string>();
  const out: Stage2SessionWord[] = [];
  for (const entry of entries) {
    if (seen.has(entry.word)) continue;
    seen.add(entry.word);
    out.push(entry);
  }
  return out;
}

/** 抽取本局 10 個不重複生字（優先資料庫 elementary + junior，否則內建 400 詞） */
export async function fetchStage2SessionWords(
  playSessionId: string,
): Promise<FetchStage2WordsResult> {
  const { assertGamePlaySession } = await import('@/lib/game/play-session-actions');
  const sessionCheck = await assertGamePlaySession(playSessionId, 'junior');
  if (!sessionCheck.ok) {
    return { ok: false, message: sessionCheck.message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: '請先登入後再玩 Stage 2。' };
  }

  const { data, error } = await supabase
    .from('vocabulary_words')
    .select('word, meaning_zh, grade_level')
    .in('grade_level', ['elementary', 'junior']);

  if (error) {
    console.warn('[fetchStage2SessionWords] DB fallback:', error.message);
    return { ok: true, words: pickFromFallback(STAGE2_TOTAL_ROUNDS) };
  }

  const pool = dedupeSessionWords(
    (data ?? [])
      .map((r) => {
        const word = r.word?.trim().toLowerCase();
        if (!word || !isValidStage2Word(word)) return null;
        return toSessionWord(word, r.meaning_zh, r.grade_level);
      })
      .filter((w): w is Stage2SessionWord => w !== null),
  );

  if (pool.length < STAGE2_TOTAL_ROUNDS) {
    const merged = dedupeSessionWords([
      ...pool,
      ...STAGE2_FALLBACK_WORDS.filter(isValidStage2Word).map((word) =>
        toSessionWord(word, STAGE2_VOCABULARY_MEANINGS_ZH[word]),
      ),
    ]);
    return { ok: true, words: shuffleArray(merged).slice(0, STAGE2_TOTAL_ROUNDS) };
  }

  return { ok: true, words: shuffleArray(pool).slice(0, STAGE2_TOTAL_ROUNDS) };
}
