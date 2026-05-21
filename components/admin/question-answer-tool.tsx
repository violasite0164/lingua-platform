'use client';

import { useMemo, useState, useTransition } from 'react';

import {
  bulkDeleteQuestions,
  deleteQuestion,
  updateQuestionAnswer,
  type BulkDeleteQuestionsResult,
  type DeleteQuestionResult,
  type UpdateQuestionAnswerResult,
} from '@/lib/admin/questions-actions';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type QuestionRow = {
  id: string;
  difficulty: string;
  question_text: string;
  options: string[];
  correct_index: number;
  correct_answer_old: string;
  explanation: string;
  created_at?: string | null;
};

type Props = {
  initialQuestions: QuestionRow[];
};

function labelForIndex(i: number): string {
  return ['A', 'B', 'C', 'D'][i] ?? '?';
}

export function QuestionAnswerTool({ initialQuestions }: Props) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [saved, setSaved] = useState<
    Record<string, { correct_index: number; correct_answer_old: string }>
  >({});
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [questions, setQuestions] = useState<QuestionRow[]>(() => initialQuestions);

  const visibleQuestions = useMemo(
    () => questions.filter((q) => !deletedIds.has(q.id)),
    [questions, deletedIds],
  );

  const listQuestions = visibleQuestions;

  const normalizeKey = (s: string) =>
    String(s ?? '')
      .toLowerCase()
      .replace(/[\u00a0\u3000]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const duplicateDeletePlan = useMemo(() => {
    // key -> rows
    const groups = new Map<string, QuestionRow[]>();
    for (const q of listQuestions) {
      const key = normalizeKey(q.question_text);
      const arr = groups.get(key) ?? [];
      arr.push(q);
      groups.set(key, arr);
    }

    const toDelete: string[] = [];
    let groupsCount = 0;
    for (const arr of groups.values()) {
      if (arr.length < 2) continue;
      groupsCount += 1;
      // 保留最新 created_at（沒有 created_at 的視為最舊）
      const sorted = [...arr].sort((a, b) => {
        const ta = a.created_at ? Date.parse(a.created_at) : 0;
        const tb = b.created_at ? Date.parse(b.created_at) : 0;
        return tb - ta;
      });
      for (let i = 1; i < sorted.length; i++) toDelete.push(sorted[i]!.id);
    }

    return { groupsCount, toDelete };
  }, [listQuestions]);

  function getSelectedIndex(q: QuestionRow): number {
    return draft[q.id] ?? saved[q.id]?.correct_index ?? q.correct_index;
  }

  function setSelectedIndex(q: QuestionRow, idx: number) {
    setDraft((d) => ({ ...d, [q.id]: idx }));
  }

  function hasChanged(q: QuestionRow) {
    const base = saved[q.id]?.correct_index ?? q.correct_index;
    return (draft[q.id] ?? base) !== base;
  }

  function saveOne(q: QuestionRow) {
    setMessage(null);
    const idx = getSelectedIndex(q);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set('id', q.id);
        fd.set('correct_index', String(idx));
        const res: UpdateQuestionAnswerResult = await updateQuestionAnswer(fd);
        if (res.ok) {
          setSaved((prev) => ({
            ...prev,
            [res.id]: {
              correct_index: res.correct_index,
              correct_answer_old: res.correct_answer_old,
            },
          }));
          setMessage({
            type: 'ok',
            text: `已更新：${q.question_text.slice(0, 40)}… → ${labelForIndex(idx)}`,
          });
          setDraft((d) => {
            const next = { ...d };
            delete next[q.id];
            return next;
          });
        } else {
          setMessage({ type: 'err', text: res.error });
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setMessage({ type: 'err', text: msg || '更新失敗（未知錯誤）' });
      }
    });
  }

  function deleteOne(q: QuestionRow) {
    setMessage(null);
    const ok = window.confirm(
      `確定要刪除這一題？\n\n${q.question_text}\n\n（此操作不可還原）`,
    );
    if (!ok) return;

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set('id', q.id);
        const res: DeleteQuestionResult = await deleteQuestion(fd);
        if (res.ok) {
          setDeletedIds((prev) => {
            const next = new Set(prev);
            next.add(res.id);
            return next;
          });
          setMessage({ type: 'ok', text: `已刪除：${q.question_text.slice(0, 40)}…` });
        } else {
          setMessage({ type: 'err', text: res.error });
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setMessage({ type: 'err', text: msg || '刪除失敗（未知錯誤）' });
      }
    });
  }

  function toggleSelected(id: string, next: boolean) {
    setSelectedIds((prev) => {
      const s = new Set(prev);
      if (next) s.add(id);
      else s.delete(id);
      return s;
    });
  }

  function selectAllVisible() {
    setSelectedIds((prev) => {
      const s = new Set(prev);
      for (const q of listQuestions) s.add(q.id);
      return s;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  const selectedCount = useMemo(() => {
    let n = 0;
    for (const q of listQuestions) {
      if (selectedIds.has(q.id)) n += 1;
    }
    return n;
  }, [listQuestions, selectedIds]);

  function bulkDeleteSelected() {
    setMessage(null);
    const ids = listQuestions.filter((q) => selectedIds.has(q.id)).map((q) => q.id);
    if (!ids.length) {
      setMessage({ type: 'err', text: '未選取任何題目。' });
      return;
    }
    const ok = window.confirm(
      `確定要刪除已勾選的題目？\n\n- 將刪除：${ids.length} 題\n\n（此操作不可還原）`,
    );
    if (!ok) return;

    startTransition(async () => {
      try {
        const res: BulkDeleteQuestionsResult = await bulkDeleteQuestions(ids);
        if (res.ok) {
          setDeletedIds((prev) => {
            const next = new Set(prev);
            for (const id of res.deleted) next.add(id);
            return next;
          });
          setSelectedIds((prev) => {
            const next = new Set(prev);
            for (const id of res.deleted) next.delete(id);
            return next;
          });
          setMessage({ type: 'ok', text: `已刪除 ${res.deleted.length} 題（勾選）。` });
        } else {
          setMessage({ type: 'err', text: res.error });
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setMessage({ type: 'err', text: msg || '刪除失敗（未知錯誤）' });
      }
    });
  }

  function bulkDeleteDuplicates() {
    setMessage(null);
    const { groupsCount, toDelete } = duplicateDeletePlan;
    if (toDelete.length === 0) {
      setMessage({ type: 'err', text: '目前清單未找到重複題（同題幹 ≥ 2）。' });
      return;
    }
    const ok = window.confirm(
      `確定要一鍵刪除重複題？\n\n- 重複群組：${groupsCount}\n- 將刪除：${toDelete.length} 題\n- 每組只保留最新（created_at 最大）的一題\n\n（此操作不可還原）`,
    );
    if (!ok) return;

    startTransition(async () => {
      try {
        const res: BulkDeleteQuestionsResult = await bulkDeleteQuestions(toDelete);
        if (res.ok) {
          setDeletedIds((prev) => {
            const next = new Set(prev);
            for (const id of res.deleted) next.add(id);
            return next;
          });
          setSelectedIds((prev) => {
            const next = new Set(prev);
            for (const id of res.deleted) next.delete(id);
            return next;
          });
          setMessage({ type: 'ok', text: `已刪除 ${res.deleted.length} 題重複題。` });
        } else {
          setMessage({ type: 'err', text: res.error });
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setMessage({ type: 'err', text: msg || '刪除失敗（未知錯誤）' });
      }
    });
  }

  if (listQuestions.length === 0) {
    return <p className="text-sm text-zinc-400">找不到符合條件的題目。</p>;
  }

  return (
    <div className="space-y-4">
      {message && (
        <p
          role="status"
          className={cn(
            'text-sm',
            message.type === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive',
          )}
        >
          {message.text}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-zinc-700 bg-zinc-950/40 text-zinc-200 hover:bg-zinc-900"
            disabled={pending || listQuestions.length === 0}
            onClick={selectAllVisible}
          >
            全選
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-zinc-700 bg-zinc-950/40 text-zinc-200 hover:bg-zinc-900"
            disabled={pending || selectedCount === 0}
            onClick={clearSelection}
          >
            清除勾選（{selectedCount}）
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={pending || selectedCount === 0}
            onClick={bulkDeleteSelected}
          >
            刪除勾選（{selectedCount}）
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="text-xs text-zinc-500">
            重複群組：{duplicateDeletePlan.groupsCount}　可刪除：{duplicateDeletePlan.toDelete.length}
          </div>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={pending || duplicateDeletePlan.toDelete.length === 0}
            onClick={bulkDeleteDuplicates}
          >
            一鍵刪除重複題
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {listQuestions.map((q) => {
          const selected = getSelectedIndex(q);
          const currentIdx = saved[q.id]?.correct_index ?? q.correct_index;
          const currentOld = saved[q.id]?.correct_answer_old ?? q.correct_answer_old;
          const checked = selectedIds.has(q.id);
          return (
            <div
              key={q.id}
              className={cn('rounded-xl border border-zinc-800 bg-zinc-950/40 p-4')}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-zinc-500">{q.difficulty}</div>
                  <div className="mt-1 break-words text-sm font-medium text-zinc-100">{q.question_text}</div>
                  {q.explanation ? (
                    <div className="mt-2 text-xs text-zinc-400">解釋：{q.explanation}</div>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-xs text-zinc-300">
                    <input
                      type="checkbox"
                      className="size-4 accent-violet-500"
                      checked={checked}
                      onChange={(e) => toggleSelected(q.id, e.target.checked)}
                      disabled={pending}
                      aria-label="勾選題目"
                    />
                    勾選
                  </label>
                  <div className="text-xs text-zinc-500">
                    目前：{labelForIndex(currentIdx)}（{currentOld}/{currentIdx}）
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={pending}
                    onClick={() => deleteOne(q)}
                  >
                    刪除
                  </Button>
                  <Button size="sm" disabled={pending || !hasChanged(q)} onClick={() => saveOne(q)}>
                    {pending ? '儲存中…' : '儲存'}
                  </Button>
                </div>
              </div>

              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {q.options.map((opt, idx) => (
                  <label
                    key={idx}
                    className={cn(
                      'flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm',
                      idx === selected
                        ? 'border-violet-500/60 bg-violet-500/10 text-zinc-50'
                        : 'border-zinc-800 bg-zinc-950/30 text-zinc-200 hover:border-zinc-700',
                    )}
                  >
                    <input
                      type="radio"
                      name={`correct-${q.id}`}
                      checked={idx === selected}
                      onChange={() => setSelectedIndex(q, idx)}
                      className="mt-1 accent-violet-500"
                    />
                    <span className="min-w-0 break-words">{opt}</span>
                  </label>
                ))}
              </div>

              <div className="mt-2 text-xs text-zinc-500">
                id: <span className="font-mono">{q.id}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

