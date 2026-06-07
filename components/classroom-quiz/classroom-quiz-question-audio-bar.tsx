'use client';

import { createPortal } from 'react-dom';
import {
  useCallback,
  useLayoutEffect,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react';

import { ClassroomQuizAudioButton } from '@/components/classroom-quiz/classroom-quiz-audio';
import { isLikelyPlayableMediaUrl } from '@/lib/media/play-abort';
import {
  isGameShellFullscreenPortal,
  useGamePortalRoot,
} from '@/lib/hooks/use-game-portal-root';

type Props = {
  videoRef: RefObject<HTMLElement | null>;
  url: string | null | undefined;
  onPlay: (url: string) => void;
  /** 字母掉落層啟用時改以 portal 疊在遊戲層之上 */
  elevateAboveVocabLayer?: boolean;
};

function QuestionAudioControl({
  url,
  onPlay,
}: {
  url: string;
  onPlay: (url: string) => void;
}) {
  return (
    <ClassroomQuizAudioButton
      url={url}
      label="播放題目語音"
      className="classroom-quiz-question-audio-btn text-emerald-800/90"
      onPlay={onPlay}
    />
  );
}

/** 題目語音：預設在影片下方；詞彙模式時 portal 至最上層以免被字母觸控層擋住 */
export function ClassroomQuizQuestionAudioBar({
  videoRef,
  url,
  onPlay,
  elevateAboveVocabLayer = false,
}: Props) {
  const trimmed = url?.trim() ?? '';
  const portalRoot = useGamePortalRoot();
  const inShellFullscreen = isGameShellFullscreenPortal(portalRoot);
  const [portalStyle, setPortalStyle] = useState<CSSProperties>({
    visibility: 'hidden',
  });

  const syncPortalPosition = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const vr = video.getBoundingClientRect();
    setPortalStyle({
      left: vr.left,
      top: vr.bottom + 6,
      width: vr.width,
      height: 40,
      visibility: 'visible',
    });
  }, [videoRef]);

  useLayoutEffect(() => {
    if (!elevateAboveVocabLayer) return;
    syncPortalPosition();
    const video = videoRef.current;
    const ro = new ResizeObserver(() => syncPortalPosition());
    if (video) ro.observe(video);
    window.addEventListener('resize', syncPortalPosition);
    window.visualViewport?.addEventListener('resize', syncPortalPosition);
    window.visualViewport?.addEventListener('scroll', syncPortalPosition);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', syncPortalPosition);
      window.visualViewport?.removeEventListener('resize', syncPortalPosition);
      window.visualViewport?.removeEventListener('scroll', syncPortalPosition);
    };
  }, [elevateAboveVocabLayer, syncPortalPosition, videoRef]);

  if (!isLikelyPlayableMediaUrl(trimmed)) return null;

  if (elevateAboveVocabLayer) {
    const mount =
      portalRoot ??
      (typeof document !== 'undefined' ? document.body : null);
    if (!mount) return null;

    return createPortal(
      <div
        className={[
          'classroom-quiz-question-audio-portal',
          inShellFullscreen && 'classroom-quiz-question-audio-portal--game-fullscreen',
        ]
          .filter(Boolean)
          .join(' ')}
        style={portalStyle}
      >
        <QuestionAudioControl url={trimmed} onPlay={onPlay} />
      </div>,
      mount,
    );
  }

  return (
    <div className="classroom-quiz-question-audio-row">
      <QuestionAudioControl url={trimmed} onPlay={onPlay} />
    </div>
  );
}
