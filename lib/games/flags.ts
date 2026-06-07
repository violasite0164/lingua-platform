/** 是否嘗試載入 Quiz 的 Rive 角色（預設關閉，避免缺檔時主控台 404） */
export function isRiveQuizEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_RIVE_QUIZ_ENABLED === 'true') return true;
  return false;
}

/** 使用者是否偏好減少動態效果 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
}
