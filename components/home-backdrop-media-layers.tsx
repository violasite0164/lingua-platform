'use client';

import { HomeBackdropVideo } from '@/components/home-backdrop-video';
import { HomeBackdropYoutube } from '@/components/home-backdrop-youtube';
import { useHomeBackdropPlayback } from '@/components/home-backdrop-playback';
import { usePreferStaticHomeBackdrop } from '@/lib/home-backdrop-network';
import type { HomeBackdropMedia } from '@/lib/homepage-public';
import { parseYouTubeVideoId } from '@/lib/youtube-url';

const SCRIM_EPS = 0.002;

/**
 * 自訂背景圖／影片與遮罩；測驗進行中卸載，只留外層 {@link HomeCinematicBackground} 的主題底色。
 * 手機＋行動數據等條件下不載入背景影片，只顯示圖片（與 {@link usePreferStaticHomeBackdrop} 一致）。
 */
export function HomeBackdropMediaLayers({ media }: { media: HomeBackdropMedia }) {
  const { backdropMediaHidden } = useHomeBackdropPlayback();
  const preferStaticOnMobileData = usePreferStaticHomeBackdrop();

  if (backdropMediaHidden) return null;

  const wouldPlayVideo = Boolean(media.videoEnabled && media.videoUrl);
  const imageOn = Boolean(media.imageEnabled && media.imageUrl);
  const posterUrl =
    media.imageEnabled && (media.imageUrl || media.imageUrls[0])
      ? media.imageUrl ?? media.imageUrls[0]
      : undefined;

  const showVideo = wouldPlayVideo && !preferStaticOnMobileData;
  const youtubeId =
    showVideo && media.videoUrl ? parseYouTubeVideoId(media.videoUrl) : null;
  /** 僅圖、或手機行動數據時改走靜態圖 */
  const showImage =
    imageOn && (!showVideo || preferStaticOnMobileData);

  const overlayOpacity = Math.min(1, Math.max(0, media.overlayOpacity ?? 0.45));
  const showAnyMedia =
    showVideo ||
    showImage ||
    (preferStaticOnMobileData && wouldPlayVideo && !imageOn);
  const showScrim = showAnyMedia && overlayOpacity > SCRIM_EPS;

  return (
    <>
      {showVideo &&
        (youtubeId ? (
          <HomeBackdropYoutube videoId={youtubeId} />
        ) : (
          <HomeBackdropVideo src={media.videoUrl!} poster={posterUrl} />
        ))}

      {showImage && (
        // eslint-disable-next-line @next/next/no-img-element -- 後台設定 URL，公開首頁展示
        <img src={media.imageUrl!} alt="" className="absolute inset-0 size-full object-cover" />
      )}

      {showScrim && (
        <div
          className="absolute inset-0 bg-background"
          style={{ opacity: overlayOpacity }}
        />
      )}
    </>
  );
}
