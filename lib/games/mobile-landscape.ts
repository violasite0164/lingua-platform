/** 手機直向時是否強制以橫屏版面呈現（CSS 旋轉 + 可選 orientation lock） */
export const MOBILE_LANDSCAPE_MAX_WIDTH_PX = 896;

export function getMobileLandscapeMediaQuery(): string {
  return `(max-width: ${MOBILE_LANDSCAPE_MAX_WIDTH_PX}px) and (orientation: portrait) and ((hover: none) or (pointer: coarse))`;
}

export function isMobilePortraitViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(getMobileLandscapeMediaQuery()).matches;
}

export async function tryLockLandscapeOrientation(): Promise<void> {
  if (typeof screen === 'undefined') return;
  const orientation = screen.orientation as ScreenOrientation & {
    lock?: (orientation: OrientationLockType) => Promise<void>;
  };
  if (typeof orientation?.lock !== 'function') return;
  try {
    await orientation.lock('landscape');
  } catch {
    /* iOS Safari 多數情況不支援，改由 CSS 旋轉 */
  }
}
