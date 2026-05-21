import { HomeBackdropMediaLayers } from '@/components/home-backdrop-media-layers';
import type { HomeBackdropMedia } from '@/lib/homepage-public';

/**
 * 首頁全幅背景：底層為主題色；自訂圖／影片由 Client 層依測驗階段顯示或卸載。
 */
export function HomeCinematicBackground({ media }: { media?: HomeBackdropMedia | null }) {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-background" />
      {media ? <HomeBackdropMediaLayers media={media} /> : null}
    </div>
  );
}
