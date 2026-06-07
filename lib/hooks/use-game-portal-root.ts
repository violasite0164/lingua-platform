'use client';

import { useEffect, useState } from 'react';

import { getGamePortalRoot } from '@/lib/dom-fullscreen';

/** Portal 目標：全螢幕時掛在 GameShell 內，否則 document.body */
export function useGamePortalRoot(): HTMLElement | null {
  const [root, setRoot] = useState<HTMLElement | null>(() =>
    typeof document !== 'undefined' ? getGamePortalRoot() : null,
  );

  useEffect(() => {
    const sync = () => setRoot(getGamePortalRoot());
    sync();
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
    };
  }, []);

  return root;
}

export function isGameShellFullscreenPortal(portalRoot: HTMLElement | null): boolean {
  if (!portalRoot || typeof document === 'undefined') return false;
  return portalRoot !== document.body;
}
