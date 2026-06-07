'use client';

import { useCallback, useEffect, useRef } from 'react';

import { isQuizAudioMuted, registerQuizGameVideo } from '@/lib/quiz/rpg-audio';
import { cn } from '@/lib/utils';

type Props = {
  videoUrl: string;
  embedded?: boolean;
  onEnded: () => void;
};

/**
 * 英語大冒險關卡影片（開局／過關）。僅此元件受遊戲靜音控制，不影響站內其他影片。
 */
export function QuizStageVideoOverlay({ videoUrl, embedded = false, onEnded }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;

  const finish = useCallback(() => {
    onEndedRef.current();
  }, []);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    return registerQuizGameVideo(el);
  }, [videoUrl]);

  useEffect(() => {
    const onMuteChange = () => {
      const el = videoRef.current;
      if (el) el.muted = isQuizAudioMuted();
    };
    window.addEventListener('quiz-audio-mute-change', onMuteChange);
    return () => window.removeEventListener('quiz-audio-mute-change', onMuteChange);
  }, []);

  const tryPlay = useCallback(async () => {
    const el = videoRef.current;
    if (!el) return;

    const gameMuted = isQuizAudioMuted();
    el.muted = gameMuted;

    if (gameMuted) {
      try {
        await el.play();
      } catch {
        finish();
      }
      return;
    }

    try {
      el.muted = false;
      await el.play();
      return;
    } catch {
      // 瀏覽器自動播放政策：改靜音播放（僅在未開啟遊戲靜音時的 fallback）
    }
    try {
      el.muted = true;
      await el.play();
    } catch {
      finish();
    }
  }, [finish]);

  useEffect(() => {
    void tryPlay();
  }, [videoUrl, tryPlay]);

  return (
    <div
      className={cn(
        'quiz-stage-video-overlay',
        embedded && 'quiz-stage-video-overlay--embedded',
      )}
      role="dialog"
      aria-modal
      aria-label="關卡影片"
    >
      <video
        ref={videoRef}
        key={videoUrl}
        src={videoUrl}
        className="quiz-stage-video"
        playsInline
        autoPlay
        preload="auto"
        onEnded={finish}
        onError={finish}
        onCanPlay={() => void tryPlay()}
      />
      <button type="button" className="quiz-stage-video-skip" onClick={finish}>
        略過
      </button>
    </div>
  );
}
