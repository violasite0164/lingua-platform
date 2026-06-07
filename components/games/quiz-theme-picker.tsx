'use client';

import { QUIZ_VISUAL_THEME_IDS, QUIZ_VISUAL_THEMES } from '@/lib/games/quiz-visual-themes';
import { useQuizVisualTheme } from '@/components/games/quiz-theme-context';
import { cn } from '@/lib/utils';

export function QuizThemePicker({ className }: { className?: string }) {
  const { themeId, setThemeId } = useQuizVisualTheme();

  return (
    <div
      className={cn('flex items-center gap-1.5', className)}
      role="radiogroup"
      aria-label="遊戲主題"
    >
      <span className="mr-0.5 hidden text-[10px] font-medium text-muted-foreground sm:inline">
        主題
      </span>
      {QUIZ_VISUAL_THEME_IDS.map((id) => {
        const t = QUIZ_VISUAL_THEMES[id];
        const selected = themeId === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={t.label}
            title={t.label}
            onClick={() => setThemeId(id)}
            className={cn(
              'size-7 shrink-0 rounded-full border-2 transition-transform sm:size-8',
              'hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              selected
                ? 'border-foreground scale-110 shadow-md'
                : 'border-white/80 opacity-90',
            )}
            style={{ background: t.swatch }}
          />
        );
      })}
    </div>
  );
}
