'use client';

import {
  FALLBACK_SUBSCRIPTION_PLAN_LABELS,
  type SubscriptionPlanLabels,
} from '@/lib/billing/subscription-plan-labels';

type Props = {
  /** 課程層級：無「沿用」選項 */
  mode: 'course' | 'lesson' | 'quiz';
  courseBasic?: boolean;
  coursePro?: boolean;
  entityBasic?: boolean | null;
  entityPro?: boolean | null;
  planLabels?: SubscriptionPlanLabels;
};

export function SubscriptionAccessFields({
  mode,
  courseBasic = false,
  coursePro = false,
  entityBasic = null,
  entityPro = null,
  planLabels = FALLBACK_SUBSCRIPTION_PLAN_LABELS,
}: Props) {
  const hasOverride = mode !== 'course';
  const overrideOn = entityBasic !== null || entityPro !== null;
  const basicLabel = planLabels.basic;
  const proLabel = planLabels.pro;

  return (
    <fieldset className="space-y-2 rounded-lg border border-dashed border-border/80 p-3">
      <legend className="px-1 text-sm font-semibold">訂閱免費觀看</legend>
      <p className="text-xs text-muted-foreground">
        {mode === 'course'
          ? `持有對應有效訂閱的會員可免費觀看整個課程（所有單元與測驗，除非個別覆寫）。${proLabel} 會員也可觀看標為「${basicLabel}」的內容。`
          : `持有對應有效訂閱的會員可免費觀看此${mode === 'lesson' ? '單元' : '測驗'}的影片（不需單獨購買課程）。${proLabel} 會員也可觀看標為「${basicLabel}」的內容。`}
      </p>

      {hasOverride ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="sub_access_override"
            defaultChecked={overrideOn}
            className="h-4 w-4 rounded border-input"
          />
          覆寫課程預設（未勾選則沿用課程：{basicLabel} {courseBasic ? '是' : '否'}／{proLabel}{' '}
          {coursePro ? '是' : '否'}）
        </label>
      ) : null}

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="sub_basic_free"
            defaultChecked={
              mode === 'course' ? courseBasic : (entityBasic ?? false)
            }
            className="h-4 w-4 rounded border-input"
          />
          {basicLabel} 可免費觀看
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="sub_pro_free"
            defaultChecked={mode === 'course' ? coursePro : (entityPro ?? false)}
            className="h-4 w-4 rounded border-input"
          />
          {proLabel} 可免費觀看
        </label>
      </div>

      {hasOverride ? (
        <p className="text-[11px] text-muted-foreground">
          儲存時若未勾選「覆寫課程預設」，將清除單元／測驗的個別設定。
        </p>
      ) : null}
    </fieldset>
  );
}

export function parseSubscriptionAccessFromForm(formData: FormData): {
  sub_basic_free: boolean | null;
  sub_pro_free: boolean | null;
} {
  const override = formData.get('sub_access_override') === 'on';
  if (!override && formData.has('sub_access_override')) {
    return { sub_basic_free: null, sub_pro_free: null };
  }
  return {
    sub_basic_free: formData.get('sub_basic_free') === 'on',
    sub_pro_free: formData.get('sub_pro_free') === 'on',
  };
}

export function parseCourseSubscriptionAccessFromForm(formData: FormData): {
  sub_basic_free: boolean;
  sub_pro_free: boolean;
} {
  return {
    sub_basic_free: formData.get('sub_basic_free') === 'on',
    sub_pro_free: formData.get('sub_pro_free') === 'on',
  };
}
