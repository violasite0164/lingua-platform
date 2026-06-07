'use client';

import { useEffect, useState } from 'react';

import '@/app/mobile-landscape.css';

import {
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
    const coarseMq = window.matchMedia('((hover: none) or (pointer: coarse))');
    const sync = () => {
      const w = window.innerWidth || document.documentElement.clientWidth || 0;
      const h = window.innerHeight || document.documentElement.clientHeight || 0;
      const portrait = h >= w;
      const narrowScreen = Math.min(w, h) <= 896;
      setForced(coarseMq.matches && narrowScreen && portrait);
    };
    sync();
    coarseMq.addEventListener('change', sync);
    window.addEventListener('resize', sync);
    window.addEventListener('orientationchange', sync);
    return () => {
      coarseMq.removeEventListener('change', sync);
      window.removeEventListener('resize', sync);
      window.removeEventListener('orientationchange', sync);
    };
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
      className={cn(
        'mobile-landscape-root flex min-h-0 w-full flex-1 flex-col',
        forced && 'mobile-landscape-root--forced',
      )}
    >
      <div className={cn('mobile-landscape-page flex min-h-0 w-full flex-1 flex-col', className)}>
        {children}
      </div>
    </div>
  );
}
