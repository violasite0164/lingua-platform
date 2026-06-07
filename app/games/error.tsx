'use client';

import { useEffect } from 'react';

import { Button } from '@/components/ui/button';

export default function GamesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[games]', error);
  }, [error]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h2 className="text-lg font-semibold">遊戲頁載入失敗</h2>
      <p className="max-w-md text-sm text-muted-foreground">{error.message}</p>
      <Button type="button" onClick={reset}>
        重試
      </Button>
    </div>
  );
}
