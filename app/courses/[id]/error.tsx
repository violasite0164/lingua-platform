'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function CourseError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[CourseError]', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center px-4">
      <h2 className="text-xl font-semibold">無法載入課程</h2>
      <p className="text-sm text-muted-foreground">
        課程資料載入失敗，可能是網路問題或課程不存在。
      </p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={reset}>重試</Button>
        <Button asChild>
          <Link href="/courses">返回課程列表</Link>
        </Button>
      </div>
    </div>
  );
}
