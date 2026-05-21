'use client';

/**
 * 首頁背景影片（僅在掛載時播放；卸載時由父層卸除）。
 */
export function HomeBackdropVideo({ src, poster }: { src: string; poster?: string }) {
  return (
    <video
      className="absolute inset-0 size-full object-cover"
      src={src}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
    />
  );
}
