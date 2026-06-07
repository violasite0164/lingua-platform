/**
 * Quiz 角色 Rive 資產約定（供設計師在 Rive Editor 對齊）。
 *
 * State Machine 建議名稱：`Main`
 * Number input `mood`：0 idle · 1 thinking · 2 correct · 3 wrong · 4 celebrate
 * Number input `personality`：0 toxic · 1 gentle
 * Trigger `react`：答題回饋 one-shot（可選）
 */
export const QUIZ_BOT_RIVE_MANIFEST = {
  stateMachine: 'Main',
  inputs: {
    mood: 'mood',
    personality: 'personality',
    react: 'react',
  },
  moodValues: {
    idle: 0,
    thinking: 1,
    correct: 2,
    wrong: 3,
    celebrate: 4,
  },
  personalityValues: {
    toxic: 0,
    gentle: 1,
  },
} as const;

export function getQuizBotRiveSrc(): string {
  const fromEnv = process.env.NEXT_PUBLIC_RIVE_QUIZ_BOT_URL?.trim();
  if (fromEnv) return fromEnv;
  return '/rive/quiz-bot.riv';
}
