import { z } from 'zod';

/** 新單元預設完成經驗值（須與 DB `lessons.xp_reward` default 一致） */
export const DEFAULT_LESSON_XP_REWARD = 300;

export const courseLevelSchema = z.enum(['beginner', 'intermediate', 'advanced']);

export const createCourseFormSchema = z.object({
  title: z.string().min(3, '標題至少 3 個字').max(200),
  description: z.string().max(50000).optional(),
  price: z.coerce.number().min(0),
  level: courseLevelSchema,
  category_id: z.union([z.number().int().positive(), z.null()]).optional(),
  is_free: z.boolean(),
  is_published: z.boolean(),
});

export const updateCourseFormSchema = createCourseFormSchema.extend({
  id: z.string().uuid(),
});

export const lessonFormSchema = z.object({
  title: z.string().min(1, '請輸入單元標題').max(300),
  description: z.string().max(20000).optional().nullable(),
  is_preview: z.boolean(),
  xp_reward: z.coerce.number().int().min(0).max(1000),
});

export type LessonFormValues = z.infer<typeof lessonFormSchema>;
