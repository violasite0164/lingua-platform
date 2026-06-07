'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  getQuizGameAudioSettings,
  updateQuizGameAudioSettings,
} from '@/lib/quiz/game-audio-actions';
import {
  QUIZ_GAME_AUDIO_PCT_MAX,
  QUIZ_GAME_AUDIO_PCT_MIN,
  type QuizGameAudioMix,
} from '@/lib/quiz/game-audio-settings';
import {
  applyQuizGameAudioMix,
  getQuizGameAudioMix,
  playQuizAnswerCorrect,
  resumeQuizAudio,
} from '@/lib/quiz/rpg-audio';
import { cn } from '@/lib/utils';

const SAVE_DEBOUNCE_MS = 450;

function MixSlider({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        <span className="tabular-nums text-xs text-muted-foreground">{value}%</span>
      </div>
      <input
        id={id}
        type="range"
        min={QUIZ_GAME_AUDIO_PCT_MIN}
        max={QUIZ_GAME_AUDIO_PCT_MAX}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer accent-violet-600"
      />
    </div>
  );
}

export function GameAudioMixControl({ isAdmin }: { isAdmin?: boolean }) {
  const [open, setOpen] = useState(false);
  const [mix, setMix] = useState<QuizGameAudioMix>(() => getQuizGameAudioMix());
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mixRef = useRef(mix);

  useEffect(() => {
    mixRef.current = mix;
  }, [mix]);

  useEffect(() => {
    const onMixChange = (e: Event) => {
      const detail = (e as CustomEvent<QuizGameAudioMix>).detail;
      if (detail) setMix(detail);
    };
    window.addEventListener('quiz-audio-mix-change', onMixChange);
    return () => window.removeEventListener('quiz-audio-mix-change', onMixChange);
  }, []);

  useEffect(() => {
    if (!open) return;
    void getQuizGameAudioSettings().then((serverMix) => {
      setMix(serverMix);
      applyQuizGameAudioMix(serverMix);
    });
  }, [open]);

  const queueSave = useCallback((nextMix: QuizGameAudioMix) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveState('saving');
    setSaveError(null);
    saveTimerRef.current = setTimeout(() => {
      void updateQuizGameAudioSettings(nextMix).then((res) => {
        if (res.ok) {
          setMix(res.mix);
          applyQuizGameAudioMix(res.mix);
          setSaveState('saved');
        } else {
          setSaveState('error');
          setSaveError(res.error);
        }
      });
    }, SAVE_DEBOUNCE_MS);
  }, []);

  const handleMixChange = useCallback(
    (patch: Partial<QuizGameAudioMix>) => {
      const nextMix = { ...mixRef.current, ...patch };
      setMix(nextMix);
      applyQuizGameAudioMix(nextMix);
      queueSave(nextMix);
    },
    [queueSave],
  );

  const handlePreviewSfx = useCallback(() => {
    void resumeQuizAudio().then(() => playQuizAnswerCorrect());
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  if (!isAdmin) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-violet-600 hover:bg-violet-500/10 hover:text-violet-700 dark:text-violet-300"
          aria-label="調整遊戲音樂與音效（管理員）"
          title="調整遊戲音樂與音效（全站）"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>遊戲音量（全站）</DialogTitle>
          <DialogDescription>
            即時調整英語大冒險的背景音樂與音效，儲存後所有玩家生效。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 pt-1">
          <MixSlider
            id="quiz-game-bgm-mix"
            label="背景音樂"
            value={mix.bgmVolumePct}
            onChange={(bgmVolumePct) => handleMixChange({ bgmVolumePct })}
          />
          <MixSlider
            id="quiz-game-sfx-mix"
            label="音效"
            value={mix.sfxVolumePct}
            onChange={(sfxVolumePct) => handleMixChange({ sfxVolumePct })}
          />
          <div className="flex items-center justify-between gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handlePreviewSfx}>
              試聽音效
            </Button>
            <span
              className={cn(
                'text-xs',
                saveState === 'error' ? 'text-destructive' : 'text-muted-foreground',
              )}
            >
              {saveState === 'saving'
                ? '儲存中…'
                : saveState === 'saved'
                  ? '已儲存全站'
                  : saveState === 'error'
                    ? saveError ?? '儲存失敗'
                    : '拖曳滑桿即時生效'}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
