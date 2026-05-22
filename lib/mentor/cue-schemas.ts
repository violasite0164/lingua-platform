import { z } from 'zod';

import type { LessonCueType } from '@/lib/lesson-cues/types';

export const lessonCueTypeSchema = z.enum([
  'sentence',
  'multiple_choice',
  'text_input',
]);

const sentencePayloadSchema = z.object({
  text: z.string().min(1, '請輸入句字內容').max(2000),
});

const multipleChoicePayloadSchema = z.object({
  prompt: z.string().min(1, '請輸入題目').max(2000),
  options: z
    .tuple([
      z.string().min(1, '選項不可空白').max(500),
      z.string().min(1).max(500),
      z.string().min(1).max(500),
      z.string().min(1).max(500),
    ]),
  correct_index: z.coerce.number().int().min(0).max(3),
  explanation: z.string().max(2000).optional(),
});

const textInputPayloadSchema = z.object({
  prompt: z.string().min(1, '請輸入題目').max(2000),
  acceptable_answers: z
    .array(z.string().min(1).max(500))
    .min(1, '至少一個可接受答案'),
  case_sensitive: z.boolean().optional(),
  explanation: z.string().max(2000).optional(),
});

export const upsertLessonCueSchema = z.object({
  lesson_id: z.string().uuid(),
  trigger_at_sec: z.coerce.number().int().min(0).max(86400),
  cue_type: lessonCueTypeSchema,
  payload: z.unknown(),
  is_enabled: z.boolean().optional(),
});

export function validateCuePayload(type: LessonCueType, payload: unknown) {
  switch (type) {
    case 'sentence':
      return sentencePayloadSchema.safeParse(payload);
    case 'multiple_choice':
      return multipleChoicePayloadSchema.safeParse(payload);
    case 'text_input':
      return textInputPayloadSchema.safeParse(payload);
  }
}
