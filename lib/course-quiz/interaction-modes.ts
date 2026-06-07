import type { CourseQuizInteractionMode } from '@/types/database.types';

export const COURSE_QUIZ_INTERACTION_MODES: Record<
  CourseQuizInteractionMode,
  { label: string; description: string }
> = {
  choice_grid: {
    label: '一般選項',
    description: '影片下方顯示選項按鈕。',
  },
  vocabulary_drop: {
    label: '單字模式',
    description:
      '播完影片與題目語音後，答案自高處散落掉於全畫面；長按撿起並拖入影片中央區域作答。可選字元或卡片顯示。',
  },
};

export function resolveCourseQuizInteractionMode(
  raw: string | null | undefined,
): CourseQuizInteractionMode {
  return raw === 'vocabulary_drop' ? 'vocabulary_drop' : 'choice_grid';
}
