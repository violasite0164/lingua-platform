import type Stripe from 'stripe';

type ShopLineItem =
  | { price: string; quantity: number }
  | {
      price_data: {
        currency: string;
        unit_amount: number;
        product_data: { name: string; description?: string };
      };
      quantity: number;
    };

/** 共用：商店一次性付款 Checkout Session 參數（含 Apple Pay 錢包） */
export function shopCheckoutSessionBase(
  lineItem: ShopLineItem,
  metadata: Record<string, string>,
  returnUrl: string,
): Pick<
  Stripe.Checkout.SessionCreateParams,
  'mode' | 'line_items' | 'metadata' | 'payment_method_types' | 'payment_method_options'
> & { payment_method_configuration?: string } {
  const params: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    line_items: [lineItem],
    metadata,
    /** 卡片通道會一併提供 Apple Pay / Google Pay（依網域與裝置） */
    payment_method_types: ['card'],
    payment_method_options: {
      card: {
        request_three_d_secure: 'automatic',
      },
    },
  };

  const pmc = process.env.STRIPE_PAYMENT_METHOD_CONFIGURATION?.trim();
  if (pmc) {
    return { ...params, payment_method_configuration: pmc };
  }

  return params;
}

export function shopCheckoutEmbeddedParams(
  lineItem: ShopLineItem,
  metadata: Record<string, string>,
  returnUrl: string,
): Stripe.Checkout.SessionCreateParams {
  return {
    ...shopCheckoutSessionBase(lineItem, metadata, returnUrl),
    ui_mode: 'embedded',
    return_url: returnUrl,
    /** 盡量留在原頁完成結帳，避免整頁導向導致遊戲狀態（續關 checkpoint）遺失 */
    redirect_on_completion: 'if_required',
    /** 遊戲內嵌結帳關閉 Link，避免彈窗關閉後卡在「等待 Link」畫面 */
    wallet_options: {
      link: {
        display: 'never',
      },
    },
  } as Stripe.Checkout.SessionCreateParams;
}

export function shopCheckoutHostedParams(
  lineItem: ShopLineItem,
  metadata: Record<string, string>,
  successUrl: string,
  cancelUrl: string,
): Stripe.Checkout.SessionCreateParams {
  return {
    ...shopCheckoutSessionBase(lineItem, metadata, successUrl),
    success_url: successUrl,
    cancel_url: cancelUrl,
  };
}
