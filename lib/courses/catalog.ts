import type { CourseLevel } from '@/types/database.types';

export const COURSE_CATALOG_SORTS = [
  { value: 'newest', label: '最新上架' },
  { value: 'oldest', label: '最早上架' },
  { value: 'popular', label: '最多學員' },
  { value: 'price_asc', label: '價格由低到高' },
  { value: 'price_desc', label: '價格由高到低' },
  { value: 'title', label: '課程名稱' },
] as const;

export type CourseCatalogSort = (typeof COURSE_CATALOG_SORTS)[number]['value'];

const SORT_SET = new Set<string>(COURSE_CATALOG_SORTS.map((s) => s.value));

export const COURSE_LEVEL_FILTER_OPTIONS: { value: '' | CourseLevel; label: string }[] = [
  { value: '', label: '全部' },
  { value: 'beginner', label: '幼兒' },
  { value: 'intermediate', label: '小學' },
  { value: 'advanced', label: '中學' },
];

const LEVEL_SET = new Set<string>(['beginner', 'intermediate', 'advanced']);

/** 訂閱免費觀看篩選（對應課程 sub_basic_free / sub_pro_free） */
export type CourseSubscriptionAccessFilter = 'sub_basic' | 'sub_pro';

const ACCESS_SET = new Set<string>(['sub_basic', 'sub_pro']);

export type CourseCatalogFilters = {
  sort: CourseCatalogSort;
  level?: CourseLevel;
  categorySlug?: string;
  subscriptionAccess?: CourseSubscriptionAccessFilter;
};

export function parseCourseCatalogSearchParams(
  sp: Record<string, string | string[] | undefined>,
): CourseCatalogFilters {
  const sortRaw = typeof sp.sort === 'string' ? sp.sort : 'newest';
  const sort: CourseCatalogSort = SORT_SET.has(sortRaw)
    ? (sortRaw as CourseCatalogSort)
    : 'newest';

  const levelRaw = typeof sp.level === 'string' ? sp.level : '';
  const level = LEVEL_SET.has(levelRaw) ? (levelRaw as CourseLevel) : undefined;

  const categoryRaw = typeof sp.category === 'string' ? sp.category.trim() : '';
  const categorySlug = categoryRaw && categoryRaw !== 'all' ? categoryRaw : undefined;

  const accessRaw = typeof sp.access === 'string' ? sp.access.trim() : '';
  const subscriptionAccess = ACCESS_SET.has(accessRaw)
    ? (accessRaw as CourseSubscriptionAccessFilter)
    : undefined;

  return { sort, level, categorySlug, subscriptionAccess };
}

export const COURSE_CATALOG_SELECT_CLASS =
  'flex h-9 min-w-[9rem] rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
