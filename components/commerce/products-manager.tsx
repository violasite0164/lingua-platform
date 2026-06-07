'use client';

import { useActionState, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';

import { CommerceActionBanner } from '@/components/commerce/commerce-action-banner';
import { CommerceStatusBadge } from '@/components/commerce/commerce-status-badge';
import { commerceInputClass, commerceLabelClass } from '@/components/commerce/field-classes';
import { formatCentsAsDollarInput } from '@/lib/billing/price-format';
import { COMMERCE_DEFAULT_CURRENCY } from '@/lib/commerce/constants';
import { formatMoneyCents } from '@/lib/commerce/format';
import {
  deleteShopItem,
  setShopItemActive,
  upsertShopItemFormAction,
  type CommerceManageFormState,
} from '@/lib/commerce/manage-actions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ShopItem } from '@/types/database.types';
import { cn } from '@/lib/utils';

type Props = {
  items: ShopItem[];
};

export function ProductsManager({ items }: Props) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<ShopItem | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function refresh() {
    router.refresh();
  }

  function handleToggleActive(item: ShopItem) {
    setActionError(null);
    setPendingId(item.id);
    startTransition(async () => {
      const res = await setShopItemActive(item.id, !item.is_active);
      setPendingId(null);
      if (!res.ok) {
        setActionError(res.error);
        return;
      }
      refresh();
    });
  }

  function handleDelete(item: ShopItem) {
    if (!window.confirm(`確定刪除「${item.title}」？已存在的訂單紀錄仍會保留。`)) return;
    setActionError(null);
    setPendingId(item.id);
    startTransition(async () => {
      const res = await deleteShopItem(item.id);
      setPendingId(null);
      if (!res.ok) {
        setActionError(res.error);
        return;
      }
      refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          管理一次性商品；未填 Stripe Price ID 時結帳會以 price_data 建立臨時價格。
        </p>
        <Button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="bg-emerald-600 text-white hover:bg-emerald-500"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          新增商品
        </Button>
      </div>

      {actionError ? (
        <p className="rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {actionError}
        </p>
      ) : null}

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <p className="font-medium">尚無商品</p>
          <p className="mt-1 text-sm text-muted-foreground">建立體力包、道具或其他一次性商品。</p>
          <Button
            type="button"
            className="mt-4 bg-emerald-600 hover:bg-emerald-500"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            建立第一個商品
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">商品</th>
                <th className="px-4 py-3 font-medium">類型</th>
                <th className="px-4 py-3 font-medium">價格</th>
                <th className="px-4 py-3 font-medium">體力</th>
                <th className="px-4 py-3 font-medium">狀態</th>
                <th className="px-4 py-3 font-medium">排序</th>
                <th className="px-4 py-3 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="font-medium">{item.title}</p>
                    <p className="line-clamp-1 text-xs text-muted-foreground">{item.description || '—'}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.kind}</td>
                  <td className="px-4 py-3">
                    {formatMoneyCents(item.price_cents, item.currency)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {item.stamina_amount != null ? item.stamina_amount : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <CommerceStatusBadge status={item.is_active ? 'active' : 'inactive'} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{item.sort_order}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditItem(item)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8"
                        disabled={isPending && pendingId === item.id}
                        onClick={() => handleToggleActive(item)}
                      >
                        {isPending && pendingId === item.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : item.is_active ? (
                          '下架'
                        ) : (
                          '上架'
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-red-400 hover:text-red-300"
                        disabled={isPending && pendingId === item.id}
                        onClick={() => handleDelete(item)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ProductFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        item={null}
        onSuccess={() => {
          setCreateOpen(false);
          refresh();
        }}
      />

      <ProductFormDialog
        open={editItem !== null}
        onOpenChange={(open) => {
          if (!open) setEditItem(null);
        }}
        item={editItem}
        onSuccess={() => {
          setEditItem(null);
          refresh();
        }}
      />
    </div>
  );
}

function ProductFormDialog({
  open,
  onOpenChange,
  item,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ShopItem | null;
  onSuccess: () => void;
}) {
  const isEdit = item !== null;
  const [state, formAction] = useActionState<CommerceManageFormState, FormData>(
    upsertShopItemFormAction,
    null,
  );

  const succeeded = state?.ok === true;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? '編輯商品' : '新增商品'}</DialogTitle>
          <DialogDescription>
            {isEdit ? '更新後立即反映於商店前台。' : '建立後可在商品目錄中上架。'}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-3">
          {isEdit ? <input type="hidden" name="id" value={item.id} /> : null}

          <CommerceActionBanner state={state} />

          {succeeded ? (
            <DialogFooter>
              <Button type="button" onClick={onSuccess} className="bg-emerald-600 hover:bg-emerald-500">
                完成
              </Button>
            </DialogFooter>
          ) : (
            <>
              <label className={commerceLabelClass}>
                標題
                <input name="title" required defaultValue={item?.title ?? ''} className={commerceInputClass} />
              </label>

              <label className={commerceLabelClass}>
                類型（kind）
                <input
                  name="kind"
                  required
                  placeholder="stamina_pack"
                  defaultValue={item?.kind ?? 'stamina_pack'}
                  className={cn(commerceInputClass, 'font-mono text-xs')}
                />
              </label>

              <label className={commerceLabelClass}>
                描述
                <textarea
                  name="description"
                  rows={2}
                  defaultValue={item?.description ?? ''}
                  className={commerceInputClass}
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className={commerceLabelClass}>
                  價格（HKD）
                  <input
                    name="price_dollars"
                    type="number"
                    min={0}
                    step={0.01}
                    defaultValue={formatCentsAsDollarInput(item?.price_cents ?? 0)}
                    className={commerceInputClass}
                  />
                </label>
                <label className={commerceLabelClass}>
                  幣別
                  <input
                    name="currency"
                    defaultValue={item?.currency ?? COMMERCE_DEFAULT_CURRENCY}
                    className={commerceInputClass}
                  />
                </label>
              </div>

              <label className={commerceLabelClass}>
                體力數量（選填，kind=stamina_pack 時使用）
                <input
                  name="stamina_amount"
                  type="number"
                  min={0}
                  defaultValue={item?.stamina_amount ?? ''}
                  className={commerceInputClass}
                />
              </label>

              <label className={commerceLabelClass}>
                Stripe Price ID（選填）
                <input
                  name="stripe_price_id"
                  placeholder="price_..."
                  defaultValue={item?.stripe_price_id ?? ''}
                  className={cn(commerceInputClass, 'font-mono text-xs')}
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className={commerceLabelClass}>
                  排序
                  <input
                    name="sort_order"
                    type="number"
                    defaultValue={item?.sort_order ?? 0}
                    className={commerceInputClass}
                  />
                </label>
                <label className={commerceLabelClass}>
                  狀態
                  <span className="mt-1 flex items-center gap-2 text-sm">
                    <input type="checkbox" name="is_active" defaultChecked={item?.is_active ?? true} />
                    上架
                  </span>
                </label>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                  取消
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500">
                  {isEdit ? '儲存變更' : '建立商品'}
                </Button>
              </DialogFooter>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
