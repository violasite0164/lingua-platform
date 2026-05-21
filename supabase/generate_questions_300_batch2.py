#!/usr/bin/env python3
"""第二批 300 題（與 batch1 題幹不重複），輸出 INSERT：jsonb + correct_answer_old + correct_index。"""
from __future__ import annotations

import json
import re


def esc(s: str) -> str:
    return s.replace("'", "''")

def norm(s: str) -> str:
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

    # ─── elementary 75（batch 2）───
    e: list[tuple] = [
        ("My parents ___ teachers.", opts("am", "is", "are", "be"), 2, "複數主詞 parents 用 are。"),
        ("Grandpa ___ reading every morning.", opts("am", "is", "are", "be"), 1, "第三人稱單數用 is。"),
        ("___ there any milk left?", opts("Is", "Are", "Am", "Do"), 0, "不可數 milk 與 there be 搭配用 Is there。"),
        ("___ those your stickers?", opts("Is", "Are", "Am", "Was"), 1, "those 複數用 Are。"),
        ("I ___ not hungry.", opts("am", "is", "are", "be"), 0, "I 配 am。"),
        ("We ___ from Canada.", opts("am", "is", "are", "be"), 2, "We 複數用 are。"),
        ("___ does the shop open?", opts("When", "Who", "Whose", "Which"), 0, "問時間用 When。"),
        ("___ bag are you carrying?", opts("Who", "Which", "Whose", "Where"), 1, "問哪一個／款式用 Which。"),
        ("Every weekend she ___ her grandma.", opts("visit", "visits", "visiting", "visited"), 1, "習慣動作 she + visit + s。"),
        ("They ___ football now.", opts("play", "plays", "are playing", "played"), 2, "now 表現在進行。"),
        ("Look! It ___ .", opts("rain", "rains", "is raining", "rained"), 2, "Look 提示正在發生。"),
        ("I ___ never ___ sushi.", opts("have / eat", "have / eaten", "has / eaten", "had / eat"), 1, "現在完成式 have eaten。"),
        ("She ___ to Tokyo twice.", opts("go", "goes", "has gone", "went"), 2, "經驗次數用現在完成式。"),
        ("Before bed I always ___ my teeth.", opts("brush", "brushes", "brushing", "brushed"), 0, "I + always + 現在式 brush。"),
        ("Can we ___ outside?", opts("plays", "play", "playing", "played"), 1, "can 後接原形。"),
        ("She ___ play the piano when she was six.", opts("can", "could", "may", "must"), 1, "過去能力用 could。"),
        ("You ___ wear a helmet on this ride.", opts("should", "shouldn't", "might", "could"), 0, "安全規定建議 should。"),
        ("It's dark. You ___ leave alone.", opts("should", "shouldn't", "must", "might"), 1, "危險情境建議不要.shouldn't。"),
        ("There ___ many kinds of juice in the jug.", opts("is", "are", "be", "am"), 1, "kinds 為可數複數，用 there are。"),
        ("How ___ students are in the club?", opts("much", "many", "long", "often"), 1, "可數名詞數量用 How many。"),
        ("How ___ does the ticket cost?", opts("many", "much", "often", "far"), 1, "價錢用 How much。"),
        ("I'd like ___ water, please.", opts("any", "some", "many", "few"), 1, "肯定請求液體用 some。"),
        ("We don't have ___ eggs.", opts("some", "any", "much", "many"), 1, "否定句「任何」用 any。"),
        ("That is ___ elephant.", opts("a", "an", "the", "/"), 1, "elephant 母音開頭用 an。"),
        ("Pass me ___ salt.", opts("a", "an", "the", "/"), 2, "特指桌上的鹽用 the。"),
        ("___ Earth goes around the Sun.", opts("A", "An", "The", "/"), 2, "獨一無二事物用 the。"),
        ("I've lost ___ pen you lent me.", opts("a", "an", "the", "/"), 2, "特定那支筆用 the。"),
        ("She runs ___ than her brother.", opts("fast", "faster", "fastest", "more fast"), 1, "兩者比較用比較級 faster。"),
        ("This is the ___ pizza I've ever had.", opts("good", "better", "best", "more good"), 2, "ever 搭配最高級 best。"),
        ("My room is ___ than yours.", opts("big", "bigger", "biggest", "more big"), 1, "than 用比較級 bigger。"),
        ("She speaks English ___ .", opts("good", "well", "better", "best"), 1, "修飾動詞 speak 用副詞 well。"),
        ("___ carefully, please!", opts("Listen", "Listen to", "Hear", "Sound"), 0, "祈使「聽」用 Listen（不及物）。"),
        ("___ you help me carry this?", opts("Can", "Should", "Must", "May"), 0, "請求協助常用 Can。"),
        ("I'm interested ___ science fiction.", opts("on", "in", "at", "for"), 1, "be interested in。"),
        ("Good ___! You'll do better next time.", opts("luck", "luckily", "lucky", "unlucky"), 0, "安慰常用 Good luck 或加油語境。"),
        ("See you ___ weekend!", opts("this", "at this", "on this", "the"), 0, "this weekend 固定說法。"),
        ("___ happy birthday!", opts("Say", "Wish", "Tell", "Speak"), 1, "祝賀生日常用 Wish。"),
        ("Turn ___ the TV; it's too loud.", opts("on", "off", "up", "in"), 1, "太吵要關掉用 turn off。"),
        ("___ up early makes me tired.", opts("Wake", "Waking", "Woke", "Wakes"), 1, "主詞用動名詞 Waking。"),
        ("I'd like ___ pizza slice.", opts("other", "another", "others", "the other"), 1, "再一片（不定數中再一個）用 another。"),
        ("Both answers ___ wrong.", opts("is", "are", "am", "was"), 1, "Both + 複數名詞用 are。"),
        ("Neither answer ___ correct.", opts("are", "is", "were", "be"), 1, "Neither + 單數名詞視為單數 is。"),
        ("Put your toys ___ the box.", opts("at", "on", "in", "to"), 2, "放入盒子內部用 in。"),
        ("The poster is ___ the wall.", opts("in", "on", "at", "over"), 1, "貼在牆面上用 on。"),
        ("We'll meet ___ noon.", opts("on", "in", "at", "by"), 2, "時刻 at noon。"),
        ("___ spring, flowers bloom.", opts("On", "At", "In", "By"), 2, "季節用 in。"),
        ("We're traveling ___ plane.", opts("by", "on", "with", "in"), 0, "交通工具 by plane。"),
        ("I'm afraid ___ spiders.", opts("for", "of", "about", "with"), 1, "be afraid of。"),
        ("Could you speak ___ slowly?", opts("more", "many", "much", "most"), 0, "請對方「再慢一點」用 more slowly。"),
        ("This puzzle is easy ___ me.", opts("for", "to", "with", "of"), 0, "對某人而言簡單用 for。"),
        ("What's the opposite of 'cheap'?", opts("small", "expensive", "short", "cold"), 1, "cheap 的反義常用 expensive。"),
        ("Which month comes ___ October?", opts("before", "after", "between", "during"), 1, "十一月接在十月之後。"),
        ("A rectangle has ___ sides.", opts("three", "four", "five", "six"), 1, "長方形四邊。"),
        ("Water freezes at ___ Celsius.", opts("0", "32", "100", "50"), 0, "水的冰點攝氏 0 度。"),
        ("Which animal lives in water and jumps?", opts("lion", "frog", "cow", "eagle"), 1, "青蛙典型在水邊／水中活動並跳躍。"),
        ("You cut vegetables with a ___.", opts("ball", "knife", "hat", "pillow"), 1, "用刀切菜。"),
        ("We listen to music with our ___.", opts("eyes", "ears", "nose", "hands"), 1, "耳朵聽音樂。"),
        ("What do you use to tell time?", opts("a map", "a clock", "a spoon", "a pillow"), 1, "時鐘看時間。"),
        ("If you are hungry, you want ___.", opts("sleep", "food", "ice", "darkness"), 1, "餓了想吃東西。"),
        ("This juice tastes ___.", opts("sweetly", "sweet", "sweetness", "sweeter"), 1, "感官動詞 taste 後接形容詞 sweet。"),
        ("The baby seems ___.", opts("happily", "happy", "happiness", "more happy"), 1, "seem + 形容詞。"),
        ("___ one is yours — the red or the blue?", opts("When", "Which", "What", "Who"), 1, "在有限選擇中問哪一個用 Which。"),
        ("___ father is a pilot?", opts("Who", "Whose", "Which", "What"), 1, "問「誰的父親」用 Whose。"),
        ("Please ___ quiet in the hospital.", opts("are", "be", "is", "being"), 1, "祈使句用 Be quiet。"),
        ("Let's ___ the homework together.", opts("do", "does", "doing", "did"), 0, "Let's + 原形。"),
        ("Don't ___ your phone in class.", opts("uses", "use", "using", "used"), 1, "Don't + 原形。"),
        ("She forgot ___ her umbrella.", opts("bring", "to bring", "bringing", "brought"), 1, "forget to + 原形表忘了去做。"),
        ("Remember ___ the door.", opts("lock", "to lock", "locking", "locked"), 1, "remember to lock 記得要鎖。"),
        ("He wants ___ a pilot.", opts("be", "to be", "being", "been"), 1, "want to be。"),
        ("I'm learning ___ swim.", opts("for", "to", "how to", "how"), 2, "學習如何游泳用 how to swim。"),
        ("It's important ___ sleep enough.", opts("for", "to", "that", "of"), 1, "It's important to + 原形。"),
        ("Could you tell me the ___ ?", opts("true", "truth", "truly", "truths"), 1, "tell the truth 說實話。"),
        ("There were ___ people at the park.", opts("much", "many", "a little", "little"), 1, "可數 people 用 many。"),
        ("How ___ homework do you have?", opts("many", "much", "often", "long"), 1, "不可數 homework 用 How much。"),
        ("Pick ___ apple from the basket.", opts("a", "an", "the", "/"), 1, "apple 母音開頭用 an。"),
    ]
    assert len(e) == 75, len(e)
    for t in e:
        rows.append(row("elementary", t[0], t[1], t[2], t[3]))

    # ─── junior 75 ───
    j: list[tuple] = [
        ("If it ___ tomorrow, we will cancel the trip.", opts("will rain", "rains", "rained", "rain"), 1, "第一條件句 if + 現在，主句未來。"),
        ("Unless you hurry, you ___ the train.", opts("catch", "will catch", "won't catch", "caught"), 2, "Unless = if not，錯過車用未來否定。"),
        ("By 2030, scientists believe many cars ___ electric.", opts("are", "were", "will be", "have been"), 2, "未來時間用 will be。"),
        ("She ___ since Monday.", opts("is sick", "has been sick", "was sick", "sicks"), 1, "since + 時間點用現在完成或完成進行；此處 has been sick。"),
        ("I ___ my keys. Have you seen them?", opts("lost", "have lost", "had lost", "lose"), 1, "剛剛丟了影響現在，現在完成。"),
        ("This time yesterday I ___ on a bus.", opts("sit", "was sitting", "sat", "have sat"), 1, "特定過去時刻進行用過去進行。"),
        ("He suggested that she ___ early.", opts("leave", "leaves", "left", "leaving"), 0, "suggest that + 原形（英式）。"),
        ("It's vital that everyone ___ quiet.", opts("remain", "remains", "remained", "remaining"), 0, "vital that + (should) + 原形。"),
        ("The roof ___ in last night's storm.", opts("damages", "was damaged", "damaged", "has damaged"), 1, "屋頂被損壞，過去被動。"),
        ("The cake ___ by my sister.", opts("made", "was made", "makes", "making"), 1, "蛋糕被製作，被動。"),
        ("She admitted ___ the window.", opts("break", "breaking", "to break", "broke"), 1, "admit + 動名詞。"),
        ("He avoided ___ her at the party.", opts("see", "seeing", "to see", "saw"), 1, "avoid + 動名詞。"),
        ("I'm planning ___ abroad next year.", opts("study", "to study", "studying", "studied"), 1, "plan to + 原形。"),
        ("She's keen ___ learning Japanese.", opts("for", "on", "in", "at"), 1, "be keen on + 動名詞。"),
        ("The movie was ___ boring that we left early.", opts("so", "such", "very", "too"), 0, "so...that 如此…以致。"),
        ("It was ___ a boring movie that we left early.", opts("so", "such", "very", "much"), 1, "such + a + 形 + 名。"),
        ("No sooner had we arrived ___ it started snowing.", opts("when", "than", "before", "until"), 1, "No sooner...than 固定。"),
        ("Hardly had he spoken ___ someone interrupted.", opts("than", "when", "before", "after"), 1, "Hardly...when。"),
        ("Were I you, I ___ accept the offer.", opts("will", "would", "can", "shall"), 1, "虛擬與現在相反用 would。"),
        ("I wish I ___ how to fix this.", opts("know", "knew", "have known", "knowing"), 1, "wish + 過去式表與現在願望相反。"),
        ("I'd rather you ___ here tonight.", opts("stay", "stayed", "staying", "to stay"), 1, "would rather + 子句常用過去式表對他人期望。"),
        ("The boy ___ wallet was lost cried.", opts("who", "whom", "whose", "which"), 2, "所有格 whose wallet。"),
        ("This is the factory ___ my uncle works.", opts("which", "where", "that", "what"), 1, "地點先行詞 where。"),
        ("She didn't tell me ___ she was leaving.", opts("that", "if", "what", "which"), 1, "是否離開用 if/whether。"),
        ("___ breaks the law must face consequences.", opts("Whoever", "Who", "Whomever", "Whatever"), 0, "無論誰 whoever。"),
        ("However hard he tried, he ___ pass.", opts("can't", "couldn't", "doesn't", "won't"), 1, "However hard，過去嘗試用 couldn't。"),
        ("The news ___ quite shocking.", opts("are", "were", "was", "be"), 2, "news 不可數單數。"),
        ("Physics ___ my weakest subject.", opts("are", "were", "is", "be"), 2, "學科 physics 單數。"),
        ("Either Tom or his cousins ___ coming.", opts("is", "are", "was", "be"), 1, "either or 動詞與較近主詞一致。"),
        ("Not only the coach but also the players ___ happy.", opts("was", "were", "is", "be"), 1, "but also 後 players 複數。"),
        ("She speaks ___ she had rehearsed for hours.", opts("even if", "as if", "unless", "until"), 1, "好像 as if。"),
        ("The building ___ next year.", opts("completes", "will complete", "will be completed", "completed"), 2, "明年被完工，未來被動。"),
        ("I remember ___ the door before bed.", opts("lock", "to lock", "locking", "locked"), 2, "記得做過 locking。"),
        ("Please remember ___ the door before you leave.", opts("lock", "to lock", "locking", "locked"), 1, "記得要去做的尚未做，to lock。"),
        ("He is used ___ early for his job.", opts("to get up", "to getting up", "get up", "getting up"), 1, "be used to + 動名詞表習慣。"),
        ("He used ___ early before retirement.", opts("to get up", "to getting up", "get up", "getting up"), 0, "used to + 原形表過去習慣。"),
        ("She got her brother ___ the heavy box.", opts("carry", "to carry", "carrying", "carried"), 1, "get + 人 + to + 原形。"),
        ("We had the roof ___ after the storm.", opts("repair", "repaired", "repairing", "repairs"), 1, "have + 物 + 過去分詞。"),
        ("The problem ___ at yesterday's meeting.", opts("discusses", "was discussed", "discussed", "is discussing"), 1, "問題被討論。"),
        ("___ careful when you cross the street.", opts("Be", "Being", "To be", "Been"), 0, "祈使句 Be careful。"),
        ("Reading: Tim forgot his keys and missed the bus. Why might Tim be late?", opts("He woke early", "He couldn't enter his house fast", "He loves buses", "He ran fast"), 1, "忘記鑰匙可能耽誤出門。"),
        ("Reading: The café opens at 7 a.m. Does it open before 8?", opts("No", "Yes", "Only on Sundays", "Unknown"), 1, "七點開門，八點前已開。"),
        ("Choose the closest meaning to 'generous'.", opts("greedy", "kind and giving", "shy", "strict"), 1, "generous 表示慷慨。"),
        ("Choose the closest meaning to 'ancient'.", opts("modern", "very old", "tiny", "noisy"), 1, "ancient 古老。"),
        ("She has ___ experience than I do.", opts("much", "more", "most", "many"), 1, "than 比較 more experience。"),
        ("This is ___ difficult exam I've taken.", opts("more", "most", "the most", "much"), 2, "最高級 the most difficult。"),
        ("He speaks Spanish ___ than I do.", opts("fluent", "more fluently", "most fluent", "fluently"), 1, "修飾動詞 speaks 用副詞比較。"),
        ("I'd ___ stay home than go out in this rain.", opts("rather", "prefer", "better", "want"), 0, "would rather...than。"),
        ("She'd prefer ___ alone tonight.", opts("be", "to be", "being", "been"), 1, "would prefer to be。"),
        ("It's worth ___ the instructions twice.", opts("read", "reading", "to read", "reads"), 1, "worth + 動名詞。"),
        ("There's no point in ___ over failed exams.", opts("worry", "worrying", "to worry", "worried"), 1, "no point in + 動名詞。"),
        ("She prevented him ___ entering the room.", opts("from", "to", "for", "of"), 0, "prevent from + 動名詞。"),
        ("The rain stopped them ___ playing tennis.", opts("from", "to", "of", "for"), 0, "stop from + 動名詞。"),
        ("He congratulated me ___ winning.", opts("for", "on", "with", "about"), 1, "congratulate on + 動名詞。"),
        ("She apologized ___ being rude.", opts("for", "to", "of", "about"), 0, "apologize for + 動名詞。"),
        ("I'm responsible ___ the schedule.", opts("for", "of", "to", "with"), 0, "responsible for。"),
        ("He's addicted ___ online games.", opts("for", "to", "on", "with"), 1, "addicted to。"),
        ("The teacher explained the rule ___ .", opts("clear", "clearly", "clearness", "clearer"), 1, "修飾動詞 explained 用副詞。"),
        ("She looked ___ when she heard the news.", opts("surprising", "surprised", "surprise", "surprisingly"), 1, "形容人用 surprised。"),
        ("The lecture was ___ tedious that several listeners left early.", opts("so", "such", "very", "too"), 0, "so...that 如此…以致；tedious 形前用 so。"),
        ("Seldom ___ such a crowd here.", opts("we saw", "did we see", "we see", "have we seen"), 1, "Seldom 開頭倒裝。"),
        ("Not until he apologized ___ she forgive him.", opts("she did", "did she", "she would", "would she"), 1, "Not until 子句後倒裝 did she。"),
        ("Little ___ that he would become famous.", opts("he knows", "did he know", "he knew", "does he know"), 1, "Little 開頭倒裝。"),
        ("So loudly ___ that everyone turned around.", opts("he spoke", "did he speak", "he speaks", "does he speak"), 1, "So loudly 前置倒裝。"),
        ("If I ___ harder, I would pass now.", opts("study", "studied", "had studied", "have studied"), 1, "與現在事實相反，過去式 studied。"),
        ("If he ___ the map, he wouldn't be lost.", opts("reads", "had read", "read", "has read"), 2, "與過去事實相反用過去完成 had read。"),
        ("The letter ___ personally by the CEO.", opts("writes", "was written", "wrote", "writing"), 1, "信被撰寫／簽署語境用被動。"),
        ("She ___ her ankle while jogging.", opts("breaks", "broke", "was breaking", "has broken"), 1, "慢跑時扭傷，過去式 broke。"),
        ("By next month, we ___ the project.", opts("finish", "will finish", "will have finished", "finished"), 2, "By + 未來完成。"),
        ("He speaks English fluently; ___, he grew up abroad.", opts("because", "for example", "besides", "therefore"), 2, "補充理由 besides／此外。"),
        ("She failed the test; ___, she didn't study.", opts("however", "therefore", "although", "unless"), 1, "因果 therefore。"),
        ("___ the rain, the match continued.", opts("Because", "Despite", "Although", "Since"), 1, "儘管下雨 despite + 名詞。"),
        ("___ it was raining, the match continued.", opts("Because", "Although", "Despite", "Unless"), 1, "讓步 although + 子句。"),
        ("You ___ touch the exhibits in the museum.", opts("should", "mustn't", "might", "could"), 1, "禁止觸摸 mustn't。"),
        ("Applicants ___ submit forms by Friday.", opts("can", "must", "might", "could"), 1, "規定截止 must。"),
    ]
    assert len(j) == 75, len(j)
    for t in j:
        rows.append(row("junior", t[0], t[1], t[2], t[3]))

    # ─── college 75 ───
    c: list[tuple] = [
        ("The manuscript was ___ peer review last month.", opts("submit", "submitted", "submitting", "submits"), 1, "過去被提交審查 submitted。"),
        ("The paper ___ several limitations.", opts("acknowledge", "acknowledges", "acknowledged", "acknowledging"), 2, "過去式 acknowledged 限制。"),
        ("The authors ___ the funding agency.", opts("thank", "thanked", "thank to", "thanks"), 1, "謝謝資助方 thanked。"),
        ("The experiment ___ ethical guidelines.", opts("follow", "followed", "was following", "follows"), 1, "過去遵循 followed。"),
        ("Findings cannot be ___ without replication.", opts("generalize", "generalized", "generalizing", "generalizes"), 1, "被概括 generalized。"),
        ("The hypothesis remains ___.", opts("test", "untested", "testing", "tests"), 1, "形容詞未檢驗 untested。"),
        ("The correlation is statistically ___.", opts("significance", "significant", "significantly", "signify"), 1, "形容詞補語 significant。"),
        ("The effect size was ___.", opts("substance", "substantial", "substantially", "substantiate"), 1, "形容詞 substantial。"),
        ("The discussion ___ alternative explanations.", opts("address", "addresses", "addressed", "addressing"), 2, "過去討論到 addressed。"),
        ("Future research should ___ these variables.", opts("examine", "examines", "examining", "examined"), 0, "情態動詞後原形 examine。"),
        ("The variable was ___ controlled.", opts("careful", "carefully", "carefulness", "care"), 1, "副詞修飾過去分詞。"),
        ("The outcome was ___ unexpected.", opts("somewhat", "somewhatly", "some", "somewhere"), 0, "副詞 somewhat。"),
        ("The proposal was ___ rejected.", opts("unanimous", "unanimously", "unanimity", "unanimouslyness"), 1, "副詞 unanimously。"),
        ("The framework is ___ applicable.", opts("broad", "broadly", "breadth", "broaden"), 1, "修飾形容詞 broadly。"),
        ("The evidence ___ replication.", opts("warrant", "warrants", "warranted", "warranting"), 1, "現在 warrants 值得。"),
        ("The sample was ___ drawn.", opts("random", "randomly", "randomness", "randomize"), 1, "副詞 randomly。"),
        ("Participants gave ___ consent.", opts("inform", "informed", "informing", "informs"), 1, "知情同意 informed consent。"),
        ("The interview data were ___ anonymized.", opts("full", "fully", "fulness", "fulfill"), 1, "副詞 fully。"),
        ("The survey ___ response bias.", opts("may exhibit", "may exhibits", "might exhibited", "might exhibiting"), 0, "可能呈現偏差 may exhibit。"),
        ("The article ___ prior work extensively.", opts("cite", "cites", "citing", "cited"), 3, "過去引用 cited。"),
        ("The model ___ reality imperfectly.", opts("mirror", "mirrors", "mirrored", "mirroring"), 1, "第三人稱 mirrors。"),
        ("The trend has ___ sharply.", opts("accelerate", "accelerated", "accelerating", "accelerates"), 1, "現在完成 has accelerated。"),
        ("Inflation has ___ consumer spending recently.", opts("curb", "curbed", "curbing", "to curb"), 1, "現在完成式 has + 過去分詞 curbed。"),
        ("Ethics approval ___ obtained before recruitment.", opts("was", "were", "is", "are"), 0, "不可數／單數概念用 was obtained。"),
        ("Participants ___ debriefed after the study.", opts("was", "were", "is", "are"), 1, "複數 participants 搭配 were。"),
        ("The findings ___ not generalizable beyond the sample.", opts("is", "are", "was", "be"), 1, "複數 findings 用 are。"),
        ("The instrument demonstrates adequate ___.", opts("reliable", "reliability", "reliably", "relying"), 1, "名詞 reliability 十足。"),
        ("Cronbach's alpha reflects internal ___.", opts("consistent", "consistency", "consistently", "consistor"), 1, "內部一致性 consistency。"),
        ("Multicollinearity can ___ coefficient estimates.", opts("bias", "distort", "distorts", "distorting"), 1, "情態動詞後原形 distort。"),
        ("The regression assumes residuals are approximately ___.", opts("normal", "normally", "normality", "normalize"), 0, "形容詞補語 normal。"),
        ("We conducted a pilot study ___ scale refinement.", opts("for", "to", "toward", "into"), 2, "朝向／為了精煉 toward scale refinement。"),
        ("The literature review ___ gaps in prior studies.", opts("highlight", "highlights", "highlighted", "highlighting"), 2, "過去式 highlighted。"),
        ("Item wording was revised ___ ambiguity.", opts("reduce", "to reduce", "reducing", "reduced"), 1, "不定詞表目的 to reduce。"),
        ("Response categories were ___ labeled.", opts("clear", "clearly", "clearing", "clearness"), 1, "副詞 clearly。"),
        ("Missing values were handled using listwise ___.", opts("delete", "deletion", "deleting", "deleted"), 1, "名詞 deletion。"),
        ("The null hypothesis was ___ at α = .05.", opts("reject", "rejected", "rejecting", "rejects"), 1, "被動 rejected。"),
        ("A Bonferroni correction ___ multiple comparisons.", opts("address", "addresses", "addressed", "addressing"), 1, "第三人稱 addresses。"),
        ("Effect sizes are reported ___ p-values alone.", opts("beside", "alongside", "besides", "along"), 1, "alongside 與…並列。"),
        ("The abstract ___ the main outcomes.", opts("summarize", "summarizes", "summarized", "summarizing"), 2, "過去式 summarized。"),
        ("Figures were produced using ___ software.", opts("statistical", "statistics", "statistically", "statistic"), 0, "形容詞 statistical software。"),
        ("Limitations include ___ sampling bias.", opts("potential", "potentially", "potence", "potent"), 0, "形容詞 potential。"),
        ("Future work might ___ longitudinal designs.", opts("employ", "employs", "employed", "employing"), 0, "情態動詞後原形 employ。"),
        ("Confounding variables were ___ where possible.", opts("control", "controlled", "controlling", "controls"), 1, "被動 controlled。"),
        ("The coding scheme achieved satisfactory ___.", opts("reliable", "reliability", "reliably", "rely"), 1, "名詞 reliability。"),
        ("Inter-rater agreement was assessed using Cohen's ___.", opts("kappa", "Kappa", "kappa coefficient", "kap"), 1, "專有名詞 Kappa（選項一致即可）。"),
        ("The manuscript adheres to journal ___ guidelines.", opts("style", "styling", "stylish", "styles"), 0, "style guidelines 體例／格式指引。"),
        ("Prior informed consent was ___ in writing.", opts("obtain", "obtained", "obtaining", "obtains"), 1, "被動 obtained。"),
        ("De-identified transcripts were stored ___.", opts("secure", "securely", "security", "secured"), 1, "副詞 securely。"),
        ("Qualitative themes emerged through ___.", opts("thematic", "thematic analysis", "themes", "theming"), 1, "慣用 thematic analysis。"),
        ("Member checking ___ interpretive validity.", opts("enhance", "enhances", "enhanced", "enhancing"), 1, "第三人稱 enhances。"),
        ("Saturation was reached when no new ___ appeared.", opts("theme", "themes", "thematic", "theming"), 1, "複數 themes。"),
        ("NVivo was used to facilitate ___.", opts("code", "coding", "coded", "codify"), 1, "動名詞 coding。"),
        ("The audit trail documents analytic ___.", opts("decide", "decisions", "deciding", "decided"), 1, "decisions。"),
        ("Reflexivity statements acknowledge researcher ___.", opts("bias", "biases", "biased", "biasing"), 0, "不可數 bias。"),
        ("Positionality may ___ how findings are framed.", opts("shape", "shapes", "shaped", "shaping"), 1, "may + 原形 shape。"),
        ("Triangulation combined interviews with ___.", opts("observe", "observations", "observed", "observing"), 1, "名詞 observations。"),
        ("Transferability depends on thick ___.", opts("describe", "description", "describing", "described"), 1, "thick description。"),
        ("Quantitative results were triangulated ___ survey comments.", opts("for", "with", "to", "by"), 1, "triangulated with。"),
        ("The discussion synthesizes results ___ prior theory.", opts("against", "with", "for", "under"), 1, "synthesize with theory。"),
        ("Preregistration ___ hypothesis specification.", opts("aid", "aids", "aided", "aiding"), 1, "第三人稱 aids。"),
        ("An open science repository hosts the ___.", opts("datum", "data", "datas", "database"), 1, "複數 data。"),
        ("Replication materials are available ___ request.", opts("in", "on", "upon", "for"), 2, "upon request 固定用法。"),
        ("Conflict-of-interest disclosures were ___.", opts("provide", "provided", "providing", "provides"), 1, "被動 provided。"),
        ("Funding sources did not ___ study design.", opts("influence", "influences", "influenced", "influencing"), 0, "did not + 原形 influence。"),
        ("Author contributions follow CRediT ___.", opts("taxonomy", "taxonomies", "taxonomic", "taxon"), 0, "CRediT taxonomy。"),
        ("ORCID iDs ___ verified where available.", opts("is", "are", "was", "were"), 1, "複數 ORCID iDs 用 were。"),
        ("Preprints were posted ___ peer review.", opts("before", "after", "during", "since"), 0, "審查前 before peer review。"),
        ("The dataset ___ released under CC-BY.", opts("is", "are", "was", "were"), 2, "過去釋出 was released。"),
        ("Sensitive variables were ___ to protect privacy.", opts("suppress", "suppressed", "suppressing", "suppresses"), 1, "被動 suppressed。"),
        ("Statistical code was written ___ R.", opts("on", "at", "in", "by"), 2, "用某語言 in R。"),
        ("Robustness checks ___ alternative specifications.", opts("use", "uses", "used", "using"), 2, "過去式 used。"),
        ("Standard errors were clustered at the ___ level.", opts("firm", "firm-year", "firm level", "firmly"), 0, "公司層級 firm level。"),
        ("An instrumental variable addresses ___.", opts("omit variable bias", "endogeneity", "randomness", "multicollinearity"), 1, "工具變數處理內生性 endogeneity。"),
        ("The placebo test yields ___ results.", opts("null", "nullifying", "nullified", "nullity"), 0, "null results 無效應結果。"),
        ("Sensitivity analyses ___ the baseline estimates.", opts("confirm", "confirms", "confirmed", "confirming"), 2, "過去式 confirmed。"),
    ]
    assert len(c) == 75, len(c)
    for t in c:
        rows.append(row("college", t[0], t[1], t[2], t[3]))

    # ─── professor 75 ───
    p: list[tuple] = [
        ("Grice's maxim of relation counsels speakers to be ___.", opts("verbose", "relevant", "polite only", "ambiguous"), 1, "關聯準則要求相關 relevant。"),
        ("In pragmatics, an implicature is often ___.", opts("entailed", "cancelable", "always explicit", "unrelated"), 1, "含意通常可撤銷 cancelable。"),
        ("A performative utterance ___.", opts("cannot be spoken", "can accomplish an act by being spoken", "must be false", "is always indirect"), 1, "言語行為以說出即完成。"),
        ("Relevance theory treats ostensive communication as ___.", opts("purely syntactic", "minimizing processing effort as assumed intended", "avoiding inference", "only literal"), 1, "具展示性溝通涉及最佳相關與處理成本。"),
        ("In phonology, complementary distribution suggests ___.", opts("free variation", "allophones of one phoneme", "minimal pairs", "tone sandhi always"), 1, "互補分布常為同一音位之異音。"),
        ("Metrical stress in English is typically ___.", opts("fixed on the first syllable always", "assigned within words according to lexical rules", "random", "suffix-driven only"), 1, "英語重音受詞彙規則約束。"),
        ("Binding theory primarily regulates ___.", opts("word order", "anaphor-pronoun dependencies", "question formation", "spell-out"), 1, "管Binding／照應與代名詞依賴。"),
        ("The EPP (Extended Projection Principle) concerns ___.", opts("theta roles only", "subjects at Spec-TP", "phonetic transcription", "discourse particles"), 1, "EPP 與主語／Spec-TP 相關。"),
        ("In OT syntax, higher-ranked constraints ___.", opts("can be freely violated", "dominate lower-ranked ones", "are never evaluated", "apply only to morphology"), 1, "優排序語法：高階限制優先。"),
        ("VP ellipsis identity typically requires ___.", opts("verbatim repetition only", "parallelism at the relevant structural level", "no licensing", "modal verbs"), 1, "VP 省略需結構平行。"),
        ("Parasitic gaps are licensed only when ___.", opts("no wh-movement occurs", "a true gap licenses wh-dependencies", "subjects are null", "infinitives are banned"), 1, "寄生空缺依賴真正空缺／移位結構。"),
        ("The cartographic approach maps functional heads onto ___.", opts("single phrase", "fine-grained hierarchies", "phonetic grids", "random trees"), 1, "製圖式句法：細緻功能層級。"),
        ("In Distributed Morphology, vocabulary insertion occurs ___.", opts("before syntax", "after syntax", "only in phonetics", "never"), 1, "詞彙插入於句法之後。"),
        ("Root suppletion mainly affects ___.", opts("determiners", "exponents realizing irregular stems", "intonation", "prosodic boundaries"), 1, "詞根異干替換多見於不規則詞形。"),
        ("In cognitive semantics, conceptual metaphor maps ___.", opts("sound to color only", "domains onto domains", "syntax to morphology", "alphabet to phonetics"), 1, "概念隱喻跨域映射。"),
        ("Frame semantics emphasizes ___.", opts("rhyme", "knowledge structures activated by words", "IPA charts", "stress grids"), 1, "框架語義：詞所喚起知識結構。"),
        ("Prototype theory predicts ___.", opts("crisp boundaries always", "graded category membership", "no polysemy", "uniform definitions"), 1, "原型範疇具程度性。"),
        ("Relevance in translation studies may prioritize ___.", opts("word-for-word gloss only", "functional equivalence in context", "ignoring register", "literal cognates"), 1, "功能對等／語境等效。"),
        ("Skopos theory foregrounds ___.", opts("author biography only", "the purpose of the translation task", "avoiding footnotes", "orthographic unity"), 1, "目的論強調翻譯目的。"),
        ("Corpus stylistics often relies on ___.", opts("intuition only", "frequency and collocational patterns", "rhyme schemes alone", "handwritten drafts"), 1, "語料庫頻率與搭配。"),
        ("In narratology, focalization concerns ___.", opts("camera lenses", "who perceives in the narrative", "chapter length", "typesetting"), 1, "聚焦：誰在感知。"),
        ("Free indirect discourse blends ___.", opts("only dialogue tags", "third-person narration with character-limited perspective", "stage directions", "footnotes"), 1, "自由間接引語融合敘述與角色視角。"),
        ("In rhetoric, aposiopesis stops mid-utterance to imply ___.", opts("strong emotion or discretion", "perfect grammar", "rhyme scheme", "IPA transcription"), 0, "頓挫省略暗示強烈情感或保留。"),
        ("An epic simile is characteristically ___.", opts("one line long", "extended and elaborate", "always humorous", "non-metaphorical"), 1, "史詩明喻冗長細緻。"),
        ("Horatian satire tends to be ___.", opts("bitter and violent", "urbane and tolerant", "purely tragic", "non-political always"), 1, "賀拉斯式較溫和城市化。"),
        ("Juvenalian satire tends toward ___.", opts("gentle mockery only", "indignation and harsh attack", "pastoral calm", "pure description"), 1, "朱維納爾式較激烈譴責。"),
        ("Metonymy substitutes ___.", opts("opposites", "a contiguous associated entity for another", "foreign words", "rhymes"), 1, "借代：鄰近相關。"),
        ("Synecdoche often substitutes ___.", opts("unrelated words", "part for whole or vice versa", "synonyms only", "verbs for nouns"), 1, "提喻：部分代整體等。"),
        ("Zeugma yokes ___.", opts("random clauses", "one word to two incongruous meanings", "only parallel nouns", "identical sounds"), 1, "共軛／軛式搭配雙義。"),
        ("Chiasmus depends on ___.", opts("rhyme only", "reversed parallel structure", "alliteration only", "homophones"), 1, "交錯配對 reversed parallelism。"),
        ("Aporia in rhetoric signals ___.", opts("certainty", "a feigned or genuine difficulty", "a bibliography", "meter"), 1, "疑惑／難題 aporia。"),
        ("An epistemic modal scopes over ___.", opts("only tense", "the speaker's degree of commitment", "only aspect", "only objects"), 1, "認識情態：說話者確信度。"),
        ("Root modals often concern ___.", opts("pure tense", "permission, ability, or obligation", "only articles", "only word stress"), 1, "根情態：許可能力義務等。"),
        ("Scalar implicature arises from ___.", opts("spelling rules", "Gricean reasoning about stronger alternatives on a scale", "only idioms", "only phonology"), 1, "量級含意源於較強選項。"),
        ("In acquisition research, 'more + adjective' often evidences ___.", opts("fossilization only", "movement toward comparative marking", "telegraphic omission only", "final devoicing"), 1, "more + 形 表比較結構習得。"),
        ("The subset principle proposes learners prefer ___.", opts("the largest grammar", "the smallest grammar consistent with input", "random rules", "borrowings"), 1, "子集原則偏好較小文法。"),
        ("Positive evidence typically refers to ___.", opts("explicit correction only", "attested utterances learners encounter", "phonetic charts", "dictionary definitions only"), 1, "正面證據：可及語料。"),
        ("Negative evidence includes ___.", opts("only praise", "feedback marking ungrammaticality", "random noise", "translation only"), 1, "負面證據：標示不合語法。"),
        ("Poverty of the stimulus arguments target ___.", opts("behaviorist imitation only", "whether input suffices for acquisition as modeled", "only orthography", "only bilingual lexicons"), 1, "刺激貧乏論證：輸入是否足夠。"),
        ("Mirror neurons are debated regarding ___.", opts("spelling", "action understanding and simulation", "IPA transcription", "tone sandhi"), 1, "鏡像神經元與動作理解。"),
        ("In ERP studies, N400 amplitude often indexes ___.", opts("motor planning", "semantic expectancy violation", "pure motor reflex", "eye color"), 1, "N400 與語義期待違反。"),
        ("LAN components are linked with ___.", opts("only happiness", "syntactic morphosyntactic anomalies", "only musical pitch", "only color naming"), 1, "左前負波與句法異常。"),
        ("P600 is commonly associated with ___.", opts("only breathing rate", "syntactic reanalysis or repair", "only olfaction", "only rhythm"), 1, "P600 與句法重分析。"),
        ("In sociolinguistics, overt prestige aligns with ___.", opts("covert norms only", "institutionally endorsed norms", "only children's speech", "only slang"), 1, "外顯聲望：制度化規範。"),
        ("Covert prestige may valorize ___.", opts("only formal registers", "local vernacular norms", "only spelling", "only loanwords"), 1, "隱性聲望：在地規範。"),
        ("Acts of identity theory stresses ___.", opts("random drift", "speakers using language to construct selves", "only phonetics", "only etymology"), 1, "語言作為身分建構。"),
        ("The observer's paradox complicates ___.", opts("typing speed", "collecting natural speech while being observed", "only reading tests", "only word lists"), 1, "觀察者悖論影響語料自然度。"),
        ("Labovian style-shifting shows ___.", opts("no variation", "attention paid to speech affects formality", "only borrowing", "only syntax"), 1, "注意力影響語體轉換。"),
        ("Semantic narrowing historically often yields ___.", opts("broader meaning always", "more specific meanings from broader ones", "only synonyms", "only homophones"), 1, "語義窄化。"),
        ("Semantic widening can produce ___.", opts("only technical jargon", "broader senses from narrower ones", "only spelling changes", "only stress shifts"), 1, "語義擴寬。"),
        ("Pejoration describes ___.", opts("neutralization only", "meaning becoming more negative", "only vowel shifts", "only stress movement"), 1, "貶義化。"),
        ("Amelioration describes ___.", opts("meaning becoming more positive", "semantic bleaching only", "only metaphor death", "only accent loss"), 0, "褒義化（意義變更正面）。"),
        ("Deixis anchors meaning to ___.", opts("only dictionaries", "utterance context like time, place, speaker", "only phonemes", "only syllables"), 1, "指示語境座標。"),
        ("Analyticity in philosophy of language often pairs with ___.", opts("thick ethical concepts only", "truth by virtue of meaning", "only empirical measurement", "only proper names"), 1, "分析性：依意義為真。"),
        ("Rigid designation (Kripke) targets ___.", opts("all predicates", "referential stability across worlds for proper names", "only adjectives", "only tense"), 1, "專名剛性指稱。"),
        ("Two-dimensional semantics distinguishes ___.", opts("only tense and aspect", "epistemic vs metaphysical intensions", "only orthography", "only syllable weight"), 1, "二維語義：認識／形上內涵。"),
        ("Dynamic semantics models meaning as ___.", opts("static sets only", "context change potentials", "only phonetic strings", "only etymology trees"), 1, "動態語義：脈絡更新潛能。"),
        ("Montague grammar aims to ___.", opts("avoid logic", "compose sentence meanings via systematic rules", "replace phonetics", "ban quantifiers"), 1, "蒙塔古語法：系統組合意義。"),
        ("Generalized quantifiers treat noun phrases as ___.", opts("only predicates", "relations between sets", "only pronouns", "only determiners as heads"), 1, "廣義量化詞：集合關係。"),
        ("Presupposition projection investigates ___.", opts("only spelling", "how complex sentences inherit presuppositions", "only intonation", "only rhyme"), 1, "預設投射。"),
        ("Donkey anaphora challenges ___.", opts("only spelling rules", "simple treatments of indefinites and pronouns", "only tense", "only proper nouns"), 1, "驢子句照應難題。"),
        ("Dynamic predicate logic can represent ___.", opts("only idioms", "anaphora via discourse referents", "only IPA", "only stress"), 1, "動態邏輯表照應。"),
        ("Situation semantics replaces possible worlds with ___.", opts("only dictionaries", "situations as partial information states", "only syllables", "only rhyme schemes"), 1, "情境語義：局部資訊情境。"),
        ("Truthmaker semantics ties truth to ___.", opts("only syntax trees", "what makes sentences true", "only phonetics", "only etymology"), 1, "使真者語義。"),
        ("Supervaluationism handles vagueness by ___.", opts("banning logic", "quantifying over admissible sharpenings", "only dictionaries", "only homophones"), 1, "超評估值：可容許細化。"),
        ("Type-logical approaches link syntax and semantics via ___.", opts("random mapping", "curry-howard style proofs", "only stress", "only orthography"), 1, "類型邏輯／句法語義介面。"),
        ("Proof-theoretic semantics privileges ___.", opts("only dictionaries", "inferential rules over truth conditions alone", "only orthography", "only IPA"), 1, "證明論語義：推導規則。"),
        ("Lexical semantics decomposition debates whether features are ___.", opts("always universal across languages", "language-particular or universal", "only phonetic", "only orthographic"), 1, "詞彙分解：特徵是否普世。"),
        ("Polysemy networks are often modeled as ___.", opts("isolated lists", "radial categories with motivated extensions", "only rhyme pairs", "only homonyms"), 1, "多義網路：放射狀範疇。"),
        ("Construction grammar treats ___ as basic.", opts("only morphemes", "form-meaning pairings at multiple sizes", "only syllables", "only phonemes"), 1, "構式語法：多層級形義配對。"),
        ("Grammaticalization typically involves ___.", opts("only borrowing", "semantic bleaching and category shifts", "only stress movement", "only spelling reform"), 1, "語法化：語義淡化與範疇轉移。"),
        ("Grammaticalization clines suggest change is ___.", opts("instantaneous always", "gradient rather than strictly abrupt", "only phonetic", "only lexical"), 1, "斜坡／漸變。"),
        ("Areal diffusion explains ___.", opts("only genetic relationships", "similarities via contact between languages", "only universal grammar", "only orthography"), 1, "區域擴散：接觸相似。"),
        ("Substrate influence often surfaces in ___.", opts("only genetic trees", "lexicon and phonology of a dominant language", "only tense", "only spelling"), 1, "底層語影響。"),
        ("Diachronic reconstruction uses ___.", opts("only modern dictionaries", "the comparative method among cognates", "only rhyme", "only stress"), 1, "歷史比較法。"),
    ]
    assert len(p) == 75, len(p)
    for t in p:
        rows.append(row("professor", t[0], t[1], t[2], t[3]))

    print(
        "INSERT INTO questions (difficulty, question_text, options, "
        "correct_answer_old, correct_index, explanation) VALUES",
    )
    print(",\n".join(rows) + ";")


if __name__ == "__main__":
    main()
