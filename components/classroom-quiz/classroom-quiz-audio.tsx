'use client';

import { useCallback, useEffect, useRef } from 'react';
import { Volume2 } from 'lucide-react';

import { getClassroomQuizSpeechVolume } from '@/lib/course-quiz/classroom-quiz-audio-runtime';
import {
  isLikelyPlayableMediaUrl,
  safeSetMediaCurrentTime,
  swallowMediaPlayError,
  waitMediaCanPlay,
} from '@/lib/media/play-abort';
import { cn } from '@/lib/utils';

function createSpeechAudio(url: string): HTMLAudioElement {
  const el = new Audio(url);
  el.preload = 'auto';
  el.volume = getClassroomQuizSpeechVolume();
  return el;
}

export function useClassroomQuizAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playGenRef = useRef(0);
  const poolRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  const preloadUrls = useCallback((urls: (string | null | undefined)[]) => {
    for (const raw of urls) {
      const url = raw?.trim();
      if (!isLikelyPlayableMediaUrl(url)) continue;
      const existing = poolRef.current.get(url);
      if (existing) {
        existing.volume = getClassroomQuizSpeechVolume();
        if (existing.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
          existing.load();
        }
        continue;
      }
      const el = createSpeechAudio(url);
      poolRef.current.set(url, el);
    }
  }, []);

  const acquireAudio = useCallback((url: string): HTMLAudioElement => {
    const pooled = poolRef.current.get(url);
    if (pooled) {
      pooled.volume = getClassroomQuizSpeechVolume();
      return pooled;
    }
    const el = createSpeechAudio(url);
    poolRef.current.set(url, el);
    return el;
  }, []);

  const stop = useCallback(() => {
    playGenRef.current += 1;
    const el = audioRef.current;
    audioRef.current = null;
    if (!el) return;
    try {
      el.pause();
    } catch {
      /* ignore */
    }
    safeSetMediaCurrentTime(el, 0);
  }, []);

  const playUrl = useCallback((url: string | null | undefined): Promise<boolean> => {
    if (!isLikelyPlayableMediaUrl(url)) return Promise.resolve(false);
    const gen = ++playGenRef.current;

    const prev = audioRef.current;
    if (prev) {
      try {
        prev.pause();
      } catch {
        /* ignore */
      }
      safeSetMediaCurrentTime(prev, 0);
    }

    const el = acquireAudio(url);
    audioRef.current = el;
    safeSetMediaCurrentTime(el, 0);

    const playReady = async (): Promise<boolean> => {
      if (gen !== playGenRef.current) return false;
      await swallowMediaPlayError(el.play());
      return gen === playGenRef.current && !el.paused;
    };

    if (el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      return playReady();
    }

    return waitMediaCanPlay(el, 2_500).then(async (ready) => {
      if (!ready || gen !== playGenRef.current) return false;
      return playReady();
    });
  }, [acquireAudio]);

  /** 播放至結束（或失敗／被 stop 中斷）後 resolve；回傳是否實際開始播放 */
  const playUrlAndWait = useCallback((url: string | null | undefined): Promise<boolean> => {
    if (!isLikelyPlayableMediaUrl(url)) return Promise.resolve(false);
    const gen = ++playGenRef.current;

    const prev = audioRef.current;
    if (prev) {
      try {
        prev.pause();
      } catch {
        /* ignore */
      }
      safeSetMediaCurrentTime(prev, 0);
    }

    const el = acquireAudio(url);
    audioRef.current = el;
    safeSetMediaCurrentTime(el, 0);

    return new Promise((resolve) => {
      let settled = false;
      const finish = (played: boolean) => {
        if (settled) return;
        settled = true;
        el.removeEventListener('ended', onEnded);
        el.removeEventListener('error', onError);
        resolve(played);
      };
      const onEnded = () => finish(true);
      const onError = () => finish(false);

      el.addEventListener('ended', onEnded);
      el.addEventListener('error', onError);

      const startPlay = async () => {
        if (gen !== playGenRef.current) {
          el.pause();
          finish(false);
          return;
        }
        await swallowMediaPlayError(el.play());
        if (gen !== playGenRef.current) {
          el.pause();
          finish(false);
          return;
        }
        if (el.paused) finish(false);
      };

      if (el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        void startPlay();
        return;
      }

      void waitMediaCanPlay(el, 4_000).then((ready) => {
        if (!ready) {
          finish(false);
          return;
        }
        void startPlay();
      });
    });
  }, [acquireAudio]);

  useEffect(() => () => stop(), [stop]);

  return { playUrl, playUrlAndWait, stop, preloadUrls };
}

export function ClassroomQuizAudioButton({
  url,
  label,
  className,
  onPlay,
}: {
  url: string | null | undefined;
  label: string;
  className?: string;
  onPlay: (url: string) => void;
}) {
  if (!isLikelyPlayableMediaUrl(url)) return null;

  return (
    <span
      role="button"
      tabIndex={0}
      className={cn(
        'inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-emerald-800/80 hover:bg-emerald-100/60',
        className,
      )}
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void onPlay(url);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          void onPlay(url);
        }
      }}
    >
      <Volume2 className="h-4 w-4" aria-hidden />
    </span>
  );
}
