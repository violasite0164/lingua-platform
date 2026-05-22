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
  { value: 'beginner', label: '初級' },
  { value: 'intermediate', label: '中級' },
  { value: 'advanced', label: '進階' },
];

const LEVEL_SET = new Set<string>(['beginner', 'intermediate', 'advanced']);

export type CourseCatalogFilters = {
  sort: CourseCatalogSort;
  level?: CourseLevel;
  categorySlug?: string;
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

  return { sort, level, categorySlug };
}

export const COURSE_CATALOG_SELECT_CLASS =
  'flex h-9 min-w-[9rem] rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
