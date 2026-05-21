#!/usr/bin/env python3
"""Generate 300 quiz INSERT rows: 75 per difficulty. Schema: options jsonb (string[4]), correct_index 0-3."""
from __future__ import annotations

import json
import re


def esc(s: str) -> str:
    return s.replace("'", "''")

def norm(s: str) -> str:
    # Remove NBSP / full-width space / zero-width chars, then collapse whitespace
    s = (
        s.replace("\u00a0", " ")
        .replace("\u3000", " ")
        .replace("\u200b", "")
        .replace("\u2060", "")
        .replace("\ufeff", "")
    )
    s = re.sub(r"\s+", " ", s).strip()
    return s


def opts(*parts: str) -> list[str]:
    letters = "ABCD"
    cleaned = [("no article" if norm(p) == "/" else norm(p)) for p in parts]
    return [f"{letters[i]}. {cleaned[i]}" for i in range(4)]


def row(diff: str, q: str, options: list[str], correct_index: int, explanation: str) -> str:
    diff = norm(diff)
    q = norm(q)
    options = [norm(o) for o in options]
    explanation = norm(explanation)
    opts_json = json.dumps(options, ensure_ascii=False)
    letter = "ABCD"[correct_index]
    return (
        f"('{esc(diff)}', '{esc(q)}', '{esc(opts_json)}'::jsonb, "
        f"'{letter}', {correct_index}, '{esc(explanation)}')"
    )


def main() -> None:
    rows: list[str] = []

    # ─── elementary (75) ───
    e: list[tuple] = [
        ("I ___ a student.", opts("am", "is", "are", "be"), 0, "主詞 I 搭配 be 動詞 am。"),
        ("She ___ my sister.", opts("am", "is", "are", "be"), 1, "第三人稱單數 she 用 is。"),
        ("They ___ playing soccer.", opts("is", "am", "are", "be"), 2, "複數主詞 they 用 are。"),
        ("What ___ your name?", opts("are", "is", "am", "be"), 1, "單數主詞 your name 視為單一概念，用 is。"),
        ("There ___ five apples.", opts("is", "are", "am", "be"), 1, "後接複數名詞用 there are。"),
        ("He ___ not like coffee.", opts("do", "does", "is", "are"), 1, "第三人稱否定喜好用 does not。"),
        ("___ you like tea?", opts("Do", "Does", "Is", "Are"), 0, "you 搭配助動詞 Do 構成疑問。"),
        ("I have ___ umbrella.", opts("a", "an", "the", "/"), 1, "umbrella 母音開頭，冠詞用 an。"),
        ("This is ___ book.", opts("a", "an", "the", "/"), 0, "book 子音開頭，不定冠詞用 a。"),
        ("Those ___ my shoes.", opts("is", "are", "am", "be"), 1, "those 為複數指示代名詞，動詞用 are。"),
        ("She ___ to school every day.", opts("go", "goes", "going", "went"), 1, "每天習慣用現在簡單式，she 加 -es。"),
        ("We ___ English on Mondays.", opts("study", "studies", "studying", "studied"), 0, "We 為複數主詞，動詞用原形 study。"),
        ("It ___ raining now.", opts("is", "are", "am", "be"), 0, "現在進行式：It is + V-ing。"),
        ("Can you ___ me?", opts("help", "helps", "helping", "helped"), 0, "情態動詞 can 後接動詞原形。"),
        ("I ___ breakfast at 7 a.m.", opts("eat", "eats", "eating", "ate"), 0, "I 第一人稱，現在簡單式用 eat。"),
        ("He ___ his homework yesterday.", opts("do", "does", "did", "doing"), 2, "yesterday 表過去，助動詞用 did（此處選項為過去式動詞 did 表「做」—若題幹為 finish 類會不同；此題選 did 表完成過去動作）。"),
        ("They ___ TV last night.", opts("watch", "watches", "watching", "watched"), 3, "last night 過去時間，動詞用過去式 watched。"),
        ("___ is your birthday?", opts("When", "Where", "Who", "How"), 0, "詢問日期用 When。"),
        ("___ bag is this?", opts("Who", "Whose", "Which", "What"), 1, "詢問物品所屬用 Whose。"),
        ("I am ___ years old.", opts("seven", "seventh", "sevens", "sevenths"), 0, "年齡用基數詞 seven。"),
        ("The cat is ___ the table.", opts("in", "on", "at", "of"), 1, "在桌面上用介系詞 on。"),
        ("The keys are ___ my pocket.", opts("on", "in", "at", "by"), 1, "在口袋內部用 in。"),
        ("She goes to school ___ bus.", opts("by", "on", "in", "with"), 0, "交通工具用 by bus。"),
        ("___! You won the game.", opts("Congratulations", "Sorry", "Excuse me", "Goodbye"), 0, "祝賀對方獲勝用 Congratulations。"),
        ("It's cold. Please ___ the window.", opts("open", "opens", "opening", "opened"), 0, "祈使句請求，動詞用原形 open。"),
        ("Don't ___ in the library.", opts("talk", "talks", "talking", "talked"), 0, "否定祈使 Don't 後接動詞原形。"),
        ("How ___ apples do you want?", opts("much", "many", "old", "long"), 1, "可數名詞數量用 How many。"),
        ("How ___ water do you need?", opts("many", "much", "often", "far"), 1, "不可數名詞用量用 How much。"),
        ("I have ___ brother and two sisters.", opts("one", "an", "much", "any"), 0, "一位哥哥／弟弟用 one 或 a；選項 one 正確。"),
        ("This pencil is ___.", opts("you", "your", "yours", "you're"), 2, "名詞後表示「你的（東西）」用名詞性物主代名詞 yours。"),
        ("___ pen is on the floor?", opts("Who", "Whose", "Where", "When"), 1, "問「誰的筆」用 Whose。"),
        ("We should ___ our teeth before bed.", opts("brush", "brushes", "brushing", "brushed"), 0, "情態動詞 should 後接原形 brush。"),
        ("It's 10 p.m. Let's ___ to bed.", opts("go", "goes", "going", "went"), 0, "Let's 後接動詞原形 go。"),
        ("The sun ___ in the east.", opts("rise", "rises", "rising", "rose"), 1, "自然現象習慣用現在式，the sun 為單數用 rises。"),
        ("Birds can ___.", opts("fly", "flies", "flying", "flew"), 0, "情態動詞 can 後接原形 fly。"),
        ("I want ___ apple juice.", opts("a", "an", "some", "any"), 2, "不可數的果汁表示「一些」用 some（肯定句）。"),
        ("There isn't ___ milk in the fridge.", opts("some", "any", "many", "a"), 1, "否定句中「任何」用 any。"),
        ("My father ___ tall.", opts("am", "is", "are", "be"), 1, "My father 第三人稱單數用 is。"),
        ("These ___ not my books.", opts("is", "are", "am", "be"), 1, "these 複數用 are。"),
        ("___ you OK?", opts("Is", "Are", "Am", "Be"), 1, "主詞 you 配 Are。"),
        ("Welcome ___ our school!", opts("for", "to", "at", "on"), 1, "Welcome to + 地點為固定用法。"),
        ("Nice ___ meet you.", opts("too", "to", "for", "of"), 1, "初次見面固定句 Nice to meet you。"),
        ("See you ___.", opts("tomorrow", "tomorrows", "in tomorrow", "at tomorrow"), 0, "明天見用 tomorrow。"),
        ("___ is this? — It's a ruler.", opts("What", "Who", "Where", "How"), 0, "詢問物品是什麼用 What。"),
        ("___ is he from? — Taiwan.", opts("What", "Where", "When", "Why"), 1, "詢問來自哪裡用 Where。"),
        ("I like ___ because it's sweet.", opts("candy", "salt", "spicy", "sour"), 0, "甜的東西符合 candy。"),
        ("We wear coats when it's ___.", opts("hot", "cold", "sunny", "warm"), 1, "穿外套通常是天冷時。"),
        ("Monday comes ___ Sunday.", opts("before", "after", "at", "on"), 1, "星期一在星期日之後。"),
        ("There are seven ___ in a week.", opts("hours", "days", "months", "years"), 1, "一週有七天 days。"),
        ("January is the first ___ of the year.", opts("week", "day", "month", "season"), 2, "一月是一年中的第一個月。"),
        ("Red and yellow make ___.", opts("green", "orange", "purple", "black"), 1, "紅加黃成橙色（題目常識）。"),
        ("A dog says ___.", opts("meow", "woof", "moo", "oink"), 1, "狗叫聲常用 woof。"),
        ("An elephant is ___.", opts("small", "tiny", "large", "short"), 2, "大象體型大，選 large。"),
        ("We use ___ to cut paper.", opts("a spoon", "a fork", "scissors", "a plate"), 2, "剪刀剪裁紙張。"),
        ("You read books in the ___.", opts("kitchen", "classroom", "library", "gym"), 2, "在圖書館閱讀。"),
        ("Doctors work in a ___.", opts("school", "hospital", "farm", "zoo"), 1, "醫師在醫院工作。"),
        ("An orange is usually ___.", opts("blue", "orange", "black", "white"), 1, "橘子通常橙色。"),
        ("We sleep in the ___.", opts("kitchen", "garden", "bedroom", "street"), 2, "在臥房睡覺。"),
        ("The opposite of 'big' is ___.", opts("large", "huge", "small", "tall"), 2, "big 的反義是 small。"),
        ("12 minus 5 equals ___.", opts("five", "six", "seven", "eight"), 2, "12-5=7。"),
        ("Which season is the hottest?", opts("spring", "summer", "fall", "winter"), 1, "通常夏季最熱。"),
        ("You drink soup with a ___.", opts("knife", "spoon", "chopsticks", "cup"), 1, "湯一般用湯匙。"),
        ("A triangle has ___ sides.", opts("two", "three", "four", "five"), 1, "三角形有三邊。"),
        ("We celebrate Christmas in ___.", opts("July", "December", "March", "June"), 1, "聖誕節在十二月。"),
        ("A week has ___ days.", opts("five", "six", "seven", "eight"), 2, "一週七天。"),
        ("The first month is ___.", opts("February", "January", "March", "April"), 1, "第一個月是一月。"),
        ("If you are thirsty, you should ___.", opts("sleep", "drink water", "run", "sing"), 1, "口渴應喝水。"),
        ("Good night means we say it ___.", opts("in the morning", "before sleep", "at lunch", "in class"), 1, "晚安在睡前說。"),
        ("We write with a ___.", opts("plate", "pen", "spoon", "chair"), 1, "用筆書寫。"),
        ("Which animal can swim?", opts("bird only", "fish", "only cats", "only cows"), 1, "魚會游泳。"),
        ("Please ___ your teacher.", opts("ignore", "respect", "shout at", "fight"), 1, "應尊敬老師。"),
        ("___ comes after Tuesday.", opts("Monday", "Wednesday", "Sunday", "Friday"), 1, "週三在週二之後。"),
        ("We eat rice with ___.", opts("only hands in class", "chopsticks in many places", "never", "shoes"), 1, "許多地區用筷子吃飯。"),
        ("___ means 'Not bad.' in many chats.", opts("Terrible", "So-so", "Perfect", "Excellent"), 1, "So-so 表示普通、還可以。"),
        ("Turn left means go to the ___.", opts("right side", "left side", "back only", "sky"), 1, "左轉即往左邊。"),
    ]
    for t in e:
        rows.append(row("elementary", t[0], t[1], t[2], t[3]))

    # ─── junior (75) ───
    j: list[tuple] = [
        ("If it rains tomorrow, we ___ the picnic.", opts("cancel", "cancelled", "have cancelled", "will cancel"), 3, "第一條件句：if + 現在簡單，主句用未來 will。"),
        ("She ___ English for five years.", opts("studies", "has studied", "studied", "is studying"), 1, "for + 一段時間表從過去持續至今，常用現在完成式。"),
        ("By next July, he ___ here for ten years.", opts("lives", "will live", "will have lived", "lived"), 2, "By + 未來時間點表「到那時將已…」，用未來完成式。"),
        ("I wish I ___ taller.", opts("am", "was", "were", "be"), 2, "wish 後假設與現在事實相反，be 動詞常用 were。"),
        ("It's time we ___ home.", opts("go", "went", "gone", "going"), 1, "It's time (that) + 過去式表「該是…的時候了」。"),
        ("The book ___ by millions of readers.", opts("reads", "is read", "was reading", "has read"), 1, "書被閱讀，被動語態。"),
        ("He decided ___ abroad.", opts("study", "studying", "to study", "studied"), 2, "decide 後接不定詞 to study。"),
        ("She is interested ___ music.", opts("on", "at", "in", "for"), 2, "be interested in 為固定搭配。"),
        ("Neither Tom nor his brothers ___ coming.", opts("is", "are", "was", "be"), 1, "Neither nor 動詞與最近主詞 brothers 一致。"),
        ("Not only Jane but also her friends ___ there.", opts("was", "were", "is", "be"), 1, "Not only but also 動詞與較近主詞 friends 一致。"),
        ("The news ___ surprising.", opts("are", "were", "is", "be"), 2, "news 為不可數，視為單數。"),
        ("Mathematics ___ my favorite subject.", opts("are", "were", "is", "be"), 2, "學科 mathematics 當單數。"),
        ("Few students finished it; ___, most gave up.", opts("therefore", "moreover", "however", "for example"), 2, "語意轉折，用 however。"),
        ("She runs fast; ___, she won the race.", opts("but", "therefore", "although", "unless"), 1, "因果：跑得快因此獲勝，用 therefore。"),
        ("___ it was cold, we went swimming.", opts("Because", "Although", "If", "Unless"), 1, "儘管冷還是去游泳，讓步用 Although。"),
        ("You ___ smoke here; it's forbidden.", opts("must", "mustn't", "should", "might"), 1, "禁止用 mustn't。"),
        ("You ___ see a doctor if the pain continues.", opts("mustn't", "should", "might not", "couldn't"), 1, "建議應該看醫生用 should。"),
        ("He speaks ___ he were an expert.", opts("even if", "as though", "unless", "until"), 1, "好像、彷彿用 as though / as if。"),
        ("No sooner ___ than the phone rang.", opts("he sat down", "had he sat down", "he had sat down", "did he sat down"), 1, "No sooner 倒裝且過去完成。"),
        ("Scarcely ___ when the lights went out.", opts("the show began", "had the show begun", "did the show began", "the show had begun"), 1, "Scarcely...when 結構常用過去完成倒裝。"),
        ("I'd rather you ___ now.", opts("leave", "left", "leaving", "to leave"), 1, "would rather + 子句表對他人行為願望時常用過去式。"),
        ("If I ___ you, I would apologize.", opts("am", "was", "were", "had been"), 2, "與現在事實相反的第二條件 if I were you。"),
        ("The man ___ wallet was stolen reported it.", opts("who", "whom", "whose", "which"), 2, "所有格關係代名詞 whose。"),
        ("This is the best film ___ I have ever seen.", opts("which", "that", "what", "who"), 1, "先行詞有最高級修飾時關係代名詞常用 that。"),
        ("He has three brothers, all of ___ are doctors.", opts("them", "which", "whom", "who"), 2, "介詞 + whom 指人（brothers）。"),
        ("She suggested that he ___ early.", opts("leave", "leaves", "left", "leaving"), 0, "suggest that + 原形動詞（英式／正式）或 should leave。"),
        ("It's essential that he ___ on time.", opts("be", "is", "was", "will be"), 0, "essential that + (should) + 原形。"),
        ("Hardly ___ when she started to cry.", opts("the movie began", "had the movie begun", "did the movie began", "the movie had begun"), 1, "Hardly...when 與過去完成倒裝。"),
        ("So difficult ___ that nobody solved it.", opts("the problem was", "was the problem", "did the problem be", "the problem is"), 1, "So + 形／副 前置倒裝。"),
        ("Not until yesterday ___ the truth.", opts("I knew", "did I know", "I had known", "had I knew"), 1, "Not until 開頭需倒裝。"),
        ("The cake smells ___.", opts("nicely", "good", "well", "best"), 1, "感官動詞 smell 後接形容詞 good。"),
        ("He felt ___ about failing the exam.", opts("badly", "bad", "worst", "badder"), 1, "feel 後接形容詞 bad。"),
        ("She looked ___ at him.", opts("angry", "angrily", "anger", "angrier"), 1, "修飾動詞 look 用副詞 angrily。"),
        ("I look forward ___ from you.", opts("to hear", "to hearing", "hearing", "hear"), 1, "look forward to + 動名詞。"),
        ("She accused him ___ lying.", opts("for", "of", "with", "about"), 1, "accuse someone of + 動名詞。"),
        ("You'd better ___ now.", opts("to leave", "leave", "leaving", "left"), 1, "had better 後接動詞原形。"),
        ("It's no use ___ over spilt milk.", opts("cry", "to cry", "crying", "cried"), 2, "It's no use + 動名詞。"),
        ("The problem ___ at the meeting yesterday.", opts("discusses", "was discussed", "discussed", "is discussing"), 1, "問題被討論，過去被動。"),
        ("The teacher made the students ___ quietly.", opts("to sit", "sit", "sitting", "sat"), 1, "make + 受詞 + 原形動詞。"),
        ("Let me ___ you with your bags.", opts("to help", "help", "helping", "helped"), 1, "let + 受詞 + 原形動詞。"),
        ("He used ___ in Paris.", opts("living", "to live", "live", "lived"), 1, "used to + 原形表過去習慣。"),
        ("The boy ___ window was broken must pay.", opts("who", "whom", "whose", "which"), 2, "男孩之窗戶，用 whose。"),
        ("This is the house ___ Shakespeare was born.", opts("which", "where", "that", "what"), 1, "地點先行詞用 where。"),
        ("I don't know ___ he will come.", opts("if", "that", "what", "which"), 0, "whether/if 引導名詞子句表「是否」。"),
        ("Tell me ___ you want.", opts("what", "that", "which", "what that"), 0, "疑問詞 what 作 want 的受詞。"),
        ("___ breaks the rules will be punished.", opts("Whoever", "Who", "Whom", "Whose"), 0, "無論誰違規，用 whoever。"),
        ("___ difficult the task is, we must finish it.", opts("However", "Whatever", "Although", "Though"), 0, "However + 形／副 表「無論多…」。"),
        ("He is ___ smart that everyone admires him.", opts("so", "such", "very", "too"), 0, "so...that 結果子句。"),
        ("It was ___ a cold day that we stayed inside.", opts("so", "such", "very", "much"), 1, "such + a + 形 + 名。"),
        ("By the time we arrived, the film ___.", opts("starts", "had started", "has started", "was starting"), 1, "動作發生在 arrived 之前，過去完成。"),
        ("She ___ the essay before the deadline.", opts("has finished", "had finished", "finished", "finishes"), 1, "在過去某點之前已完成，過去完成。"),
        ("If I ___ harder, I would have passed.", opts("study", "studied", "had studied", "have studied"), 2, "與過去事實相反的第三條件。"),
        ("The letter ___ last week.", opts("sends", "was sent", "is sending", "has sent"), 1, "信被寄出，過去被動。"),
        ("He enjoys ___, not to be read to.", opts("to read", "reading", "read", "reads"), 1, "enjoy + 動名詞。"),
        ("Would you mind ___ the door?", opts("close", "closing", "to close", "closed"), 1, "mind + 動名詞。"),
        ("It's worth ___ again.", opts("try", "trying", "to try", "tried"), 1, "worth + 動名詞。"),
        ("She denied ___ the money.", opts("steal", "stealing", "to steal", "stole"), 1, "deny + 動名詞。"),
        ("I can't afford ___ a new car.", opts("buy", "to buy", "buying", "bought"), 1, "afford + to + 原形。"),
        ("She reminded me ___ the lights.", opts("turn off", "to turn off", "turning off", "of turn off"), 1, "remind + 受詞 + to + 原形。"),
        ("He congratulated me ___ the prize.", opts("for winning", "on winning", "to win", "of winning"), 1, "congratulate on + 動名詞。"),
        ("She apologized ___ rude.", opts("for being", "to be", "of being", "about be"), 0, "apologize for + 動名詞。"),
        ("I'm thinking ___ abroad next year.", opts("about going", "to go", "of go", "going"), 0, "think about + 動名詞。"),
        ("He succeeded ___ the exam.", opts("to pass", "in passing", "on passing", "pass"), 1, "succeed in + 動名詞。"),
        ("She insisted ___ paying.", opts("on", "for", "to", "of"), 0, "insist on + 動名詞。"),
        ("He prevented me ___ leaving.", opts("from", "to", "for", "of"), 0, "prevent from + 動名詞。"),
        ("The rain stopped us ___ going out.", opts("from", "to", "of", "for"), 0, "stop from + 動名詞。"),
        ("She is capable ___ the job.", opts("to do", "of doing", "for doing", "in do"), 1, "capable of + 動名詞。"),
        ("He is used ___ early.", opts("to get up", "to getting up", "of getting up", "for getting up"), 1, "be used to + 動名詞表習慣。"),
        ("I'd prefer ___ at home tonight.", opts("stay", "to stay", "staying", "stayed"), 1, "would prefer + to + 原形。"),
        ("Rather than ___ , he walked.", opts("wait", "to wait", "waiting", "waited"), 0, "rather than + 原形。"),
        ("It ___ John who broke the vase.", opts("is", "was", "were", "are"), 1, "分裂句 It was... who，過去事件。"),
        ("Little ___ about her past.", opts("she knew", "did she know", "knew she", "she did know"), 1, "否定副詞 Little 開頭倒裝。"),
        ("Never ___ such a beautiful sunset.", opts("I saw", "have I seen", "I have seen", "did I saw"), 1, "Never 開頭現在完成倒裝。"),
        ("The more you practice, ___ you become.", opts("the more fluently", "the more fluent", "more fluent", "most fluent"), 1, "the more... the more 平行結構。"),
        ("He speaks English ___ a native speaker.", opts("as fluent as", "as fluently as", "so fluent as", "more fluent than"), 1, "修飾動詞 speaks 用副詞比較 as fluently as。"),
    ]
    for t in j:
        rows.append(row("junior", t[0], t[1], t[2], t[3]))

    # ─── college (75) ───
    c: list[tuple] = [
        ("The hypothesis was ___ by subsequent experiments.", opts("refuted", "refuting", "refute", "to refute"), 0, "被動語態，假設被後續實驗駁回。"),
        ("The study ___ a significant correlation between variables.", opts("established", "establishing", "establish", "to establish"), 0, "過去研究「確立」相關，用過去式 established。"),
        ("The author's argument is somewhat ___.", opts("tenuous", "tenuously", "tenuity", "tenuousness"), 0, "形容詞作補語：論證略顯薄弱 tenuous。"),
        ("She gave a ___ account of the incident.", opts("dispassionate", "dispassionately", "dispassion", "dispassioning"), 0, "名詞前用形容詞：客觀平實的敘述。"),
        ("The policy has had ___ effects on small businesses.", opts("deleterious", "deleteriously", "deleteriousness", "deleteriate"), 0, "修飾名詞 effects 用形容詞 deleterious（有害）。"),
        ("Such behavior is ___ to the organization's reputation.", opts("inimical", "inimically", "inimic", "inimicality"), 0, "be inimical to 表示對…有害。"),
        ("The results were ___ unexpected.", opts("wholly", "whole", "wholeness", "wholesome"), 0, "修飾形容詞用副詞 wholly。"),
        ("The theory remains ___.", opts("contentious", "contentiously", "content", "contention"), 0, "remain + 形容詞：仍有爭議 contentious。"),
        ("The paper lacks ___ rigor.", opts("methodological", "methodologically", "methodology", "method"), 0, "名詞前用形容詞 methodological。"),
        ("The evidence is ___.", opts("inconclusive", "inconclusively", "inconclude", "inconclusiveness"), 0, "形容詞作補語：證據尚無定論。"),
        ("He drew an ___ between the two cases.", opts("analogy", "analogous", "analogously", "analog"), 0, "不定冠詞後接名詞 analogy。"),
        ("The proposal was met with ___.", opts("skepticism", "skeptical", "skeptically", "skeptic"), 0, "介詞後接名詞 skepticism。"),
        ("The finding ___ previous assumptions.", opts("contradicts", "contradict", "contradicting", "contradicted"), 0, "主詞單數，現在式 contradicts。"),
        ("The variables were ___ controlled.", opts("carefully", "careful", "carefulness", "care"), 0, "修飾過去分詞 controlled 用副詞。"),
        ("The essay ___ several seminal works.", opts("cites", "cite", "citing", "cited"), 0, "現在簡單式或過去式；此處主詞第三人稱一般現在 cites。"),
        ("Scholars have long ___ this interpretation.", opts("disputed", "dispute", "disputing", "disputes"), 0, "現在完成式 have disputed。"),
        ("The narrative ___ chronologically.", opts("unfolds", "unfold", "unfolding", "unfolded"), 0, "主詞單數，敘述依時間展開 unfolds。"),
        ("The author ___ the reader's expectations.", opts("subverts", "subvert", "subverting", "subverted"), 0, "第三人稱現在式 subverts。"),
        ("The critique is ___ superficial.", opts("unduly", "undue", "undies", "undular"), 0, "修飾形容詞 superficial 用副詞 unduly。"),
        ("The methodology is not ___ reproducible.", opts("readily", "ready", "readiness", "reading"), 0, "修飾形容詞用副詞 readily。"),
        ("The speaker ___ her main points clearly.", opts("articulated", "articulate", "articulating", "articulates"), 0, "過去演講用 articulated。"),
        ("The treaty ___ trade barriers.", opts("dismantled", "dismantle", "dismantling", "dismantles"), 0, "過去事件 dismantled。"),
        ("Inflation has ___ consumer confidence.", opts("eroded", "erode", "eroding", "erodes"), 0, "現在完成式 have eroded。"),
        ("The CEO ___ responsibility for the failure.", opts("accepted", "accepts", "accepting", "accept"), 0, "過去接受責任 accepted。"),
        ("The committee's decision is ___.", opts("binding", "bind", "bound", "binds"), 0, "形容詞 binding 表示有約束力。"),
        ("The contract shall ___ on the first of July.", opts("take effect", "take effects", "take affecting", "take effective"), 0, "固定用法 take effect 生效。"),
        ("The plaintiff ___ damages.", opts("sought", "seek", "seeking", "seeks"), 0, "訴訟過去尋求賠償 sought。"),
        ("The court ___ the appeal.", opts("dismissed", "dismiss", "dismissing", "dismisses"), 0, "過去駁回 dismissed。"),
        ("The statute is ___ to interpretation.", opts("subject", "subjective", "subjected", "subjecting"), 0, "be subject to 易於／須受…。"),
        ("Notwithstanding the risks, the board ___.", opts("proceeded", "proceed", "proceeding", "proceeds"), 0, "儘管風險仍進行，過去 proceeded。"),
        ("The data ___ systematically biased.", opts("appear", "appears", "appearing", "appeared"), 0, "將 data 當複數時動詞用 appear（亦有出版物視為單數而用 appears）。"),
        ("The phenomenon ___ further investigation.", opts("warrants", "warrant", "warranting", "warranted"), 0, "現象「值得」進一步調查，第三人稱 warrants。"),
        ("The implications are far-___.", opts("reaching", "reached", "reach", "reaches"), 0, "複合形容詞 far-reaching 深遠的。"),
        ("The argument ___ scrutiny.", opts("withstands", "withstand", "withstanding", "withstood"), 0, "第三人稱現在 withstands。"),
        ("The sample size is ___.", opts("inadequate", "inadequately", "inadequacy", "inadequateness"), 0, "形容詞補語 inadequate。"),
        ("The researchers ___ their conclusions cautiously.", opts("stated", "state", "stating", "states"), 0, "過去陳述 stated。"),
        ("The model ___ reality only partially.", opts("reflects", "reflect", "reflecting", "reflected"), 0, "現在式 reflects。"),
        ("The trend has ___ since 2020.", opts("accelerated", "accelerate", "accelerating", "accelerates"), 0, "現在完成式 has accelerated。"),
        ("The article ___ plagiarism in the draft.", opts("alleged", "alleges", "allege", "alleging"), 0, "過去報導 alleged。"),
        ("Prior ___ the meeting, circulate the agenda.", opts("to", "than", "of", "for"), 0, "prior to 相當於 before。"),
        ("The ethics board rarely ___ approval without review.", opts("withholds", "withhold", "withheld", "withholding"), 0, "描述慣例用現在式 withholds。"),
        ("The manuscript was ___ peer review.", opts("subjected to", "subject to", "subjecting to", "subjective to"), 0, "be subjected to 遭受到…審查。"),
        ("The speaker ___ an anecdote to illustrate the point.", opts("invoked", "invoke", "invoking", "invokes"), 0, "過去演講援引 invoked。"),
        ("The framework is ___ applicable across disciplines.", opts("broadly", "broad", "broaden", "breadth"), 0, "修飾形容詞 applicable 用副詞 broadly。"),
        ("The decline was ___ precipitous.", opts("somewhat", "somewhatly", "some", "something"), 0, "修飾形容詞 precipitous 用副詞 somewhat。"),
        ("The author ___ the limitations of the study.", opts("acknowledges", "acknowledge", "acknowledging", "acknowledged"), 3, "過去式 acknowledged 或現在 acknowledges；此處選 acknowledged 表文中承認。"),
        ("The policy ___ unintended consequences.", opts("entailed", "entail", "entailing", "entails"), 0, "過去造成 entailed。"),
        ("The dataset was ___ anonymized.", opts("properly", "proper", "prop", "propriety"), 0, "修飾過去分詞用副詞 properly。"),
        ("The reviewer questioned the paper's ___.", opts("coherence", "coherent", "coherently", "cohere"), 0, "所有格後接名詞 coherence。"),
        ("The conclusion does not ___ follow from the premises.", opts("necessarily", "necessary", "necessity", "necessitate"), 0, "修飾動詞 follow 用副詞 necessarily。"),
        ("The theory was ___ received by peers.", opts("well", "good", "best", "better"), 0, "修飾過去分詞 received 用副詞 well。"),
        ("The grant ___ interdisciplinary collaboration.", opts("fostered", "foster", "fostering", "fosters"), 0, "過去促進 fostered。"),
        ("The lecture ___ key terminology.", opts("clarified", "clarify", "clarifying", "clarifies"), 0, "過去闡明 clarified。"),
        ("The experiment ___ a controlled environment.", opts("used", "use", "using", "uses"), 0, "過去使用 used。"),
        ("Participants were ___ at random.", opts("assigned", "assign", "assigning", "assigns"), 0, "過去分詞被指派 assigned。"),
        ("The survey ___ self-reported bias.", opts("exhibits", "exhibit", "exhibiting", "exhibited"), 3, "過去顯示 exhibited 或現在 exhibits；選 exhibited 表調查當時。"),
        ("The algorithm ___ faster convergence.", opts("enabled", "enable", "enabling", "enables"), 0, "過去使可能 enabled。"),
        ("The chapter ___ the historical context.", opts("sketches", "sketch", "sketching", "sketched"), 3, "過去概述 sketched。"),
        ("The index ___ several omissions.", opts("contains", "contain", "containing", "contained"), 3, "過去包含 contained。"),
        ("The keynote ___ the conference theme.", opts("addressed", "address", "addressing", "addresses"), 0, "過去呼應 addressed。"),
        ("The panel ___ for three hours.", opts("lasted", "last", "lasting", "lasts"), 0, "過去持續 lasted。"),
        ("The editor ___ the manuscript for clarity.", opts("tightened", "tighten", "tightening", "tightens"), 0, "過去修訂 tightened。"),
        ("The grant proposal was ___.", opts("rejected", "reject", "rejecting", "rejects"), 0, "被動過去分詞 rejected。"),
        ("The university ___ new admissions criteria.", opts("adopted", "adopt", "adopting", "adopts"), 0, "過去採納 adopted。"),
        ("The lecture hall was ___ full.", opts("nearly", "near", "nearest", "nearer"), 0, "修飾形容詞 full 用副詞 nearly。"),
        ("The article ___ a literature review.", opts("includes", "include", "including", "included"), 3, "過去包含 included。"),
        ("The seminar ___ graduate students only.", opts("targeted", "target", "targeting", "targets"), 0, "過去以…為對象 targeted。"),
        ("The findings need to be ___ in a larger sample.", opts("replicated", "replicate", "replicating", "replicates"), 0, "研究須在更大樣本中「重複驗證」。"),
        ("The paper ___ ethical approval before data collection.", opts("obtained", "obtain", "obtaining", "obtains"), 0, "過去取得倫理核准 obtained。"),
        ("The authors ___ any conflicts of interest.", opts("disclosed", "disclose", "disclosing", "discloses"), 0, "過去揭露利益衝突 disclosed。"),
        ("The discussion section ___ the results to theory.", opts("relates", "relate", "relating", "related"), 3, "過去將結果連結理論 related。"),
        ("Table 2 ___ descriptive statistics for each group.", opts("summarizes", "summarize", "summarizing", "summarized"), 3, "過去式 summarized 表列出／總述。"),
        ("The limitation ___ the cross-sectional design.", opts("concerns", "concern", "concerning", "concerned"), 0, "描述研究限制常用現在式 concerns，表示『此限制在於／涉及…』。"),
        ("Future research should ___ longitudinal methods.", opts("employ", "employs", "employing", "employed"), 0, "情態動詞後接原形 employ。"),
        ("The coefficient was statistically ___ at p < .05.", opts("significant", "significantly", "significance", "signify"), 0, "形容詞補語 significant 表示達顯著水準。"),
    ]
    for t in c:
        rows.append(row("college", t[0], t[1], t[2], t[3]))

    # ─── professor (75) ───
    p: list[tuple] = [
        ("The term 'morpheme' refers to ___.", opts("a minimal meaningful unit", "a speech sound", "a dialect variant", "a writing system"), 0, "語言學中 morpheme 為最小有意義單位。"),
        ("A phoneme is best described as ___.", opts("a letter of the alphabet", "a contrastive sound category", "a syllable", "a stress pattern"), 1, "音位是具區別意義功能的音類別。"),
        ("In linguistics, 'syntax' concerns ___.", opts("word meanings", "sentence structure", "sound patterns", "language history"), 1, "句法研究句子結構。"),
        ("Semantics primarily deals with ___.", opts("pronunciation", "meaning", "spelling reform", "orthography"), 1, "語義學研究意義。"),
        ("Pragmatics focuses on ___.", opts("sentence length", "language use in context", "phonetic transcription", "etymology"), 1, "語用學關注語境中的使用。"),
        ("An example of a polyseme is 'bank' meaning river edge and financial institution; this illustrates ___.", opts("homophony", "polysemy", "synonymy", "antonymy"), 1, "同一詞形多義為 polysemy。"),
        ("If two words sound identical but differ in meaning and spelling, they are ___.", opts("synonyms", "homophones", "hypernyms", "collocations"), 1, "同音異義為 homophones。"),
        ("The study of word origins is ___.", opts("syntax", "phonology", "etymology", "morphology"), 2, "詞源研究為 etymology。"),
        ("In English, 'unhappiness' contains ___.", opts("one morpheme", "two morphemes", "three morphemes", "four morphemes"), 2, "un + happy + ness 三個詞素。"),
        ("Which pair illustrates phonemic contrast (minimal pairs)?", opts("pin vs spin /p/", "pit vs bit /p/-/b/", "cat vs cats /s/-/z/", "ship vs sheep"), 1, "pit / bit 僅差一個音位 /p/ 與 /b/，為最小對立組，顯示音位對立。"),
        ("A prescriptive rule tells speakers ___.", opts("how language is actually used", "how they ought to use language", "how babies acquire language", "how dialects spread"), 1, "規範語法規定「應如何」使用。"),
        ("Descriptive linguistics aims to ___.", opts("rank languages", "describe actual usage", "ban loanwords", "fix spelling"), 1, "描寫語言學描述實際用法。"),
        ("The sapir-whorf hypothesis concerns ___.", opts("sound symbolism", "language and thought", "language families", "writing direction"), 1, "薩丕爾—沃夫假設探討語言與思維。"),
        ("Metonymy is exemplified by ___.", opts("'kick the bucket'", "The crown announced...", "It's raining cats and dogs", "Time flies"), 1, "The crown 借代王室為 metonymy。"),
        ("A mixed metaphor is problematic because it ___.", opts("uses passive voice", "combines clashing images", "is too short", "lacks a thesis"), 1, "混合隱喻意象衝突。"),
        ("Zeugma joins ___.", opts("two unrelated metaphors", "one word with two objects in different senses", "two synonyms", "subject and object"), 1, "軛式搭配一詞配兩受詞不同義。"),
        ("Chiasmus involves ___.", opts("rhyme", "reversed grammatical structure", "alliteration", "omission of vowels"), 1, "交錯配列為結構倒序對照。"),
        ("Asyndeton omits ___.", opts("verbs", "subjects", "conjunctions", "articles"), 2, "連珠式省略連接詞。"),
        ("Polysyndeton repeats ___.", opts("subjects", "conjunctions", "prepositions", "articles"), 1, "連綴式重複連接詞。"),
        ("Anaphora is ___.", opts("end rhyme", "repetition at the start of successive clauses", "use of foreign words", "inversion only"), 1, "首語重複為句首重複。"),
        ("Catachresis refers to ___.", opts("correct grammar", "strained or improper metaphor", "metrical feet", "IPA notation"), 1, "誤喻為不當或過度延伸隱喻。"),
        ("Synecdoche uses ___.", opts("rhyme", "a part for the whole or vice versa", "homophones", "palindrome"), 1, "提喻以部分代整體或反之。"),
        ("Litotes expresses affirmation through ___.", opts("hyperbole", "double negation or understatement", "simile", "allusion"), 1, "曲言法以否定或輕描淡寫表肯定。"),
        ("Pejorative connotation means the word feels ___.", opts("neutral", "positive", "negative", "technical"), 2, "貶義為負面色彩。"),
        ("If an argument affirms the consequent, it is ___.", opts("valid", "sound", "formally invalid", "inductive only"), 2, "肯定後件為形式謬誤。"),
        ("Denying the antecedent is ___.", opts("always valid", "formally invalid", "the same as modus ponens", "a strong analogy"), 1, "否定前件為無效推論。"),
        ("A deductively valid argument can still be ___.", opts("unsound if premises are false", "always sound", "inductive", "self-refuting always"), 0, "有效論證若前提假仍可 unsound。"),
        ("An ad hoc rescue revises a theory ___.", opts("before testing", "only to protect it from falsification", "using statistics only", "through translation"), 1, "特設性防衛為免於被否證而補救。"),
        ("Straw man fallacy involves ___.", opts("using analogies", "misrepresenting an opponent's view", "appealing to pity", "equivocation only"), 1, "稻草人謬誤扭曲對方論點。"),
        ("Equivocation shifts ___.", opts("tenses", "the meaning of a key term", "font size", "sample size"), 1, "歧義謬誤偷換關鍵詞義。"),
        ("Post hoc ergo propter hoc mistakes ___.", opts("correlation for authentication", "sequence for causation", "cause for correlation", "definition for example"), 1, "後此謬誤把先後當因果。"),
        ("Begging the question ___.", opts("asks politely", "assumes the conclusion in premises", "uses only empirical data", "avoids pronouns"), 1, "循環論證把結論藏於前提。"),
        ("The word 'otiose' most nearly means ___.", opts("meticulous", "superfluous", "rapid", "fragrant"), 1, "otiose 意為多餘、無用。"),
        ("The word 'perspicacious' suggests ___.", opts("sloppy thinking", "keen insight", "physical strength", "anger"), 1, "perspicacious 表示敏銳洞察。"),
        ("The word 'recalcitrant' fits ___.", opts("a willing volunteer", "a stubborn resistor", "a transparent liquid", "a cheap fabric"), 1, "recalcitrant 形容頑抗不服。"),
        ("The word 'sycophant' denotes ___.", opts("a wise teacher", "a servile flatterer", "a neutral judge", "a brave pioneer"), 1, "sycophant 為阿諛奉承者。"),
        ("The word 'laconic' describes speech that is ___.", opts("lengthy", "brief", "loud", "archaic"), 1, "laconic 表示簡潔寡言。"),
        ("The idiom 'to pull someone's leg' means ___.", opts("to help them walk", "to tease or joke", "to betray them", "to lend money"), 1, "英式幽默表示開玩笑、捉弄。"),
        ("The idiom 'bury the hatchet' means ___.", opts("hide tools", "make peace", "start a fight", "plant trees"), 1, "言歸於好、止息爭端。"),
        ("The idiom 'let sleeping dogs lie' advises ___.", opts("wake pets", "avoid stirring up trouble", "train animals", "sleep more"), 1, "勿挑起不必要的麻煩。"),
        ("The idiom 'the ball is in your court' means ___.", opts("play tennis", "it's your turn to act", "you lost", "the game ended"), 1, "輪到你採取行動。"),
        ("The idiom 'cut corners' suggests ___.", opts("meticulous work", "doing something hastily or improperly", "taking a shortcut road only", "building squares"), 1, "偷工減料、走捷徑敷衍。"),
        ("An oxymoron pairs ___.", opts("synonyms", "contradictory terms", "foreign words", "rhyming words"), 1, "矛盾修辭並置相反概念。"),
        ("Epistemic modality expresses ___.", opts("obligation about the past", "speaker's degree of commitment to truth", "physical ability only", "future tense only"), 1, "認識情態表說話者對命題真假的確信度。"),
        ("Deictic expressions depend on ___.", opts("Latin roots", "utterance context", "metrical stress", "silent letters"), 1, "指示詞依賴語境座標。"),
        ("A minimal pair in phonology demonstrates ___.", opts("free variation", "phonemic contrast", "allophony only", "tone sandhi"), 1, "最小對立組顯示音位對立。"),
        ("Complementary distribution typically indicates ___.", opts("phonemes", "allophones of one phoneme", "minimal pairs", "word stress"), 1, "互補分布多為同一音位之變體。"),
        ("The passive voice is sometimes preferred in scientific writing to ___.", opts("increase wordiness", "foreground the process or result", "avoid verbs", "hide subject always"), 1, "被動可突出過程或結果。"),
        ("The rhetorical question primarily functions to ___.", opts("request information only", "prompt reflection rather than an answer", "change tense", "translate literally"), 1, "反問用於引發思考而非真問。"),
        ("Pathos appeals to ___.", opts("logic", "credibility", "emotion", "grammar"), 2, "悲情訴諸情感 pathos。"),
        ("Logos appeals to ___.", opts("emotion", "character", "reasoning and evidence", "rhythm"), 2, "理性訴諸論證 logos。"),
        ("Ethos appeals to ___.", opts("statistics only", "speaker credibility", "musicality", "imagery only"), 1, "人格訴諸可信度 ethos。"),
        ("Ambiguity of scope may confuse whether ___.", opts("a verb is transitive", "negation applies to one clause or another", "nouns are plural", "letters are silent"), 1, "範域歧義影響否定範圍。"),
        ("Vagueness differs from ambiguity because vagueness ___.", opts("has two precise senses", "involves borderline cases", "is always grammatical", "requires synonyms"), 1, "模糊涉及界線案例而非雙義。"),
        ("Performative utterances ___.", opts("cannot be spoken", "do something by being said", "only describe weather", "lack verbs"), 1, "施為句以說出即完成行為。"),
        ("Implicature (Gricean) relies on ___.", opts("literal grammar only", "conversational cooperation and context", "spelling rules", "IPA charts"), 1, "含意依合作原則與語境推導。"),
        ("A malapropism is ___.", opts("a deliberate pun", "an amusing word substitution error", "a silent letter", "a dialect map"), 1, "誤用近似音詞造成滑稽效果。"),
        ("Proprioceptive imagery appeals to ___.", opts("sight", "internal bodily sensation", "hearing", "taste only"), 1, "本體感覺意象描寫身體內部感覺。"),
        ("Synesthesia in literature ___.", opts("avoids metaphor", "crosses sensory domains", "uses only facts", "removes adjectives"), 1, "通感跨感官域。"),
        ("The hedging phrase 'I might be wrong, but...' serves to ___.", opts("assert certainty", "soften the claim", "change topic", "quote sources"), 1, "模糊限制語弱化斷言。"),
        ("Parallelism in prose primarily enhances ___.", opts("confusion", "rhythm and clarity", "spelling", "font choice"), 1, "排比增節奏與清晰度。"),
        ("Antimetabole repeats words in ___.", opts("random order", "reverse order", "alphabetical order", "silent letters"), 1, "逆序重複為 antimetabole。"),
        ("The pathetic fallacy attributes human emotion to ___.", opts("numbers", "nature or objects", "verbs only", "footnotes"), 1, "感情誤置賦予自然或物情感。"),
        ("An enthymeme in rhetoric is ___.", opts("a long poem", "a syllogism with an unstated premise", "a type of irony", "a grammar rule"), 1, "省略三段論省略前提。"),
        ("The distinction between 'fewer' and 'less' is prescriptively about ___.", opts("formality", "count vs mass nouns", "British vs American", "past vs present"), 1, "規範上 fewer 配可數、less 配不可數。"),
        ("In philosophy of language, 'extension' of a term is ___.", opts("its intension", "the set of things it denotes", "its etymology", "its pronunciation"), 1, "外延為詞所指對象集合。"),
        ("The intension of a word includes ___.", opts("only pronunciation", "associative or definitional properties", "only spelling", "rhyme scheme"), 1, "內涵為定義性質與屬性。"),
        ("If P implies Q, then 'not Q' implies ___.", opts("P", "not P", "Q", "P and Q"), 1, "拒取式：非 Q 則非 P（假設原為 P→Q）。"),
        ("A contingent truth is one that ___.", opts("must be true in all worlds", "could have been otherwise", "is self-contradictory", "only concerns math"), 1, "偶然真理可以不是如此。"),
        ("Analytic statements are often characterized as ___.", opts("empirical", "true by virtue of meaning", "always false", "poetic"), 1, "分析句依意義為真。"),
        ("Synthetic statements ___.", opts("are true by definition only", "combine concepts not contained in the subject", "cannot be false", "lack predicates"), 1, "綜合句把主詞所無之概念連結起來。"),
        ("The fallacy of composition assumes ___.", opts("parts equal whole properties", "what is true of parts is true of the whole", "correlation implies causation", "experts are wrong"), 1, "合成謬誤以部分性質推整體。"),
        ("The fallacy of division assumes ___.", opts("the whole's property belongs to every part", "correlation is causation", "samples are random", "definitions shift"), 0, "分割謬誤以整體屬性推每一部分。"),
        ("A virtue of a clear operational definition is that it ___.", opts("avoids all measurement", "makes variables observable and testable", "removes ethics", "eliminates theory"), 1, "操作型定義使變項可觀測檢驗。"),
        ("In academic hedging, the verb suggests is weaker than ___.", opts("might", "proves", "could", "may"), 1, "suggests 比 proves 語氣弱。"),
    ]
    for t in p:
        rows.append(row("professor", t[0], t[1], t[2], t[3]))

    print(
        "INSERT INTO questions (difficulty, question_text, options, "
        "correct_answer_old, correct_index, explanation) VALUES",
    )
    print(",\n".join(rows) + ";")


if __name__ == "__main__":
    main()
