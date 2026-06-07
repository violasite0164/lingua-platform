/** 判斷伺服器回傳訊息是否為體力不足 */
export function isStaminaInsufficientMessage(message: string): boolean {
  const m = message.trim();
  if (!m) return false;
  return m.includes('體力不足') || /insufficient\s+stamina/i.test(m);
}
