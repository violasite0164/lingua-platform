import { createClient } from '@/lib/supabase/server';
import { NewCourseForm } from './new-course-form';

export default async function MentorNewCoursePage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .order('name');

  return <NewCourseForm categories={categories ?? []} />;
}
