/** Cloudflare Stream 內嵌播放器（不需額外環境變數） */
export function cloudflareStreamIframeSrc(videoUid: string): string {
  return `https://iframe.videodelivery.net/${videoUid}`;
}
