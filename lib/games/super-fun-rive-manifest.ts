/**
 * Super Fun Quiz 專用 Rive 資產（可分批上線，缺檔時用插圖 fallback）。
 *
 * 各檔 State Machine 建議皆命名 `Main`，Number input `mood`：
 * 0 idle · 1 thinking · 2 correct · 3 wrong · 4 celebrate
 */
export const SUPER_FUN_RIVE = {
  stateMachine: 'Main',
  inputs: { mood: 'mood', react: 'react', cheer: 'cheer', stupid: 'stupid' },
  moodValues: {
    idle: 0,
    thinking: 1,
    correct: 2,
    wrong: 3,
    celebrate: 4,
  },
  assets: {
    prop: {
      src: () =>
        process.env.NEXT_PUBLIC_RIVE_QUIZ_PROP_URL?.trim() || '/rive/quiz-prop.riv',
      label: '題目插圖（如動物）',
    },
    boy: {
      src: () =>
        process.env.NEXT_PUBLIC_RIVE_QUIZ_BOY_URL?.trim() || '/rive/quiz-mascot-boy.riv',
      label: '男孩吉祥物',
    },
    girl: {
      src: () =>
        process.env.NEXT_PUBLIC_RIVE_QUIZ_GIRL_URL?.trim() || '/rive/quiz-mascot-girl.riv',
      label: '女孩吉祥物',
    },
  },
} as const;

export type SuperFunRiveSlot = keyof typeof SUPER_FUN_RIVE.assets;
