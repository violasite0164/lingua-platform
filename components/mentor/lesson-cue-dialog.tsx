'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { Clock, Loader2, MessageSquare, Pencil, Plus, Trash2 } from 'lucide-react';

import {
  createLessonTimedCueAction,
  deleteLessonTimedCueAction,
  listLessonTimedCuesAction,
  toggleLessonTimedCueAction,
  updateLessonTimedCueAction,
} from '@/lib/mentor/cue-actions';
import {
  defaultPayloadForType,
  LESSON_CUE_TYPE_LABELS,
  type LessonCuePayload,
  type LessonCueType,
} from '@/lib/lesson-cues/types';
import { formatCueTime, parseCueTimeInput } from '@/lib/lesson-cues/time';
import { mentorTextareaClass } from '@/components/mentor/field-classes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { LessonTimedCue } from '@/types/database.types';

type Props = {
  lessonId: string;
  lessonTitle: string;
  disabled?: boolean;
};

function payloadFromRow(row: LessonTimedCue): LessonCuePayload {
  const raw = row.payload;
  if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
    return raw as LessonCuePayload;
  }
  return defaultPayloadForType(row.cue_type);
}

export function LessonCueDialog({ lessonId, lessonTitle, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [cues, setCues] = useState<LessonTimedCue[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [timeInput, setTimeInput] = useState('0:00');
  const [cueType, setCueType] = useState<LessonCueType>('sentence');
  const [payload, setPayload] = useState<LessonCuePayload>(
    defaultPayloadForType('sentence'),
  );

  const loadList = useCallback(async () => {
    setLoadingList(true);
    setMsg(null);
    const res = await listLessonTimedCuesAction(lessonId);
    setLoadingList(false);
    if (res.error) {
      setMsg(res.error);
      setCues([]);
      return;
    }
    setCues(res.cues);
  }, [lessonId]);

  useEffect(() => {
    if (open) void loadList();
  }, [open, loadList]);

  function resetForm() {
    setEditingId(null);
    setTimeInput('0:00');
    setCueType('sentence');
    setPayload(defaultPayloadForType('sentence'));
  }

  function startEdit(row: LessonTimedCue) {
    setEditingId(row.id);
    setTimeInput(formatCueTime(row.trigger_at_sec));
    setCueType(row.cue_type);
    setPayload(payloadFromRow(row));
  }

  function onTypeChange(next: LessonCueType) {
    setCueType(next);
    setPayload(defaultPayloadForType(next));
  }

  function handleSave() {
    const trigger_at_sec = parseCueTimeInput(timeInput);
    if (trigger_at_sec === null) {
      setMsg('請輸入有效時間（例如 1:30 或 90）');
      return;
    }

    setMsg(null);
    startTransition(async () => {
      const body = {
        lesson_id: lessonId,
        trigger_at_sec,
        cue_type: cueType,
        payload,
        is_enabled: true,
      };

      const res = editingId
        ? await updateLessonTimedCueAction(editingId, body)
        : await createLessonTimedCueAction(body);

      if (res.error) {
        setMsg(res.error);
        return;
      }
      setMsg(res.success ?? '已儲存');
      resetForm();
      await loadList();
    });
  }

  function handleDelete(id: string) {
    if (!confirm('確定刪除此互動？')) return;
    startTransition(async () => {
      const res = await deleteLessonTimedCueAction(id);
      setMsg(res.error ?? res.success ?? null);
      if (editingId === id) resetForm();
      await loadList();
    });
  }

  function handleToggle(id: string, enabled: boolean) {
    startTransition(async () => {
      const res = await toggleLessonTimedCueAction(id, enabled);
      setMsg(res.error ?? res.success ?? null);
      await loadList();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline" disabled={disabled}>
          <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
          即時互動
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>影片即時互動</DialogTitle>
          <DialogDescription>
            單元：{lessonTitle}。設定影片播放到指定時間時，學員畫面下方彈出的內容。
          </DialogDescription>
        </DialogHeader>

        {msg ? (
          <p className="text-sm text-emerald-600 dark:text-emerald-400/90" role="status">
            {msg}
          </p>
        ) : null}

        <div className="space-y-4 rounded-lg border border-border p-3">
          <p className="text-sm font-medium">
            {editingId ? '編輯互動' : '新增互動'}
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>彈出時間</Label>
              <Input
                value={timeInput}
                onChange={(e) => setTimeInput(e.target.value)}
                placeholder="m:ss 或秒數，如 1:30"
              />
              <p className="text-xs text-muted-foreground">
                影片播放至此時間時顯示
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>內容類型</Label>
              <select
                value={cueType}
                onChange={(e) => onTypeChange(e.target.value as LessonCueType)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                disabled={!!editingId}
              >
                {(Object.keys(LESSON_CUE_TYPE_LABELS) as LessonCueType[]).map(
                  (t) => (
                    <option key={t} value={t}>
                      {LESSON_CUE_TYPE_LABELS[t]}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>

          <CuePayloadFields
            cueType={cueType}
            payload={payload}
            onChange={setPayload}
          />

          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={pending} onClick={handleSave}>
              {pending ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="mr-1.5 h-3.5 w-3.5" />
              )}
              {editingId ? '儲存變更' : '新增'}
            </Button>
            {editingId ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={resetForm}
              >
                取消編輯
              </Button>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">已設定的互動（{cues.length}）</p>
          {loadingList ? (
            <p className="text-sm text-muted-foreground">載入中…</p>
          ) : cues.length === 0 ? (
            <p className="text-sm text-muted-foreground">尚無內容</p>
          ) : (
            <ul className="max-h-48 space-y-2 overflow-y-auto">
              {cues.map((row) => (
                <li
                  key={row.id}
                  className="flex items-start justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatCueTime(row.trigger_at_sec)}
                      </span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
                        {LESSON_CUE_TYPE_LABELS[row.cue_type]}
                      </span>
                      {!row.is_enabled ? (
                        <span className="text-xs text-amber-600">已停用</span>
                      ) : null}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {summarizePayload(row)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      disabled={pending}
                      onClick={() => startEdit(row)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      disabled={pending}
                      onClick={() => handleToggle(row.id, !row.is_enabled)}
                      title={row.is_enabled ? '停用' : '啟用'}
                    >
                      {row.is_enabled ? '停' : '啟'}
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      disabled={pending}
                      onClick={() => handleDelete(row.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function summarizePayload(row: LessonTimedCue): string {
  const p = payloadFromRow(row);
  if (row.cue_type === 'sentence' && 'text' in p) return p.text;
  if ('prompt' in p) return p.prompt;
  return '';
}

function CuePayloadFields({
  cueType,
  payload,
  onChange,
}: {
  cueType: LessonCueType;
  payload: LessonCuePayload;
  onChange: (p: LessonCuePayload) => void;
}) {
  if (cueType === 'sentence' && 'text' in payload) {
    return (
      <div className="space-y-1.5">
        <Label>句字內容</Label>
        <textarea
          value={payload.text}
          onChange={(e) => onChange({ text: e.target.value })}
          rows={3}
          className={mentorTextareaClass}
          placeholder="播放時以打字效果顯示"
        />
      </div>
    );
  }

  if (cueType === 'multiple_choice' && 'options' in payload) {
    return (
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>題目</Label>
          <textarea
            value={payload.prompt}
            onChange={(e) => onChange({ ...payload, prompt: e.target.value })}
            rows={2}
            className={mentorTextareaClass}
          />
        </div>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-1">
            <Label>選項 {i + 1}</Label>
            <Input
              value={payload.options[i]}
              onChange={(e) => {
                const options = [...payload.options] as [
                  string,
                  string,
                  string,
                  string,
                ];
                options[i] = e.target.value;
                onChange({ ...payload, options });
              }}
            />
          </div>
        ))}
        <div className="space-y-1.5">
          <Label>正確答案</Label>
          <select
            value={payload.correct_index}
            onChange={(e) =>
              onChange({
                ...payload,
                correct_index: Number(e.target.value),
              })
            }
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {[0, 1, 2, 3].map((i) => (
              <option key={i} value={i}>
                選項 {i + 1}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>解答說明（選填）</Label>
          <Input
            value={payload.explanation ?? ''}
            onChange={(e) =>
              onChange({ ...payload, explanation: e.target.value })
            }
          />
        </div>
      </div>
    );
  }

  if (cueType === 'text_input' && 'acceptable_answers' in payload) {
    return (
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>題目</Label>
          <textarea
            value={payload.prompt}
            onChange={(e) => onChange({ ...payload, prompt: e.target.value })}
            rows={2}
            className={mentorTextareaClass}
          />
        </div>
        <div className="space-y-1.5">
          <Label>可接受答案（每行一個）</Label>
          <textarea
            value={payload.acceptable_answers.join('\n')}
            onChange={(e) =>
              onChange({
                ...payload,
                acceptable_answers: e.target.value
                  .split('\n')
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            rows={3}
            className={mentorTextareaClass}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={payload.case_sensitive ?? false}
            onChange={(e) =>
              onChange({ ...payload, case_sensitive: e.target.checked })
            }
            className="h-4 w-4 rounded border-input"
          />
          區分大小寫
        </label>
        <div className="space-y-1.5">
          <Label>解答說明（選填）</Label>
          <Input
            value={payload.explanation ?? ''}
            onChange={(e) =>
              onChange({ ...payload, explanation: e.target.value })
            }
          />
        </div>
      </div>
    );
  }

  return null;
}
