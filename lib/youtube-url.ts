/**
 * 自訂背景影片欄位若為 YouTube 連結，首頁改以 iframe 嵌入（靜音自動播放）。
 */

const ID_RE = /^[a-zA-Z0-9_-]{11}$/;

function normalizeVideoId(id: string | null | undefined): string | null {
  if (!id) return null;
  const cleaned = id.trim();
  return ID_RE.test(cleaned) ? cleaned : null;
}

/**
 * 背景嵌入 URL（須帶與站台一致的 `origin`，否則常出現 Error 153）。
 *
 * 預設使用 **www.youtube.com**：Google 在部分情境下對 youtube-nocookie 嵌入會更容易出現
 * 「Sign in to confirm you are not a bot」驗證畫面；若你仍希望隱私強化網域，可設
 * `NEXT_PUBLIC_YOUTUBE_EMBED_USE_NOCOOKIE=true`。
 */
export function buildYouTubeBackdropEmbedSrc(videoId: string, pageOrigin?: string): string {
  const useNocookie = process.env.NEXT_PUBLIC_YOUTUBE_EMBED_USE_NOCOOKIE === 'true';
  const embedHost = useNocookie ? 'www.youtube-nocookie.com' : 'www.youtube.com';

  const params = new URLSearchParams({
    autoplay: '1',
    mute: '1',
    loop: '1',
    playlist: videoId,
    controls: '0',
    modestbranding: '1',
    rel: '0',
    playsinline: '1',
    iv_load_policy: '3',
    disablekb: '1',
    enablejsapi: '1',
  });
  const o = pageOrigin?.trim().replace(/\/$/, '');
  if (o) params.set('origin', o);

  return `https://${embedHost}/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
}

/**
 * 從常見 YouTube URL 取出 11 碼 video id；非 YouTube 或無法解析則回傳 null。
 */
export function parseYouTubeVideoId(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  let url: URL;
  try {
    url = new URL(s.includes('://') ? s : `https://${s}`);
  } catch {
    return null;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

  const host = url.hostname.toLowerCase();
  const hostNoWww = host.startsWith('www.') ? host.slice(4) : host;

  if (hostNoWww === 'youtu.be') {
    const seg = url.pathname.split('/').filter(Boolean)[0];
    return normalizeVideoId(seg);
  }

  if (hostNoWww === 'youtube.com' || hostNoWww.endsWith('.youtube.com')) {
    const parts = url.pathname.split('/').filter(Boolean);

    if (parts[0] === 'embed' && parts[1]) return normalizeVideoId(parts[1]);
    if (parts[0] === 'shorts' && parts[1]) return normalizeVideoId(parts[1]);
    if (parts[0] === 'live' && parts[1]) return normalizeVideoId(parts[1]);
    if (parts[0] === 'watch') return normalizeVideoId(url.searchParams.get('v'));
    if (parts[0] === 'v' && parts[1]) return normalizeVideoId(parts[1]);
  }

  if (
    hostNoWww === 'youtube-nocookie.com' ||
    hostNoWww.endsWith('.youtube-nocookie.com')
  ) {
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts[0] === 'embed' && parts[1]) return normalizeVideoId(parts[1]);
  }

  return null;
}
