import { z } from 'zod';

import {
  QUIZ_VIDEO_TEXT_ALIGNMENTS,
  QUIZ_VIDEO_TEXT_ANIMATIONS,
  QUIZ_VIDEO_TEXT_FONTS,
} from '@/lib/course-quiz/video-text';

const fontIds = QUIZ_VIDEO_TEXT_FONTS.map((f) => f.id) as [string, ...string[]];
const alignIds = QUIZ_VIDEO_TEXT_ALIGNMENTS.map((a) => a.id) as [string, ...string[]];
const animIds = QUIZ_VIDEO_TEXT_ANIMATIONS.map((a) => a.id) as [string, ...string[]];

export const upsertVideoTextStepSchema = z.object({
  quiz_id: z.string().uuid(),
  text_content: z.string().min(1, '請輸入文字'),
  font_family: z.enum(fontIds).default('fredoka'),
  font_size_px: z.coerce.number().int().min(12).max(120).default(32),
  text_color: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, '請使用 #RRGGBB 色碼')
    .default('#ffffff'),
  text_align: z.enum(alignIds).default('center'),
  text_animation: z.enum(animIds).default('fade'),
});

export type UpsertVideoTextStepInput = z.infer<typeof upsertVideoTextStepSchema>;
