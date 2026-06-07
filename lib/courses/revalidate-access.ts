import { revalidatePath } from 'next/cache';

/** 訂閱免費／存取設定變更後，讓學員端課程列表與詳情即時反映 */
export function revalidateCourseAccessPaths(courseId: string) {
  revalidatePath('/courses');
  revalidatePath(`/courses/${courseId}`);
  revalidatePath(`/learn/${courseId}`);
  revalidatePath('/dashboard');
  revalidatePath(`/mentor/courses/${courseId}/edit`);
}
