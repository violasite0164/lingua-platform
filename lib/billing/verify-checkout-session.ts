import type { SupabaseClient } from '@supabase/supabase-js';

import { fulfillCourseEnrollment } from '@/lib/billing/fulfill-course-checkout';
import { claimInboxStaminaPack } from '@/lib/billing/claim-inbox-stamina';
import { deliverStaminaPackToInbox } from '@/lib/billing/inbox-delivery';
import { GAME_STAMINA_MAX, type GameStaminaState } from '@/lib/game/stamina';
import { ensureShopPurchaseRecord } from '@/lib/billing/ensure-shop-purchase';
import { syncStripeSubscriptionToDb } from '@/lib/billing/sync-stripe-subscription';
import { getStripeServer } from '@/lib/stripe/server';

export type CheckoutVerifyResult =
  | {
      ok: true;
      status: 'paid';
      purchaseKind: 'shop_item' | 'subscription' | 'course';
      shopItemKind?: string;
      staminaDelivered?: boolean;
      staminaClaimed?: boolean;
      staminaGranted?: number;
      stamina?: GameStaminaState;
      shopItemTitle?: string;
      enrolled?: boolean;
    }
  | {
      ok: true;
      status: 'pending';
      message: string;
    }
  | {
      ok: false;
      message: string;
    };

/** 付款完成頁確認 Stripe session，並在 webhook 未到時補送體力包至收件匣 */
export async function verifyCheckoutSessionForUser(
  sessionId: string,
  userId: string,
  userSupabase: SupabaseClient,
  adminSupabase: SupabaseClient,
  options?: { autoClaimStamina?: boolean },
): Promise<CheckoutVerifyResult> {
  const stripe = getStripeServer();
  let session: Awaited<ReturnType<typeof stripe.checkout.sessions.retrieve>>;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return { ok: false, message: '無法讀取付款紀錄' };
  }

  const md = session.metadata ?? {};
  if (md.user_id !== userId) {
    return { ok: false, message: '付款紀錄與目前帳號不符' };
  }

  if (session.payment_status !== 'paid') {
    return {
      ok: true,
      status: 'pending',
      message:
        session.status === 'expired'
          ? '付款連結已過期，請重新購買'
          : '付款尚未完成，若已扣款請稍候再重新整理',
    };
  }

  if (md.kind === 'course' && md.course_id) {
    const paymentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.id;
    const result = await fulfillCourseEnrollment(adminSupabase, {
      userId,
      courseId: md.course_id,
      stripePaymentId: paymentId,
    });
    if (!result.ok) {
      return { ok: false, message: result.message };
    }
    return {
      ok: true,
      status: 'paid',
      purchaseKind: 'course',
      enrolled: !result.alreadyEnrolled,
    };
  }

  if (md.kind === 'subscription') {
    const planCode = md.plan_code || 'unknown';
    const stripeSubId =
      typeof session.subscription === 'string' ? session.subscription : null;
    if (stripeSubId) {
      await syncStripeSubscriptionToDb(adminSupabase, {
        userId,
        planCode,
        stripeSubscriptionId: stripeSubId,
        stripeCustomerId:
          typeof session.customer === 'string' ? session.customer : null,
      });
    }
    return { ok: true, status: 'paid', purchaseKind: 'subscription' };
  }

  if (md.kind !== 'shop_item') {
    return { ok: true, status: 'paid', purchaseKind: 'shop_item' };
  }

  const shopItemKind = md.shop_item_kind || '';
  const shopItemId = md.shop_item_id || null;
  const staminaAmount = Number.parseInt(md.stamina_amount || '0', 10);

  const purchaseId = await ensureShopPurchaseRecord(adminSupabase, {
    userId,
    shopItemId: shopItemId,
    stripeCheckoutSessionId: sessionId,
    stripePaymentIntentId:
      typeof session.payment_intent === 'string' ? session.payment_intent : null,
    amountCents: typeof session.amount_total === 'number' ? session.amount_total : null,
    currency: session.currency ?? null,
    status: 'paid',
  });

  const { data: purchase } = purchaseId
    ? await userSupabase
        .from('user_purchases')
        .select('shop_item_id')
        .eq('id', purchaseId)
        .maybeSingle()
    : { data: null };

  let shopItemTitle = '體力道具';
  const resolvedShopItemId = shopItemId || purchase?.shop_item_id || null;
  if (resolvedShopItemId) {
    const { data: shopItem } = await adminSupabase
      .from('shop_items')
      .select('title')
      .eq('id', resolvedShopItemId)
      .maybeSingle();
    if (shopItem?.title) shopItemTitle = shopItem.title;
  }

  let staminaDelivered = false;
  let staminaClaimed = false;
  let staminaGranted: number | undefined;
  let stamina: GameStaminaState | undefined;

  if (
    shopItemKind === 'stamina_pack' &&
    Number.isFinite(staminaAmount) &&
    staminaAmount > 0 &&
    purchaseId
  ) {
    if (options?.autoClaimStamina) {
      const { data: existingInbox } = await userSupabase
        .from('profile_inbox_messages')
        .select('id, claimed_at')
        .eq('user_id', userId)
        .contains('payload', { purchase_id: purchaseId })
        .maybeSingle();

      if (existingInbox?.id && !existingInbox.claimed_at) {
        const claim = await claimInboxStaminaPack(
          userSupabase,
          userId,
          existingInbox.id,
        );
        if (claim.ok) {
          staminaClaimed = true;
          staminaGranted = claim.granted;
          stamina = claim.stamina;
          staminaDelivered = true;
        }
      } else if (existingInbox?.claimed_at) {
        staminaDelivered = true;
        staminaClaimed = true;
        const { data: staminaRow } = await userSupabase.rpc('get_game_stamina');
        const row = staminaRow as Record<string, unknown> | null;
        if (row && row.ok === true) {
          stamina = {
            stamina: typeof row.stamina === 'number' ? row.stamina : GAME_STAMINA_MAX,
            max: typeof row.max === 'number' ? row.max : GAME_STAMINA_MAX,
            isAdmin: row.isAdmin === true,
            nextRegenAt:
              typeof row.nextRegenAt === 'string' ? row.nextRegenAt : null,
          };
        }
      }

      if (!staminaClaimed) {
      const grantAmount = Math.min(
        GAME_STAMINA_MAX,
        Math.max(1, Math.round(staminaAmount)),
      );
      const { data: grantData, error: grantError } = await userSupabase.rpc(
        'grant_game_stamina',
        { p_amount: grantAmount },
      );

      if (!grantError) {
        const grant = grantData as Record<string, unknown> | null;
        if (grant?.ok === true) {
          staminaClaimed = true;
          staminaGranted = grantAmount;
          stamina = {
            stamina:
              typeof grant.stamina === 'number' ? grant.stamina : GAME_STAMINA_MAX,
            max: typeof grant.max === 'number' ? grant.max : GAME_STAMINA_MAX,
            isAdmin: false,
            nextRegenAt: null,
          };
          staminaDelivered = true;

          await deliverStaminaPackToInbox(adminSupabase, {
            userId,
            purchaseId,
            shopItemId: resolvedShopItemId,
            shopItemTitle,
            staminaAmount,
            alreadyClaimed: true,
          });
        }
      }
      }

      if (!staminaClaimed) {
        await deliverStaminaPackToInbox(adminSupabase, {
          userId,
          purchaseId,
          shopItemId: resolvedShopItemId,
          shopItemTitle,
          staminaAmount,
        });

        const { data: inboxRow } = await userSupabase
          .from('profile_inbox_messages')
          .select('id')
          .eq('user_id', userId)
          .contains('payload', { purchase_id: purchaseId })
          .maybeSingle();

        staminaDelivered = Boolean(inboxRow?.id);

        if (inboxRow?.id) {
          const claim = await claimInboxStaminaPack(userSupabase, userId, inboxRow.id);
          if (claim.ok) {
            staminaClaimed = true;
            staminaGranted = claim.granted;
            stamina = claim.stamina;
          }
        }
      }
    } else {
      await deliverStaminaPackToInbox(adminSupabase, {
        userId,
        purchaseId,
        shopItemId: resolvedShopItemId,
        shopItemTitle,
        staminaAmount,
      });

      const { data: inboxRow } = await userSupabase
        .from('profile_inbox_messages')
        .select('id')
        .eq('user_id', userId)
        .contains('payload', { purchase_id: purchaseId })
        .maybeSingle();

      staminaDelivered = Boolean(inboxRow?.id);
    }
  }

  if (options?.autoClaimStamina && staminaClaimed && !stamina) {
    const { data: staminaRow } = await userSupabase.rpc('get_game_stamina');
    const row = staminaRow as Record<string, unknown> | null;
    if (row && row.ok === true) {
      stamina = {
        stamina:
          typeof row.stamina === 'number' ? row.stamina : GAME_STAMINA_MAX,
        max: typeof row.max === 'number' ? row.max : GAME_STAMINA_MAX,
        isAdmin: row.isAdmin === true,
        freePlay: row.freePlay === true,
        nextRegenAt:
          typeof row.nextRegenAt === 'string' ? row.nextRegenAt : null,
      };
    }
  }

  return {
    ok: true,
    status: 'paid',
    purchaseKind: 'shop_item',
    shopItemKind,
    staminaDelivered,
    staminaClaimed,
    staminaGranted,
    stamina,
    shopItemTitle,
  };
}
