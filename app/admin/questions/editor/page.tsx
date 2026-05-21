
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createAdminClient } from '@/lib/supabase/server';
import { QuestionsInlineEditor } from '@/components/admin/questions-inline-editor';

export const metadata = {
  title: '題庫複製清單',
};

export default async function AdminQuestionsEditorPage() {
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from('questions')
    .select('id,difficulty,question_text,options,correct_index')
    .neq('difficulty', 'elementary')
    .order('created_at', { ascending: true })
    .limit(2000);

  const rows = (data ?? []) as any[];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
          題庫複製清單
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          以你指定的格式展示：<code className="rounded bg-zinc-800 px-1 text-xs">Question optionA optionB optionC optionD</code>
          。可直接 highlight copy（清單會顯示 Answer A/B/C/D）。
        </p>
      </div>

      <Card className="border-zinc-800 bg-zinc-900/80">
        <CardHeader>
          <CardTitle className="text-zinc-100">所有題目（排除 elementary；最多 2000 筆）</CardTitle>
          <CardDescription className="text-zinc-400">
            如需全量（超過 2000），我可以再加分頁/分批載入；先用這版確認流程與格式。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <QuestionsInlineEditor initial={rows as any} />
        </CardContent>
      </Card>
    </div>
  );
}

