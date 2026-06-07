'use client';

import { useCallback, useEffect, useState } from 'react';
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
import { applyClassroomQuizAudioRuntime } from '@/lib/course-quiz/classroom-quiz-audio-runtime';
import {
  QUIZ_GAME_AUDIO_PCT_MAX,
  QUIZ_GAME_AUDIO_PCT_MIN,
  getClassroomQuizAudioMix,
  setClassroomQuizAudioMix,
  type ClassroomQuizAudioMix,
} from '@/lib/course-quiz/classroom-quiz-audio-settings';
import {
  playQuizAnswerCorrect,
  resumeQuizAudio,
} from '@/lib/quiz/rpg-audio';

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
        className="h-2 w-full cursor-pointer accent-emerald-600"
      />
    </div>
  );
}

export function ClassroomQuizAudioMixControl() {
  const [open, setOpen] = useState(false);
  const [mix, setMix] = useState<ClassroomQuizAudioMix>(() => getClassroomQuizAudioMix());

  useEffect(() => {
    const onMixChange = (e: Event) => {
      const detail = (e as CustomEvent<ClassroomQuizAudioMix>).detail;
      if (detail) setMix(detail);
    };
    window.addEventListener('classroom-quiz-audio-mix-change', onMixChange);
    return () => window.removeEventListener('classroom-quiz-audio-mix-change', onMixChange);
  }, []);

  useEffect(() => {
    if (!open) return;
    setMix(getClassroomQuizAudioMix());
  }, [open]);

  const handleMixChange = useCallback((patch: Partial<ClassroomQuizAudioMix>) => {
    const next = setClassroomQuizAudioMix({ ...getClassroomQuizAudioMix(), ...patch });
    setMix(next);
    applyClassroomQuizAudioRuntime();
  }, []);

  const handlePreviewSfx = useCallback(() => {
    applyClassroomQuizAudioRuntime();
    void resumeQuizAudio().then(() => playQuizAnswerCorrect());
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-emerald-700 hover:bg-emerald-500/10 hover:text-emerald-800 dark:text-emerald-300"
          aria-label="調整課堂測驗音量"
          title="調整課堂測驗音量"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>課堂測驗音量</DialogTitle>
          <DialogDescription>
            調整此測驗的背景音樂與音效大小。設定會保存在本裝置，不影響其他遊戲模式。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 pt-1">
          <MixSlider
            id="classroom-quiz-bgm-mix"
            label="背景音樂"
            value={mix.bgmVolumePct}
            onChange={(bgmVolumePct) => handleMixChange({ bgmVolumePct })}
          />
          <MixSlider
            id="classroom-quiz-sfx-mix"
            label="音效"
            value={mix.sfxVolumePct}
            onChange={(sfxVolumePct) => handleMixChange({ sfxVolumePct })}
          />
          <div className="flex items-center justify-between gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handlePreviewSfx}>
              試聽音效
            </Button>
            <span className="text-xs text-muted-foreground">拖曳滑桿即時生效</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
