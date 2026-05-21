'use client';

/**
 * YouTube 背景：embed 需 playlist=id 才能單片循環；須帶 origin 以避免 Error 153。
 * 版面使用常見「cover」算法讓 16:9 iframe 铺满容器。
 */

import { useEffect, useMemo, useState } from 'react';

import { buildYouTubeBackdropEmbedSrc } from '@/lib/youtube-url';

export function HomeBackdropYoutube({ videoId }: { videoId: string }) {
  const envOrigin =
    typeof process.env.NEXT_PUBLIC_APP_URL === 'string'
      ? process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/$/, '')
      : '';

  const [origin, setOrigin] = useState<string | null>(envOrigin || null);

  useEffect(() => {
    if (!envOrigin) setOrigin(window.location.origin);
  }, [envOrigin]);

  const src = useMemo(
    () => (origin ? buildYouTubeBackdropEmbedSrc(videoId, origin) : null),
    [videoId, origin],
  );

  if (!src) return null;

  return (
    <iframe
      title=""
      src={src}
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border-0"
      style={{
        width: '100vw',
        height: '56.25vw',
        minHeight: '100vh',
        minWidth: '177.78vh',
      }}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
      referrerPolicy="origin"
      loading="eager"
      tabIndex={-1}
      aria-hidden
    />
  );
}
