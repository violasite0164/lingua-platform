'use server';

import { revalidatePath } from 'next/cache';

import { requireAdmin } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';

export type BulkUpdateCorrectIndexResult =
  | { ok: true; updated: number }
  | { ok: false; error: string };

function letterFromIndex(i: number): 'A' | 'B' | 'C' | 'D' | null {
  if (i === 0) return 'A';
  if (i === 1) return 'B';
  if (i === 2) return 'C';
  if (i === 3) return 'D';
  return null;
}

export async function bulkUpdateQuestionsCorrectIndex(
  changes: { id: string; correct_index: number }[],
): Promise<BulkUpdateCorrectIndexResult> {
  await requireAdmin();

  if (!Array.isArray(changes) || changes.length === 0) {
    return { ok: true, updated: 0 };
  }
  if (changes.length > 5000) {
    return { ok: false, error: '一次更新過多（> 5000）。請分批儲存。' };
  }

  const cleaned: { id: string; correct_index: number; correct_answer_old: 'A' | 'B' | 'C' | 'D' }[] =
    [];

  for (const c of changes) {
    const id = String(c?.id ?? '').trim();
    const idx = Number(c?.correct_index);
    if (!id) return { ok: false, error: '缺少題目 id。' };
    if (!Number.isFinite(idx) || !Number.isInteger(idx) || idx < 0 || idx > 3) {
      return { ok: false, error: `題目 ${id} 的 correct_index 無效（必須 0–3）。` };
    }
    const letter = letterFromIndex(idx);
    if (!letter) return { ok: false, error: `題目 ${id} 的 correct_index 無法轉成 A–D。` };
    cleaned.push({ id, correct_index: idx, correct_answer_old: letter });
  }

  const supabase = await createAdminClient();
  const CHUNK = 250;
  let updated = 0;
  for (let i = 0; i < cleaned.length; i += CHUNK) {
    const slice = cleaned.slice(i, i + CHUNK);
    /* postgrest-js：僅更新 correct_index / correct_answer_old 時，Insert 型別要求全欄位 */
    const { error } = await supabase
      .from('questions')
      .upsert(slice as never, { onConflict: 'id' });
    if (error) {
      console.error('[bulkUpdateQuestionsCorrectIndex]', error.message);
      return { ok: false, error: error.message || '更新失敗' };
    }
    updated += slice.length;
  }

  revalidatePath('/admin/questions');
  revalidatePath('/admin/questions/editor');
  return { ok: true, updated };
}

