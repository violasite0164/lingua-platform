'use client';

import { BookOpen, GraduationCap, Trophy, Zap } from 'lucide-react';

import { RegisterFormCard } from '@/components/auth/register-form-card';

const FEATURES = [
  { icon: BookOpen, label: '500+ 堂互動課程' },
  { icon: GraduationCap, label: '專業認證師資' },
  { icon: Trophy, label: '成就解鎖系統' },
  { icon: Zap, label: 'AI 個人學習路徑' },
] as const;

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen">
      <aside className="relative hidden w-[45%] flex-col justify-between overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-12 text-primary-foreground lg:flex">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm ring-1 ring-white/30">
            <BookOpen className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">Lingua</span>
        </div>

        <div className="relative space-y-6">
          <div className="space-y-3">
            <h2 className="text-4xl font-bold leading-tight">
              加入我們，
              <br />
              一起學習世界
            </h2>
            <p className="text-base leading-relaxed text-primary-foreground/75">
              免費建立帳號，立刻開始你的語言學習之旅。與數千名學習者一同進步。
            </p>
          </div>

          <ul className="space-y-3">
            {FEATURES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-sm">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/20">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-primary-foreground/90">{label}</span>
              </li>
            ))}
          </ul>
        </div>

        <blockquote className="relative space-y-2 border-l-2 border-white/30 pl-4">
          <p className="text-sm italic text-primary-foreground/80">
            「三個月內日語從零到 N3，Lingua 的學習系統真的太有效了！」
          </p>
          <footer className="text-xs text-primary-foreground/60">— Mei, 學習者</footer>
        </blockquote>
      </aside>

      <main className="flex flex-1 flex-col items-center justify-center bg-background px-4 py-12">
        <div className="w-full max-w-[380px] space-y-6">
          <div className="flex flex-col items-center gap-2 text-center lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
              <BookOpen className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold">Lingua</span>
          </div>

          <RegisterFormCard variant="page" loginLinkPlacement="card-footer" />
        </div>
      </main>
    </div>
  );
}
