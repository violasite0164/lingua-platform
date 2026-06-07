import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

import { CourseQuizEditor } from '@/components/mentor/course-quiz-editor';
import { getSubscriptionPlanLabels } from '@/lib/billing/queries';
import { isAzureSpeechConfigured } from '@/lib/azure/speech-config';
import { requireMentor } from '@/lib/mentor/auth';
import { getMentorCourseQuizzesForEdit } from '@/lib/mentor/queries';

export default async function MentorCourseQuizEditPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const profile = await requireMentor();

  const [pack, planLabels] = await Promise.all([
    getMentorCourseQuizzesForEdit(courseId, profile.id),
    getSubscriptionPlanLabels(),
  ]);
  if (!pack) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/mentor/course-quizzes"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          返回測驗管理
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-foreground">{pack.course.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          管理測驗、影片文字與題目順序（共 {pack.lessons.length} 個單元）。
        </p>
      </div>

      <CourseQuizEditor
        courseId={pack.course.id}
        courseSubBasic={pack.course.sub_basic_free}
        courseSubPro={pack.course.sub_pro_free}
        planLabels={planLabels}
        lessons={pack.lessons}
        quizzes={pack.quizzes}
        questions={pack.quizQuestions}
        steps={pack.quizSteps}
        azureSpeechConfigured={isAzureSpeechConfigured()}
      />
    </div>
  );
}
