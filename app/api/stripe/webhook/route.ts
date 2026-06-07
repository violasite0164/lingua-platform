import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

import { fulfillCourseEnrollment } from '@/lib/billing/fulfill-course-checkout';
import { deliverStaminaPackToInbox } from '@/lib/billing/inbox-delivery';
import { ensureShopPurchaseRecord } from '@/lib/billing/ensure-shop-purchase';
import {
  applyStripeSubscriptionEvent,
  syncStripeSubscriptionToDb,
} from '@/lib/billing/sync-stripe-subscription';
import { createAdminClient } from '@/lib/supabase/server';
import { getStripeServer } from '@/lib/stripe/server';

export async function POST(req: Request) {
  const sig = (await headers()).get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json({ error: 'Missing webhook signature/secret' }, { status: 400 });
  }

  const stripe = getStripeServer();
  const body = await req.text();

  let event: ReturnType<typeof stripe.webhooks.constructEvent>;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Invalid signature' },
      { status: 400 },
    );
  }

  // idempotency guard
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 });
  }
  const supabase = await createAdminClient();
  const { data: existing } = await supabase
    .from('stripe_events')
    .select('id')
    .eq('id', event.id)
    .maybeSingle();
  if (existing) return NextResponse.json({ received: true });
  await supabase.from('stripe_events').insert({ id: event.id, type: event.type } as never);

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as {
        id: string;
        mode: 'payment' | 'subscription';
        payment_intent?: string | null;
        subscription?: string | null;
        customer?: string | null;
        metadata?: Record<string, string>;
        amount_total?: number | null;
        currency?: string | null;
      };

      const md = session.metadata ?? {};
      const userId = md.user_id;
      if (md.kind === 'shop_item' && userId) {
        const shopItemId = md.shop_item_id || null;
        await supabase
          .from('user_purchases')
          .update({
            status: 'paid',
            stripe_payment_intent_id: session.payment_intent ?? null,
            amount_cents: typeof session.amount_total === 'number' ? session.amount_total : null,
            currency: session.currency ?? null,
          } as never)
          .eq('stripe_checkout_session_id', session.id);

        let purchaseId: string | null = null;
        const { data: purchaseRow } = await supabase
          .from('user_purchases')
          .select('id')
          .eq('stripe_checkout_session_id', session.id)
          .maybeSingle();
        purchaseId = purchaseRow?.id ?? null;

        if (md.shop_item_kind === 'stamina_pack') {
          const amount = Number.parseInt(md.stamina_amount || '0', 10);
          if (Number.isFinite(amount) && amount > 0 && purchaseId) {
            let shopTitle = '體力道具';
            if (shopItemId) {
              const { data: shopItem } = await supabase
                .from('shop_items')
                .select('title')
                .eq('id', shopItemId)
                .maybeSingle();
              if (shopItem?.title) shopTitle = shopItem.title;
            }
            await deliverStaminaPackToInbox(supabase, {
              userId,
              purchaseId,
              shopItemId,
              shopItemTitle: shopTitle,
              staminaAmount: amount,
            });
          }
        }

      }

      if (md.kind === 'course' && userId && md.course_id) {
        const paymentId =
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.id;
        await fulfillCourseEnrollment(supabase, {
          userId,
          courseId: md.course_id,
          stripePaymentId: paymentId,
        });
      }

      if (md.kind === 'subscription' && userId) {
        const planCode = md.plan_code || 'unknown';
        const stripeSubId =
          typeof session.subscription === 'string' ? session.subscription : null;

        if (stripeSubId) {
          await syncStripeSubscriptionToDb(supabase, {
            userId,
            planCode,
            stripeSubscriptionId: stripeSubId,
            stripeCustomerId: (session.customer as string | null) ?? null,
          });
        } else {
          await supabase.from('user_subscriptions').upsert(
            {
              user_id: userId,
              plan_code: planCode,
              stripe_customer_id: (session.customer as string | null) ?? null,
              status: 'active',
            } as never,
            { onConflict: 'user_id,plan_code' },
          );
        }

        if (session.customer) {
          await supabase
            .from('profiles')
            .update({ stripe_customer_id: session.customer as string } as never)
            .eq('id', userId);
        }
      }
    }

    if (event.type === 'checkout.session.expired') {
      const session = event.data.object as { id: string };
      await supabase
        .from('user_purchases')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() } as never)
        .eq('stripe_checkout_session_id', session.id)
        .eq('status', 'pending');
    }

    if (
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      const sub = event.data.object as {
        id: string;
        status: string;
        current_period_end?: number;
        customer?: string | null;
      };
      await applyStripeSubscriptionEvent(supabase, sub);
    }
  } catch (e) {
    // Don't throw; Stripe will retry. But we should signal failure.
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Webhook handler failed' },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}

