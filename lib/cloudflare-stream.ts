/**
 * Cloudflare Stream thumbnail URL helpers.
 * Thumbnails are available immediately after upload (may show a placeholder
 * frame until the video finishes processing).
 *
 * Docs: https://developers.cloudflare.com/stream/edit-videos/video-thumbnails/
 */

interface ThumbnailOptions {
  /** Timestamp to capture (e.g. "5s", "10%"). Default: "5s" */
  time?: string;
  /** Output width in pixels */
  width?: number;
  /** Output height in pixels */
  height?: number;
  /** Fit mode. Default: "crop" */
  fit?: 'crop' | 'clip' | 'scale-down';
}

/**
 * Build a Cloudflare Stream thumbnail URL for a given video UID.
 * Works client-side (uses NEXT_PUBLIC_ env) and server-side.
 */
export function cfThumbnailUrl(
  videoUid: string,
  options: ThumbnailOptions = {},
): string {
  const { time = '5s', width, height, fit = 'crop' } = options;

  const subdomain =
    typeof window === 'undefined'
      ? process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN
      : (window as typeof window & { __CF_SUBDOMAIN__?: string }).__CF_SUBDOMAIN__ ??
        process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN;

  const base = subdomain
    ? `https://${subdomain}/${videoUid}/thumbnails/thumbnail.jpg`
    : `https://videodelivery.net/${videoUid}/thumbnails/thumbnail.jpg`;

  const params = new URLSearchParams({ time, fit });
  if (width)  params.set('width',  String(width));
  if (height) params.set('height', String(height));

  return `${base}?${params.toString()}`;
}
