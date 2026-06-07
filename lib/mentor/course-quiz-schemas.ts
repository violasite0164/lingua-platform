import { z } from 'zod';

import { choiceCountForMode } from '@/lib/course-quiz/choice-mode';
import type { CourseQuizChoiceMode } from '@/types/database.types';

export const upsertCourseQuizSchema = z.object({
  course_id: z.string().uuid(),
  title: z.string().min(1, '請輸入測驗標題').max(200),
  placement: z.enum(['after_lesson', 'final_exam']),
  choice_mode: z.enum(['three', 'four']).default('four'),
  play_theme: z.enum(['off', 'magic_forest', 'kindergarten']).default('kindergarten'),
  interaction_mode: z.enum(['choice_grid', 'vocabulary_drop']).default('choice_grid'),
  vocabulary_display: z
    .enum(['character', 'shape', 'card'])
    .default('character')
    .transform((v) => (v === 'card' ? 'shape' : v)),
  shape_typeface_url: z.string().url().nullable().optional(),
  after_lesson_id: z.string().uuid().nullable().optional(),
  require_to_continue: z.boolean().default(true),
  require_to_complete_course: z.boolean().default(true),
  xp_reward: z.coerce.number().int().min(0).max(10000).default(300),
  is_published: z.boolean().default(false),
  sub_access_override: z.boolean().optional(),
  sub_basic_free: z.boolean().optional(),
  sub_pro_free: z.boolean().optional(),
});

export function upsertCourseQuizQuestionSchemaForMode(mode: CourseQuizChoiceMode) {
  const count = choiceCountForMode(mode);
  const maxIndex = count - 1;
  return z.object({
    quiz_id: z.string().uuid(),
    question_text: z.string().min(1, '請輸入題目'),
    question_speech_text: z.string().max(2000).optional().default(''),
    options: z
      .array(z.string().min(1, '選項不可為空'))
      .length(count, `需要 ${count} 個選項`),
    correct_index: z.coerce
      .number()
      .int()
      .min(0, '請選擇正確答案')
      .max(maxIndex, '請選擇正確答案'),
    explanation: z.string().max(2000).optional().default(''),
    cf_video_uid: z.string().nullable().optional(),
    cf_correct_video_uid: z.string().nullable().optional(),
    cf_wrong_video_uid: z.string().nullable().optional(),
    option_image_urls: z.array(z.string()).optional(),
    option_shape_glyphs: z.array(z.string()).optional(),
    vocabulary_display: z
      .enum(['character', 'shape', 'card'])
      .optional()
      .transform((v) => (v === 'card' ? 'shape' : v)),
  });
}

export type UpsertCourseQuizInput = z.infer<typeof upsertCourseQuizSchema>;
export type UpsertCourseQuizQuestionInput = z.infer<
  ReturnType<typeof upsertCourseQuizQuestionSchemaForMode>
>;
