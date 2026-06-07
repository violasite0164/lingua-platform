const preloaded = new Set<string>();

/**
 * 以 fetch 預熱 Rive 檔至瀏覽器 HTTP cache（不解析 .riv）。
 * 失敗不拋錯，由 Rive runtime 載入時再 fallback。
 */
export async function preloadRiveAsset(src: string): Promise<boolean> {
  if (preloaded.has(src)) return true;
  try {
    const res = await fetch(src, {
      method: 'GET',
      cache: 'force-cache',
      credentials: 'same-origin',
    });
    if (!res.ok) return false;
    preloaded.add(src);
    return true;
  } catch {
    return false;
  }
}

export function clearRivePreloadCache(): void {
  preloaded.clear();
}
