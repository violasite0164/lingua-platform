'use client';

import { useEffect, useState } from 'react';

import '@/app/mobile-landscape.css';

import {
  getMobileLandscapeMediaQuery,
  tryLockLandscapeOrientation,
} from '@/lib/games/mobile-landscape';
import { cn } from '@/lib/utils';

type Props = {
  children: React.ReactNode;
  className?: string;
};

/**
 * 手機直向時強制橫屏：優先 Screen Orientation API，否則以 CSS 旋轉整頁遊戲區。
 */
export function MobileLandscapeEnforcer({ children, className }: Props) {
  const [forced, setForced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(getMobileLandscapeMediaQuery());
    const sync = () => setForced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (!forced) return;
    document.documentElement.setAttribute('data-mobile-landscape-forced', '');
    return () => document.documentElement.removeAttribute('data-mobile-landscape-forced');
  }, [forced]);

  useEffect(() => {
    const onGesture = () => {
      void tryLockLandscapeOrientation();
    };
    window.addEventListener('pointerdown', onGesture, { once: true, passive: true });
    window.addEventListener('touchstart', onGesture, { once: true, passive: true });
    return () => {
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('touchstart', onGesture);
    };
  }, []);

  return (
    <div
      className={cn('mobile-landscape-root', forced && 'mobile-landscape-root--forced')}
    >
      <div className={cn('mobile-landscape-page', className)}>{children}</div>
    </div>
  );
}
