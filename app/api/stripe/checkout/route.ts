import { NextResponse } from 'next/server';

import { COMMERCE_DEFAULT_CURRENCY } from '@/lib/commerce/constants';
import { expireStalePendingPurchases } from '@/lib/billing/expire-pending-purchases';
import { ensureShopPurchaseRecord } from '@/lib/billing/ensure-shop-purchase';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/supabase/queries';
import { ensurePaymentMethodDomains } from '@/lib/stripe/ensure-payment-method-domain';
import {
  shopCheckoutEmbeddedParams,
  shopCheckoutHostedParams,
} from '@/lib/stripe/shop-checkout-session';
import { getStripeServer } from '@/lib/stripe/server';

type CheckoutReturnTo = 'commerce' | 'games';

type CheckoutBody =
  | {
      kind: 'shop_item';
      shopItemId: string;
      returnTo?: CheckoutReturnTo;
      embedded?: boolean;
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
    const requestOrigin = req.headers.get('origin') ?? req.headers.get('referer');

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

      const returnPath = body.returnTo === 'games' ? '/games' : '/commerce';
      const metadata = {
        kind: 'shop_item',
        shop_item_id: item.id,
        user_id: user.id,
        shop_item_kind: item.kind,
        stamina_amount: item.stamina_amount ? String(item.stamina_amount) : '',
        return_to: body.returnTo === 'games' ? 'games' : 'commerce',
      };

      await ensurePaymentMethodDomains(stripe, requestOrigin);

      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const admin = await createAdminClient();
        await expireStalePendingPurchases(admin, { userId: user.id });
      }

      const returnUrl = `${baseUrl}${returnPath}?checkout=success&session_id={CHECKOUT_SESSION_ID}&shop_kind=${encodeURIComponent(item.kind)}`;
      const cancelUrl = `${baseUrl}${returnPath}?checkout=canceled`;

      if (body.embedded) {
        const session = await stripe.checkout.sessions.create(
          shopCheckoutEmbeddedParams(lineItem, metadata, returnUrl),
        );

        if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
          const admin = await createAdminClient();
          await ensureShopPurchaseRecord(admin, {
            userId: user.id,
            shopItemId: item.id,
            stripeCheckoutSessionId: session.id,
            amountCents: item.price_cents,
            currency,
            status: 'pending',
          });
        }

        if (!session.client_secret) {
          return NextResponse.json({ error: '無法建立嵌入式付款' }, { status: 500 });
        }

        return NextResponse.json({
          clientSecret: session.client_secret,
          sessionId: session.id,
        });
      }

      const session = await stripe.checkout.sessions.create(
        shopCheckoutHostedParams(lineItem, metadata, returnUrl, cancelUrl),
      );

      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const admin = await createAdminClient();
        await ensureShopPurchaseRecord(admin, {
          userId: user.id,
          shopItemId: item.id,
          stripeCheckoutSessionId: session.id,
          amountCents: item.price_cents,
          currency,
          status: 'pending',
        });
      }

      return NextResponse.json({ url: session.url, sessionId: session.id });
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

    const courseId =
      body.kind === 'course'
        ? body.courseId?.trim()
        : 'courseId' in body && typeof (body as { courseId?: string }).courseId === 'string'
          ? (body as { courseId: string }).courseId.trim()
          : '';

    if (!courseId) {
      return NextResponse.json({ error: 'Missing courseId' }, { status: 400 });
    }

    const { data: course, error: courseErr } = await supabase
      .from('courses')
      .select('id, title, description, price, is_free, is_published')
      .eq('id', courseId)
      .maybeSingle();

    if (courseErr || !course) {
      return NextResponse.json(
        { error: courseErr?.message ?? 'Course not found' },
        { status: 400 },
      );
    }

    if (!course.is_published) {
      return NextResponse.json({ error: '課程尚未上架' }, { status: 400 });
    }

    if (course.is_free) {
      return NextResponse.json({ error: '此課程為免費，請直接報名' }, { status: 400 });
    }

    const priceNum = Number(course.price);
    const amountCents = Math.round(priceNum * 100);
    if (!Number.isFinite(priceNum) || amountCents <= 0) {
      return NextResponse.json({ error: '課程尚未設定價格' }, { status: 400 });
    }

    const { data: enrolled } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .maybeSingle();

    if (enrolled?.id) {
      return NextResponse.json({ error: '您已報名此課程' }, { status: 400 });
    }

    const currency = COMMERCE_DEFAULT_CURRENCY;
    const lineItem = {
      price_data: {
        currency,
        unit_amount: amountCents,
        product_data: {
          name: course.title,
          description: course.description || undefined,
        },
      },
      quantity: 1,
    } as const;

    const metadata = {
      kind: 'course',
      course_id: courseId,
      user_id: user.id,
    };

    await ensurePaymentMethodDomains(stripe, requestOrigin);

    const successUrl = `${baseUrl}/courses/${courseId}?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/courses/${courseId}?checkout=canceled`;

    const session = await stripe.checkout.sessions.create({
      ...shopCheckoutHostedParams(lineItem, metadata, successUrl, cancelUrl),
      customer_email: user.email ?? undefined,
    });

    if (!session.url) {
      return NextResponse.json({ error: '無法建立付款連結' }, { status: 500 });
    }

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Stripe error' },
      { status: 500 },
    );
  }
}

