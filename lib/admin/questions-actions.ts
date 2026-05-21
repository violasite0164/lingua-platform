'use server';

import { revalidatePath } from 'next/cache';

import { requireAdmin } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';

export type UpdateQuestionAnswerResult =
  | { ok: true; id: string; correct_index: number; correct_answer_old: 'A' | 'B' | 'C' | 'D' }
  | { ok: false; error: string };

export type DeleteQuestionResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export type BulkDeleteQuestionsResult =
  | { ok: true; deleted: string[] }
  | { ok: false; error: string };

export type QuestionRowForTool = {
  id: string;
  difficulty: string;
  question_text: string;
  options: string[];
  correct_index: number;
  correct_answer_old: string;
  explanation: string;
  created_at?: string | null;
};

function letterFromIndex(i: number): 'A' | 'B' | 'C' | 'D' | null {
  if (i === 0) return 'A';
  if (i === 1) return 'B';
  if (i === 2) return 'C';
  if (i === 3) return 'D';
  return null;
}

export async function updateQuestionAnswer(formData: FormData): Promise<UpdateQuestionAnswerResult> {
  try {
    await requireAdmin();

    const id = String(formData.get('id') ?? '').trim();
    const idxRaw = String(formData.get('correct_index') ?? '').trim();
    const correctIndex = Number.parseInt(idxRaw, 10);

    if (!id) return { ok: false, error: '缺少題目 id' };
    if (!Number.isFinite(correctIndex) || correctIndex < 0 || correctIndex > 3) {
      return { ok: false, error: 'correct_index 必須是 0–3' };
    }

    const letter = letterFromIndex(correctIndex);
    if (!letter) return { ok: false, error: '無效的 correct_index' };

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return {
        ok: false,
        error:
          '缺少 SUPABASE_SERVICE_ROLE_KEY（管理員更新需要 Service Role）。請在伺服器環境變數設定。',
      };
    }

    const supabase = await createAdminClient();
    const { data: updRow, error } = await supabase
      .from('questions')
      .update({ correct_index: correctIndex, correct_answer_old: letter })
      .eq('id', id)
      .select('id,correct_index,correct_answer_old')
      .maybeSingle();

    if (error) {
      console.error('[updateQuestionAnswer]', error.message);
      return { ok: false, error: error.message || '更新失敗' };
    }

    // PostgREST 可能在 0 rows affected 時不回 error（例如 RLS 阻擋 update）；
    // 因此改用 update(...).select(...) 直接判斷是否有回傳更新後的列。
    if (!updRow) {
      return {
        ok: false,
        error:
          '更新未生效：0 筆資料被更新（常見原因：RLS 阻擋、Service Role Key 設錯/未套用到伺服器環境、或 id 不存在）。',
      };
    }
    if (updRow.correct_index !== correctIndex) {
      return {
        ok: false,
        error: '更新未生效（更新後值不一致）。請檢查資料庫觸發器或欄位約束。',
      };
    }

    revalidatePath('/admin');
    revalidatePath('/admin/questions');
    return {
      ok: true,
      id: updRow.id,
      correct_index: updRow.correct_index,
      correct_answer_old: updRow.correct_answer_old,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[updateQuestionAnswer] uncaught', msg);
    return { ok: false, error: msg || '更新失敗（未知錯誤）' };
  }
}

export async function deleteQuestion(formData: FormData): Promise<DeleteQuestionResult> {
  try {
    await requireAdmin();

    const id = String(formData.get('id') ?? '').trim();
    if (!id) return { ok: false, error: '缺少題目 id' };

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return {
        ok: false,
        error:
          '缺少 SUPABASE_SERVICE_ROLE_KEY（管理員刪除需要 Service Role）。請在伺服器環境變數設定。',
      };
    }

    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from('questions')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('[deleteQuestion]', error.message);
      return { ok: false, error: error.message || '刪除失敗' };
    }
    if (!data) {
      return { ok: false, error: '刪除未生效：0 筆資料被刪除（可能 id 不存在）。' };
    }

    revalidatePath('/admin');
    revalidatePath('/admin/questions');
    return { ok: true, id: data.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[deleteQuestion] uncaught', msg);
    return { ok: false, error: msg || '刪除失敗（未知錯誤）' };
  }
}

export async function bulkDeleteQuestions(
  ids: string[],
): Promise<BulkDeleteQuestionsResult> {
  try {
    await requireAdmin();
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return {
        ok: false,
        error:
          '缺少 SUPABASE_SERVICE_ROLE_KEY（管理員刪除需要 Service Role）。請在伺服器環境變數設定。',
      };
    }

    const uniq = Array.from(
      new Set((ids ?? []).map((x) => String(x ?? '').trim()).filter(Boolean)),
    );
    if (!uniq.length) return { ok: true, deleted: [] };
    if (uniq.length > 5000) {
      return { ok: false, error: '一次刪除過多（> 5000）。請分批。' };
    }

    const supabase = await createAdminClient();
    const deleted: string[] = [];
    const CHUNK = 250;
    for (let i = 0; i < uniq.length; i += CHUNK) {
      const slice = uniq.slice(i, i + CHUNK);
      const { data, error } = await supabase
        .from('questions')
        .delete()
        .in('id', slice)
        .select('id');

      if (error) {
        console.error('[bulkDeleteQuestions]', error.message);
        return { ok: false, error: error.message || '刪除失敗' };
      }
      for (const row of (data ?? []) as any[]) deleted.push(String(row.id));
    }

    revalidatePath('/admin');
    revalidatePath('/admin/questions');
    return { ok: true, deleted };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[bulkDeleteQuestions] uncaught', msg);
    return { ok: false, error: msg || '刪除失敗（未知錯誤）' };
  }
}

/**
 * 依題幹（完全相符）拉回所有同題幹的題目，用於「一鍵找重複」。
 * 注意：這裡不做模糊比對，避免意外拉回大量不相關資料。
 */
export async function fetchQuestionsByExactQuestionText(
  questionTexts: string[],
): Promise<{ ok: true; questions: QuestionRowForTool[] } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return {
        ok: false,
        error:
          '缺少 SUPABASE_SERVICE_ROLE_KEY（管理員讀取需要 Service Role）。請在伺服器環境變數設定。',
      };
    }

    const texts = (questionTexts ?? [])
      .map((t) => String(t ?? '').trim())
      .filter((t) => t.length > 0);
    const uniq = Array.from(new Set(texts)).slice(0, 200);
    if (uniq.length === 0) return { ok: true, questions: [] };

    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from('questions')
      .select('id,difficulty,question_text,options,correct_index,correct_answer_old,explanation,created_at')
      .in('question_text', uniq)
      .order('created_at', { ascending: false })
      .limit(2000);

    if (error) {
      console.error('[fetchQuestionsByExactQuestionText]', error.message);
      return { ok: false, error: error.message || '讀取失敗' };
    }

    return { ok: true, questions: (data ?? []) as unknown as QuestionRowForTool[] };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[fetchQuestionsByExactQuestionText] uncaught', msg);
    return { ok: false, error: msg || '讀取失敗（未知錯誤）' };
  }
}

