'use client';

import { ClassroomQuizRepeatQuestionButton } from '@/components/classroom-quiz/classroom-quiz-repeat-question-button';
import type { CourseQuizPlayTheme } from '@/types/database.types';

const TITLE_LINE_CLASSES = [
  'quiz-title-line-1',
  'quiz-title-line-2',
  'quiz-title-line-3',
] as const;

function ClassroomQuizQuestionProgress({
  cursor,
  total,
  showRepeatQuestion,
  questionAudioUrl,
  onRepeatQuestion,
}: {
  cursor: number;
  total: number;
  showRepeatQuestion?: boolean;
  questionAudioUrl?: string | null;
  onRepeatQuestion?: (url: string) => void;
}) {
  return (
    <span className="classroom-quiz-progress-row">
      <span className="classroom-quiz-progress-label">
        第 {cursor + 1} / {total} 題
      </span>
      {showRepeatQuestion && onRepeatQuestion ? (
        <ClassroomQuizRepeatQuestionButton
          url={questionAudioUrl}
          onPlay={onRepeatQuestion}
        />
      ) : null}
    </span>
  );
}

export function ClassroomQuizHeader({
  playTheme,
  quizTitle,
  cursor,
  total,
  showRepeatQuestion = false,
  questionAudioUrl,
  onRepeatQuestion,
}: {
  playTheme: CourseQuizPlayTheme;
  quizTitle: string;
  cursor: number;
  total: number;
  showRepeatQuestion?: boolean;
  questionAudioUrl?: string | null;
  onRepeatQuestion?: (url: string) => void;
}) {
  const progress = (
    <ClassroomQuizQuestionProgress
      cursor={cursor}
      total={total}
      showRepeatQuestion={showRepeatQuestion}
      questionAudioUrl={questionAudioUrl}
      onRepeatQuestion={onRepeatQuestion}
    />
  );

  if (playTheme !== 'magic_forest' && playTheme !== 'kindergarten') {
    return (
      <div className="classroom-quiz-header classroom-quiz-header--plain">
        <span className="classroom-quiz-header-title">{quizTitle}</span>
        <span className="classroom-quiz-header-sep" aria-hidden>
          ·
        </span>
        {progress}
      </div>
    );
  }

  const words = quizTitle.split(/\s+/).filter(Boolean);

  return (
    <header className="classroom-quiz-header-wrap text-center">
      <h2 className="quiz-bubble-title">
        {words.map((word, i) => (
          <span key={`${i}-${word}`} className={TITLE_LINE_CLASSES[i % 3]}>
            {word}{' '}
          </span>
        ))}
      </h2>
      <div className="classroom-quiz-header-sub-row">{progress}</div>
    </header>
  );
}
