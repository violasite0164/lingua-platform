import { NextResponse } from 'next/server';

import {
  loadLessonTextbookFile,
  textbookDownloadResponse,
} from '@/lib/lesson-textbooks/download';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ textbookId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { textbookId } = await context.params;
  if (!textbookId) {
    return NextResponse.json({ error: '缺少教材 ID' }, { status: 400 });
  }

  const supabase = await createClient();
  const result = await loadLessonTextbookFile(supabase, textbookId);
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }

  return textbookDownloadResponse(result.row, result.blob);
}
