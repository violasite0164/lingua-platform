import Link from 'next/link';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { createAdminClient } from '@/lib/supabase/server';
import { QuestionAnswerTool } from '@/components/admin/question-answer-tool';
import type { QuizDifficultyLevel } from '@/types/database.types';

export const metadata = {
  title: '題庫答案修正',
};

type SearchParams = {
  q?: string;
  difficulty?: string;
  dup?: string;
};

function clampDifficulty(raw: string | undefined): QuizDifficultyLevel | undefined {
  if (!raw) return undefined;
  const s = raw.trim().toLowerCase();
  if (s === 'elementary' || s === 'junior' || s === 'college' || s === 'professor')
    return s as QuizDifficultyLevel;
  return undefined;
}

export default async function AdminQuestionsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const q = (sp.q ?? '').trim();
  const difficulty = clampDifficulty(sp.difficulty);
  const showDup = String(sp.dup ?? '').trim() === '1';

  const supabase = await createAdminClient();
  let rows: any[] = [];

  const normalizeKey = (s: string) =>
    String(s ?? '')
      .toLowerCase()
      .replace(/[\u00a0\u3000]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  if (showDup) {
    // 全庫找「題幹重複」：先抓一批（上限 5000），再用 JS 分組
    // 若題庫極大，之後可再做分頁或改成 DB view/rpc。
    let query = supabase
      .from('questions')
      .select('id,difficulty,question_text,options,correct_index,correct_answer_old,explanation,created_at')
      .order('created_at', { ascending: false })
      .limit(5000);

    if (difficulty) query = query.eq('difficulty', difficulty);

    const { data, error } = await query;
    const list = !error && data ? (data as any[]) : [];
    const groups = new Map<string, any[]>();
    for (const r of list) {
      const key = normalizeKey(r.question_text);
      const arr = groups.get(key) ?? [];
      arr.push(r);
      groups.set(key, arr);
    }
    rows = [];
    for (const arr of groups.values()) {
      if (arr.length >= 2) rows.push(...arr);
    }
  } else if (q) {
    let query = supabase
      .from('questions')
      .select('id,difficulty,question_text,options,correct_index,correct_answer_old,explanation,created_at')
      .ilike('question_text', `%${q}%`)
      .order('created_at', { ascending: false })
      .limit(25);

    if (difficulty) query = query.eq('difficulty', difficulty);

    const { data, error } = await query;
    if (!error && data) rows = data as any[];
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">題庫答案修正</h1>
        <p className="mt-1 text-sm text-zinc-400">
          可用關鍵字搜尋（最多顯示 25 筆），或直接一鍵列出「題幹重複」的題目，然後改答案/刪除。
        </p>
      </div>

      <Card className="border-zinc-800 bg-zinc-900/80">
        <CardHeader>
          <CardTitle className="text-zinc-100">搜尋 / 重複題</CardTitle>
          <CardDescription className="text-zinc-400">
            建議輸入題幹的一小段（例如 <code className="rounded bg-zinc-800 px-1 text-xs">married ___</code> 或{' '}
            <code className="rounded bg-zinc-800 px-1 text-xs">cut the paper</code>）。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3 md:flex-row md:items-center">
            <Input
              name="q"
              defaultValue={q}
              placeholder="輸入題幹關鍵字…"
              autoComplete="off"
              className="border-zinc-700 bg-zinc-950/60 text-zinc-100 placeholder:text-zinc-500"
            />
            <Input
              name="difficulty"
              defaultValue={difficulty ?? ''}
              placeholder="difficulty（選填：elementary/junior/college/professor）"
              autoComplete="off"
              className="border-zinc-700 bg-zinc-950/60 text-zinc-100 placeholder:text-zinc-500 md:max-w-xs"
            />
            <Button type="submit" className="md:shrink-0">
              搜尋
            </Button>
            <Button
              type="submit"
              name="dup"
              value="1"
              variant="secondary"
              className="md:shrink-0"
            >
              顯示重複題
            </Button>
          </form>

          <div className="mt-3 text-xs text-zinc-500">
            也可以回 <Link href="/admin" className="text-zinc-300 underline">概覽</Link>。
          </div>
        </CardContent>
      </Card>

      {q || showDup ? (
        <QuestionAnswerTool initialQuestions={rows as any} />
      ) : (
        <p className="text-sm text-zinc-500">可直接按「顯示重複題」，或先用關鍵字搜尋。</p>
      )}
    </div>
  );
}

