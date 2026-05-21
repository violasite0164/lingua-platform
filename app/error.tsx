'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <h2 className="text-xl font-semibold">出了點問題</h2>
      <p className="text-sm text-muted-foreground">
        {error.message ?? '發生未預期的錯誤，請稍後再試。'}
      </p>
      <Button onClick={reset}>重試</Button>
    </div>
  );
}
