import type { SupabaseClient } from '@supabase/supabase-js';

import { cfThumbnailUrl } from '@/lib/cloudflare-stream';
import type { Database } from '@/types/database.types';

/** Cloudflare Stream 產生的縮圖 URL（可自動覆寫） */
export function isStreamDerivedThumbnailUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  return (
    url.includes('cloudflarestream.com') ||
    url.includes('videodelivery.net') ||
    url.includes('imagedelivery.net')
  );
}

/** 影片處理中時縮圖可能尚未就緒，短暫重試 */
export async function fetchStreamThumbnailBytes(
  url: string,
  opts?: { retries?: number; delayMs?: number },
): Promise<Buffer | null> {
  const retries = opts?.retries ?? 4;
  const delayMs = opts?.delayMs ?? 1500;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 200) return buf;
      }
    } catch {
      // retry
    }
    if (attempt < retries - 1) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return null;
}

export function buildStreamThumbnailUrl(videoUid: string): string {
  return cfThumbnailUrl(videoUid, { time: '5s', width: 640, fit: 'crop' });
}

/**
 * 將 Stream 縮圖下載並存入 Supabase `thumbnails` bucket，回傳公開 URL。
 * 失敗時回傳 null（呼叫端可改存 Cloudflare 直鏈）。
 */
export async function persistCourseThumbnailFromStream(
  supabase: SupabaseClient<Database>,
  teacherId: string,
  courseId: string,
  streamThumbUrl: string,
): Promise<string | null> {
  const bytes = await fetchStreamThumbnailBytes(streamThumbUrl);
  if (!bytes) return null;

  const path = `${teacherId}/${courseId}.jpg`;
  const { error: upErr } = await supabase.storage.from('thumbnails').upload(path, bytes, {
    upsert: true,
    contentType: 'image/jpeg',
  });

  if (upErr) {
    console.error('[persistCourseThumbnail]', upErr);
    return null;
  }

  const { data: pub } = supabase.storage.from('thumbnails').getPublicUrl(path);
  return pub.publicUrl;
}
