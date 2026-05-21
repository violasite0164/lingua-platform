import { HomepageBackdropForm } from '@/components/admin/homepage-backdrop-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getHomepageConfigRow } from '@/lib/homepage-config';

export const metadata = {
  title: '首頁設定',
};

export default async function AdminHomepageBackdropPage() {
  const row = await getHomepageConfigRow();

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">首頁設定</h1>
        <p className="mt-1 text-sm text-zinc-400">
          背景、賣點與 AI 課程區插圖、全站主題配色、測驗文案與字色。
        </p>
      </div>

      <Card className="border-zinc-800 bg-zinc-900/80">
        <CardHeader>
          <CardTitle className="text-zinc-100">首頁與全站外觀</CardTitle>
          <CardDescription className="text-zinc-400">
            背景媒體、賣點區插圖、AI×線上課程三張說明卡插圖、五款主題配色預設，以及測驗文案與標題字色。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HomepageBackdropForm initial={row} />
        </CardContent>
      </Card>

      {row?.updated_at && (
        <p className="text-xs text-zinc-500">
          上次更新：{new Date(row.updated_at).toLocaleString('zh-HK')}
        </p>
      )}
    </div>
  );
}
