export const QUIZ_VIDEO_TEXT_FONTS = [
  { id: 'fredoka', label: '圓潤英文 (Fredoka)' },
  { id: 'noto-sans-tc', label: '思源黑體' },
  { id: 'press-start', label: '像素風' },
  { id: 'system', label: '系統預設' },
] as const;

export type QuizVideoTextFontId = (typeof QUIZ_VIDEO_TEXT_FONTS)[number]['id'];

export const QUIZ_VIDEO_TEXT_ALIGNMENTS = [
  { id: 'left', label: '靠左' },
  { id: 'center', label: '置中' },
  { id: 'right', label: '靠右' },
] as const;

export type QuizVideoTextAlign = (typeof QUIZ_VIDEO_TEXT_ALIGNMENTS)[number]['id'];

export const QUIZ_VIDEO_TEXT_ANIMATIONS = [
  { id: 'none', label: '無' },
  { id: 'fade', label: '淡入' },
  { id: 'slide-up', label: '向上滑入' },
  { id: 'slide-left', label: '由右滑入' },
  { id: 'pop', label: '彈出' },
  { id: 'typewriter', label: '打字機' },
] as const;

export type QuizVideoTextAnimation = (typeof QUIZ_VIDEO_TEXT_ANIMATIONS)[number]['id'];

export function fontFamilyCss(id: QuizVideoTextFontId): string {
  switch (id) {
    case 'fredoka':
      return '"Fredoka", "Fredoka One", sans-serif';
    case 'noto-sans-tc':
      return '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
    case 'press-start':
      return '"Press Start 2P", monospace';
    default:
      return 'system-ui, -apple-system, sans-serif';
  }
}

export function fontClassName(id: QuizVideoTextFontId): string {
  switch (id) {
    case 'fredoka':
      return 'cq-font-fredoka';
    case 'noto-sans-tc':
      return 'cq-font-noto';
    case 'press-start':
      return 'cq-font-pixel';
    default:
      return 'cq-font-system';
  }
}
