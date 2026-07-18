# -*- coding: utf-8 -*-
"""
Судейский движок «Мисс Разделённый мир — 2061».

Детерминированно: одинаковый вход -> одинаковые баллы. Никакой случайности из
времени. Победитель НЕ выбирается заранее — он вытекает из арифметики.

Модель:
  * У каждой участницы 11 базовых конкурсных атрибутов (0–10) из profiles.py.
  * Каждый раунд оценивает подмножество атрибутов со своими весами.
  * 7 судей, у каждого своя область компетенции (веса атрибутов) и небольшие,
    честные предпочтения (без учёта морали, славы, политического статуса,
    боевой силы). Оценивают только свою область.
  * Балл судьи = взвешенное среднее релевантных атрибутов
                 + компетентностный акцент судьи
                 + маленький детерминированный «характерный» разброс (±0.35)
                 + узкий бонус/штраф за соответствие раунду (пластика/речь и т.п.)
    -> клиппинг в [1..10], полная точность внутри, округление только при показе.
  * Средний балл раунда = среднее 7 судей.
  * Предварительный тотал = взвешенная сумма раундов (веса из ТЗ).
"""
import hashlib

def _rng(*parts):
    """Детерминированный дробный шум в [-1,1] из строкового ключа."""
    h = hashlib.sha256("|".join(str(p) for p in parts).encode()).hexdigest()
    v = int(h[:8], 16) / 0xFFFFFFFF      # 0..1
    return v * 2 - 1

def clamp(x, lo=1.0, hi=10.0):
    return max(lo, min(hi, x))

# ── АТРИБУТЫ (индексы совпадают с profiles.ATTR) ────────────────────────────
IDX = {k:i for i,k in enumerate(
    ["beauty","individ","physique","charisma","intellect",
     "rhetoric","style","command","coherence","memorable","presence","sex"])}

# ── РАУНДЫ: какие атрибуты и с каким весом оценивает раунд ───────────────────
# сумма весов внутри раунда нормируется автоматически
ROUNDS = {
    # Это в первую очередь конкурс КРАСОТЫ: визуальные раунды весят больше,
    # а сексуальность/красота/форма — ключевые критерии выходов.
    "presentation": {  # представление / выход открытия
        "title":"Представление","weight":0.15,"phase":"prelim",
        "attrs":{"beauty":3,"sex":2,"physique":2,"style":2,"command":1,"memorable":1},
    },
    "interview": {     # закрытое интервью
        "title":"Закрытое интервью","weight":0.10,"phase":"prelim",
        "attrs":{"intellect":3,"rhetoric":3,"charisma":2,"coherence":1,"individ":1},
    },
    "swimwear": {      # выход в купальнике — красота тела и чувственность
        "title":"Выход в купальнике","weight":0.30,"phase":"prelim",
        "attrs":{"sex":4,"physique":3,"beauty":3,"command":1,"individ":1},
    },
    "gown": {          # вечернее платье
        "title":"Вечернее платье","weight":0.25,"phase":"prelim",
        "attrs":{"beauty":3,"style":3,"sex":2,"coherence":1,"command":1,"memorable":1},
    },
    "costume": {       # фракционный костюм
        "title":"Фракционный костюм","weight":0.20,"phase":"prelim",
        "attrs":{"individ":3,"coherence":2,"memorable":2,"style":2,"presence":1,"beauty":1},
    },
    # финальные раунды (собственные системы, не входят в prelim).
    # Красота/сексуальность/присутствие вплетены и сюда: это конкурс красоты,
    # и внешность участницы — часть впечатления от любого её выхода.
    "manifesto": {     # топ-20 «Манифест»
        "title":"Манифест","phase":"top20",
        "attrs":{"rhetoric":3,"command":2,"presence":2,"beauty":2,"sex":1,"memorable":1},
    },
    "stage_question": {# топ-10 персональный вопрос
        "title":"Персональный вопрос","phase":"top10",
        "attrs":{"intellect":2,"rhetoric":2,"coherence":2,"beauty":2,"charisma":1,"individ":1},
    },
    "talent": {        # топ-10 конкурс талантов — кто во что горазд
        "title":"Конкурс талантов","phase":"top10",
        "attrs":{"individ":3,"physique":2,"presence":2,"memorable":2,"sex":1,"style":1,"command":1},
    },
    "photo": {         # топ-5 фотосессия — чистый визуал и чувственность
        "title":"Фотосессия","phase":"top5",
        "attrs":{"beauty":4,"sex":3,"style":2,"memorable":2,"physique":1},
    },
    "final_look": {    # топ-5 финальный образ
        "title":"Финальный образ","phase":"top5",
        "attrs":{"beauty":3,"sex":3,"style":2,"memorable":2,"command":1},
    },
    "final_question": {# топ-5 общий вопрос
        "title":"Общий вопрос","phase":"top5",
        "attrs":{"rhetoric":3,"coherence":2,"charisma":2,"beauty":2,"sex":1,"individ":1},
    },
    "last_word": {     # топ-3 последнее слово
        "title":"Последнее слово","phase":"top3",
        "attrs":{"command":2,"memorable":2,"rhetoric":2,"presence":2,"beauty":2,"sex":1},
    },
}
PRELIM = ["presentation","interview","swimwear","gown","costume"]

# ── ЖЮРИ: 7 независимых ролей, веса по областям компетенции ─────────────────
# accent — атрибуты, которые судья «видит» особенно остро (в своей зоне).
JURY = [
 {"id":"j_couture","name":"Огюстен Вейл","role":"Эксперт по высокой моде",
  "origin":"Единая Америка, дом мод «Veil Atelier»",
  "bio":"Последний живой кутюрье довоенной школы, одевавший три поколения элит. "
        "Видит крой там, где другие видят блеск.",
  "focus":"Силуэт, ткань, цельность костюма, вкус.",
  "bias":"Ценит архитектуру образа и наказывает пошлость; равнодушен к спецэффектам.",
  "accent":{"style":1.55,"beauty":1.3,"coherence":1.2,"sex":1.2},
  "reads":["style","beauty","coherence","individ","sex"]},

 {"id":"j_director","name":"Ким До-Хён","role":"Режиссёр телевизионных шоу",
  "origin":"Единая Медиасеть",
  "bio":"Постановщик крупнейших прямых эфиров континента. Мыслит кадром, светом и монтажом.",
  "focus":"Присутствие в кадре, память зрителя, движение, драматургия выхода.",
  "bias":"Награждает то, что нельзя выключить; холоден к красивой пустоте.",
  "accent":{"command":1.4,"memorable":1.35,"physique":1.25,"presence":1.15,"beauty":1.25,"sex":1.3},
  "reads":["command","memorable","physique","presence","beauty","sex"]},

 {"id":"j_press","name":"Далия Морэ","role":"Журналист-интервьюер",
  "origin":"Независимая пресса Белой зоны",
  "bio":"Единственный репортёр, бравший интервью по обе стороны Рубежа и выживший. "
        "Слышит ложь по паузе.",
  "focus":"Смысл ответа, честность, индивидуальность, противоречия.",
  "bias":"Ловит манипуляцию и клише; уважает опасную искренность.",
  "accent":{"rhetoric":1.4,"intellect":1.35,"individ":1.3},
  "reads":["rhetoric","intellect","individ","coherence"]},

 {"id":"j_orator","name":"Профессор Ленц","role":"Специалист по публичной речи",
  "origin":"Аркадия, кафедра риторики",
  "bio":"Автор канона публичного слова новой эпохи. Разбирает речь на дыхание и ритм.",
  "focus":"Владение словом и залом, структура высказывания.",
  "bias":"Форма важна не меньше содержания; пустой пафос карается.",
  "accent":{"rhetoric":1.55,"command":1.3,"coherence":1.2},
  "reads":["rhetoric","command","coherence"]},

 {"id":"j_culture","name":"Сестра Иоланда","role":"Культурный исследователь фракций",
  "origin":"Тенебрион, Капитул Причащения (в отставке)",
  "bio":"Этнограф расколотого мира; собрала атлас символов всех держав и территорий.",
  "focus":"Подлинность фракционного образа, соответствие себе, узнаваемость знака.",
  "bias":"Ценит верность корням и сути; не путает мораль с качеством образа.",
  "accent":{"coherence":1.5,"individ":1.35,"presence":1.2,"memorable":1.1},
  "reads":["coherence","individ","presence","memorable"]},

 {"id":"j_movement","name":"Тьяго Реаль","role":"Эксперт по пластике и сценическому движению",
  "origin":"Экваториальная сеть, школа сценического тела",
  "bio":"Хореограф и постановщик проходов; читает тело как текст.",
  "focus":"Пластика, походка, владение телом, дисциплина движения.",
  "bias":"Награждает контроль и характер движения; равнодушен к статусу.",
  "accent":{"physique":1.5,"command":1.2,"style":1.15,"sex":1.35,"beauty":1.15},
  "reads":["physique","command","style","presence","sex","beauty"]},

 {"id":"j_chair","name":"Арбитр Хейл","role":"Председатель жюри, нейтральный аналитик",
  "origin":"Нейтральная территория, бывш. арбитражный корпус",
  "bio":"Председатель без права голоса за конкретный образ — сводит оценки, следит "
        "за честностью и разрешает равенства.",
  "focus":"Баланс всех критериев, цельность впечатления.",
  "bias":"Усредняет и уравновешивает; выносит письменное решение при ничьей.",
  "accent":{},  # нейтральный: ровное среднее по всем reads
  "reads":["beauty","individ","physique","charisma","intellect",
           "rhetoric","style","command","coherence","memorable","presence","sex"]},
]

def round_base(attrs, round_key):
    """Взвешенное среднее релевантных атрибутов раунда (0–10)."""
    spec = ROUNDS[round_key]["attrs"]
    tot = sum(spec.values())
    return sum(attrs[IDX[a]]*w for a,w in spec.items())/tot

def judge_score(slug, attrs, round_key, judge):
    """Балл одного судьи за раунд (полная точность)."""
    spec = ROUNDS[round_key]["attrs"]
    reads = set(judge["reads"])
    acc = judge["accent"]
    num = den = 0.0
    for a,w in spec.items():
        if a not in reads:           # судья не оценивает вне своей компетенции
            continue
        mult = acc.get(a,1.0)
        num += attrs[IDX[a]]*w*mult
        den += w*mult
    if den == 0:                     # раунд вне зоны судьи -> ровно по базе раунда
        base = round_base(attrs, round_key)
    else:
        base = num/den
    # характерный детерминированный разброс судьи (маленький, ±0.35)
    jitter = _rng(judge["id"], slug, round_key) * 0.35
    return round(clamp(base + jitter), 4)

def score_round(contestants, round_key):
    """{slug: {'judges':{jid:score}, 'avg':x}} для раунда."""
    out = {}
    for slug, attrs in contestants.items():
        js = {j["id"]: judge_score(slug, attrs, round_key, j) for j in JURY}
        avg = round(sum(js.values())/len(js), 4)
        out[slug] = {"judges": js, "avg": avg}
    return out

def prelim_total(round_avgs):
    """Взвешенная сумма предварительных раундов (веса из ТЗ)."""
    return round(sum(round_avgs[r]*ROUNDS[r]["weight"] for r in PRELIM), 4)

# ── ТАЙБРЕЙК (из ТЗ §39) ────────────────────────────────────────────────────
# 1) выше балл интервью; 2) выше балл фракционного костюма;
# 3) выше балл последнего актуального раунда; 4) решение председателя.
def tiebreak_key(slug, round_avgs, last_round):
    return (
        round_avgs["interview"],
        round_avgs["costume"],
        round_avgs.get(last_round, 0),
        # председательский детерминированный микроразрыв — воспроизводимый и
        # задокументированный (не влияет, если предыдущие ключи различаются)
        _rng("chair_resolve", slug),
    )
