/**
 * 首頁背景媒體 — Supabase Storage `homepage` bucket（公開讀、僅 admin 寫）
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database.types';

export const HOMEPAGE_BUCKET = 'homepage' as const;

/** 與後台表單 accept / 驗證一致 */
export const HOMEPAGE_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';
export const HOMEPAGE_VIDEO_ACCEPT = 'video/mp4,video/quicktime,video/webm';

export const MAX_HOMEPAGE_IMAGE_BYTES = 12 * 1024 * 1024; // 12 MiB
export const MAX_HOMEPAGE_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MiB（勿超過 bucket file_size_limit）

function extensionForFile(file: File, kind: 'image' | 'video'): string {
  const fromType =
    file.type === 'image/jpeg'
      ? 'jpg'
      : file.type === 'image/png'
        ? 'png'
        : file.type === 'image/webp'
          ? 'webp'
          : file.type === 'image/gif'
            ? 'gif'
            : file.type === 'video/mp4'
              ? 'mp4'
              : file.type === 'video/quicktime'
                ? 'mov'
                : file.type === 'video/webm'
                  ? 'webm'
                  : '';
  if (fromType) return fromType;
  const name = file.name.toLowerCase();
  const ext = name.includes('.') ? name.split('.').pop() : '';
  if (ext && /^[a-z0-9]{2,8}$/.test(ext)) return ext;
  return kind === 'image' ? 'jpg' : 'mp4';
}

export function buildHomepageStoragePath(file: File, kind: 'image' | 'video'): string {
  const ext = extensionForFile(file, kind);
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 10)
      : String(Date.now());
  return `media/${Date.now()}-${id}.${ext}`;
}

export type HomepageUploadResult =
  | { ok: true; publicUrl: string }
  | { ok: false; error: string };

export async function uploadHomepageMedia(
  supabase: SupabaseClient<Database>,
  file: File,
  kind: 'image' | 'video',
): Promise<HomepageUploadResult> {
  const max = kind === 'image' ? MAX_HOMEPAGE_IMAGE_BYTES : MAX_HOMEPAGE_VIDEO_BYTES;
  if (file.size > max) {
    return {
      ok: false,
      error:
        kind === 'image'
          ? `圖片請勿超過 ${Math.round(MAX_HOMEPAGE_IMAGE_BYTES / 1024 / 1024)} MiB`
          : `影片請勿超過 ${Math.round(MAX_HOMEPAGE_VIDEO_BYTES / 1024 / 1024)} MiB`,
    };
  }

  if (kind === 'image' && !file.type.startsWith('image/')) {
    return { ok: false, error: '請選擇圖片檔（JPEG / PNG / WebP / GIF）' };
  }
  if (kind === 'video' && !file.type.startsWith('video/')) {
    return { ok: false, error: '請選擇影片檔（MP4 / MOV / WebM）' };
  }

  const path = buildHomepageStoragePath(file, kind);
  const { error } = await supabase.storage.from(HOMEPAGE_BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });

  if (error) {
    console.error('[uploadHomepageMedia]', error.message);
    return { ok: false, error: error.message || '上傳失敗（請確認已執行 Storage 遷移且具 admin 權限）' };
  }

  const { data } = supabase.storage.from(HOMEPAGE_BUCKET).getPublicUrl(path);
  return { ok: true, publicUrl: data.publicUrl };
}
