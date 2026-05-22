'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, BookOpen, ClipboardCheck } from 'lucide-react';

import { cn } from '@/lib/utils';

const NAV = [
  { href: '/mentor',             label: '儀表板',  icon: LayoutDashboard },
  { href: '/mentor/courses',     label: '課程管理', icon: BookOpen },
  { href: '/mentor/assignments', label: '作業審核', icon: ClipboardCheck },
] as const;

export function MentorNavLinks() {
  const pathname = usePathname();

  return (
    <>
      {NAV.map(({ href, label, icon: Icon }) => {
        const path = pathname ?? '';
        const active =
          href === '/mentor' ? path === '/mentor' : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
              active
                ? 'bg-accent text-emerald-700 dark:text-emerald-300'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4 shrink-0 opacity-90" />
            {label}
          </Link>
        );
      })}
    </>
  );
}
