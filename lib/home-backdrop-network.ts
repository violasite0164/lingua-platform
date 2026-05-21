'use client';

import { useLayoutEffect, useState } from 'react';

const MOBILE_MQ = '(max-width: 768px)';

type NetworkInformationLike = {
  type?: string;
  saveData?: boolean;
  effectiveType?: string;
  addEventListener?: (type: string, fn: () => void) => void;
  removeEventListener?: (type: string, fn: () => void) => void;
} & EventTarget;

function getNavigatorConnection(): NetworkInformationLike | undefined {
  if (typeof navigator === 'undefined') return undefined;
  return (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
}

/**
 * 窄螢幕（手機）下盡量不播背景影片，改靜態圖。
 * - `navigator.connection` **不存在**時（常見於 iOS Safari）：無法區分 Wi‑Fi／行動數據，改為**仍允許影片**，避免手機連 Wi‑Fi 卻永遠只顯示靜態圖。
 * - API 存在時：`saveData`、明確 `cellular`、極慢網路仍改走靜態；`wifi`／`ethernet` 則播放。
 */
function shouldPreferStaticBackdrop(): boolean {
  if (typeof window === 'undefined') return false;
  if (!window.matchMedia(MOBILE_MQ).matches) return false;

  const c = getNavigatorConnection();

  // 無 Network Information API：不強制靜態（否則 iOS Wi‑Fi 也永遠不播）
  if (!c) {
    return false;
  }

  if (c.saveData) return true;
  if (c.type === 'cellular') return true;

  const et = c.effectiveType;
  if (et === 'slow-2g' || et === '2g') return true;

  if (c.type === 'wifi' || c.type === 'ethernet') {
    return false;
  }

  // type 不明（unknown / 空值 / bluetooth 等）：不強制靜態，以免誤傷已連 Wi‑Fi 但瀏覽器未標記 type 的情況
  return false;
}

export function usePreferStaticHomeBackdrop(): boolean {
  const [prefer, setPrefer] = useState(false);

  useLayoutEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);

    const sync = () => {
      setPrefer(shouldPreferStaticBackdrop());
    };

    sync();
    mq.addEventListener('change', sync);

    const conn = getNavigatorConnection();
    conn?.addEventListener?.('change', sync);

    return () => {
      mq.removeEventListener('change', sync);
      conn?.removeEventListener?.('change', sync);
    };
  }, []);

  return prefer;
}
