'use client';

import { cn } from '@/lib/utils';
import { QUIZ_EDITOR_PERSONALITY_OPTIONS } from '@/lib/quiz/editor-personality-preference';
import type { QuizEditorPersonality } from '@/types/database.types';

export function EditorPersonalityPicker({
  value,
  onChange,
  disabled,
  className,
}: {
  value: QuizEditorPersonality | null;
  onChange: (id: QuizEditorPersonality) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('grid gap-3 sm:grid-cols-2', className)}>
      {QUIZ_EDITOR_PERSONALITY_OPTIONS.map((opt) => {
        const selected = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.id)}
            className={cn(
              'rounded-xl border p-4 text-left transition-all',
              'hover:border-primary/50 hover:bg-accent/30',
              'disabled:cursor-not-allowed disabled:opacity-60',
              selected
                ? 'border-primary bg-primary/5 ring-2 ring-primary/25'
                : 'border-border bg-card',
            )}
          >
            <p className="text-base font-semibold">{opt.label}</p>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              {opt.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}
