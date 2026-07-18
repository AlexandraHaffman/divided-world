# -*- coding: utf-8 -*-
"""
Полная симуляция конкурса + эмиссия данных.
Запуск:  python3 build/generate.py
Выход:   miss-divided-world-2061/data/*.json  и  data/data.js (window.DW)
"""
import json, glob, os, sys, hashlib
sys.path.insert(0, os.path.dirname(__file__))
from profiles import PROFILES, ATTR, FACTIONS, MEASURE
from world import CONTEST, STAGES, AGG
import engine as E

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHARDIR = os.path.join(ROOT, "data", "characters")
PORTRAITS = json.load(open(os.path.join(ROOT, "data", "portraits.json")))
OUT = os.path.join(ROOT, "miss-divided-world-2061", "data")

def _rng(*p):
    h = hashlib.sha256("|".join(str(x) for x in p).encode()).hexdigest()
    return int(h[:8],16)/0xFFFFFFFF

def img_rel(url):
    """github.io URL -> путь относительно корня репозитория (data/images/...)."""
    if not url: return None
    fn = os.path.basename(url)
    return "data/images/characters/" + fn

# ── 1. Загрузка канона + сборка участниц ────────────────────────────────────
def load_contestants():
    rows = {}
    for f in sorted(glob.glob(os.path.join(CHARDIR, "*.json"))):
        d = json.load(open(f))
        if d.get("gender") != "Женский":
            continue
        slug = os.path.basename(f)[:-5]
        p = PROFILES[slug]
        fac = d.get("faction","—")
        fmeta = FACTIONS.get(fac, {"id":"independent","color":"#c0c8d4"})
        # изображения
        ref = img_rel(d.get("avatar_web"))
        cin = img_rel(d.get("avatar_web_full"))
        sys11 = None
        if slug in PORTRAITS:
            sys11 = img_rel(PORTRAITS[slug])
        # ожидаемый путь системного портрета 1:1 (даже если файла ещё нет)
        expect11 = "data/images/characters/%s-portrait-web.jpg" % _translit(slug)
        rows[slug] = {
            "slug": slug,
            "name": d["name"],
            "faction": fac,
            "faction_id": fmeta["id"],
            "faction_color": d.get("faction_color") or fmeta["color"],
            "subfaction": d.get("subfaction") or "",
            "role": d.get("role") or "",
            "birthdate": d.get("birthdate",""),
            "status": d.get("status",""),
            "tier": d.get("tier",""),
            "threat_level": d.get("threat_level",0),
            "aliases": d.get("aliases",[]),
            "abilities": d.get("abilities",[]),
            "stats": d.get("stats",{}),
            "card_quote": d.get("card_quote",""),
            "card_bio": d.get("card_bio",""),
            "biography": d.get("biography",""),
            "current_status": d.get("current_status",""),
            # конкурсная надстройка
            "arch": p["arch"], "look": p["look"], "motive": p["motive"],
            "strategy": p["strategy"], "temper": p["temper"], "speech": p["speech"],
            "sensual": p["sensual"], "strengths": p["strengths"],
            "weaknesses": p["weaknesses"], "scandal": p["scandal"],
            "attrs": p["attrs"],
            "img": {
                "reference": ref,
                "cinematic": cin,
                "system_1x1": sys11,               # None -> заглушка
                "system_1x1_expected": expect11,   # ожидаемый путь на будущее
            },
        }
    return rows

# грубая транслитерация slug -> латиница для ожидаемого имени файла 1:1
_TR = {
 'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh','з':'z','и':'i',
 'й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t',
 'у':'u','ф':'f','х':'kh','ц':'ts','ч':'ch','ш':'sh','щ':'shch','ъ':'','ы':'y',
 'ь':'','э':'e','ю':'yu','я':'ya','-':'-'}
def _translit(s):
    return "".join(_TR.get(c,c) for c in s)

# ── 2. Симуляция ────────────────────────────────────────────────────────────
def run():
    C = load_contestants()
    attrs = {s: C[s]["attrs"] for s in C}
    scores = {}   # round_key -> score_round output
    round_avg = {}  # slug -> {round: avg}
    for s in C: round_avg[s] = {}

    def do_round(rk, pool):
        sub = {s: attrs[s] for s in pool}
        res = E.score_round(sub, rk)
        scores[rk] = res
        for s in pool:
            round_avg[s][rk] = res[s]["avg"]
        return res

    allslugs = list(C.keys())

    # PRELIM (все 35)
    for rk in E.PRELIM:
        do_round(rk, allslugs)
    prelim = {s: E.prelim_total(round_avg[s]) for s in allslugs}

    # 35 -> 20
    order35 = sorted(allslugs, key=lambda s: (prelim[s],)+E.tiebreak_key(s,round_avg[s],"costume"), reverse=True)
    top20 = order35[:20]
    out20 = order35[20:]   # 21..35 (в порядке убывания)

    # МАНИФЕСТ (топ-20)
    do_round("manifesto", top20)
    semifinal = {s: round(AGG["semifinal"]["prelim"]*prelim[s]
                          + AGG["semifinal"]["manifesto"]*round_avg[s]["manifesto"],4)
                 for s in top20}
    order20 = sorted(top20, key=lambda s:(semifinal[s], round_avg[s]["manifesto"],
                     round_avg[s]["interview"], _rng("t20",s)), reverse=True)
    top10 = order20[:10]
    out10 = order20[10:]  # 11..20

    # ПЕРСОНАЛЬНЫЙ ВОПРОС (топ-10)
    do_round("stage_question", top10)
    t10tot = {s: round(AGG["top10"]["semifinal"]*semifinal[s]
                       + AGG["top10"]["stage_question"]*round_avg[s]["stage_question"],4)
              for s in top10}
    order10 = sorted(top10, key=lambda s:(t10tot[s], round_avg[s]["stage_question"],
                     round_avg[s]["costume"], _rng("t10",s)), reverse=True)
    top5 = order10[:5]
    out5 = order10[5:]  # 6..10

    # ФИНАЛЬНЫЙ ОБРАЗ + ОБЩИЙ ВОПРОС (топ-5)
    do_round("final_look", top5)
    do_round("final_question", top5)
    finalstage = {s: round(AGG["top5_final"]["final_look"]*round_avg[s]["final_look"]
                           + AGG["top5_final"]["final_question"]*round_avg[s]["final_question"],4)
                  for s in top5}
    order5 = sorted(top5, key=lambda s:(finalstage[s], round_avg[s]["final_look"],
                    round_avg[s]["final_question"], _rng("t5",s)), reverse=True)
    top3 = order5[:3]
    out3 = order5[3:]  # 4..5

    # ПОСЛЕДНЕЕ СЛОВО (топ-3) + КОРОНА
    do_round("last_word", top3)
    crown = {s: round(AGG["crown"]["final_look"]*round_avg[s]["final_look"]
                      + AGG["crown"]["final_question"]*round_avg[s]["final_question"]
                      + AGG["crown"]["last_word"]*round_avg[s]["last_word"],4)
             for s in top3}
    order3 = sorted(top3, key=lambda s:(crown[s], round_avg[s]["last_word"],
                    round_avg[s]["final_question"], round_avg[s]["interview"], _rng("t3",s)),
                    reverse=True)
    winner, runnerup, third = order3

    # ── ИТОГОВЫЙ РЕЙТИНГ 1..35 ──
    placement = {}
    placement[winner]=1; placement[runnerup]=2; placement[third]=3
    for i,s in enumerate(out3):      placement[s]=4+i         # 4..5
    for i,s in enumerate(out5):      placement[s]=6+i         # 6..10
    for i,s in enumerate(out10):     placement[s]=11+i        # 11..20
    for i,s in enumerate(out20):     placement[s]=21+i        # 21..35

    # агрегатные тоталы для отображения на каждой позиции
    agg_total = {}
    for s in allslugs:
        if s in crown: agg_total[s]=crown[s]
        elif s in finalstage: agg_total[s]=finalstage[s]
        elif s in t10tot: agg_total[s]=t10tot[s]
        elif s in semifinal: agg_total[s]=semifinal[s]
        else: agg_total[s]=prelim[s]

    # ── ЛУЧШИЙ / ХУДШИЙ раунд каждой + движение места ──
    def best_worst(s):
        rs = {r:round_avg[s][r] for r in E.PRELIM if r in round_avg[s]}
        best=max(rs,key=rs.get); worst=min(rs,key=rs.get)
        return best, worst
    prelim_rank = {s:i+1 for i,s in enumerate(order35)}

    result = dict(
        contestants=C, attrs=attrs, scores=scores, round_avg=round_avg,
        prelim=prelim, semifinal=semifinal, t10tot=t10tot, finalstage=finalstage,
        crown=crown, placement=placement, agg_total=agg_total,
        top20=top20, top10=top10, top5=top5, top3=top3,
        out20=out20, out10=out10, out5=out5, out3=out3,
        order35=order35, order20=order20, order10=order10, order5=order5, order3=order3,
        winner=winner, runnerup=runnerup, third=third,
        prelim_rank=prelim_rank, best_worst={s:best_worst(s) for s in allslugs},
    )
    return result

# ── 3. Специальные награды ──────────────────────────────────────────────────
def awards(R, cap=2):
    """Специальные награды. Честный расчёт метрик; распределяются с ограничением
    не более `cap` титулов на участницу (спотлайт спред) — при переборе титул
    уходит следующей по той же метрике. §29: награда не обязана совпадать с местом."""
    C=R["contestants"]; ra=R["round_avg"]; at=R["attrs"]
    I=E.IDX
    def av(rk): return {s:ra[s][rk] for s in ra if rk in ra[s]}
    def attr(s,k): return at[s][I[k]]
    canon_unpred = {s:C[s]["stats"].get("unpredictability",0)+_rng("unx",s)*0.5 for s in C}
    climb = {s: R["prelim_rank"][s]-R["placement"][s] + _rng("clm",s)*0.1 for s in C}
    common = {s:-R["placement"][s] for s in C if C[s]["tier"]=="common"}
    aud   = {s: 0.4*attr(s,"beauty")+0.3*attr(s,"charisma")+0.2*attr(s,"presence")+0.1*attr(s,"memorable")+_rng("aud",s)*0.3 for s in C}
    press = {s: 0.35*attr(s,"individ")+0.25*attr(s,"intellect")+0.25*attr(s,"rhetoric")+0.15*attr(s,"presence")+_rng("prs",s)*0.3 for s in C}
    photo = {s: 0.5*attr(s,"beauty")+0.3*attr(s,"style")+0.2*attr(s,"memorable")+_rng("pht",s)*0.3 for s in C}
    move  = {s: attr(s,"physique")+_rng("mov",s)*0.3 for s in C}
    strong= {s: attr(s,"command")+attr(s,"presence")+_rng("str",s)*0.3 for s in C}
    danger= {s: attr(s,"presence")+0.5*attr(s,"individ")+0.5*C[s]["stats"].get("cruelty",0)+_rng("dng",s)*0.3 for s in C}
    indiv = {s: attr(s,"individ")+_rng("ind",s)*0.3 for s in C}
    # Мисс Дружелюбие — тёплые, добрые, не жестокие (выбор самих участниц)
    congen = {s: attr(s,"charisma")*0.5 + (10-C[s]["stats"].get("cruelty",5))*0.45
                 + attr(s,"coherence")*0.05 + _rng("cong",s)*0.3 for s in C}
    # (id, заголовок, метрика, пул)
    specs = [
      ("best_interview","Лучшее интервью", av("interview"), None),
      ("best_swimwear","Лучший выход в купальнике", av("swimwear"), None),
      ("best_gown","Лучшее вечернее платье", av("gown"), None),
      ("best_costume","Лучший фракционный костюм", av("costume"), None),
      ("best_manifesto","Лучший манифест", av("manifesto"), None),
      ("best_final_speech","Лучшая финальная речь", av("last_word"), None),
      ("most_photogenic","Самая фотогеничная участница", photo, None),
      ("audience_choice","Выбор публики", aud, None),
      ("press_choice","Выбор прессы", press, None),
      ("best_movement","Лучшая пластика", move, None),
      ("strongest_stage","Самый сильный сценический образ", strong, None),
      ("most_dangerous","Самый опасный сценический образ", danger, None),
      ("most_unexpected","Самое неожиданное выступление", canon_unpred, None),
      ("absolute_individuality","Абсолютная индивидуальность", indiv, None),
      ("breakthrough","Главный прорыв конкурса", climb, None),
      ("best_debut","Лучший дебют", common, None),
      ("miss_congeniality","Мисс Дружелюбие (выбор участниц)", congen, None),
    ]
    held = {}
    res = []
    for aid,title,metric,_pool in specs:
        ranked = sorted(metric, key=metric.get, reverse=True)
        pick = next((s for s in ranked if held.get(s,0) < cap), ranked[0])
        held[pick] = held.get(pick,0)+1
        res.append({"id":aid,"title":title,"slug":pick,"name":C[pick]["name"]})
    return res

R2 = {"presentation":1,"interview":2,"swimwear":3,"gown":4,"costume":5}

def emit():
    """Собрать все JSON-файлы данных + бандл data.js (window.DW)."""
    import world, engine
    try:
        import bible
        NARR = bible.NARR
    except Exception as e:
        NARR = {}
        print("WARN: bible не загружен:", e)
    R = run()
    C = R["contestants"]
    aw = awards(R)
    placement = R["placement"]
    inv = {v:k for k,v in placement.items()}

    # --- этап выбытия каждой участницы + метрика места ---
    def elim_stage(s):
        p=placement[s]
        if p<=3: return ("crown", R["crown"].get(s))
        if p<=5: return ("top-3","finalstage",)  # placeholder replaced below
        return None
    band = {}
    for s in C:
        p=placement[s]
        if p==1: band[s]=("Победительница","crown",R["crown"][s])
        elif p==2: band[s]=("1-я вице-мисс","crown",R["crown"][s])
        elif p==3: band[s]=("2-я вице-мисс","crown",R["crown"][s])
        elif p<=5: band[s]=("Выбыла 5→3 (Топ-5)","finalstage",R["finalstage"][s])
        elif p<=10: band[s]=("Выбыла 10→5 (Топ-10)","top10",R["t10tot"][s])
        elif p<=20: band[s]=("Выбыла 20→10 (Топ-20)","semifinal",R["semifinal"][s])
        else: band[s]=("Выбыла 35→20","prelim",R["prelim"][s])

    # --- contestants.json ---
    contestants = []
    for s in sorted(C, key=lambda x: placement[x]):
        c = C[s]
        b = band[s]
        contestants.append({
            "slug": s, "name": c["name"], "faction": c["faction"],
            "faction_id": c["faction_id"], "faction_color": c["faction_color"],
            "subfaction": c["subfaction"], "role": c["role"],
            "birthdate": c["birthdate"], "status": c["status"], "tier": c["tier"],
            "threat_level": c["threat_level"], "aliases": c["aliases"],
            "abilities": c["abilities"], "stats": c["stats"],
            "card_quote": c["card_quote"], "card_bio": c["card_bio"],
            "biography": c["biography"], "current_status": c["current_status"],
            "arch": c["arch"], "look": c["look"], "motive": c["motive"],
            "strategy": c["strategy"], "temper": c["temper"], "speech": c["speech"],
            "sensual": c["sensual"], "strengths": c["strengths"],
            "weaknesses": c["weaknesses"], "scandal": c["scandal"],
            "attrs": dict(zip(ATTR, c["attrs"])),
            "measure": dict(zip(["height","bust","waist","hips","weight"], MEASURE[s])),
            "img": c["img"],
            "placement": placement[s],
            "prelim_rank": R["prelim_rank"][s],
            "elim_band": b[0], "elim_metric": b[1], "total": b[2],
            "round_avg": R["round_avg"][s],
            "best_round": R["best_worst"][s][0], "worst_round": R["best_worst"][s][1],
            "awards": [a["title"] for a in aw if a["slug"]==s],
        })

    # --- scores.json (per round -> per contestant -> per judge) ---
    scores = {}
    for rk, res in R["scores"].items():
        scores[rk] = {s: {"judges":res[s]["judges"], "avg":res[s]["avg"]} for s in res}

    # --- rankings.json (по этапам) ---
    rankings = {
        "prelim":   [{"slug":s,"name":C[s]["name"],"total":R["prelim"][s],"rank":i+1} for i,s in enumerate(R["order35"])],
        "semifinal":[{"slug":s,"name":C[s]["name"],"total":R["semifinal"][s],"rank":i+1} for i,s in enumerate(R["order20"])],
        "top10":    [{"slug":s,"name":C[s]["name"],"total":R["t10tot"][s],"rank":i+1} for i,s in enumerate(R["order10"])],
        "top5":     [{"slug":s,"name":C[s]["name"],"total":R["finalstage"][s],"rank":i+1} for i,s in enumerate(R["order5"])],
        "top3":     [{"slug":s,"name":C[s]["name"],"total":R["crown"][s],"rank":i+1} for i,s in enumerate(R["order3"])],
        "final":    [{"slug":inv[p],"name":C[inv[p]]["name"],"faction":C[inv[p]]["faction"],
                      "faction_id":C[inv[p]]["faction_id"],"faction_color":C[inv[p]]["faction_color"],
                      "place":p,"band":band[inv[p]][0],"total":band[inv[p]][2],
                      "best_round":R["best_worst"][inv[p]][0],"worst_round":R["best_worst"][inv[p]][1]}
                     for p in range(1,36)],
    }

    # --- results.json ---
    results = {
        "winner": {"slug":R["winner"],"name":C[R["winner"]]["name"]},
        "runnerup": {"slug":R["runnerup"],"name":C[R["runnerup"]]["name"]},
        "third": {"slug":R["third"],"name":C[R["third"]]["name"]},
        "cuts": {
            "35_to_20": {"advanced":[C[s]["name"] for s in R["order35"][:20]],
                         "eliminated":[C[s]["name"] for s in R["out20"]]},
            "20_to_10": {"advanced":[C[s]["name"] for s in R["order20"][:10]],
                         "eliminated":[C[s]["name"] for s in R["out10"]]},
            "10_to_5":  {"advanced":[C[s]["name"] for s in R["order10"][:5]],
                         "eliminated":[C[s]["name"] for s in R["out5"]]},
            "5_to_3":   {"advanced":[C[s]["name"] for s in R["order5"][:3]],
                         "eliminated":[C[s]["name"] for s in R["out3"]]},
        },
    }

    # --- performances.json (нарратив из bible, ключ = slug) ---
    performances = {}
    for s in C:
        performances[s] = NARR.get(s, {})

    # --- jury.json / rounds.json / contest.json / timeline.json / assets.json ---
    jury = engine.JURY
    rounds = {rk:{"title":v["title"],"weight":v.get("weight"),"phase":v["phase"],
                  "attrs":v["attrs"]} for rk,v in engine.ROUNDS.items()}
    contest = world.CONTEST
    timeline = [{"key":k,"title":t,"date":d,"remaining":n,"href":h} for k,t,d,n,h in world.STAGES]
    missing11 = [ {"slug":s,"name":C[s]["name"],"expected":C[s]["img"]["system_1x1_expected"]}
                  for s in C if not C[s]["img"]["system_1x1"] ]
    assets = {
        "reference_dir":"data/images/characters/",
        "total": len(C),
        "with_system_portrait": sum(1 for s in C if C[s]["img"]["system_1x1"]),
        "missing_system_portrait": missing11,
    }

    files = {
        "contest.json": contest,
        "contestants.json": contestants,
        "jury.json": jury,
        "rounds.json": rounds,
        "scores.json": scores,
        "rankings.json": rankings,
        "results.json": results,
        "awards.json": aw,
        "performances.json": performances,
        "timeline.json": timeline,
        "assets.json": assets,
        "agg": world.AGG,
    }
    os.makedirs(OUT, exist_ok=True)
    for fn, data in files.items():
        if fn=="agg": continue
        with open(os.path.join(OUT, fn), "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=1)

    # --- бандл data.js: window.DW = {...} (надёжно грузится локально, без сервера) ---
    bundle = {k[:-5] if k.endswith(".json") else k: v for k,v in files.items()}
    with open(os.path.join(OUT, "data.js"), "w", encoding="utf-8") as f:
        f.write("/* Автогенерировано build/generate.py — не редактировать вручную. */\n")
        f.write("window.DW = ")
        json.dump(bundle, f, ensure_ascii=False)
        f.write(";\n")
    return R, aw

if __name__ == "__main__":
    if len(sys.argv)>1 and sys.argv[1]=="emit":
        R, aw = emit()
        print("Данные записаны в", OUT)
        print("Победительница:", R["contestants"][R["winner"]]["name"])
        import os as _os
        for fn in sorted(_os.listdir(OUT)):
            print("  ", fn, _os.path.getsize(_os.path.join(OUT,fn)), "б")
        raise SystemExit
    R = run()
    C=R["contestants"]
    print("Участниц:", len(C))
    print("\n=== ИТОГОВЫЙ ТОП-10 ===")
    inv = {v:k for k,v in R["placement"].items()}
    for pos in range(1,11):
        s=inv[pos]; print(f'{pos:2}. {C[s]["name"]:24} [{C[s]["faction"]:14}] total={R["agg_total"][s]:.3f}')
    print(f'\nПОБЕДИТЕЛЬНИЦА: {C[R["winner"]]["name"]}')
    print(f'1-я вице-мисс : {C[R["runnerup"]]["name"]}')
    print(f'3-е место     : {C[R["third"]]["name"]}')
    print("\n=== НАГРАДЫ ===")
    for a in awards(R):
        print(f'  {a["title"]:38} -> {a["name"]}')
