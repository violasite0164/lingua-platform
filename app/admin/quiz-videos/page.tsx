import { QuizGameVideosForm } from '@/components/admin/quiz-game-videos-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getHomepageConfigRow } from '@/lib/homepage-config';

export const metadata = {
  title: '英語大冒險影片',
};

export default async function AdminQuizVideosPage() {
  const row = await getHomepageConfigRow();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">英語大冒險影片</h1>
        <p className="mt-1 text-sm text-zinc-400">
          依難度（初級、中級、進階、教授級）分別上傳開局與過關影片。
        </p>
      </div>

      <Card className="border-zinc-800 bg-zinc-900/80">
        <CardHeader>
          <CardTitle className="text-zinc-100">關卡影片</CardTitle>
          <CardDescription className="text-zinc-400">
            每個難度各設「開局影片」與「過關影片」。建議 MP4（H.264）、5–30 秒；上傳至
            Storage「homepage」儲存桶。舊版單一影片會自動視為初級。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <QuizGameVideosForm initial={row} />
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
