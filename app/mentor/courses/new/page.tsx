import { getSubscriptionPlanLabels } from '@/lib/billing/queries';
import { createClient } from '@/lib/supabase/server';
import { NewCourseForm } from './new-course-form';

export default async function MentorNewCoursePage() {
  const supabase = await createClient();
  const [{ data: categories }, planLabels] = await Promise.all([
    supabase.from('categories').select('id, name').order('name'),
    getSubscriptionPlanLabels(),
  ]);

  return <NewCourseForm categories={categories ?? []} planLabels={planLabels} />;
}
