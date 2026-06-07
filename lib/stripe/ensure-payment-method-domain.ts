import type Stripe from 'stripe';

/** 避免同一程序重複註冊同一網域 */
const ensuredHostnames = new Set<string>();

function hostnameFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function collectCandidateHostnames(requestUrl?: string | null): string[] {
  const hosts = new Set<string>();
  const envBase =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');

  if (envBase) {
    const h = hostnameFromUrl(envBase);
    if (h) hosts.add(h);
  }

  if (requestUrl) {
    const h = hostnameFromUrl(requestUrl);
    if (h) hosts.add(h);
  }

  return [...hosts];
}

/**
 * 嵌入式 Checkout 要在商家網域顯示 Apple Pay / Google Pay，須先註冊 Payment Method Domain。
 * @see https://docs.stripe.com/payments/payment-method-domains
 */
export async function ensurePaymentMethodDomains(
  stripe: Stripe,
  requestUrl?: string | null,
): Promise<void> {
  const hostnames = collectCandidateHostnames(requestUrl);
  for (const hostname of hostnames) {
    if (!hostname || ensuredHostnames.has(hostname)) continue;

    try {
      const listed = await stripe.paymentMethodDomains.list({
        domain_name: hostname,
        limit: 1,
      });

      let domain = listed.data[0];
      if (!domain) {
        domain = await stripe.paymentMethodDomains.create({
          domain_name: hostname,
          enabled: true,
        });
      }

      if (domain.apple_pay.status !== 'active' || domain.google_pay.status !== 'active') {
        try {
          domain = await stripe.paymentMethodDomains.validate(domain.id);
        } catch {
          /* 驗證檔尚未部署時仍允許結帳（卡號仍可付） */
        }
      }

      ensuredHostnames.add(hostname);
    } catch (err) {
      console.warn('[ensurePaymentMethodDomains]', hostname, err);
    }
  }
}
