-- 為排行榜用 view 加上資料庫內註解（與應用層排序規則說明一致）
comment on view public.quiz_user_stats is
  'AI英語鬥：各難度每人平均得分、滿分次數、作答秒數（用於推導平均每局作答時間）、場次。排行榜排序：滿分場次優先；同場次則加權 時間60%+平均得分40%（見程式 lib/leaderboard/queries.ts）。';

