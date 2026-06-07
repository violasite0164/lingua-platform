'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Stream } from '@cloudflare/stream-react';

import { getClassroomQuizVideoVolumeScale } from '@/lib/course-quiz/classroom-quiz-video-volume';
import { safeSetMediaCurrentTime, swallowMediaPlayError } from '@/lib/media/play-abort';
import { cn } from '@/lib/utils';

interface StreamPlayer {
  currentTime: number;
  duration: number;
  paused: boolean;
  muted: boolean;
  volume: number;
  play: () => Promise<void>;
  pause: () => void;
}

function useStreamVideoVolume(videoUid: string): number {
  const [volume, setVolume] = useState(() => getClassroomQuizVideoVolumeScale(videoUid));

  useEffect(() => {
    setVolume(getClassroomQuizVideoVolumeScale(videoUid));
  }, [videoUid]);

  useEffect(() => {
    const onChange = () => setVolume(getClassroomQuizVideoVolumeScale(videoUid));
    window.addEventListener('classroom-quiz-video-volume-change', onChange);
    return () => window.removeEventListener('classroom-quiz-video-volume-change', onChange);
  }, [videoUid]);

  return volume;
}

export function ClassroomQuizStreamPlayer({
  videoUid,
  active,
  onEnded,
  onPlaybackStarted,
  className,
}: {
  videoUid: string;
  active: boolean;
  onEnded?: () => void;
  /** 影片實際開始播放（含使用者點擊播放），用於解鎖題目語音自動播放 */
  onPlaybackStarted?: () => void;
  className?: string;
}) {
  const playerRef = useRef<StreamPlayer | null>(null);
  const endedRef = useRef(false);
  const playGenRef = useRef(0);
  const playbackStartedRef = useRef(false);
  const activeRef = useRef(active);
  const onEndedRef = useRef(onEnded);
  const onPlaybackStartedRef = useRef(onPlaybackStarted);
  const [needsTapToPlay, setNeedsTapToPlay] = useState(false);
  const streamVolume = useStreamVideoVolume(videoUid);
  onEndedRef.current = onEnded;
  onPlaybackStartedRef.current = onPlaybackStarted;
  activeRef.current = active;

  const notifyPlaybackStarted = useCallback(() => {
    if (playbackStartedRef.current) return;
    playbackStartedRef.current = true;
    onPlaybackStartedRef.current?.();
  }, []);

  const fireEnded = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    playGenRef.current += 1;
    setNeedsTapToPlay(false);
    try {
      playerRef.current?.pause();
    } catch {
      /* ignore */
    }
    onEndedRef.current?.();
  }, []);

  const tryPlayWithSound = useCallback(async (): Promise<boolean> => {
    const player = playerRef.current;
    if (!player || !activeRef.current || endedRef.current) return false;

    const gen = ++playGenRef.current;

    const attempt = async (muted: boolean): Promise<boolean> => {
      if (gen !== playGenRef.current || !activeRef.current || endedRef.current) {
        return false;
      }
      player.muted = muted;
      await swallowMediaPlayError(player.play());
      return gen === playGenRef.current && !player.paused;
    };

    if (await attempt(false)) {
      setNeedsTapToPlay(false);
      notifyPlaybackStarted();
      return true;
    }
    if (await attempt(true)) {
      player.muted = false;
      if (await attempt(false)) {
        setNeedsTapToPlay(false);
        notifyPlaybackStarted();
        return true;
      }
      setNeedsTapToPlay(true);
      notifyPlaybackStarted();
      return true;
    }
    setNeedsTapToPlay(true);
    return false;
  }, [notifyPlaybackStarted]);

  const scheduleAutoplayAttempts = useCallback(() => {
    const delays = [0, 80, 200, 450, 900, 1600];
    const timers = delays.map((ms) =>
      window.setTimeout(() => {
        if (!activeRef.current || endedRef.current) return;
        void tryPlayWithSound().then((ok) => {
          if (ok) return;
          const player = playerRef.current;
          if (player?.paused) setNeedsTapToPlay(true);
        });
      }, ms),
    );
    return () => {
      for (const id of timers) window.clearTimeout(id);
    };
  }, [tryPlayWithSound]);

  const playWithUserGesture = useCallback(() => {
    const player = playerRef.current;
    if (!player || endedRef.current) return;

    playGenRef.current += 1;
    setNeedsTapToPlay(false);
    safeSetMediaCurrentTime(player, 0);
    player.muted = false;
    void swallowMediaPlayError(player.play()).then((played) => {
      if (played && !player.paused) {
        setNeedsTapToPlay(false);
        notifyPlaybackStarted();
      } else {
        setNeedsTapToPlay(true);
      }
    });
  }, [notifyPlaybackStarted]);

  useEffect(() => {
    const player = playerRef.current;
    if (player) player.volume = streamVolume;
  }, [streamVolume]);

  useEffect(() => {
    endedRef.current = false;
    playbackStartedRef.current = false;
    playGenRef.current += 1;
    setNeedsTapToPlay(false);
  }, [videoUid]);

  useEffect(() => {
    if (!active) {
      playGenRef.current += 1;
      setNeedsTapToPlay(false);
      const player = playerRef.current;
      try {
        if (player) {
          player.muted = true;
          player.volume = 0;
          player.pause();
        }
      } catch {
        /* ignore */
      }
      return;
    }

    const player = playerRef.current;
    if (player) {
      player.volume = streamVolume;
      player.muted = false;
    }

    endedRef.current = false;
    if (player) safeSetMediaCurrentTime(player, 0);

    return scheduleAutoplayAttempts();
  }, [active, scheduleAutoplayAttempts, streamVolume]);

  const handleCanPlay = useCallback(() => {
    if (!activeRef.current || endedRef.current) return;
    void tryPlayWithSound();
  }, [tryPlayWithSound]);

  const handleTimeUpdate = useCallback(() => {
    const player = playerRef.current;
    if (!activeRef.current || !player || endedRef.current) return;

    if (!player.paused && player.currentTime > 0.05) {
      setNeedsTapToPlay(false);
      notifyPlaybackStarted();
    }

    const { currentTime, duration } = player;
    if (duration > 0 && currentTime >= duration - 0.15) {
      fireEnded();
    }
  }, [fireEnded, notifyPlaybackStarted]);

  const handleEnded = useCallback(() => {
    fireEnded();
  }, [fireEnded]);

  return (
    <div className={cn('classroom-quiz-stream-frame', className)}>
      <Stream
        src={videoUid}
        controls={false}
        autoplay={active}
        muted={!active}
        volume={active ? streamVolume : 0}
        loop={false}
        preload="auto"
        responsive
        letterboxColor="transparent"
        className="classroom-quiz-stream-canvas"
        /* @ts-expect-error – streamRef type from package */
        streamRef={playerRef}
        onCanPlay={handleCanPlay}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
      />
      {needsTapToPlay && active ? (
        <button
          type="button"
          className="classroom-quiz-stream-tap-play"
          onClick={playWithUserGesture}
        >
          點擊開始播放
        </button>
      ) : (
        <div className="classroom-quiz-stream-shield" aria-hidden />
      )}
    </div>
  );
}
