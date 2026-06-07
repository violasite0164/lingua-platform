/** Cloudflare Stream 內嵌播放器（不需額外環境變數） */
export function cloudflareStreamIframeSrc(
  videoUid: string,
  opts?: {
    autoplay?: boolean;
    controls?: boolean;
    /** 設為 transparent 可減少 iframe 內 letterbox 底色 */
    letterboxColor?: string;
    muted?: boolean;
  },
): string {
  const subdomain = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN;
  const params = new URLSearchParams();
  params.set('preload', 'auto');
  params.set('loop', 'false');
  if (opts?.autoplay) {
    params.set('autoplay', 'true');
    params.set('muted', opts.muted !== false ? 'true' : 'false');
  }
  if (opts?.controls === false) {
    params.set('controls', 'false');
  } else {
    params.set('controls', 'true');
  }
  if (opts?.letterboxColor) {
    params.set('letterboxColor', opts.letterboxColor);
  }

  const qs = params.toString();
  if (subdomain) {
    return `https://${subdomain}/${videoUid}/iframe${qs ? `?${qs}` : ''}`;
  }
  return `https://iframe.videodelivery.net/${videoUid}${qs ? `?${qs}` : ''}`;
}
