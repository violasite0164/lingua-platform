'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Loader2,
  ListChecks,
  Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  deleteCourseQuizStepAction,
  moveCourseQuizStepAction,
} from '@/lib/mentor/course-quiz-actions';
import type { CourseQuizQuestion, CourseQuizStep } from '@/types/database.types';

type Props = {
  quizId: string;
  steps: CourseQuizStep[];
  questions: CourseQuizQuestion[];
  busy: boolean;
  onMessage: (m: string | null) => void;
  onDone: () => void;
  renderQuestionEditor: (questionId: string) => React.ReactNode;
  renderAddQuestion: () => React.ReactNode;
};

export function CourseQuizSequencePanel({
  quizId,
  steps,
  questions,
  busy,
  onMessage,
  onDone,
  renderQuestionEditor,
  renderAddQuestion,
}: Props) {
  const quizSteps = useMemo(
    () => [...steps].filter((s) => s.quiz_id === quizId).sort((a, b) => a.sort_order - b.sort_order),
    [steps, quizId],
  );

  const questionSteps = useMemo(
    () => quizSteps.filter((s) => s.step_kind === 'question'),
    [quizSteps],
  );

  const legacyTextSteps = useMemo(
    () => quizSteps.filter((s) => s.step_kind === 'video_text'),
    [quizSteps],
  );

  const questionMap = useMemo(
    () => new Map(questions.map((q) => [q.id, q])),
    [questions],
  );

  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">流程順序</p>
        <p className="text-xs text-muted-foreground">用 ↑↓ 調整題目順序。</p>
      </div>

      {legacyTextSteps.length > 0 ? (
        <ul className="space-y-2 rounded-md border border-amber-200/80 bg-amber-50/50 p-2 dark:border-amber-900/50 dark:bg-amber-950/20">
          {legacyTextSteps.map((step) => (
            <li
              key={step.id}
              className="flex items-center justify-between gap-2 rounded-md bg-background/80 px-2 py-1.5 text-sm"
            >
              <span className="min-w-0 truncate text-muted-foreground">
                已停用：{step.text_content || '（無內容）'}
              </span>
              <DeleteStepButton
                stepId={step.id}
                busy={busy}
                onMessage={onMessage}
                onDone={onDone}
              />
            </li>
          ))}
        </ul>
      ) : null}

      {questionSteps.length === 0 ? (
        <p className="text-sm text-muted-foreground">尚無題目，請新增題目。</p>
      ) : (
        <ul className="space-y-2">
          {questionSteps.map((step, index) => (
            <li key={step.id} className="rounded-lg border border-border bg-card">
              <div className="flex items-start gap-2 p-3">
                <div className="flex flex-col gap-0.5 pt-1">
                  <StepMoveButton
                    stepId={step.id}
                    direction="up"
                    disabled={busy || index === 0}
                    onMessage={onMessage}
                    onDone={onDone}
                  />
                  <StepMoveButton
                    stepId={step.id}
                    direction="down"
                    disabled={busy || index === questionSteps.length - 1}
                    onMessage={onMessage}
                    onDone={onDone}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-muted-foreground">#{index + 1}</p>
                  <div className="mt-1 flex items-start gap-2">
                    <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {questionMap.get(step.question_id ?? '')?.question_text ??
                          '（題目已刪除）'}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        點擊下方箭頭展開設定
                      </p>
                    </div>
                  </div>
                </div>
                <DeleteStepButton
                  stepId={step.id}
                  busy={busy}
                  onMessage={onMessage}
                  onDone={onDone}
                />
              </div>

              {step.question_id ? (
                <div className="relative border-t border-border px-3 pb-10 pt-3">
                  {expandedQuestionId === step.question_id ? (
                    <div>{renderQuestionEditor(step.question_id)}</div>
                  ) : null}

                  <button
                    type="button"
                    className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground shadow-sm hover:bg-muted/40"
                    aria-label={
                      expandedQuestionId === step.question_id ? '收合題目設定' : '展開題目設定'
                    }
                    onClick={() => {
                      setExpandedQuestionId((prev) =>
                        prev === step.question_id ? null : step.question_id!,
                      );
                    }}
                    disabled={busy}
                  >
                    {expandedQuestionId === step.question_id ? (
                      <span className="inline-flex items-center gap-1">
                        收合 <ChevronUp className="h-4 w-4" aria-hidden />
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        展開 <ChevronDown className="h-4 w-4" aria-hidden />
                      </span>
                    )}
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <div className="pt-2">{renderAddQuestion()}</div>
    </div>
  );
}

function DeleteStepButton({
  stepId,
  busy,
  onMessage,
  onDone,
}: {
  stepId: string;
  busy: boolean;
  onMessage: (m: string | null) => void;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      disabled={busy || pending}
      onClick={() => {
        if (!confirm('確定刪除此項目？')) return;
        startTransition(async () => {
          const res = await deleteCourseQuizStepAction(stepId);
          onMessage(res.success ?? res.error ?? null);
          onDone();
        });
      }}
    >
      <Trash2 className="h-4 w-4 text-destructive" />
    </Button>
  );
}

function StepMoveButton({
  stepId,
  direction,
  disabled,
  onMessage,
  onDone,
}: {
  stepId: string;
  direction: 'up' | 'down';
  disabled: boolean;
  onMessage: (m: string | null) => void;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="icon"
      variant="outline"
      className="h-7 w-7"
      disabled={disabled || pending}
      onClick={() => {
        startTransition(async () => {
          const res = await moveCourseQuizStepAction(stepId, direction);
          onMessage(res.success ?? res.error ?? null);
          onDone();
        });
      }}
      aria-label={direction === 'up' ? '上移' : '下移'}
    >
      {pending ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : direction === 'up' ? (
        <ArrowUp className="h-3 w-3" />
      ) : (
        <ArrowDown className="h-3 w-3" />
      )}
    </Button>
  );
}
