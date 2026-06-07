export function supportsDomFullscreen(): boolean {
  if (typeof document === 'undefined') return false;
  const root = document.documentElement;
  const hasStandard = typeof root.requestFullscreen === 'function';
  const hasWebkit =
    typeof (root as HTMLElement & { webkitRequestFullscreen?: () => void })
      .webkitRequestFullscreen === 'function';
  if (!hasStandard && !hasWebkit) return false;
  if ('fullscreenEnabled' in document && document.fullscreenEnabled === false) return false;
  return true;
}

function getFullscreenElement(): Element | null {
  const doc = document as Document & { webkitFullscreenElement?: Element | null };
  return document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

export function isElementFullscreen(el: Element | null): boolean {
  if (!el) return false;
  return getFullscreenElement() === el;
}

function resolveGameShellElement(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  const shell = document.querySelector('[data-game-shell]');
  return shell instanceof HTMLElement ? shell : null;
}

/** React portal 掛載點：全螢幕時掛在全螢幕元素；否則掛在 GameShell，避免蓋住整頁連結 */
export function getGamePortalRoot(): HTMLElement {
  if (typeof document === 'undefined') {
    throw new Error('getGamePortalRoot requires document');
  }
  const fs = getFullscreenElement();
  if (fs instanceof HTMLElement) return fs;
  return resolveGameShellElement() ?? document.body;
}

export async function requestElementFullscreen(el: HTMLElement): Promise<void> {
  const elWk = el as HTMLElement & { webkitRequestFullscreen?: () => void };
  try {
    if (getFullscreenElement() === el) return;
    if (typeof el.requestFullscreen === 'function') {
      await el.requestFullscreen();
    } else if (typeof elWk.webkitRequestFullscreen === 'function') {
      await Promise.resolve(elWk.webkitRequestFullscreen());
    }
  } catch {
    // 瀏覽器拒絕全螢幕（常見於非使用者手勢觸發）
  }
}

export async function toggleElementFullscreen(el: HTMLElement): Promise<void> {
  const doc = document as Document & {
    webkitExitFullscreen?: () => Promise<void> | void;
  };
  const elWk = el as HTMLElement & { webkitRequestFullscreen?: () => void };
  try {
    if (getFullscreenElement() === el) {
      if (typeof document.exitFullscreen === 'function') {
        await document.exitFullscreen();
      } else if (typeof doc.webkitExitFullscreen === 'function') {
        await Promise.resolve(doc.webkitExitFullscreen());
      }
      return;
    }
    await requestElementFullscreen(el);
  } catch {
    // 瀏覽器拒絕全螢幕
  }
}
