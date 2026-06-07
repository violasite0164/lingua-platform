'use client';

/** 魔法森林場景：背景動態 + 光暈 + 雲 + 光點（不加整片白漸層遮罩） */
export function QuizForestAtmosphere() {
  return (
    <div className="quiz-forest-fx" aria-hidden>
      <div className="quiz-forest-fx-bg" />
      <div className="quiz-forest-fx-glow" />
      <div className="quiz-forest-fx-cloud quiz-forest-fx-cloud--a" />
      <div className="quiz-forest-fx-cloud quiz-forest-fx-cloud--b" />
      <div className="quiz-forest-fx-cloud quiz-forest-fx-cloud--c" />
      <span className="quiz-forest-fx-spark quiz-forest-fx-spark--1" />
      <span className="quiz-forest-fx-spark quiz-forest-fx-spark--2" />
      <span className="quiz-forest-fx-spark quiz-forest-fx-spark--3" />
      <span className="quiz-forest-fx-spark quiz-forest-fx-spark--4" />
      <span className="quiz-forest-fx-spark quiz-forest-fx-spark--5" />
      <span className="quiz-forest-fx-spark quiz-forest-fx-spark--6" />
      <span className="quiz-forest-fx-spark quiz-forest-fx-spark--7" />
      <span className="quiz-forest-fx-spark quiz-forest-fx-spark--8" />
    </div>
  );
}
