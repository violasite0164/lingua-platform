import { notFound } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { requireMentor } from '@/lib/mentor/auth';
import { getMentorCourseForEdit } from '@/lib/mentor/queries';
import { MentorCourseEditForm } from '@/components/mentor/mentor-course-edit-form';

export default async function MentorEditCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireMentor();

  const pack = await getMentorCourseForEdit(id, profile.id);
  if (!pack) {
    notFound();
  }

  const supabase = await createClient();
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .order('name');

  return (
    <MentorCourseEditForm
      course={pack.course}
      lessons={pack.lessons}
      categories={categories ?? []}
    />
  );
}
