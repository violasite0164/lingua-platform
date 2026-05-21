import Link from 'next/link';
import { ArrowLeft, ImageIcon, LayoutDashboard, PencilLine, Shield } from 'lucide-react';
import { BookCheck } from 'lucide-react';

import { requireAdmin } from '@/lib/admin/auth';
import { GUEST_HOME_PATH } from '@/lib/site-routes';

const SIDEBAR = [
  { href: '/admin', label: '概覽', icon: LayoutDashboard },
  { href: '/admin/homepage', label: '首頁設定', icon: ImageIcon },
  { href: '/admin/questions', label: '題庫答案', icon: BookCheck },
  { href: '/admin/questions/editor', label: '題庫複製清單', icon: PencilLine },
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="flex min-h-[calc(100vh-8rem)] w-full bg-zinc-950 text-zinc-100">
      <aside className="relative hidden w-56 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 lg:flex">
        <div className="flex h-14 items-center gap-2 border-b border-zinc-800 px-4">
          <Shield className="h-5 w-5 text-violet-400" />
          <span className="font-semibold tracking-tight">管理員後台</span>
        </div>
        <nav className="flex flex-col gap-0.5 p-3">
          {SIDEBAR.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50"
            >
              <Icon className="size-4 shrink-0 opacity-80" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-zinc-800 p-4">
          <Link
            href={GUEST_HOME_PATH}
            className="flex items-center gap-2 text-[11px] text-zinc-500 hover:text-zinc-300"
          >
            <ArrowLeft className="size-3.5" />
            返回網站首頁
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col bg-zinc-900/40">
        <div className="flex gap-1 overflow-x-auto border-b border-zinc-800 bg-zinc-950 px-2 py-2 lg:hidden">
          {SIDEBAR.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="flex shrink-0 items-center rounded-md px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
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
