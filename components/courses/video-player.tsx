'use client';

import { useRef, useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoPlayerProps {
  /** Cloudflare Stream 影片 UID */
  videoUid: string | null;
  /** 已看到的秒數（用於續播） */
  startTime?: number;
  /** 是否鎖定（未購買） */
  locked?: boolean;
  /** 影片進度回調 (每 5 秒呼叫一次) */
  onProgress?: (seconds: number) => void;
  /** 影片播放完成回調 */
  onComplete?: () => void;
  className?: string;
}

export function VideoPlayer({
  videoUid,
  startTime = 0,
  locked = false,
  onProgress,
  onComplete,
  className,
}: VideoPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isReady, setIsReady] = useState(false);

  // Cloudflare Stream Player API via postMessage
  useEffect(() => {
    if (!iframeRef.current || !videoUid) return;

    function handleMessage(event: MessageEvent) {
      if (!event.data || typeof event.data !== 'object') return;
      const { event: evtName, currentTime } = event.data as {
        event?: string;
        currentTime?: number;
      };

      if (evtName === 'streamReady') {
        setIsReady(true);
        // 從上次位置續播
        if (startTime > 0) {
          iframeRef.current?.contentWindow?.postMessage(
            { method: 'seekTo', value: startTime },
            '*',
          );
        }
      }
      if (evtName === 'timeupdate' && currentTime !== undefined) {
        onProgress?.(Math.floor(currentTime));
      }
      if (evtName === 'ended') {
        onComplete?.();
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [videoUid, startTime, onProgress, onComplete]);

  // 每 5 秒 poll 一次，確保進度不漏報
  useEffect(() => {
    if (!isReady || !iframeRef.current) return;
    const id = setInterval(() => {
      iframeRef.current?.contentWindow?.postMessage({ method: 'getCurrentTime' }, '*');
    }, 5000);
    return () => clearInterval(id);
  }, [isReady]);

  if (!videoUid) {
    return (
      <div className={cn('aspect-video bg-muted rounded-xl flex items-center justify-center', className)}>
        <p className="text-muted-foreground text-sm">影片尚未上傳</p>
      </div>
    );
  }

  if (locked) {
    return (
      <div className={cn('aspect-video bg-muted/80 rounded-xl flex flex-col items-center justify-center gap-3', className)}>
        <div className="rounded-full bg-background/80 p-4">
          <Lock className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground font-medium">購買課程後解鎖</p>
      </div>
    );
  }

  const subdomain = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN;
  const src = subdomain
    ? `https://${subdomain}/${videoUid}/iframe?preload=auto&loop=false&controls=true`
    : `https://iframe.videodelivery.net/${videoUid}?preload=auto&loop=false&controls=true`;

  return (
    <div className={cn('aspect-video rounded-xl overflow-hidden bg-black', className)}>
      <iframe
        ref={iframeRef}
        src={src}
        className="w-full h-full"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        title="課程影片"
      />
    </div>
  );
}
