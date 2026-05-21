import type {
  HomeBackdropMedia,
  HomeQuizCopy,
  HomeQuizHeadingColors,
  HomeQuizResultBackground,
  TeachersCardImageUrls,
} from '@/lib/homepage-public';

import { HomeFaq } from '@/components/marketing/home-faq';
import { HomeFeatures } from '@/components/marketing/home-features';
import { HomeHero } from '@/components/marketing/home-hero';
import { HomeSteps } from '@/components/marketing/home-steps';
import { HomeTeachers } from '@/components/marketing/home-teachers';
import { HomeTestimonials } from '@/components/marketing/home-testimonials';
import { HOME_QUIZ_SECTION } from '@/lib/marketing-home-content';
import { QuizHome, type QuizHomeRecommendedCourse } from '@/components/QuizHome';

export function HomeLanding({
  media,
  headingColors,
  quizCopy,
  quizResultBackground,
  featuresStudentImageUrl,
  teachersCardImageUrls,
  loggedIn = false,
  recommendedCourses = [],
}: {
  media: HomeBackdropMedia | null;
  headingColors: HomeQuizHeadingColors | null;
  quizCopy: HomeQuizCopy | null;
  quizResultBackground: HomeQuizResultBackground | null;
  featuresStudentImageUrl: string | null;
  teachersCardImageUrls: TeachersCardImageUrls;
  loggedIn?: boolean;
  recommendedCourses?: QuizHomeRecommendedCourse[];
}) {
  return (
    <div className="flex w-full flex-col bg-[hsl(var(--marketing-surface))]">
      <HomeHero media={media} />
      <HomeFeatures featuresStudentImageUrl={featuresStudentImageUrl} />
      <HomeTeachers teachersCardImageUrls={teachersCardImageUrls} />
      <HomeTestimonials />
      <HomeSteps loggedIn={loggedIn} />

      <section
        id="quiz"
        className="scroll-mt-20 border-t border-primary/10 bg-background py-16 md:py-20"
        aria-labelledby="home-quiz-heading"
      >
        <div className="container mx-auto max-w-4xl px-4">
          <div className="mb-8 text-center">
            <h2
              id="home-quiz-heading"
              className="text-2xl font-bold tracking-tight text-foreground md:text-3xl"
            >
              {HOME_QUIZ_SECTION.title}
            </h2>
            <p className="mt-2 text-sm text-marketing-muted md:text-base">
              {HOME_QUIZ_SECTION.subtitle}
            </p>
          </div>
          <QuizHome
            layout="landing"
            loggedIn={loggedIn}
            recommendedCourses={recommendedCourses}
            homeQuizHeadingColors={headingColors}
            homeQuizCopy={quizCopy}
            homeQuizResultBackground={quizResultBackground}
          />
        </div>
      </section>

      <HomeFaq />
    </div>
  );
}
