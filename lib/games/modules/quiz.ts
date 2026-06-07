import { QuizApp } from '@/components/quiz/quiz-app';
import type { GameModule } from '@/lib/games/types';

export const quizGameModule: GameModule = {
  id: 'quiz',
  title: '英語大冒險',
  description: '四選一英語測驗',
  pixelFont: false,
  Component: QuizApp,
};
