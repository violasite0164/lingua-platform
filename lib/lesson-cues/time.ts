/** 秒 → m:ss（導師後台顯示） */
export function formatCueTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

/** m:ss 或純數字秒 → 秒；無效則 null */
export function parseCueTimeInput(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^\d+$/.test(trimmed)) {
    return Math.max(0, parseInt(trimmed, 10));
  }

  const match = /^(\d+):(\d{1,2})$/.exec(trimmed);
  if (!match) return null;

  const minutes = parseInt(match[1], 10);
  const secs = parseInt(match[2], 10);
  if (secs >= 60) return null;
  return minutes * 60 + secs;
}
