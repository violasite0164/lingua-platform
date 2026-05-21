import Link from 'next/link';
import { GraduationCap } from 'lucide-react';

import { requireMentor } from '@/lib/mentor/auth';
import { MentorNavLinks } from '@/components/mentor/nav-links';

const MOBILE_NAV = [
  { href: '/mentor',             label: '儀表板' },
  { href: '/mentor/courses',     label: '課程管理' },
  { href: '/mentor/assignments', label: '作業審核' },
] as const;

export default async function MentorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireMentor();

  return (
    <div className="flex min-h-[calc(100vh-8rem)] w-full bg-zinc-950 text-zinc-100">
      {/* Desktop sidebar */}
      <aside className="relative hidden w-56 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 lg:flex">
        <div className="flex h-14 items-center gap-2 border-b border-zinc-800 px-4">
          <GraduationCap className="h-5 w-5 text-emerald-400" />
          <span className="font-semibold tracking-tight">導師後台</span>
        </div>
        <nav className="flex flex-col gap-0.5 p-3">
          <MentorNavLinks />
        </nav>
        <div className="mt-auto border-t border-zinc-800 p-4 text-[11px] text-zinc-500">
          LinguaLearn Mentor
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col bg-zinc-900/40">
        {/* Mobile nav */}
        <div className="flex gap-1 overflow-x-auto border-b border-zinc-800 bg-zinc-950 px-2 py-2 lg:hidden">
          {MOBILE_NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="flex-1 p-4 md:p-8">{children}</div>
      </div>
    </div>
  );
}
