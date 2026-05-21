import Link from 'next/link';
import { ArrowRight, BookCheck, ImageIcon } from 'lucide-react';

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = {
  title: '管理員後台',
};

export default function AdminDashboardPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">概覽</h1>
        <p className="mt-1 text-sm text-zinc-400">選擇要管理的項目。</p>
      </div>

      <Link
        href="/admin/homepage"
        className="group block max-w-md rounded-xl outline-none ring-offset-zinc-950 focus-visible:ring-2 focus-visible:ring-violet-500"
      >
        <Card className="h-full border-zinc-800 bg-zinc-900/80 transition-colors hover:border-zinc-700 hover:bg-zinc-900">
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <ImageIcon className="size-8 text-violet-400" />
              <ArrowRight className="size-4 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-400" />
            </div>
            <CardTitle className="text-lg text-zinc-100">首頁背景</CardTitle>
            <CardDescription className="text-zinc-400">
              設定首頁全幅背景圖片與影片網址、遮罩濃度。
            </CardDescription>
          </CardHeader>
        </Card>
      </Link>

      <Link
        href="/admin/questions"
        className="group block max-w-md rounded-xl outline-none ring-offset-zinc-950 focus-visible:ring-2 focus-visible:ring-violet-500"
      >
        <Card className="h-full border-zinc-800 bg-zinc-900/80 transition-colors hover:border-zinc-700 hover:bg-zinc-900">
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <BookCheck className="size-8 text-violet-400" />
              <ArrowRight className="size-4 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-400" />
            </div>
            <CardTitle className="text-lg text-zinc-100">題庫答案</CardTitle>
            <CardDescription className="text-zinc-400">
              搜尋題目並直接修正正確答案（correct_index / A–D）。
            </CardDescription>
          </CardHeader>
        </Card>
      </Link>
    </div>
  );
}
