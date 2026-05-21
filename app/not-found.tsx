import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center px-4">
      <p className="text-6xl font-bold text-muted-foreground/30">404</p>
      <h2 className="text-xl font-semibold">找不到這個頁面</h2>
      <p className="text-sm text-muted-foreground">
        你要找的頁面不存在，或已被移除。
      </p>
      <Button asChild>
        <Link href="/">回到首頁</Link>
      </Button>
    </div>
  );
}
