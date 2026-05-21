import type { Metadata } from 'next';

import { HomeLanding } from '@/components/marketing/home-landing';
import type { QuizHomeRecommendedCourse } from '@/components/QuizHome';
import { getHomepagePublicSettings } from '@/lib/homepage-config';
import { getCurrentUser, getPublishedCourses } from '@/lib/supabase/queries';

export const metadata: Metadata = {
  title: '首頁',
  description:
    'LinguaLearn — 扎根香港，貼近教資；趣味線上課程、AI 輔助與資深師資，家長可為子女安排免費快測',
};

/** 依登入狀態載入推薦課程（SSR） */
export const dynamic = 'force-dynamic';

function toRecommendedCourses(
  courses: Awaited<ReturnType<typeof getPublishedCourses>>,
): QuizHomeRecommendedCourse[] {
  return courses.map((c) => ({
    id: c.id,
    title: c.title,
    level: c.level,
    thumbnail_url: c.thumbnail_url,
    is_free: c.is_free,
    price: c.price,
  }));
}

/**
 * 一律顯示訪客行銷落地頁（含內嵌快測）。
 * 已登入用戶的學習主頁見 /dashboard；點 logo 可隨時回到此頁。
 */
export default async function HomePage() {
  const user = await getCurrentUser();
  const [
    {
      media,
      headingColors,
      quizCopy,
      quizResultBackground,
      featuresStudentImageUrl,
      teachersCardImageUrls,
    },
    courses,
  ] = await Promise.all([
    getHomepagePublicSettings(),
    user ? getPublishedCourses({ limit: 12 }) : Promise.resolve([]),
  ]);

  return (
    <HomeLanding
      media={media}
      headingColors={headingColors}
      quizCopy={quizCopy}
      quizResultBackground={quizResultBackground}
      featuresStudentImageUrl={featuresStudentImageUrl}
      teachersCardImageUrls={teachersCardImageUrls}
      loggedIn={!!user}
      recommendedCourses={toRecommendedCourses(courses)}
    />
  );
}
