'use client';

import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Row = {
  id: string;
  difficulty: string;
  question_text: string;
  options: string[];
  correct_index: number;
};

function letter(i: number): 'A' | 'B' | 'C' | 'D' {
  return (['A', 'B', 'C', 'D'][i] ?? 'A') as 'A' | 'B' | 'C' | 'D';
}

export function QuestionsInlineEditor({ initial }: { initial: Row[] }) {
  const [q, setQ] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const dd = difficulty.trim().toLowerCase();
    return initial.filter((r) => {
      if (dd && String(r.difficulty).toLowerCase() !== dd) return false;
      if (!qq) return true;
      const hay = `${r.question_text} ${r.options?.join(' ')}`.toLowerCase();
      return hay.includes(qq);
    });
  }, [initial, q, difficulty]);

  function lineOf(r: Row) {
    const opts = r.options ?? [];
    const a = opts[0] ?? '';
    const b = opts[1] ?? '';
    const c = opts[2] ?? '';
    const d = opts[3] ?? '';
    const ans = letter(r.correct_index);
  return `${r.question_text} ${a} ${b} ${c} ${d} Answer ${ans}`.replace(/\s+/g, ' ').trim();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜尋題幹/選項…"
          autoComplete="off"
          className="border-zinc-700 bg-zinc-950/60 text-zinc-100 placeholder:text-zinc-500"
        />
        <Input
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          placeholder="difficulty（選填：junior/college/professor）"
          autoComplete="off"
          className="border-zinc-700 bg-zinc-950/60 text-zinc-100 placeholder:text-zinc-500 md:max-w-xs"
        />
      </div>

      {message && (
        <p className={message.type === 'ok' ? 'text-sm text-emerald-400' : 'text-sm text-destructive'}>
          {message.text}
        </p>
      )}

      <div className="text-xs text-zinc-500">
        顯示 {filtered.length} / {initial.length} 題（僅提供可複製清單）
      </div>

      <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium text-zinc-200">可複製清單（依目前篩選）</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-zinc-600 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
            onClick={async () => {
              const text = filtered.map(lineOf).join('\n');
              try {
                await navigator.clipboard.writeText(text);
                setMessage({ type: 'ok', text: '已複製目前清單。' });
              } catch {
                setMessage({ type: 'err', text: '複製失敗（瀏覽器限制），請手動全選複製。' });
              }
            }}
            disabled={filtered.length === 0}
          >
            一鍵複製
          </Button>
        </div>
        <textarea
          readOnly
          value={filtered.map(lineOf).join('\n')}
          onFocus={(e) => e.currentTarget.select()}
          onClick={(e) => (e.currentTarget as HTMLTextAreaElement).select()}
          rows={Math.min(18, Math.max(6, filtered.length))}
          className="w-full resize-y rounded-md border border-zinc-800 bg-zinc-950/60 p-3 font-mono text-xs leading-relaxed text-zinc-100"
        />
        <p className="text-[11px] text-zinc-500">點一下會自動全選，方便直接 highlight copy。</p>
      </div>
    </div>
  );
}

