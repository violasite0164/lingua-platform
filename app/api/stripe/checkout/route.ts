import { NextResponse } from 'next/server';

import { COMMERCE_DEFAULT_CURRENCY } from '@/lib/commerce/constants';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/supabase/queries';
import { getStripeServer } from '@/lib/stripe/server';

type CheckoutReturnTo = 'commerce' | 'games';

type CheckoutBody =
  | {
      kind: 'shop_item';
      shopItemId: string;
      returnTo?: CheckoutReturnTo;
      courseId?: never;
      planCode?: never;
    }
  | {
      kind: 'subscription';
      planCode: string;
      returnTo?: CheckoutReturnTo;
      shopItemId?: never;
      courseId?: never;
    }
  | { kind: 'course'; courseId: string; shopItemId?: never; planCode?: never; returnTo?: never };

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    'http://localhost:3000'
  );
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }

    const profile = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }

    const body = (await req.json()) as CheckoutBody;
    const stripe = getStripeServer();
    const baseUrl = siteUrl();

    if (body.kind === 'shop_item') {
      const { data: item, error } = await supabase
        .from('shop_items')
        .select('id, title, description, price_cents, currency, stripe_price_id, stamina_amount, kind')
        .eq('id', body.shopItemId)
        .maybeSingle();
      if (error || !item) {
        return NextResponse.json({ error: error?.message ?? 'Item not found' }, { status: 400 });
      }

      const currency = (item.currency || COMMERCE_DEFAULT_CURRENCY).toLowerCase();
      const lineItem =
        item.stripe_price_id?.trim()
          ? ({ price: item.stripe_price_id, quantity: 1 } as const)
          : ({
              price_data: {
                currency,
                unit_amount: item.price_cents,
                product_data: {
                  name: item.title,
                  description: item.description || undefined,
                },
              },
              quantity: 1,
            } as const);

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [lineItem],
        success_url: `${baseUrl}/commerce?success=1`,
        cancel_url: `${baseUrl}/commerce?canceled=1`,
        metadata: {
          kind: 'shop_item',
          shop_item_id: item.id,
          user_id: user.id,
          shop_item_kind: item.kind,
          stamina_amount: item.stamina_amount ? String(item.stamina_amount) : '',
        },
      });

      // record pending purchase (best effort)
      await supabase.from('user_purchases').insert({
        user_id: user.id,
        kind: 'shop_item',
        shop_item_id: item.id,
        stripe_checkout_session_id: session.id,
        amount_cents: item.price_cents,
        currency,
        status: 'pending',
      } as never);

      return NextResponse.json({ url: session.url });
    }

    if (body.kind === 'subscription') {
      const { data: plan, error } = await supabase
        .from('subscription_plans')
        .select('code, title, description, price_cents, currency, stripe_price_id, is_active')
        .eq('code', body.planCode)
        .maybeSingle();
      if (error || !plan || !plan.is_active) {
        return NextResponse.json({ error: error?.message ?? 'Plan not found' }, { status: 400 });
      }

      const currency = (plan.currency || COMMERCE_DEFAULT_CURRENCY).toLowerCase();
      const lineItem = plan.stripe_price_id?.trim()
        ? ({ price: plan.stripe_price_id, quantity: 1 } as const)
        : plan.price_cents > 0
          ? ({
              price_data: {
                currency,
                unit_amount: plan.price_cents,
                recurring: { interval: 'month' as const },
                product_data: {
                  name: plan.title,
                  description: plan.description || undefined,
                },
              },
              quantity: 1,
            } as const)
          : null;

      if (!lineItem) {
        return NextResponse.json(
          { error: '方案尚未設定價格，請先到 Commerce 管理後台填寫價格或 Stripe Price ID' },
          { status: 400 },
        );
      }

      const returnPath = body.returnTo === 'games' ? '/games' : '/commerce';
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [lineItem],
        success_url: `${baseUrl}${returnPath}?checkout=success&session_id={CHECKOUT_SESSION_ID}&shop_kind=subscription`,
        cancel_url: `${baseUrl}${returnPath}?checkout=canceled`,
        metadata: {
          kind: 'subscription',
          plan_code: plan.code,
          user_id: user.id,
        },
      });

      return NextResponse.json({ url: session.url });
    }

    // kind === 'course' (existing enroll button)
    // We keep this route but return a clear error until course pricing is wired.
    return NextResponse.json(
      { error: 'COURSE_CHECKOUT_NOT_IMPLEMENTED' },
      { status: 400 },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Stripe error' },
      { status: 500 },
    );
  }
}

