'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';

import { gradeAssignmentAction } from '@/lib/mentor/actions';
import type { MentorAssignmentRow } from '@/lib/mentor/queries';
import { mentorTextareaClass } from '@/components/mentor/field-classes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type Props = {
  assignment: MentorAssignmentRow;
};

export function AssignmentGradeCard({ assignment }: Props) {
  const [grade, setGrade] = useState(
    assignment.grade != null ? String(assignment.grade) : '',
  );
  const [feedback, setFeedback] = useState(assignment.feedback ?? '');
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setMsg(null);
    const n = Number(grade);
    if (grade === '' || Number.isNaN(n)) {
      setMsg('請輸入有效分數');
      return;
    }
    startTransition(async () => {
      const res = await gradeAssignmentAction(assignment.id, n, feedback);
      setMsg(res.success ?? res.error ?? null);
    });
  }

  const student = assignment.student;
  const lesson = assignment.lesson;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">
              {lesson?.title ?? '單元'}
            </CardTitle>
            <CardDescription>
              {lesson?.course?.title ?? '課程'} · 繳交於{' '}
              {new Date(assignment.submitted_at).toLocaleString('zh-HK')}
            </CardDescription>
          </div>
          <Badge variant="secondary" className="bg-amber-500/15 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
            {assignment.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 overflow-hidden rounded-full bg-muted">
            {student?.avatar_url ? (
              <Image
                src={student.avatar_url}
                alt=""
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                {(student?.display_name ?? '?').slice(0, 2)}
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {student?.display_name ?? '學員'}
            </p>
            <p className="text-xs text-muted-foreground">類型：{assignment.type}</p>
          </div>
        </div>

        {assignment.text_content && (
          <div className="rounded-md border border-border bg-muted/50 p-3 text-sm text-foreground">
            {assignment.text_content}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-[120px_1fr] sm:items-end">
          <div className="space-y-1.5">
            <Label>分數（0–100）</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>批改回饋</Label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={3}
              className={mentorTextareaClass}
              placeholder="給學員的建議…"
            />
          </div>
        </div>

        {msg && (
          <p
            className={
              msg.includes('無權') || msg.includes('請輸入')
                ? 'text-sm text-destructive'
                : 'text-sm text-emerald-600 dark:text-emerald-400'
            }
          >
            {msg}
          </p>
        )}

        <Button
          type="button"
          onClick={submit}
          disabled={pending}
          className="bg-emerald-600 text-white hover:bg-emerald-500"
        >
          {pending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          送出批改
        </Button>
      </CardContent>
    </Card>
  );
}
