'use client';

import { useState, useTransition } from 'react';
import { Loader2, RotateCcw } from 'lucide-react';

import { resetLessonLearning } from '@/app/actions/lesson-cue-progress';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Props = {
  lessonId: string;
  courseId: string;
  disabled?: boolean;
  onSuccess?: () => void;
};

export function RelearnLessonButton({
  lessonId,
  courseId,
  disabled,
  onSuccess,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function confirmRelearn() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await resetLessonLearning({ lessonId, courseId });
        if (res.error) {
          setError(res.error);
          return;
        }
        setDialogOpen(false);
        onSuccess?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : '重置失敗，請稍後再試');
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || pending}
        onClick={() => {
          setError(null);
          setDialogOpen(true);
        }}
      >
        <RotateCcw className="mr-1.5 h-4 w-4" />
        重新學習此單元
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>重新學習此單元</DialogTitle>
            <DialogDescription>
              互動題作答與完成狀態將重置，影片會從頭播放。已獲得的經驗值不會收回。
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={confirmRelearn}
            >
              {pending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  重置中…
                </>
              ) : (
                '確認重新學習'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {error && !dialogOpen ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
