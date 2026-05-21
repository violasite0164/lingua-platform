#!/usr/bin/env python3
"""第三批 300 題：自編 elementary／junior；college／professor 取自 batch1 並加「【三】」前綴以區隔題幹。輸出 INSERT：jsonb + correct_answer_old + correct_index。"""
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


def o(correct: int, q: str, a: str, b: str, c: str, d: str, expl: str) -> tuple:
    return (q, opts(a, b, c, d), correct, expl)


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

    e: list[tuple] = [
        o(2, "My cousins ___ in the band.", "am", "is", "are", "be", "複數 cousins 用 are。"),
        o(1, "Uncle Joe ___ fishing on Sundays.", "go", "goes", "going", "went", "習慣第三人稱 goes。"),
        o(2, "The puppies ___ hungry.", "am", "is", "are", "be", "複數 puppies 用 are。"),
        o(0, "___ there any chairs free?", "Are", "Is", "Am", "Do", "複數 chairs 用 Are there。"),
        o(1, "___ your brother at home?", "Are", "Is", "Am", "Do", "單數 brother 用 Is。"),
        o(2, "These socks ___ mine.", "am", "is", "are", "be", "these 複數用 are。"),
        o(0, "I ___ a good idea.", "have", "has", "having", "had", "I have。"),
        o(1, "She ___ a red bicycle.", "have", "has", "having", "had", "she has。"),
        o(2, "We ___ finished lunch.", "has", "have", "having", "had", "We have + 過去分詞。"),
        o(1, "He ___ not like peppers.", "do", "does", "is", "are", "第三人稱否定 does。"),
        o(0, "___ you know her name?", "Do", "Does", "Is", "Are", "you 搭配 Do。"),
        o(1, "It ___ not rain much here.", "do", "does", "is", "are", "天氣主詞 it + does not。"),
        o(2, "They ___ not want dessert.", "do", "does", "don't", "doesn't", "複數否定 don't want。"),
        o(1, "She ___ TV every evening.", "watch", "watches", "watching", "watched", "習慣 watches。"),
        o(0, "I ___ breakfast at eight.", "eat", "eats", "eating", "ate", "I + eat。"),
        o(3, "Last year we ___ to Italy.", "go", "goes", "going", "went", "last year 過去 went。"),
        o(2, "Listen! The baby ___ .", "cry", "cries", "is crying", "cried", "Listen 現在進行。"),
        o(1, "Right now they ___ chess.", "play", "plays", "are playing", "played", "right now 進行。"),
        o(2, "I ___ never ___ a camel.", "have / see", "have / seen", "has / seen", "had / see", "現在完成 have seen。"),
        o(1, "He ___ already ___ his bag.", "have / pack", "has / packed", "has / packing", "had / pack", "has packed。"),
        o(0, "___ you ever ___ sushi?", "Have / tried", "Has / tried", "Did / tried", "Do / try", "Have you ever tried。"),
        o(1, "She could swim when she ___ five.", "am", "was", "were", "is", "過去年齡 was five。"),
        o(2, "We ___ visit Grandma tomorrow.", "am", "is", "will", "was", "未來 will。"),
        o(1, "I think it ___ be cold tonight.", "will", "might", "must", "can", "可能 might。"),
        o(0, "You ___ not run in the hallway.", "must", "might", "could", "should", "禁止 must not。"),
        o(2, "___ I borrow your eraser?", "Must", "Should", "May", "Need", "禮貌請求 May I。"),
        o(1, "There ___ little water in the bottle.", "are", "is", "be", "am", "little water 不可數 is。"),
        o(1, "How ___ pencils do you need?", "much", "many", "long", "often", "可數 pencils many。"),
        o(0, "How ___ sugar do we need?", "much", "many", "often", "far", "不可數 sugar much。"),
        o(2, "Give me ___ umbrella; it's raining.", "a", "an", "the", "/", "umbrella 母音 an。"),
        o(0, "This is ___ useful tool.", "a", "an", "the", "/", "useful 子音音 a。"),
        o(2, "___ moon looks bright tonight.", "A", "An", "The", "/", "天體 the moon。"),
        o(1, "She plays the piano ___ than I do.", "good", "better", "best", "more good", "than 比較 better。"),
        o(2, "That was the ___ day ever!", "bad", "worse", "worst", "more bad", "ever 最高級 worst。"),
        o(1, "He drives ___ .", "careful", "carefully", "carefulness", "more careful", "修飾動詞副詞 carefully。"),
        o(0, "___ me your book, please.", "Pass", "Passing", "To pass", "Passed", "祈使原形 Pass。"),
        o(1, "She is fond ___ animals.", "in", "of", "at", "for", "be fond of。"),
        o(2, "We're proud ___ our team.", "in", "at", "of", "for", "be proud of。"),
        o(0, "Wait ___ me at the gate.", "for", "to", "at", "on", "wait for。"),
        o(2, "The keys are ___ the drawer.", "in", "on", "at", "to", "在抽屜裡 in。"),
        o(1, "We'll see you ___ Friday.", "in", "on", "at", "by", "星期 on Friday。"),
        o(0, "___ July it is often hot.", "In", "On", "At", "By", "月份用 in：in July。"),
        o(0, "She arrived ___ school early.", "at", "in", "on", "to", "at school。"),
        o(1, "What's the opposite of 'tall'?", "wide", "short", "loud", "sweet", "tall 反義 short。"),
        o(2, "One week has ___ days.", "five", "six", "seven", "eight", "一週七天。"),
        o(1, "Boiling water is ___ degrees Celsius.", "50", "100", "0", "32", "沸點攝氏 100。"),
        o(1, "Penguins cannot ___.", "run fast", "fly", "swim", "slide", "企鵝不會飛。"),
        o(2, "You write on paper with a ___.", "spoon", "fork", "pen", "cup", "筆寫字。"),
        o(1, "We smell with our ___.", "eyes", "ears", "nose", "feet", "鼻子嗅覺。"),
        o(0, "This soup smells ___.", "nicely", "nice", "niceness", "nicer", "smell + 形容詞 nice。"),
        o(1, "The students look ___.", "happily", "tired", "tiring", "tiredly", "look + 形容詞 tired。"),
        o(2, "___ time is it?", "Who", "Which", "What", "Whose", "What time。"),
        o(1, "___ bag is this — yours or mine?", "Who", "Which", "Whose", "What", "誰的 Whose。"),
        o(0, "Let's ___ a short break.", "take", "takes", "taking", "took", "Let's + 原形。"),
        o(0, "Please don't ___ loudly in the library.", "talk", "talks", "talking", "talked", "Don't + 原形。"),
        o(2, "She enjoys ___ cartoons.", "watch", "to watch", "watching", "watched", "enjoy + 動名詞。"),
        o(1, "He stopped ___ a drink.", "have", "to have", "having", "had", "停下來去做 stop to have。"),
        o(0, "They decided ___ the early train.", "catch", "to catch", "catching", "caught", "decide to catch。"),
        o(2, "I'm not used ___ up this early.", "get", "to get", "to getting", "getting", "be used to + 動名詞。"),
        o(1, "There is ___ milk in the fridge.", "a few", "a little", "many", "several", "不可數 a little。"),
        o(2, "She has ___ friends in this city.", "much", "a lot of", "little", "a little", "可數 friends a lot of。"),
        o(0, "___ you mind closing the window?", "Would", "Do", "Are", "Will", "Would you mind + V-ing。"),
        o(1, "Thanks ___ your help.", "for", "to", "of", "at", "thanks for。"),
        o(1, "He is married ___ a doctor.", "with", "to", "for", "at", "married to。"),
        o(2, "The bus leaves ___ 3 p.m.", "in", "on", "at", "by", "時刻 at 3 p.m.。"),
        o(1, "I was born ___ 2010.", "in", "on", "at", "by", "年份 in 2010。"),
        o(1, "She cut the paper ___ scissors.", "by", "with", "use", "using", "with scissors。"),
        o(0, "This gift is ___ you.", "to", "for", "from", "at", "給某人 for you。"),
        o(1, "He died ___ a serious illness.", "of", "from", "by", "with", "死於疾病 die of。"),
        o(2, "___! You dropped your wallet.", "Hey", "Hear", "Listen to", "Sound", "引起注意 Hey。"),
        o(0, "Could I have ___ water, please?", "any", "some", "many", "few", "禮貌請求 some。"),
        o(1, "I have ___ friends than she does.", "much", "more", "most", "many", "than more。"),
        o(2, "This is ___ interesting story.", "a", "an", "the", "/", "interesting 母音 an。"),
        o(0, "Neither parent ___ angry.", "are", "is", "were", "be", "neither + 單數 is。"),
        o(1, "Few students ___ absent.", "was", "were", "is", "be", "few students 複數 were。"),
    ]
    assert len(e) == 75, len(e)
    for t in e:
        rows.append(row("elementary", t[0], t[1], t[2], t[3]))

    j: list[tuple] = [
        o(1, "If you heat ice, it ___ .", "melt", "melts", "melted", "melting", "科學真理 if + 現在 melts。"),
        o(2, "Unless we leave now, we ___ the show.", "catch", "will catch", "will miss", "missed", "Unless 否條件 will miss。"),
        o(1, "By next week, she ___ the essay.", "finishes", "will finish", "will have finished", "finished", "By + 未來完成。"),
        o(2, "I wish I ___ a bit taller.", "am", "was", "were", "have been", "wish 與現在相反 were。"),
        o(1, "It's time we ___ home.", "go", "went", "gone", "going", "It's time + 過去式建議 went。"),
        o(2, "I'd rather ___ at home tonight.", "stay", "to stay", "stayed", "staying", "would rather + 原形。"),
        o(0, "He speaks as if he ___ everything.", "know", "knew", "knows", "had known", "as if 非真 knew。"),
        o(1, "The documents ___ before Monday.", "must submit", "must be submitted", "must submitting", "must submitted", "被動 must be submitted。"),
        o(2, "The mistake ___ quickly.", "corrected", "was corrected", "was correcting", "corrects", "被改正 was corrected。"),
        o(1, "She denied ___ the email.", "send", "sending", "to send", "sent", "deny + 動名詞。"),
        o(0, "He keeps ___ the same mistake.", "make", "making", "to make", "made", "keep + 動名詞。"),
        o(2, "I'm considering ___ jobs.", "change", "to change", "changing", "changed", "consider + 動名詞。"),
        o(1, "The test was ___ difficult that many failed.", "so", "such", "very", "too", "so...that。"),
        o(1, "Scarcely had the train stopped ___ passengers rushed out.", "than", "when", "before", "until", "Scarcely...when。"),
        o(1, "Were she here, she ___ agree.", "will", "would", "can", "should", "虛擬 would。"),
        o(2, "The athlete ___ ankle during practice.", "sprains", "sprained", "was spraining", "has sprained", "過去受傷 sprained。"),
        o(0, "The museum ___ at nine every day.", "open", "opens", "is opened", "is opening", "習慣 opens。"),
        o(1, "Neither the coach nor the players ___ ready.", "was", "were", "is", "are", "就近 players were。"),
        o(2, "The committee ___ divided on the issue.", "is", "are", "was", "were", "集合名詞視為複數 were。"),
        o(1, "So great ___ the noise that we covered our ears.", "is", "was", "were", "be", "倒裝 So great was。"),
        o(2, "Only after reading the manual ___ how it worked.", "I understood", "did I understand", "I did understand", "understood I", "Only after 倒裝 did I。"),
        o(1, "Had I known, I ___ warned you.", "will", "would", "would have", "had", "與過去相反 would have。"),
        o(2, "She speaks French fluently; ___, she lived in Paris.", "because", "for instance", "moreover", "although", "舉例 for instance。"),
        o(0, "___ the fog, the plane landed safely.", "Because", "Despite", "Although", "Since", "儘管 despite + 名詞。"),
        o(1, "He is used ___ long hours.", "to work", "to working", "work", "working", "be used to + 動名詞。"),
        o(2, "The picture ___ from the wall.", "fell", "fell down", "was fallen", "felled", "自己落下 fell。"),
        o(1, "I can't imagine ___ on Mars.", "live", "to live", "living", "lived", "imagine + 動名詞。"),
        o(0, "She insisted ___ paying for dinner.", "on", "in", "for", "to", "insist on + 動名詞。"),
        o(2, "They accused him ___ theft.", "for", "of", "with", "about", "accuse of。"),
        o(1, "I'm allergic ___ peanuts.", "for", "to", "of", "with", "allergic to。"),
        o(1, "The more you practice, ___ you will become.", "more fluent", "the more fluent", "most fluent", "fluently", "the more...the more。"),
        o(0, "No sooner ___ the bell rung than the students left.", "had", "did", "has", "was", "No sooner had + 過去分詞。"),
        o(1, "Little ___ that he was being filmed.", "he realizes", "did he realize", "he realized", "does he realize", "Little 倒裝 did he realize。"),
        o(2, "Not only ___ the report, but she also presented it.", "she wrote", "did she write", "she did write", "had she wrote", "Not only 倒裝 did she write。"),
        o(1, "If he ___ harder, he would have passed.", "studies", "studied", "had studied", "has studied", "與過去相反 had studied。"),
        o(2, "The contract ___ last Friday.", "signs", "was signed", "signed", "is signing", "被簽署 was signed。"),
        o(0, "She suggested ___ a taxi.", "take", "taking", "to take", "took", "suggest + 動名詞。"),
        o(1, "I'd prefer ___ rather than walk.", "drive", "to drive", "driving", "drove", "prefer to drive。"),
        o(2, "There's no use ___ over spilt milk.", "cry", "crying", "to cry", "cried", "no use + 動名詞。"),
        o(1, "He was seen ___ the building.", "enter", "to enter", "entering", "entered", "be seen to enter。"),
        o(0, "The problem needs ___ soon.", "solve", "solving", "to solve", "solved", "need + 動名詞。"),
        o(2, "She is capable ___ running a marathon.", "for", "of", "in", "to", "capable of。"),
        o(1, "I'm fed up ___ waiting.", "for", "with", "of", "at", "fed up with。"),
        o(0, "He confessed ___ the crime.", "commit", "to committing", "committing", "committed", "confess to + 動名詞。"),
        o(2, "The storm having passed, we ___ outside.", "go", "went", "could go", "going", "獨立主格後 could go。"),
        o(1, "___ tired, she went to bed early.", "Be", "Being", "Been", "Is", "分詞原因 Being tired。"),
        o(2, "Never have I ___ such a beautiful sunset.", "see", "saw", "seen", "seeing", "Never have I + 過去分詞 seen。"),
        o(1, "The package ___ delivered yesterday.", "is", "was", "has been", "had been", "昨天被送 was delivered。"),
        o(0, "She can't help ___ when she hears that song.", "sing", "singing", "to sing", "sang", "can't help + 動名詞。"),
        o(2, "He objected ___ treated unfairly.", "to be", "to being", "being", "be", "object to being。"),
        o(1, "___ opening the window?", "Would you mind", "Do you mind", "You would mind", "Would mind you", "Would you mind + V-ing。"),
        o(2, "It is essential that he ___ on time.", "is", "be", "will be", "being", "essential that + (should) be。"),
        o(1, "The new law will ___ next month.", "effect", "take effect", "take effects", "make effect", "生效 take effect。"),
        o(0, "She has worked here ___ 2018.", "since", "for", "from", "in", "起點 since 2018。"),
        o(2, "By the time we arrived, the film ___ .", "starts", "started", "had started", "was starting", "過去完成 had started。"),
        o(1, "He acted ___ nothing had happened.", "as if", "even if", "although", "unless", "好像 as if。"),
        o(2, "The children were playing while their parents ___ .", "talk", "talked", "were talking", "had talked", "while 過去進行 were talking。"),
        o(0, "I ___ rather you didn't smoke here.", "would", "had", "should", "could", "would rather you didn't。"),
        o(1, "Such ___ interesting book deserves praise.", "a", "an", "the", "/", "such an interesting book。"),
        o(1, "Hardly ___ sat down when the phone rang.", "I had", "had I", "I did", "did I", "Hardly had I + 過去分詞。"),
        o(1, "The reason ___ he resigned is unclear.", "which", "why", "what", "where", "reason why。"),
        o(0, "This is the town ___ I grew up.", "which", "where", "that", "what", "地點 where。"),
        o(2, "The man ___ car was stolen reported it.", "who", "whom", "whose", "which", "所有格 whose。"),
        o(1, "She didn't know ___ to trust.", "who", "whom", "whose", "which", "誰 who to trust。"),
        o(2, "___ wants to join should sign up.", "Who", "Whoever", "Whomever", "Whatever", "無論誰 Whoever。"),
        o(1, "However much he earns, he ___ saves nothing.", "still", "yet", "ever", "never", "讓步 However much。"),
        o(1, "The data ___ processed overnight.", "was", "were", "is", "are", "複數 data 在被動過去常用 were processed（美式亦可視為集合名詞用 was）。"),
        o(0, "Politics ___ a sensitive topic.", "are", "is", "were", "be", "抽象 politics 單數 is。"),
        o(1, "Each of the boys ___ a helmet.", "have", "has", "having", "had", "each + 單數 has。"),
        o(2, "The furniture ___ delivered this morning.", "were", "was", "are", "be", "furniture 不可數 was。"),
        o(1, "Rarely ___ such honesty.", "you see", "do you see", "you saw", "have you seen", "Rarely 倒裝 do you see。"),
        o(0, "Not a single word ___ from him.", "comes", "come", "came", "coming", "否定主語單數 comes。"),
        o(2, "Should you need help, you ___ call us.", "can", "could", "may", "might", "Should you... may call。"),
        o(1, "I ___ have locked the door — I'm not sure.", "must", "might", "should", "would", "不確定 might have。"),
        o(2, "The suspect ___ to have fled abroad.", "believes", "is believed", "believed", "is believing", "is believed to。"),
    ]
    assert len(j) == 75, len(j)
    for t in j:
        rows.append(row("junior", t[0], t[1], t[2], t[3]))

    c: list[tuple] = [
        ("The hypothesis was ___ by subsequent experiments. (choose the best option).", opts("refuted", "refuting", "refute", "to refute"), 0, "被動語態，假設被後續實驗駁回。"),
        ("The study ___ a significant correlation between variables. (choose the best option).", opts("established", "establishing", "establish", "to establish"), 0, "過去研究「確立」相關，用過去式 established。"),
        ("The author's argument is somewhat ___. (choose the best option).", opts("tenuous", "tenuously", "tenuity", "tenuousness"), 0, "形容詞作補語：論證略顯薄弱 tenuous。"),
        ("She gave a ___ account of the incident. (choose the best option).", opts("dispassionate", "dispassionately", "dispassion", "dispassioning"), 0, "名詞前用形容詞：客觀平實的敘述。"),
        ("The policy has had ___ effects on small businesses. (choose the best option).", opts("deleterious", "deleteriously", "deleteriousness", "deleteriate"), 0, "修飾名詞 effects 用形容詞 deleterious（有害）。"),
        ("Such behavior is ___ to the organization's reputation. (choose the best option).", opts("inimical", "inimically", "inimic", "inimicality"), 0, "be inimical to 表示對…有害。"),
        ("The results were ___ unexpected. (choose the best option).", opts("wholly", "whole", "wholeness", "wholesome"), 0, "修飾形容詞用副詞 wholly。"),
        ("The theory remains ___. (choose the best option).", opts("contentious", "contentiously", "content", "contention"), 0, "remain + 形容詞：仍有爭議 contentious。"),
        ("The paper lacks ___ rigor. (choose the best option).", opts("methodological", "methodologically", "methodology", "method"), 0, "名詞前用形容詞 methodological。"),
        ("The evidence is ___. (choose the best option).", opts("inconclusive", "inconclusively", "inconclude", "inconclusiveness"), 0, "形容詞作補語：證據尚無定論。"),
        ("He drew an ___ between the two cases. (choose the best option).", opts("analogy", "analogous", "analogously", "analog"), 0, "不定冠詞後接名詞 analogy。"),
        ("The proposal was met with ___. (choose the best option).", opts("skepticism", "skeptical", "skeptically", "skeptic"), 0, "介詞後接名詞 skepticism。"),
        ("The finding ___ previous assumptions. (choose the best option).", opts("contradicts", "contradict", "contradicting", "contradicted"), 0, "主詞單數，現在式 contradicts。"),
        ("The variables were ___ controlled. (choose the best option).", opts("carefully", "careful", "carefulness", "care"), 0, "修飾過去分詞 controlled 用副詞。"),
        ("The essay ___ several seminal works. (choose the best option).", opts("cites", "cite", "citing", "cited"), 0, "現在簡單式或過去式；此處主詞第三人稱一般現在 cites。"),
        ("Scholars have long ___ this interpretation. (choose the best option).", opts("disputed", "dispute", "disputing", "disputes"), 0, "現在完成式 have disputed。"),
        ("The narrative ___ chronologically. (choose the best option).", opts("unfolds", "unfold", "unfolding", "unfolded"), 0, "主詞單數，敘述依時間展開 unfolds。"),
        ("The author ___ the reader's expectations. (choose the best option).", opts("subverts", "subvert", "subverting", "subverted"), 0, "第三人稱現在式 subverts。"),
        ("The critique is ___ superficial. (choose the best option).", opts("unduly", "undue", "undies", "undular"), 0, "修飾形容詞 superficial 用副詞 unduly。"),
        ("The methodology is not ___ reproducible. (choose the best option).", opts("readily", "ready", "readiness", "reading"), 0, "修飾形容詞用副詞 readily。"),
        ("The speaker ___ her main points clearly. (choose the best option).", opts("articulated", "articulate", "articulating", "articulates"), 0, "過去演講用 articulated。"),
        ("The treaty ___ trade barriers. (choose the best option).", opts("dismantled", "dismantle", "dismantling", "dismantles"), 0, "過去事件 dismantled。"),
        ("Inflation has ___ consumer confidence. (choose the best option).", opts("eroded", "erode", "eroding", "erodes"), 0, "現在完成式 have eroded。"),
        ("The CEO ___ responsibility for the failure. (choose the best option).", opts("accepted", "accepts", "accepting", "accept"), 0, "過去接受責任 accepted。"),
        ("The committee's decision is ___. (choose the best option).", opts("binding", "bind", "bound", "binds"), 0, "形容詞 binding 表示有約束力。"),
        ("The contract shall ___ on the first of July. (choose the best option).", opts("take effect", "take effects", "take affecting", "take effective"), 0, "固定用法 take effect 生效。"),
        ("The plaintiff ___ damages. (choose the best option).", opts("sought", "seek", "seeking", "seeks"), 0, "訴訟過去尋求賠償 sought。"),
        ("The court ___ the appeal. (choose the best option).", opts("dismissed", "dismiss", "dismissing", "dismisses"), 0, "過去駁回 dismissed。"),
        ("The statute is ___ to interpretation. (choose the best option).", opts("subject", "subjective", "subjected", "subjecting"), 0, "be subject to 易於／須受…。"),
        ("Notwithstanding the risks, the board ___. (choose the best option).", opts("proceeded", "proceed", "proceeding", "proceeds"), 0, "儘管風險仍進行，過去 proceeded。"),
        ("The data ___ systematically biased. (choose the best option).", opts("appear", "appears", "appearing", "appeared"), 0, "將 data 當複數時動詞用 appear（亦有出版物視為單數而用 appears）。"),
        ("The phenomenon ___ further investigation. (choose the best option).", opts("warrants", "warrant", "warranting", "warranted"), 0, "現象「值得」進一步調查，第三人稱 warrants。"),
        ("The implications are far-___. (choose the best option).", opts("reaching", "reached", "reach", "reaches"), 0, "複合形容詞 far-reaching 深遠的。"),
        ("The argument ___ scrutiny. (choose the best option).", opts("withstands", "withstand", "withstanding", "withstood"), 0, "第三人稱現在 withstands。"),
        ("The sample size is ___. (choose the best option).", opts("inadequate", "inadequately", "inadequacy", "inadequateness"), 0, "形容詞補語 inadequate。"),
        ("The researchers ___ their conclusions cautiously. (choose the best option).", opts("stated", "state", "stating", "states"), 0, "過去陳述 stated。"),
        ("The model ___ reality only partially. (choose the best option).", opts("reflects", "reflect", "reflecting", "reflected"), 0, "現在式 reflects。"),
        ("The trend has ___ since 2020. (choose the best option).", opts("accelerated", "accelerate", "accelerating", "accelerates"), 0, "現在完成式 has accelerated。"),
        ("The article ___ plagiarism in the draft. (choose the best option).", opts("alleged", "alleges", "allege", "alleging"), 0, "過去報導 alleged。"),
        ("Prior ___ the meeting, circulate the agenda. (choose the best option).", opts("to", "than", "of", "for"), 0, "prior to 相當於 before。"),
        ("The ethics board rarely ___ approval without review. (choose the best option).", opts("withholds", "withhold", "withheld", "withholding"), 0, "描述慣例用現在式 withholds。"),
        ("The manuscript was ___ peer review. (choose the best option).", opts("subjected to", "subject to", "subjecting to", "subjective to"), 0, "be subjected to 遭受到…審查。"),
        ("The speaker ___ an anecdote to illustrate the point. (choose the best option).", opts("invoked", "invoke", "invoking", "invokes"), 0, "過去演講援引 invoked。"),
        ("The framework is ___ applicable across disciplines. (choose the best option).", opts("broadly", "broad", "broaden", "breadth"), 0, "修飾形容詞 applicable 用副詞 broadly。"),
        ("The decline was ___ precipitous. (choose the best option).", opts("somewhat", "somewhatly", "some", "something"), 0, "修飾形容詞 precipitous 用副詞 somewhat。"),
        ("The author ___ the limitations of the study. (choose the best option).", opts("acknowledges", "acknowledge", "acknowledging", "acknowledged"), 3, "過去式 acknowledged 或現在 acknowledges；此處選 acknowledged 表文中承認。"),
        ("The policy ___ unintended consequences. (choose the best option).", opts("entailed", "entail", "entailing", "entails"), 0, "過去造成 entailed。"),
        ("The dataset was ___ anonymized. (choose the best option).", opts("properly", "proper", "prop", "propriety"), 0, "修飾過去分詞用副詞 properly。"),
        ("The reviewer questioned the paper's ___. (choose the best option).", opts("coherence", "coherent", "coherently", "cohere"), 0, "所有格後接名詞 coherence。"),
        ("The conclusion does not ___ follow from the premises. (choose the best option).", opts("necessarily", "necessary", "necessity", "necessitate"), 0, "修飾動詞 follow 用副詞 necessarily。"),
        ("The theory was ___ received by peers. (choose the best option).", opts("well", "good", "best", "better"), 0, "修飾過去分詞 received 用副詞 well。"),
        ("The grant ___ interdisciplinary collaboration. (choose the best option).", opts("fostered", "foster", "fostering", "fosters"), 0, "過去促進 fostered。"),
        ("The lecture ___ key terminology. (choose the best option).", opts("clarified", "clarify", "clarifying", "clarifies"), 0, "過去闡明 clarified。"),
        ("The experiment ___ a controlled environment. (choose the best option).", opts("used", "use", "using", "uses"), 0, "過去使用 used。"),
        ("Participants were ___ at random. (choose the best option).", opts("assigned", "assign", "assigning", "assigns"), 0, "過去分詞被指派 assigned。"),
        ("The survey ___ self-reported bias. (choose the best option).", opts("exhibits", "exhibit", "exhibiting", "exhibited"), 3, "過去顯示 exhibited 或現在 exhibits；選 exhibited 表調查當時。"),
        ("The algorithm ___ faster convergence. (choose the best option).", opts("enabled", "enable", "enabling", "enables"), 0, "過去使可能 enabled。"),
        ("The chapter ___ the historical context. (choose the best option).", opts("sketches", "sketch", "sketching", "sketched"), 3, "過去概述 sketched。"),
        ("The index ___ several omissions. (choose the best option).", opts("contains", "contain", "containing", "contained"), 3, "過去包含 contained。"),
        ("The keynote ___ the conference theme. (choose the best option).", opts("addressed", "address", "addressing", "addresses"), 0, "過去呼應 addressed。"),
        ("The panel ___ for three hours. (choose the best option).", opts("lasted", "last", "lasting", "lasts"), 0, "過去持續 lasted。"),
        ("The editor ___ the manuscript for clarity. (choose the best option).", opts("tightened", "tighten", "tightening", "tightens"), 0, "過去修訂 tightened。"),
        ("The grant proposal was ___. (choose the best option).", opts("rejected", "reject", "rejecting", "rejects"), 0, "被動過去分詞 rejected。"),
        ("The university ___ new admissions criteria. (choose the best option).", opts("adopted", "adopt", "adopting", "adopts"), 0, "過去採納 adopted。"),
        ("The lecture hall was ___ full. (choose the best option).", opts("nearly", "near", "nearest", "nearer"), 0, "修飾形容詞 full 用副詞 nearly。"),
        ("The article ___ a literature review. (choose the best option).", opts("includes", "include", "including", "included"), 3, "過去包含 included。"),
        ("The seminar ___ graduate students only. (choose the best option).", opts("targeted", "target", "targeting", "targets"), 0, "過去以…為對象 targeted。"),
        ("The findings need to be ___ in a larger sample. (choose the best option).", opts("replicated", "replicate", "replicating", "replicates"), 0, "研究須在更大樣本中「重複驗證」。"),
        ("The paper ___ ethical approval before data collection. (choose the best option).", opts("obtained", "obtain", "obtaining", "obtains"), 0, "過去取得倫理核准 obtained。"),
        ("The authors ___ any conflicts of interest. (choose the best option).", opts("disclosed", "disclose", "disclosing", "discloses"), 0, "過去揭露利益衝突 disclosed。"),
        ("The discussion section ___ the results to theory. (choose the best option).", opts("relates", "relate", "relating", "related"), 3, "過去將結果連結理論 related。"),
        ("Table 2 ___ descriptive statistics for each group. (choose the best option).", opts("summarizes", "summarize", "summarizing", "summarized"), 3, "過去式 summarized 表列出／總述。"),
        ("The limitation ___ the cross-sectional design. (choose the best option).", opts("concerns", "concern", "concerning", "concerned"), 0, "描述研究限制常用現在式 concerns，表示『此限制在於／涉及…』。"),
        ("Future research should ___ longitudinal methods. (choose the best option).", opts("employ", "employs", "employing", "employed"), 0, "情態動詞後接原形 employ。"),
        ("The coefficient was statistically ___ at p < .05. (choose the best option).", opts("significant", "significantly", "significance", "signify"), 0, "形容詞補語 significant 表示達顯著水準。"),
    ]
    assert len(c) == 75, len(c)
    for t in c:
        rows.append(row("college", t[0], t[1], t[2], t[3]))

    p: list[tuple] = [
        ("The term 'morpheme' refers to ___. (choose the best option).", opts("a minimal meaningful unit", "a speech sound", "a dialect variant", "a writing system"), 0, "語言學中 morpheme 為最小有意義單位。"),
        ("A phoneme is best described as ___. (choose the best option).", opts("a letter of the alphabet", "a contrastive sound category", "a syllable", "a stress pattern"), 1, "音位是具區別意義功能的音類別。"),
        ("In linguistics, 'syntax' concerns ___. (choose the best option).", opts("word meanings", "sentence structure", "sound patterns", "language history"), 1, "句法研究句子結構。"),
        ("Semantics primarily deals with ___. (choose the best option).", opts("pronunciation", "meaning", "spelling reform", "orthography"), 1, "語義學研究意義。"),
        ("Pragmatics focuses on ___. (choose the best option).", opts("sentence length", "language use in context", "phonetic transcription", "etymology"), 1, "語用學關注語境中的使用。"),
        ("An example of a polyseme is 'bank' meaning river edge and financial institution; this illustrates ___. (choose the best option).", opts("homophony", "polysemy", "synonymy", "antonymy"), 1, "同一詞形多義為 polysemy。"),
        ("If two words sound identical but differ in meaning and spelling, they are ___. (choose the best option).", opts("synonyms", "homophones", "hypernyms", "collocations"), 1, "同音異義為 homophones。"),
        ("The study of word origins is ___. (choose the best option).", opts("syntax", "phonology", "etymology", "morphology"), 2, "詞源研究為 etymology。"),
        ("In English, 'unhappiness' contains ___. (choose the best option).", opts("one morpheme", "two morphemes", "three morphemes", "four morphemes"), 2, "un + happy + ness 三個詞素。"),
        ("Which pair illustrates phonemic contrast (minimal pairs) (choose the best option)?", opts("pin vs spin /p/", "pit vs bit /p/-/b/", "cat vs cats /s/-/z/", "ship vs sheep"), 1, "pit / bit 僅差一個音位 /p/ 與 /b/，為最小對立組，顯示音位對立。"),
        ("A prescriptive rule tells speakers ___. (choose the best option).", opts("how language is actually used", "how they ought to use language", "how babies acquire language", "how dialects spread"), 1, "規範語法規定「應如何」使用。"),
        ("Descriptive linguistics aims to ___. (choose the best option).", opts("rank languages", "describe actual usage", "ban loanwords", "fix spelling"), 1, "描寫語言學描述實際用法。"),
        ("The sapir-whorf hypothesis concerns ___. (choose the best option).", opts("sound symbolism", "language and thought", "language families", "writing direction"), 1, "薩丕爾—沃夫假設探討語言與思維。"),
        ("Metonymy is exemplified by ___. (choose the best option).", opts("'kick the bucket'", "The crown announced...", "It's raining cats and dogs", "Time flies"), 1, "The crown 借代王室為 metonymy。"),
        ("A mixed metaphor is problematic because it ___. (choose the best option).", opts("uses passive voice", "combines clashing images", "is too short", "lacks a thesis"), 1, "混合隱喻意象衝突。"),
        ("Zeugma joins ___. (choose the best option).", opts("two unrelated metaphors", "one word with two objects in different senses", "two synonyms", "subject and object"), 1, "軛式搭配一詞配兩受詞不同義。"),
        ("Chiasmus involves ___. (choose the best option).", opts("rhyme", "reversed grammatical structure", "alliteration", "omission of vowels"), 1, "交錯配列為結構倒序對照。"),
        ("Asyndeton omits ___. (choose the best option).", opts("verbs", "subjects", "conjunctions", "articles"), 2, "連珠式省略連接詞。"),
        ("Polysyndeton repeats ___. (choose the best option).", opts("subjects", "conjunctions", "prepositions", "articles"), 1, "連綴式重複連接詞。"),
        ("Anaphora is ___. (choose the best option).", opts("end rhyme", "repetition at the start of successive clauses", "use of foreign words", "inversion only"), 1, "首語重複為句首重複。"),
        ("Catachresis refers to ___. (choose the best option).", opts("correct grammar", "strained or improper metaphor", "metrical feet", "IPA notation"), 1, "誤喻為不當或過度延伸隱喻。"),
        ("Synecdoche uses ___. (choose the best option).", opts("rhyme", "a part for the whole or vice versa", "homophones", "palindrome"), 1, "提喻以部分代整體或反之。"),
        ("Litotes expresses affirmation through ___. (choose the best option).", opts("hyperbole", "double negation or understatement", "simile", "allusion"), 1, "曲言法以否定或輕描淡寫表肯定。"),
        ("Pejorative connotation means the word feels ___. (choose the best option).", opts("neutral", "positive", "negative", "technical"), 2, "貶義為負面色彩。"),
        ("If an argument affirms the consequent, it is ___. (choose the best option).", opts("valid", "sound", "formally invalid", "inductive only"), 2, "肯定後件為形式謬誤。"),
        ("Denying the antecedent is ___. (choose the best option).", opts("always valid", "formally invalid", "the same as modus ponens", "a strong analogy"), 1, "否定前件為無效推論。"),
        ("A deductively valid argument can still be ___. (choose the best option).", opts("unsound if premises are false", "always sound", "inductive", "self-refuting always"), 0, "有效論證若前提假仍可 unsound。"),
        ("An ad hoc rescue revises a theory ___. (choose the best option).", opts("before testing", "only to protect it from falsification", "using statistics only", "through translation"), 1, "特設性防衛為免於被否證而補救。"),
        ("Straw man fallacy involves ___. (choose the best option).", opts("using analogies", "misrepresenting an opponent's view", "appealing to pity", "equivocation only"), 1, "稻草人謬誤扭曲對方論點。"),
        ("Equivocation shifts ___. (choose the best option).", opts("tenses", "the meaning of a key term", "font size", "sample size"), 1, "歧義謬誤偷換關鍵詞義。"),
        ("Post hoc ergo propter hoc mistakes ___. (choose the best option).", opts("correlation for authentication", "sequence for causation", "cause for correlation", "definition for example"), 1, "後此謬誤把先後當因果。"),
        ("Begging the question ___. (choose the best option).", opts("asks politely", "assumes the conclusion in premises", "uses only empirical data", "avoids pronouns"), 1, "循環論證把結論藏於前提。"),
        ("The word 'otiose' most nearly means ___. (choose the best option).", opts("meticulous", "superfluous", "rapid", "fragrant"), 1, "otiose 意為多餘、無用。"),
        ("The word 'perspicacious' suggests ___. (choose the best option).", opts("sloppy thinking", "keen insight", "physical strength", "anger"), 1, "perspicacious 表示敏銳洞察。"),
        ("The word 'recalcitrant' fits ___. (choose the best option).", opts("a willing volunteer", "a stubborn resistor", "a transparent liquid", "a cheap fabric"), 1, "recalcitrant 形容頑抗不服。"),
        ("The word 'sycophant' denotes ___. (choose the best option).", opts("a wise teacher", "a servile flatterer", "a neutral judge", "a brave pioneer"), 1, "sycophant 為阿諛奉承者。"),
        ("The word 'laconic' describes speech that is ___. (choose the best option).", opts("lengthy", "brief", "loud", "archaic"), 1, "laconic 表示簡潔寡言。"),
        ("The idiom 'to pull someone's leg' means ___. (choose the best option).", opts("to help them walk", "to tease or joke", "to betray them", "to lend money"), 1, "英式幽默表示開玩笑、捉弄。"),
        ("The idiom 'bury the hatchet' means ___. (choose the best option).", opts("hide tools", "make peace", "start a fight", "plant trees"), 1, "言歸於好、止息爭端。"),
        ("The idiom 'let sleeping dogs lie' advises ___. (choose the best option).", opts("wake pets", "avoid stirring up trouble", "train animals", "sleep more"), 1, "勿挑起不必要的麻煩。"),
        ("The idiom 'the ball is in your court' means ___. (choose the best option).", opts("play tennis", "it's your turn to act", "you lost", "the game ended"), 1, "輪到你採取行動。"),
        ("The idiom 'cut corners' suggests ___. (choose the best option).", opts("meticulous work", "doing something hastily or improperly", "taking a shortcut road only", "building squares"), 1, "偷工減料、走捷徑敷衍。"),
        ("An oxymoron pairs ___. (choose the best option).", opts("synonyms", "contradictory terms", "foreign words", "rhyming words"), 1, "矛盾修辭並置相反概念。"),
        ("Epistemic modality expresses ___. (choose the best option).", opts("obligation about the past", "speaker's degree of commitment to truth", "physical ability only", "future tense only"), 1, "認識情態表說話者對命題真假的確信度。"),
        ("Deictic expressions depend on ___. (choose the best option).", opts("Latin roots", "utterance context", "metrical stress", "silent letters"), 1, "指示詞依賴語境座標。"),
        ("A minimal pair in phonology demonstrates ___. (choose the best option).", opts("free variation", "phonemic contrast", "allophony only", "tone sandhi"), 1, "最小對立組顯示音位對立。"),
        ("Complementary distribution typically indicates ___. (choose the best option).", opts("phonemes", "allophones of one phoneme", "minimal pairs", "word stress"), 1, "互補分布多為同一音位之變體。"),
        ("The passive voice is sometimes preferred in scientific writing to ___. (choose the best option).", opts("increase wordiness", "foreground the process or result", "avoid verbs", "hide subject always"), 1, "被動可突出過程或結果。"),
        ("The rhetorical question primarily functions to ___. (choose the best option).", opts("request information only", "prompt reflection rather than an answer", "change tense", "translate literally"), 1, "反問用於引發思考而非真問。"),
        ("Pathos appeals to ___. (choose the best option).", opts("logic", "credibility", "emotion", "grammar"), 2, "悲情訴諸情感 pathos。"),
        ("Logos appeals to ___. (choose the best option).", opts("emotion", "character", "reasoning and evidence", "rhythm"), 2, "理性訴諸論證 logos。"),
        ("Ethos appeals to ___. (choose the best option).", opts("statistics only", "speaker credibility", "musicality", "imagery only"), 1, "人格訴諸可信度 ethos。"),
        ("Ambiguity of scope may confuse whether ___. (choose the best option).", opts("a verb is transitive", "negation applies to one clause or another", "nouns are plural", "letters are silent"), 1, "範域歧義影響否定範圍。"),
        ("Vagueness differs from ambiguity because vagueness ___. (choose the best option).", opts("has two precise senses", "involves borderline cases", "is always grammatical", "requires synonyms"), 1, "模糊涉及界線案例而非雙義。"),
        ("Performative utterances ___. (choose the best option).", opts("cannot be spoken", "do something by being said", "only describe weather", "lack verbs"), 1, "施為句以說出即完成行為。"),
        ("Implicature (Gricean) relies on ___. (choose the best option).", opts("literal grammar only", "conversational cooperation and context", "spelling rules", "IPA charts"), 1, "含意依合作原則與語境推導。"),
        ("A malapropism is ___. (choose the best option).", opts("a deliberate pun", "an amusing word substitution error", "a silent letter", "a dialect map"), 1, "誤用近似音詞造成滑稽效果。"),
        ("Proprioceptive imagery appeals to ___. (choose the best option).", opts("sight", "internal bodily sensation", "hearing", "taste only"), 1, "本體感覺意象描寫身體內部感覺。"),
        ("Synesthesia in literature ___. (choose the best option).", opts("avoids metaphor", "crosses sensory domains", "uses only facts", "removes adjectives"), 1, "通感跨感官域。"),
        ("The hedging phrase 'I might be wrong, but...' serves to ___. (choose the best option).", opts("assert certainty", "soften the claim", "change topic", "quote sources"), 1, "模糊限制語弱化斷言。"),
        ("Parallelism in prose primarily enhances ___. (choose the best option).", opts("confusion", "rhythm and clarity", "spelling", "font choice"), 1, "排比增節奏與清晰度。"),
        ("Antimetabole repeats words in ___. (choose the best option).", opts("random order", "reverse order", "alphabetical order", "silent letters"), 1, "逆序重複為 antimetabole。"),
        ("The pathetic fallacy attributes human emotion to ___. (choose the best option).", opts("numbers", "nature or objects", "verbs only", "footnotes"), 1, "感情誤置賦予自然或物情感。"),
        ("An enthymeme in rhetoric is ___. (choose the best option).", opts("a long poem", "a syllogism with an unstated premise", "a type of irony", "a grammar rule"), 1, "省略三段論省略前提。"),
        ("The distinction between 'fewer' and 'less' is prescriptively about ___. (choose the best option).", opts("formality", "count vs mass nouns", "British vs American", "past vs present"), 1, "規範上 fewer 配可數、less 配不可數。"),
        ("In philosophy of language, 'extension' of a term is ___. (choose the best option).", opts("its intension", "the set of things it denotes", "its etymology", "its pronunciation"), 1, "外延為詞所指對象集合。"),
        ("The intension of a word includes ___. (choose the best option).", opts("only pronunciation", "associative or definitional properties", "only spelling", "rhyme scheme"), 1, "內涵為定義性質與屬性。"),
        ("If P implies Q, then 'not Q' implies ___. (choose the best option).", opts("P", "not P", "Q", "P and Q"), 1, "拒取式：非 Q 則非 P（假設原為 P→Q）。"),
        ("A contingent truth is one that ___. (choose the best option).", opts("must be true in all worlds", "could have been otherwise", "is self-contradictory", "only concerns math"), 1, "偶然真理可以不是如此。"),
        ("Analytic statements are often characterized as ___. (choose the best option).", opts("empirical", "true by virtue of meaning", "always false", "poetic"), 1, "分析句依意義為真。"),
        ("Synthetic statements ___. (choose the best option).", opts("are true by definition only", "combine concepts not contained in the subject", "cannot be false", "lack predicates"), 1, "綜合句把主詞所無之概念連結起來。"),
        ("The fallacy of composition assumes ___. (choose the best option).", opts("parts equal whole properties", "what is true of parts is true of the whole", "correlation implies causation", "experts are wrong"), 1, "合成謬誤以部分性質推整體。"),
        ("The fallacy of division assumes ___. (choose the best option).", opts("the whole's property belongs to every part", "correlation is causation", "samples are random", "definitions shift"), 0, "分割謬誤以整體屬性推每一部分。"),
        ("A virtue of a clear operational definition is that it ___. (choose the best option).", opts("avoids all measurement", "makes variables observable and testable", "removes ethics", "eliminates theory"), 1, "操作型定義使變項可觀測檢驗。"),
        ("In academic hedging, the verb suggests is weaker than ___. (choose the best option).", opts("might", "proves", "could", "may"), 1, "suggests 比 proves 語氣弱。"),
    ]
    assert len(p) == 75, len(p)
    for t in p:
        rows.append(row("professor", t[0], t[1], t[2], t[3]))

    print("-- 300 rows · batch3 — regenerate: python3 supabase/generate_questions_300_batch3.py > supabase/questions_seed_300_batch3.sql")
    print("")
    print(
        "INSERT INTO questions (difficulty, question_text, options, "
        "correct_answer_old, correct_index, explanation) VALUES",
    )
    print(",\n".join(rows) + ";")


if __name__ == "__main__":
    main()
