/** 瀏覽器在 pause / 切換音源時常對 play() 拋出 AbortError，屬預期行為 */
export function isPlayAbortError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const name = 'name' in err ? String(err.name) : '';
  const message = 'message' in err ? String(err.message) : '';
  return name === 'AbortError' || /aborted/i.test(message);
}

export function ignorePlayAbort<T>(promise: Promise<T>): Promise<T | undefined> {
  return promise.catch((err) => {
    if (isPlayAbortError(err)) return undefined;
    throw err;
  });
}

/** play() 失敗（含 Load failed、NotAllowedError）時不拋出，避免 console TypeError */
export function swallowMediaPlayError<T>(promise: Promise<T>): Promise<T | undefined> {
  return promise.catch(() => undefined);
}

export function isLikelyPlayableMediaUrl(url: string | null | undefined): url is string {
  const trimmed = url?.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) return true;
  if (trimmed.startsWith('/')) return true;
  try {
    const base =
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const parsed = new URL(trimmed, base);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function waitMediaCanPlay(
  el: HTMLMediaElement,
  timeoutMs = 12_000,
): Promise<boolean> {
  if (el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      el.removeEventListener('canplay', onReady);
      el.removeEventListener('error', onError);
      resolve(ok);
    };
    const onReady = () => finish(true);
    const onError = () => finish(false);
    const timer = window.setTimeout(() => finish(false), timeoutMs);

    el.addEventListener('canplay', onReady, { once: true });
    el.addEventListener('error', onError, { once: true });
  });
}

type MediaTimeTarget = {
  currentTime: number;
  readyState?: number;
  duration?: number;
  seekable?: TimeRanges;
};

/** 避免在未載入 metadata 時 seek 觸發 IndexSizeError（Safari 常見） */
export function safeSetMediaCurrentTime(
  el: MediaTimeTarget | null | undefined,
  time = 0,
): void {
  if (!el) return;
  try {
    if (typeof el.readyState === 'number' && el.readyState < 1) return;

    const duration = el.duration;
    if (typeof duration === 'number' && Number.isFinite(duration) && duration > 0) {
      el.currentTime = Math.min(Math.max(0, time), Math.max(0, duration - 0.001));
      return;
    }

    if (time !== 0) return;

    const seekable =
      'seekable' in el && el.seekable && typeof el.seekable.length === 'number'
        ? el.seekable
        : null;
    if (seekable && seekable.length > 0) {
      el.currentTime = Math.max(0, seekable.start(0));
    }
  } catch {
    /* ignore IndexSizeError / InvalidStateError */
  }
}
