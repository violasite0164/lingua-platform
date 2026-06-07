# Quiz Rive 資產

## Super Fun Quiz（建議優先）

| 檔名 | 用途 |
|------|------|
| `quiz-prop.riv` | 題目區中央插圖（如狐狸、動畫 idle） |
| `quiz-mascot-bear.riv` | 答題場景熊（`bear_idle`；有 State Machine 時可接 mood） |
| `quiz-mascot-boy.riv` | 答題場景男孩（`boy1_idle`；有 State Machine 時可接 mood） |
| `quiz-mascot-girl.riv` | 答題場景女孩（`eng_adv_girl_idle`；有 State Machine 時可接 mood） |

環境變數覆寫（可選）：

```env
NEXT_PUBLIC_RIVE_QUIZ_PROP_URL=
NEXT_PUBLIC_RIVE_QUIZ_BOY_URL=
NEXT_PUBLIC_RIVE_QUIZ_GIRL_URL=
```

關閉所有 Rive 嘗試：

```env
NEXT_PUBLIC_RIVE_QUIZ_ENABLED=false
```

## State Machine 約定（各檔建議相同）

| 名稱 | 類型 | 說明 |
|------|------|------|
| `Main` | State Machine | 預設狀態機 |
| `mood` | Number | 0 idle · 1 thinking · 2 correct · 3 wrong · 4 celebrate |
| `react` | Trigger | 答題瞬間 one-shot（可選） |

缺檔時網頁會自動使用 emoji 插圖與 👦👧 fallback，不影響遊玩。
