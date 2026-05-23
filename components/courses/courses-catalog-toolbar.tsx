'use client';

import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowUpDown, Filter } from 'lucide-react';

import {
  COURSE_CATALOG_SELECT_CLASS,
  COURSE_CATALOG_SORTS,
  COURSE_LEVEL_FILTER_OPTIONS,
  type CourseCatalogFilters,
  type CourseCatalogSort,
} from '@/lib/courses/catalog';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { CourseLevel } from '@/types/database.types';

type CategoryOption = { id: number; name: string; slug: string };

type Props = {
  categories: CategoryOption[];
  filters: CourseCatalogFilters;
  resultCount: number;
};

export function CoursesCatalogToolbar({
  categories,
  filters,
  resultCount,
}: Props) {
  const router = useRouter();
  const pathname = usePathname() ?? '/courses';
  const searchParams = useSearchParams();

  const pushFilters = useCallback(
    (next: Partial<CourseCatalogFilters>) => {
      const params = new URLSearchParams(searchParams?.toString() ?? '');

      const sort = next.sort ?? filters.sort;
      if (sort === 'newest') params.delete('sort');
      else params.set('sort', sort);

      const level = 'level' in next ? next.level : filters.level;
      if (!level) params.delete('level');
      else params.set('level', level);

      const categorySlug =
        'categorySlug' in next ? next.categorySlug : filters.categorySlug;
      if (!categorySlug) params.delete('category');
      else params.set('category', categorySlug);

      const q = params.toString();
      router.push(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [filters, pathname, router, searchParams],
  );

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Filter className="h-4 w-4 shrink-0" aria-hidden />
        <span className="font-medium text-foreground">篩選與排序</span>
        <span className="text-xs">· 共 {resultCount} 門課程</span>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end md:gap-x-4 md:gap-y-3">
        <div className="flex w-full min-w-0 flex-col gap-2 md:flex-1">
          <span className="text-xs font-medium text-muted-foreground">級數</span>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="課程級數"
          >
            {COURSE_LEVEL_FILTER_OPTIONS.map((opt) => {
              const active =
                opt.value === ''
                  ? !filters.level
                  : filters.level === opt.value;
              return (
                <Button
                  key={opt.value || 'all'}
                  type="button"
                  size="sm"
                  variant={active ? 'default' : 'outline'}
                  className={cn(
                    'min-w-[4.5rem] rounded-full',
                    active && 'shadow-sm',
                  )}
                  aria-pressed={active}
                  onClick={() =>
                    pushFilters({
                      level: opt.value
                        ? (opt.value as CourseLevel)
                        : undefined,
                    })
                  }
                >
                  {opt.label}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="grid w-full grid-cols-2 gap-3 md:w-auto md:shrink-0">
          <label className="flex min-w-0 flex-col gap-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 font-medium">
              <ArrowUpDown className="h-3.5 w-3.5 shrink-0" />
              排序
            </span>
            <select
              className={cn(COURSE_CATALOG_SELECT_CLASS, 'w-full min-w-0')}
              value={filters.sort}
              onChange={(e) =>
                pushFilters({ sort: e.target.value as CourseCatalogSort })
              }
              aria-label="課程排序"
            >
              {COURSE_CATALOG_SORTS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex min-w-0 flex-col gap-1.5 text-xs text-muted-foreground">
            <span className="font-medium">類型</span>
            <select
              className={cn(COURSE_CATALOG_SELECT_CLASS, 'w-full min-w-0')}
              value={filters.categorySlug ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                pushFilters({ categorySlug: v || undefined });
              }}
              aria-label="課程類型"
            >
              <option value="">全部類型</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}
