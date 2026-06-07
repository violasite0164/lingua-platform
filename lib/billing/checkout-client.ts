export type CheckoutReturnTo = 'commerce' | 'games';

export type CheckoutPayload =
  | { kind: 'shop_item'; shopItemId: string; returnTo?: CheckoutReturnTo }
  | { kind: 'subscription'; planCode: string; returnTo?: CheckoutReturnTo }
  | { kind: 'course'; courseId: string };

export type EmbeddedShopCheckoutPayload = {
  kind: 'shop_item';
  shopItemId: string;
  returnTo?: CheckoutReturnTo;
};

export async function startStripeCheckout(payload: CheckoutPayload): Promise<string> {
  if (payload.kind === 'shop_item') {
    const { url } = await createHostedShopCheckout(payload);
    return url;
  }

  const res = await fetch('/api/stripe/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = (await res.json()) as { url?: string; error?: string };
  if (!res.ok || !json.url) {
    throw new Error(json.error ?? '無法開始付款，請稍後再試');
  }
  return json.url;
}

/** Stripe 託管結帳頁（checkout.stripe.com）— Apple Pay 在 Chrome 等瀏覽器較完整 */
export async function createHostedShopCheckout(
  payload: CheckoutPayload & { kind: 'shop_item' },
): Promise<{ url: string; sessionId: string }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined' && window.location.origin) {
    headers.Origin = window.location.origin;
  }

  const res = await fetch('/api/stripe/checkout', {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...payload, embedded: false }),
  });
  const json = (await res.json()) as { url?: string; sessionId?: string; error?: string };
  if (!res.ok || !json.url || !json.sessionId) {
    throw new Error(json.error ?? '無法開始付款，請稍後再試');
  }
  return { url: json.url, sessionId: json.sessionId };
}

/** 遊戲內彈窗：Stripe Embedded Checkout（不離開頁面、不需瀏覽器彈出視窗） */
export async function createEmbeddedShopCheckout(
  payload: EmbeddedShopCheckoutPayload,
): Promise<{ clientSecret: string; sessionId: string }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined' && window.location.origin) {
    headers.Origin = window.location.origin;
  }

  const res = await fetch('/api/stripe/checkout', {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...payload, embedded: true }),
  });
  const json = (await res.json()) as {
    clientSecret?: string;
    sessionId?: string;
    error?: string;
  };
  if (!res.ok || !json.clientSecret || !json.sessionId) {
    const msg = json.error ?? '無法開始付款，請稍後再試';
    throw new Error(msg);
  }
  return { clientSecret: json.clientSecret, sessionId: json.sessionId };
}

export async function verifyCheckoutAndClaimStamina(sessionId: string): Promise<
  | {
      ok: true;
      staminaClaimed: boolean;
      staminaGranted?: number;
      stamina?: {
        stamina: number;
        max: number;
        isAdmin: boolean;
        nextRegenAt: string | null;
      };
      shopItemTitle?: string;
    }
  | { ok: false; message: string }
  | { ok: true; status: 'pending'; message: string }
> {
  const res = await fetch('/api/stripe/checkout/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, autoClaimStamina: true }),
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    return {
      ok: false,
      message: typeof json.message === 'string' ? json.message : '付款確認失敗',
    };
  }
  if (json.ok !== true) {
    return {
      ok: false,
      message: typeof json.message === 'string' ? json.message : '付款確認失敗',
    };
  }
  if (json.status === 'pending') {
    return {
      ok: true,
      status: 'pending',
      message: typeof json.message === 'string' ? json.message : '付款處理中',
    };
  }
  const staminaRaw = json.stamina as Record<string, unknown> | undefined;
  return {
    ok: true,
    staminaClaimed: json.staminaClaimed === true,
    staminaGranted:
      typeof json.staminaGranted === 'number' ? json.staminaGranted : undefined,
    stamina:
      staminaRaw && typeof staminaRaw.stamina === 'number'
        ? {
            stamina: staminaRaw.stamina,
            max: typeof staminaRaw.max === 'number' ? staminaRaw.max : 10,
            isAdmin: staminaRaw.isAdmin === true,
            nextRegenAt:
              typeof staminaRaw.nextRegenAt === 'string' ? staminaRaw.nextRegenAt : null,
          }
        : undefined,
    shopItemTitle:
      typeof json.shopItemTitle === 'string' ? json.shopItemTitle : undefined,
  };
}
