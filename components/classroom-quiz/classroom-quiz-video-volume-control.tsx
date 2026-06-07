'use client';

import { useCallback, useEffect, useState } from 'react';
import { Volume2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  QUIZ_GAME_AUDIO_PCT_MAX,
  QUIZ_GAME_AUDIO_PCT_MIN,
  getClassroomQuizVideoVolumePct,
  setClassroomQuizVideoVolumePct,
} from '@/lib/course-quiz/classroom-quiz-video-volume';

function VideoVolumeSlider({
  videoUid,
  label,
}: {
  videoUid: string;
  label: string;
}) {
  const [pct, setPct] = useState(() => getClassroomQuizVideoVolumePct(videoUid));

  useEffect(() => {
    setPct(getClassroomQuizVideoVolumePct(videoUid));
  }, [videoUid]);

  useEffect(() => {
    const onChange = () => setPct(getClassroomQuizVideoVolumePct(videoUid));
    window.addEventListener('classroom-quiz-video-volume-change', onChange);
    return () => window.removeEventListener('classroom-quiz-video-volume-change', onChange);
  }, [videoUid]);

  const handleChange = useCallback(
    (next: number) => {
      const normalized = setClassroomQuizVideoVolumePct(videoUid, next);
      setPct(normalized);
    },
    [videoUid],
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={`classroom-video-vol-${videoUid}`} className="text-sm font-medium">
          {label}
        </Label>
        <span className="tabular-nums text-xs text-muted-foreground">{pct}%</span>
      </div>
      <input
        id={`classroom-video-vol-${videoUid}`}
        type="range"
        min={QUIZ_GAME_AUDIO_PCT_MIN}
        max={QUIZ_GAME_AUDIO_PCT_MAX}
        step={1}
        value={pct}
        onChange={(e) => handleChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer accent-emerald-600"
      />
    </div>
  );
}

export type ClassroomQuizVideoVolumeTarget = {
  videoUid: string;
  label: string;
};

export function ClassroomQuizVideoVolumeControl({
  activeVideo,
  relatedVideos = [],
}: {
  /** 目前正在播放或即將播放的影片 */
  activeVideo: ClassroomQuizVideoVolumeTarget | null;
  /** 本題其他影片（可選調整） */
  relatedVideos?: ClassroomQuizVideoVolumeTarget[];
}) {
  const [open, setOpen] = useState(false);

  const targets = (() => {
    const seen = new Set<string>();
    const list: ClassroomQuizVideoVolumeTarget[] = [];
    const add = (item: ClassroomQuizVideoVolumeTarget | null | undefined) => {
      if (!item?.videoUid.trim() || seen.has(item.videoUid)) return;
      seen.add(item.videoUid);
      list.push(item);
    };
    add(activeVideo);
    for (const item of relatedVideos) add(item);
    return list;
  })();

  const hasTargets = targets.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-emerald-700 hover:bg-emerald-500/10 hover:text-emerald-800 dark:text-emerald-300"
        aria-label="調整影片音量"
        title="調整影片音量"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Volume2 className="h-4 w-4" aria-hidden />
      </Button>
      <DialogContent className="z-[100] max-w-sm">
        <DialogHeader>
          <DialogTitle>影片音量</DialogTitle>
          <DialogDescription>
            每支影片的音量會分開記住。調整後立即套用到播放中的影片。
          </DialogDescription>
        </DialogHeader>
        {hasTargets ? (
          <div className="space-y-5 pt-1">
            {targets.map((target) => (
              <VideoVolumeSlider
                key={target.videoUid}
                videoUid={target.videoUid}
                label={target.label}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">此題尚無影片可調整。</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
