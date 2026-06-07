'use server';

import { revalidatePath } from 'next/cache';

import { requireCommerceAccess } from '@/lib/commerce/auth';
import { COMMERCE_DEFAULT_CURRENCY } from '@/lib/commerce/constants';
import { parsePriceDollarsToCents } from '@/lib/billing/price-format';
import { createAdminClient } from '@/lib/supabase/server';

export type CommerceManageActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

export type CommerceManageFormState = CommerceManageActionResult | null;

function parseIntSafe(raw: unknown, fallback: number): number {
  const n = Number.parseInt(String(raw ?? '').trim(), 10);
  return Number.isFinite(n) ? n : fallback;
}

function parseBool(raw: unknown): boolean {
  const s = String(raw ?? '').toLowerCase();
  return s === 'true' || s === '1' || s === 'on';
}

function parseSubscriptionPlanGiftsFromForm(
  formData: FormData,
): { shop_item_id: string; quantity: number }[] {
  const ids = formData
    .getAll('gift_shop_item_ids')
    .map((v) => String(v).trim())
    .filter(Boolean);

  return ids.map((shop_item_id) => {
    const raw = formData.get(`gift_qty_${shop_item_id}`);
    const n = Number.parseInt(String(raw ?? '').trim(), 10);
    const quantity = Number.isFinite(n) ? Math.min(99, Math.max(1, n)) : 1;
    return { shop_item_id, quantity };
  });
}

export async function upsertSubscriptionPlan(
  formData: FormData,
): Promise<CommerceManageActionResult> {
  await requireCommerceAccess('/commerce/manage');
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: '缺少 SUPABASE_SERVICE_ROLE_KEY（更新方案需要 Service Role）。' };
  }
  const supabase = await createAdminClient();

  const code = String(formData.get('code') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const priceCents = parsePriceDollarsToCents(formData.get('price_dollars'));
  const currency = String(formData.get('currency') ?? 'usd').trim().toLowerCase();
  const stripePriceId = String(formData.get('stripe_price_id') ?? '').trim() || null;
  const isActive = parseBool(formData.get('is_active'));
  const freePlayGames = parseBool(formData.get('free_play_games'));
  const sortOrder = parseIntSafe(formData.get('sort_order'), 0);

  if (!code) return { ok: false, error: '缺少 code（例如 basic / pro）' };
  if (!title) return { ok: false, error: '缺少 title' };
  if (priceCents === null) return { ok: false, error: '價格格式不正確' };

  const planGifts = parseSubscriptionPlanGiftsFromForm(formData);

  const now = new Date().toISOString();
  const { data: savedPlan, error } = await supabase
    .from('subscription_plans')
    .upsert(
      {
        code,
        title,
        description,
        price_cents: priceCents,
        currency,
        stripe_price_id: stripePriceId,
        is_active: isActive,
        free_play_games: freePlayGames,
        sort_order: sortOrder,
        updated_at: now,
      } as never,
      { onConflict: 'code' },
    )
    .select('code')
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!savedPlan) {
    return { ok: false, error: '訂閱方案寫入失敗（請確認 SUPABASE_SERVICE_ROLE_KEY 已設定）。' };
  }

  const { error: delGiftsErr } = await supabase
    .from('subscription_plan_gifts')
    .delete()
    .eq('plan_code', code);
  if (delGiftsErr) return { ok: false, error: delGiftsErr.message };

  if (planGifts.length > 0) {
    const { error: insGiftsErr } = await supabase.from('subscription_plan_gifts').insert(
      planGifts.map((g) => ({
        plan_code: code,
        shop_item_id: g.shop_item_id,
        quantity: g.quantity,
      })) as never,
    );
    if (insGiftsErr) return { ok: false, error: insGiftsErr.message };
  }
  revalidatePath('/commerce/manage');
  revalidatePath('/commerce/manage/plans');
  revalidatePath('/commerce');
  revalidatePath('/profile');
  revalidatePath('/courses');
  return { ok: true, message: '訂閱方案已儲存' };
}

export async function upsertSubscriptionPlanFormAction(
  _prev: CommerceManageFormState,
  formData: FormData,
): Promise<CommerceManageActionResult> {
  return upsertSubscriptionPlan(formData);
}

export async function upsertShopItem(formData: FormData): Promise<CommerceManageActionResult> {
  await requireCommerceAccess('/commerce/manage');
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: '缺少 SUPABASE_SERVICE_ROLE_KEY（更新商品需要 Service Role）。' };
  }
  const supabase = await createAdminClient();

  const id = String(formData.get('id') ?? '').trim() || null;
  const kind = String(formData.get('kind') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const priceCents = parsePriceDollarsToCents(formData.get('price_dollars'));
  const currency = String(formData.get('currency') ?? COMMERCE_DEFAULT_CURRENCY)
    .trim()
    .toLowerCase();
  const stripePriceId = String(formData.get('stripe_price_id') ?? '').trim() || null;
  const staminaAmountRaw = String(formData.get('stamina_amount') ?? '').trim();
  const staminaAmount = staminaAmountRaw ? parseIntSafe(staminaAmountRaw, 0) : null;
  const isActive = parseBool(formData.get('is_active'));
  const sortOrder = parseIntSafe(formData.get('sort_order'), 0);

  if (!kind) return { ok: false, error: '缺少 kind（例如 stamina_pack）' };
  if (!title) return { ok: false, error: '缺少 title' };
  if (priceCents === null) return { ok: false, error: '價格格式不正確' };

  const payload = {
    id: id ?? undefined,
    kind,
    title,
    description,
    price_cents: priceCents,
    currency,
    stripe_price_id: stripePriceId,
    stamina_amount: staminaAmount,
    is_active: isActive,
    sort_order: sortOrder,
  };

  const { error } = await supabase.from('shop_items').upsert(payload as never);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/commerce/manage');
  revalidatePath('/commerce/manage/products');
  revalidatePath('/commerce');
  return { ok: true, message: id ? '商品已更新' : '商品已建立' };
}

export async function upsertShopItemFormAction(
  _prev: CommerceManageFormState,
  formData: FormData,
): Promise<CommerceManageActionResult> {
  return upsertShopItem(formData);
}

export async function deleteShopItem(itemId: string): Promise<CommerceManageActionResult> {
  await requireCommerceAccess('/commerce/manage/products');
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: '缺少 SUPABASE_SERVICE_ROLE_KEY。' };
  }
  const id = itemId.trim();
  if (!id) return { ok: false, error: '缺少商品 ID' };

  const supabase = await createAdminClient();
  const { error } = await supabase.from('shop_items').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/commerce/manage');
  revalidatePath('/commerce/manage/products');
  revalidatePath('/commerce');
  return { ok: true, message: '商品已刪除' };
}

export async function setShopItemActive(
  itemId: string,
  isActive: boolean,
): Promise<CommerceManageActionResult> {
  await requireCommerceAccess('/commerce/manage/products');
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: '缺少 SUPABASE_SERVICE_ROLE_KEY。' };
  }

  const supabase = await createAdminClient();
  const { error } = await supabase
    .from('shop_items')
    .update({ is_active: isActive, updated_at: new Date().toISOString() } as never)
    .eq('id', itemId);

  if (error) return { ok: false, error: error.message };

  revalidatePath('/commerce/manage/products');
  revalidatePath('/commerce');
  return { ok: true, message: isActive ? '商品已上架' : '商品已下架' };
}
