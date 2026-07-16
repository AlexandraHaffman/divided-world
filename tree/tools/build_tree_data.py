#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Сборка слоя данных древа мета-способностей.

Читает:  data/characters/*.json  (дамп волта)
         tree/tools/roster.json  (каталожная приписка: класс/подкласс/происхождение/серийник)
Пишет:   tree/data/nodes.js      (window.META_TREE — единый слой данных для обоих рендеров)

Автоплейсмент: любой персонаж дампа с Мета-силой > 0, отсутствующий в roster.json,
автоматически попадает в очередь «⚠ спорные» — новый персонаж падает в дамп и сам
встаёт на ревью, ничего не теряется.

Запуск из корня репозитория:  python3 tree/tools/build_tree_data.py
"""

import json, os, sys, datetime

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
DUMP = os.path.join(ROOT, "data", "characters")
ROSTER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "roster.json")
OUT = os.path.join(ROOT, "tree", "data", "nodes.js")

# ── Реестр классов (порядок = порядок секторов по кругу, от вершины по часовой) ──
CLASSES = {
    "KIN": {"name": "Кинез",          "full": "Управление средой и материей",
            "desc": "Прямое воздействие на неживую среду: вода, воздух, свет, температура, давление, кристаллическая решётка. Двустихийные носители маркируются KIN²."},
    "VIT": {"name": "Витакинез",      "full": "Живая материя",
            "desc": "Воздействие на живые системы: вампиризм жизненных сил, кровь, флора, микробиом, исцеление, регенерация и отказ от смерти."},
    "ENT": {"name": "Энтропия",       "full": "Распад",
            "desc": "Ускорение распада и гниения материи. Редчайший класс: задокументирован единственный носитель."},
    "PSI": {"name": "Псионика",       "full": "Разум · восприятие · воля",
            "desc": "Вмешательство в чужой разум: телепатия, искажение восприятия, эрозия воли, боль, дезориентация, стирание памяти."},
    "FLD": {"name": "Энергополя",     "full": "Поля и конструкты",
            "desc": "Генерация полей и энергетических конструктов: ЭМИ, сияние и щиты, резонансные клинки, стеклокинез."},
    "COG": {"name": "Когниция",       "full": "Провидение · усиление",
            "desc": "Расширенное познание. Два лоба: Провидение (предвидение, абсолютное зрение, мета-сенсорика) и Усиление (ускоренный приём и обработка информации)."},
    "NUL": {"name": "Нуллификация",   "full": "Анти-мета",
            "desc": "Отрицание способностей, а не способность. Поле подавления гасит любые проявления мета-силы. Единственный носитель."},
    "CMN": {"name": "Соборная связь", "full": "Коллективный дар",
            "desc": "Не индивидуальный класс: базовый дар всех граждан Тенебриона. Слабая телепатическая связь с богиней и перманентное долголетие."},
}

FACTIONS = {
    "TNB": {"name": "Тенебрион",               "color": "#ff9d00"},
    "UAM": {"name": "Единая Америка",          "color": "#4a9eff"},
    "RKS": {"name": "Ракшасы",                 "color": "#a55eea"},
    "HVN": {"name": "Тихая гавань",            "color": "#38bdf8"},
    "IND": {"name": "Независимые",             "color": "#8b8f98"},
    "EQN": {"name": "Экваториальная сеть",     "color": "#d4a843"},
    "GRN": {"name": "Гарнизон",                "color": "#f2f2f2"},
    "ABY": {"name": "Отражение бездны",        "color": "#3d5a3e"},
    "MRC": {"name": "Наемники",                "color": "#b8860b"},
    "MSP": {"name": "Конфедерация Междуречья", "color": "#6B6B2A"},
}
FACTION_NAME_TO_CODE = {v["name"]: k for k, v in FACTIONS.items()}

# ── Полевые заметки К. Вистнера (ховер по узлу; сухо, по-архивному) ──
NOTES = {
    "тенебриа":          "Шкала строилась, чтобы измерить её. Все замеры уходят за пределы приборов; присваиваю W∞ и признаю: измерению не подлежит.",
    "маркус-кросс":      "Потолок шкалы — W10. Кросс стабильно даёт 12. Аномалия сверх потолка; отдельная бирка W10⁺, пересмотр шкалы отклонён.",
    "артур-остерман":    "Все датчики в его присутствии показывают ноль. Долго считал это неисправностью. Это не неисправность.",
    "ульяна-спасская":   "Абсолютная отметка по гидросфере. Не проявляет силу без нужды — что осложняет замеры и упрощает жизнь побережью.",
    "лилия-спасская":    "Ветер как продолжение тела. Пересборка после рассеивания зафиксирована трижды; нижняя граница смертности не установлена.",
    "амели-бертран":     "Скорость распада в её зоне превышает фоновую на порядки. Образцы не сохраняются. Класс из одного носителя.",
    "маро":              "Контакт глазами не обязателен. Опрошенные после сеанса уверены, что решение приняли сами.",
    "валентина-блажек":  "Отбор жизненной силы на дистанции. Кривая насыщения не выходит на плато — верхний предел не найден.",
    "эрик-сэнд":         "Редкий случай подтверждённого дара: сила наделена намеренно. Спектр сияния не совпадает ни с одним стихийным профилем.",
    "марина-элеонора-геррера": "Второй подтверждённый дар. Видит на любом расстоянии, сквозь любую погоду. Погода, впрочем, слушается её сама.",
    "вестник-тишины":    "Радиус подавления электроники растёт от замера к замеру. Рекомендация: аналоговые приборы, бумага, карандаш.",
    "смотрящий-в-бездну":"Перцептивное поле накрывает наблюдателя раньше, чем тот осознаёт вход в зону. Данные наблюдателей ненадёжны по определению.",
    "дух-леса":          "Жила расширяется. Граница между носителем и лесом инструментально не определяется.",
    "эну":               "Считает причинно-следственные связи быстрее, чем мы успеваем их создавать.",
}

CLASS_NOTES = {
    "KIN": "Кинетики — самая населённая ветвь. Среда слушается их так, будто ждала команды.",
    "VIT": "Живая материя отзывчивее мёртвой. И мстительнее.",
    "ENT": "Один носитель. Надеюсь, единственный.",
    "PSI": "Худшие замеры в моей практике: прибор фиксирует то, что оператору внушили зафиксировать.",
    "FLD": "Поля и конструкты. Единственный класс, который удаётся хоть как-то экранировать.",
    "COG": "Они не действуют на мир — они его знают. Иногда раньше, чем он случится.",
    "NUL": "Отрицание. Не способность, а дыра в таксономии.",
    "CMN": "Фон W1 у миллионов граждан. Слабейший из даров — и самый массовый инструмент в истории.",
}

MYTH = ("ЗАПИСЬ SRC-∅ // ПЕРВОВСПЛЕСК-99.\n"
        "12.12.1999 приборы четырёх континентов зафиксировали единый выброс неизвестной природы. "
        "Эпицентр — Бакспорт, США: рождение Натали Рут. Вся последующая мета-активность планеты — "
        "затухающие отголоски этого события.\n"
        "«Врождённые» способности — неосознанные эхо Первовсплеска. «Дар» — то, чем Источник наделяет намеренно. "
        "Соборная связь — фон, который Источник поддерживает постоянно.\n"
        "Иных источников мета-силы не задокументировано.")

CHANGELOG = [
    "r3 · Ольга Гончарова: KIN → KIN² (двустихийность подтверждена)",
    "r2 · Маркус Кросс: введена бирка W10⁺ (аномалия сверх потолка шкалы)",
    "r1 · База развёрнута. 38 носителей каталогизировано",
]

STATUS_MAP = {"Активен": "alive", "Мёртв": "dead", "Неизвестно": "missing", "В плену": "captive"}


def flat_abilities(raw):
    out = []
    for a in raw or []:
        if isinstance(a, list):
            out.extend(str(x) for x in a)
        else:
            out.append(str(a))
    return out


def load_dump():
    chars = {}
    for fn in sorted(os.listdir(DUMP)):
        if not fn.endswith(".json"):
            continue
        with open(os.path.join(DUMP, fn), encoding="utf-8") as f:
            c = json.load(f)
        chars[fn[:-5]] = c
    return chars


def main():
    with open(ROSTER, encoding="utf-8") as f:
        roster = json.load(f)
    dump = load_dump()

    nodes, used_slugs = [], set()

    for r in roster["carriers"]:
        slug = r.get("slug")
        node = {
            "id": slug or r["id"],
            "slug": slug,
            "cls": r["cls"],
            "dual": bool(r.get("dual")),
            "subclass": r.get("subclass", ""),
            "origin": r.get("origin", "s"),
            "fac": r["fac"],
            "serial": r.get("serial", ""),
        }
        for k in ("anomaly", "review", "lobe"):
            if r.get(k):
                node[k] = r[k]
        if r.get("review_note"):
            node["review_note"] = r["review_note"]

        if slug:
            if slug not in dump:
                print(f"!! roster: карточка не найдена в дампе: {slug}", file=sys.stderr)
                continue
            used_slugs.add(slug)
            c = dump[slug]
            node["name"] = c.get("name", slug)
            node["role"] = c.get("role", "")
            node["meta_power"] = (c.get("stats") or {}).get("meta_power", 0)
            node["threat"] = c.get("threat_level", 0)
            node["status"] = STATUS_MAP.get((c.get("status") or "").strip(), "missing")
            node["abilities"] = flat_abilities(c.get("abilities"))[:6]
            node["avatar"] = c.get("avatar_web", "")
            node["aliases"] = c.get("aliases", [])[:3]
        else:
            node["name"] = r["name"]
            node["role"] = r.get("role", "")
            node["meta_power"] = r.get("meta_power", 1)
            node["threat"] = r.get("threat", 0)
            node["status"] = r.get("status", "alive")
            node["abilities"] = r.get("abilities", [])
            node["avatar"] = ""
            node["aliases"] = []
            node["undocumented"] = True  # в каноне есть, карточки в дампе нет

        if node["id"] in NOTES:
            node["note"] = NOTES[node["id"]]
        nodes.append(node)

    # ── автоплейсмент: мета-люди дампа вне ростера → очередь «⚠ спорные» ──
    for slug, c in dump.items():
        mp = (c.get("stats") or {}).get("meta_power", 0)
        if mp and mp > 0 and slug not in used_slugs:
            fac = FACTION_NAME_TO_CODE.get(c.get("faction", ""), "IND")
            nodes.append({
                "id": slug, "slug": slug, "cls": "CMN" if mp <= 1 else "PSI",
                "dual": False, "subclass": "не классифицировано", "origin": "s",
                "fac": fac, "serial": "?", "review": True,
                "review_note": "Автоплейсмент из дампа: класс не приписан. Требует ревью.",
                "name": c.get("name", slug), "role": c.get("role", ""),
                "meta_power": mp, "threat": c.get("threat_level", 0),
                "status": STATUS_MAP.get((c.get("status") or "").strip(), "missing"),
                "abilities": flat_abilities(c.get("abilities"))[:6],
                "avatar": c.get("avatar_web", ""), "aliases": c.get("aliases", [])[:3],
            })
            print(f"⚠ спорные: {slug} (Мета-сила {mp}) — добавлен на ревью", file=sys.stderr)

    data = {
        "version": "TAXA.DB v2061.7-r3",
        "built": datetime.date.today().isoformat(),
        "changelog": CHANGELOG,
        "myth": MYTH,
        "classes": CLASSES,
        "class_notes": CLASS_NOTES,
        "factions": FACTIONS,
        "nodes": nodes,
        "ghosts": roster.get("ghosts", []),
        "resonance": roster.get("resonance", []),
    }

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("/* Автосборка: python3 tree/tools/build_tree_data.py — НЕ править руками */\n")
        f.write("window.META_TREE = ")
        json.dump(data, f, ensure_ascii=False, indent=1)
        f.write(";\n")

    meta = [n for n in nodes if n["cls"] != "SRC"]
    print(f"OK: {len(nodes)} узлов ({len(meta)} носителей + Источник) → {os.path.relpath(OUT, ROOT)}")


if __name__ == "__main__":
    main()
