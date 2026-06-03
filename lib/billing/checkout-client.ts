export type CheckoutReturnTo = 'commerce' | 'games';

export type CheckoutPayload =
  | { kind: 'shop_item'; shopItemId: string; returnTo?: CheckoutReturnTo }
  | { kind: 'subscription'; planCode: string; returnTo?: CheckoutReturnTo }
  | { kind: 'course'; courseId: string };

export async function startStripeCheckout(payload: CheckoutPayload): Promise<string> {
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
