/** 首頁行銷落地頁文案（香港中小學 · 家長為主 · 無作業批改表述） */

export const HOME_HERO = {
  eyebrow: '扎根香港 · 專為本地中小學生而設',
  title: '幫子女學好英文，就揀 LinguaLearn',
  subtitle:
    '貼近香港教資、趣味學習、線上課程時間彈性；資深師資配合 AI 與線上教學，家長更易掌握子女程度',
  ctaPrimary: '即刻幫子女免費測驗',
  ctaSecondary: '瀏覽適合學生的課程 →',
};

export const HOME_STATS = [
  { value: '香港', label: '本地課程設計' },
  { value: '小一至中六', label: '年級涵蓋' },
  { value: '趣味', label: '遊戲化學習' },
  { value: '10,000+', label: '家庭選用' },
] as const;

export const HOME_FEATURES_TITLE = '點解家長揀 LinguaLearn 幫子女學英文';

/** 三欄賣點：左 4 項｜中央圖｜右 4 項（Sino-bus 風排版） */
export const HOME_FEATURES_LEFT = [
  {
    title: '價錢親民',
    desc: '線上課程彈性報讀，設有免費體驗與快測，性價比高，減少交通與補習開支。',
  },
  {
    title: '課程重溫',
    desc: '教學影片隨時重溫，鞏固課堂重點，方便按子女節奏複習。',
  },
  {
    title: '師資強勁',
    desc: '具教育背景與教學經驗的導師團隊，內容清晰、循序漸進。',
  },
  {
    title: '教材豐富',
    desc: '貼近香港教資，按年級與程度編排章節與練習，配合常見考核重點。',
  },
] as const;

export const HOME_FEATURES_RIGHT = [
  {
    title: '度身規劃',
    desc: '免費快測了解學習狀況，建議合適課程與練習重點，專攻薄弱環節。',
  },
  {
    title: '時間彈性',
    desc: '全線上學習，上課與重溫時間由家庭自行安排，放學後或週末皆可。',
  },
  {
    title: '覆蓋最廣',
    desc: '涵蓋小一至中六不同程度，配合本地學制與常見學習需要。',
  },
  {
    title: '隨時答疑',
    desc: 'AI 即時解析配合線上課程，答題後即可參考重點，弱項一目了然。',
  },
] as const;

/** @deprecated 改用 HOME_FEATURES_LEFT / HOME_FEATURES_RIGHT */
export const HOME_FEATURES = [...HOME_FEATURES_LEFT, ...HOME_FEATURES_RIGHT] as const;

export const HOME_TEACHERS_TITLE = 'AI × 線上課程 · 子女點樣學';
export const HOME_TEACHERS = [
  {
    name: '線上影片課程',
    role: '資深師資 · 章節清晰',
    bio: '由具教學經驗的導師錄製，按年級與程度編排，配合香港學生常見學習需要；可隨時重溫，鞏固課堂重點。',
    stats: [
      { value: '教資', label: '貼近本地' },
      { value: '隨時', label: '線上重溫' },
    ],
  },
  {
    name: 'AI 英語快測',
    role: '智能評估 · 約 5 分鐘',
    bio: '配合線上學習路徑，先了解子女閱讀、文法等大概程度，再選擇合適章節與練習重點。',
    stats: [
      { value: '10 題', label: '快測' },
      { value: '即時', label: '解析參考' },
    ],
  },
  {
    name: 'AI 英語鬥',
    role: '趣味練習 · 提升動機',
    bio: '以遊戲化方式配合線上課程，讓子女在輕鬆氛圍中反覆練習，越玩越熟。',
    stats: [
      { value: '趣味', label: '主動練習' },
      { value: 'AI', label: '即時回饋' },
    ],
  },
] as const;

export const HOME_TESTIMONIALS_TITLE = '家長好評回饋';
export const HOME_TESTIMONIALS = [
  '內容貼近香港學校節奏，女兒做完快測就知道要加強閱讀，跟住線上課程補得好自然。',
  '最鍾意可以在家學、時間自己夾；兒子話 AI 英語鬥好玩，肯主動開機練。',
  '導師講解清楚，配合 AI 練習，唔使再周圍搵補習班試下試下。',
  '全線上彈性高，功課忙都可以排短時間重溫一課，家長都易跟進。',
] as const;

export const HOME_STEPS_TITLE = '家長如何開始？';
export const HOME_STEPS = [
  {
    step: '01',
    title: '讓子女做免費快測',
    desc: '無需先報名課程，在本頁即可開始，配合 AI 即時了解程度參考。',
  },
  {
    step: '02',
    title: '查看建議與弱項',
    desc: '按答題表現掌握要加強的方向，方便同子女討論學習計劃。',
  },
  {
    step: '03',
    title: '選擇線上課程',
    desc: '按年級報讀合適課程，配合 AI 練習，在家彈性安排學習時間。',
  },
] as const;

export const HOME_FAQ_TITLE = '家長常見問題';
export const HOME_FAQ = [
  {
    q: '課程是否貼近香港教資？',
    a: '平台以香港中小學生為對象，學習重點參照本地課程與常見考核範圍；具體仍須配合各校進度與子女投入時間。',
  },
  {
    q: '適合幾多年級？',
    a: '涵蓋小一至中六不同程度；建議先讓子女做免費快測，再選擇合適年級與章節。',
  },
  {
    q: '線上課程可以幾時學？',
    a: '報讀後可隨時上課、重溫影片，適合放學後或週末在家學習，時間由家庭自行安排。',
  },
  {
    q: 'AI 同線上課程如何配合？',
    a: '快測與 AI 英語鬥幫助掌握弱項與保持趣味；線上影片課程由師資系統講解，兩者互相補充。',
  },
  {
    q: '快測要登入嗎？',
    a: '訪客即可開始；註冊後可保存學習紀錄，並使用完整 AI 英語鬥與課程功能。',
  },
  {
    q: '課程如何收費？',
    a: '設有免費體驗與付費課程，各課程頁會標示價格；建議先完成免費快測再選擇方案。',
  },
] as const;

/** 首頁測驗區標題（家長視角） */
export const HOME_QUIZ_SECTION = {
  title: '英語程度快測',
  subtitle: '約 10 題選擇題，完成後提供程度參考與學習建議，協助選擇合適線上課程',
};
