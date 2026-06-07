export const GAMES_STAMINA_CHECKOUT_SESSION_KEY = 'games-stamina-checkout-session';

export function rememberGamesStaminaCheckoutSession(sessionId: string): void {
  try {
    sessionStorage.setItem(GAMES_STAMINA_CHECKOUT_SESSION_KEY, sessionId.trim());
  } catch {
    /* ignore */
  }
}
