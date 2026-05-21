'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Stream } from '@cloudflare/stream-react';
import { Lock, AlertCircle, RefreshCw, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { saveVideoProgress, markLessonComplete } from '@/app/actions/progress';

// ─── Minimal Cloudflare Stream player API types ──────────────────────────────

interface StreamPlayer {
  currentTime: number;
  duration: number;
  paused: boolean;
  play: () => Promise<void>;
  pause: () => void;
}

// ─── Public props ─────────────────────────────────────────────────────────────

export interface VideoPlayerProps {
  /** Cloudflare Stream video UID (cf_video_uid column in lessons) */
  videoUid: string | null;
  /** Lesson ID — enables auto-save to user_progress when provided */
  lessonId?: string;
  /** Resume playback from this timestamp (seconds) */
  startTime?: number;
  /** Show paywall overlay instead of playing */
  locked?: boolean;
  /**
   * Fraction of total duration to watch before marking the lesson complete.
   * Default: 0.9 (90 %)
   */
  completionThreshold?: number;
  /** Fires ~every 5 s with the current playback position (seconds) */
  onProgress?: (seconds: number) => void;
  /** Fires once when completionThreshold is reached */
  onComplete?: () => void;
  className?: string;
}

// ─── Stable debounce hook ─────────────────────────────────────────────────────

function useDebouncedCallback<T extends unknown[]>(
  fn: (...args: T) => void,
  delay: number,
) {
  const fnRef  = useRef(fn);
  const timer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { fnRef.current = fn; });

  return useCallback(
    (...args: T) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => fnRef.current(...args), delay);
    },
    [delay],
  );
}

// ─── Overlay sub-components ───────────────────────────────────────────────────

function LoadingOverlay() {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-zinc-950">
      {/* Shimmer bars */}
      <div className="w-full max-w-xs space-y-2.5 px-8">
        <div className="h-1.5 w-full animate-pulse rounded-full bg-white/10" />
        <div className="h-1.5 w-4/5 animate-pulse rounded-full bg-white/10" />
        <div className="h-1.5 w-2/3 animate-pulse rounded-full bg-white/10" />
      </div>
      <div className="flex items-center gap-2 pt-1 text-white/30">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span className="text-xs tracking-wide">影片載入中…</span>
      </div>
    </div>
  );
}

function ErrorOverlay({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 bg-zinc-950/95">
      <div className="rounded-full bg-red-500/15 p-4 ring-1 ring-red-500/30">
        <AlertCircle className="h-8 w-8 text-red-400" />
      </div>
      <div className="space-y-1 text-center">
        <p className="text-sm font-semibold text-white">影片載入失敗</p>
        <p className="text-xs text-white/45">請確認網路連線後重試</p>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="gap-2 border-white/15 bg-white/8 text-white hover:bg-white/15 hover:text-white"
        onClick={onRetry}
      >
        <RefreshCw className="h-3.5 w-3.5" />
        重新載入
      </Button>
    </div>
  );
}

function LockedOverlay() {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 bg-zinc-950/75 backdrop-blur-sm">
      <div className="rounded-full bg-white/10 p-5 ring-2 ring-white/20 shadow-xl">
        <Lock className="h-10 w-10 text-white/80" />
      </div>
      <div className="space-y-1.5 text-center">
        <p className="text-base font-bold text-white">購買課程後解鎖</p>
        <p className="text-sm text-white/55">報名後即可觀看完整影片內容</p>
      </div>
    </div>
  );
}

function CompletedBadge() {
  return (
    <div className="absolute left-3 top-3 z-20 flex items-center gap-1.5 rounded-full bg-emerald-500/90 px-3 py-1 text-xs font-semibold text-white shadow-md backdrop-blur-sm">
      <CheckCircle2 className="h-3.5 w-3.5" />
      已完成
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function VideoPlayer({
  videoUid,
  lessonId,
  startTime = 0,
  locked = false,
  completionThreshold = 0.9,
  onProgress,
  onComplete,
  className,
}: VideoPlayerProps) {
  const playerRef    = useRef<StreamPlayer | null>(null);
  const completedRef = useRef(false);

  const [status,    setStatus]    = useState<'loading' | 'ready' | 'error'>('loading');
  const [retryKey,  setRetryKey]  = useState(0);
  const [completed, setCompleted] = useState(false);

  // Reset on video / retry change
  useEffect(() => {
    completedRef.current = false;
    setCompleted(false);
    setStatus('loading');
  }, [videoUid, retryKey]);

  // ── Progress persistence (debounced, fires ~5 s after last timeupdate) ──────

  const persistProgress = useCallback(
    async (seconds: number) => {
      onProgress?.(seconds);
      if (lessonId) {
        await saveVideoProgress({ lessonId, watchedSeconds: seconds });
      }
    },
    [lessonId, onProgress],
  );

  const debouncedPersist = useDebouncedCallback(persistProgress, 5000);

  // ── Completion handler ────────────────────────────────────────────────────

  const handleCompletion = useCallback(async () => {
    if (completedRef.current) return;
    completedRef.current = true;
    setCompleted(true);
    onComplete?.();
    if (lessonId) {
      await markLessonComplete({ lessonId });
    }
  }, [lessonId, onComplete]);

  // ── Stream event handlers ─────────────────────────────────────────────────

  const handleCanPlay = useCallback(() => {
    setStatus('ready');
    if (startTime > 0 && playerRef.current) {
      playerRef.current.currentTime = startTime;
    }
  }, [startTime]);

  const handleTimeUpdate = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;

    const current = player.currentTime;
    const total   = player.duration;

    debouncedPersist(Math.floor(current));

    if (!completedRef.current && total > 0 && current / total >= completionThreshold) {
      handleCompletion();
    }
  }, [debouncedPersist, completionThreshold, handleCompletion]);

  const handleEnded = useCallback(() => {
    handleCompletion();
  }, [handleCompletion]);

  const handleError = useCallback(() => {
    setStatus('error');
  }, []);

  // ── Empty state ───────────────────────────────────────────────────────────

  if (!videoUid) {
    return (
      <div
        className={cn(
          'aspect-video flex items-center justify-center rounded-xl bg-muted',
          className,
        )}
      >
        <p className="text-sm text-muted-foreground">影片尚未上傳</p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div
      className={cn(
        'group relative aspect-video overflow-hidden rounded-xl bg-zinc-950',
        'shadow-2xl ring-1 ring-black/20 dark:ring-white/5',
        className,
      )}
    >
      {/* Cloudflare Stream player (iframe + HLS, quality switching built-in) */}
      <Stream
        key={retryKey}
        src={videoUid}
        controls
        preload="auto"
        className="h-full w-full"
        /* @ts-expect-error – ref type not perfectly exported by the package */
        streamRef={playerRef}
        onCanPlay={handleCanPlay}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={handleError}
      />

      {/* ── State overlays ── */}
      {status === 'loading' && !locked && <LoadingOverlay />}
      {status === 'error'   && !locked && (
        <ErrorOverlay onRetry={() => setRetryKey((k) => k + 1)} />
      )}
      {locked && <LockedOverlay />}

      {/* Completion badge */}
      {completed && !locked && <CompletedBadge />}
    </div>
  );
}
